const express = require("express");
const { nanoid } = require("nanoid");
const { auth, requireRole } = require("../middleware/auth");
const { readDB, writeDB } = require("../lib/jsonStore");
const { nowIso, str, normalizeMoney, normalizeBool } = require("../lib/paymentStore");
const {
  DONATION_ADMIN_ROLES,
  DONATION_CURRENCY,
  DONATION_PROVIDERS,
  ensureDonationCollections,
  resolveCampaign,
  getCampaignOptions,
  buildDonationOverview,
  getPublicDonationOverview,
  resolveDonationProvider,
  buildDonationReference,
  getDonationCallbackUrl,
  getDonationByReference,
  getDonationById,
  appendDonationAudit,
  appendDonationWebhookLog,
  updateWebhookLog,
  toPublicDonationRow,
  toAdminDonationRow,
  filterDonations,
  initializePaystackDonation,
  verifyPaystackDonation,
  verifyPaystackWebhookSignature,
  validatePaystackAmountCurrency,
  isPaystackSuccess,
  isPaystackFailure,
  finalizeDonationSuccess,
  finalizeDonationFailure,
  buildDonationCsv,
} = require("../lib/donations");

const router = express.Router();

function getErrorMessage(error, fallback) {
  return str(error?.message || error?.response?.data?.message) || fallback;
}

function createDonationRecord(db, payload = {}) {
  ensureDonationCollections(db);

  const campaign = resolveCampaign(db, payload.campaign || payload.campaignId || payload.cause);
  const provider = resolveDonationProvider(payload.provider);
  const anonymous = normalizeBool(payload.anonymous);
  const donorName = str(payload.donorName || payload.name || (anonymous ? "Anonymous Donor" : ""));
  const email = str(payload.email).toLowerCase();
  const amount = normalizeMoney(payload.amount);

  const donation = {
    id: nanoid(),
    donorName,
    email,
    phone: str(payload.phone),
    amount,
    campaign: str(campaign?.id),
    campaignLabel: str(campaign?.name || payload.campaignLabel || payload.campaign || "School Support"),
    paymentReference: buildDonationReference(),
    provider,
    status: "PENDING",
    anonymous,
    message: str(payload.message),
    currency: DONATION_CURRENCY,
    createdAt: nowIso(),
    updatedAt: nowIso(),
    paidAt: "",
    verifiedAt: "",
    callbackUrl: str(payload.callbackUrl || getDonationCallbackUrl()),
    adminNote: "",
    receiptSentAt: "",
    thankYouEmailStatus: "",
    gatewayReference: "",
    gatewayPayload: {},
  };

  db.donations.unshift(donation);
  appendDonationAudit(db, donation, "created", { actorId: "public", actorRole: "PUBLIC" }, "Donation initiated from public website");
  return donation;
}

function validateDonationPayload(payload = {}) {
  const anonymous = normalizeBool(payload.anonymous);
  const donorName = str(payload.donorName || payload.name || (anonymous ? "Anonymous Donor" : ""));
  const email = str(payload.email).toLowerCase();
  const amount = normalizeMoney(payload.amount);

  if (!donorName) return "Donor name is required";
  if (!email || !email.includes("@")) return "A valid email address is required";
  if (amount <= 0) return "Donation amount must be greater than zero";
  return "";
}

router.get("/donations/public/overview", (req, res) => {
  const db = readDB();
  ensureDonationCollections(db);
  writeDB(db);
  return res.json(getPublicDonationOverview(db));
});

router.post("/donations/initiate", async (req, res) => {
  const payload = req.body || {};
  const validationError = validateDonationPayload(payload);
  if (validationError) return res.status(400).json({ message: validationError });

  const db = readDB();
  ensureDonationCollections(db);

  const donation = createDonationRecord(db, payload);

  try {
    if (donation.provider === "PAYSTACK") {
      const initializeResult = await initializePaystackDonation(donation);
      donation.gatewayPayload = {
        ...(donation.gatewayPayload || {}),
        initialize: initializeResult.data || {},
      };
      donation.gatewayReference = str(initializeResult?.data?.reference || donation.paymentReference);
      donation.updatedAt = nowIso();

      writeDB(db);
      return res.status(201).json({
        message: "Donation initialized successfully",
        provider: donation.provider,
        reference: donation.paymentReference,
        checkoutUrl: str(initializeResult?.data?.authorization_url),
        donation: toPublicDonationRow(donation),
      });
    }

    donation.gatewayPayload = {
      ...(donation.gatewayPayload || {}),
      initialize: {
        provider: "MOCK",
      },
    };
    donation.updatedAt = nowIso();

    writeDB(db);
    return res.status(201).json({
      message: "Donation initialized in offline demo mode",
      provider: donation.provider,
      reference: donation.paymentReference,
      checkoutUrl: `${donation.callbackUrl}?reference=${encodeURIComponent(donation.paymentReference)}&provider=MOCK`,
      donation: toPublicDonationRow(donation),
    });
  } catch (error) {
    finalizeDonationFailure(db, donation, {}, "initialization");
    appendDonationAudit(db, donation, "initialization_failed", { actorId: "system", actorRole: "SYSTEM" }, getErrorMessage(error, "Donation initialization failed"));
    writeDB(db);
    return res.status(502).json({ message: getErrorMessage(error, "Unable to start donation payment") });
  }
});

router.get("/donations/verify/:reference", async (req, res) => {
  const reference = str(req.params.reference).toUpperCase();
  if (!reference) return res.status(400).json({ message: "Donation reference is required" });

  const db = readDB();
  ensureDonationCollections(db);

  const donation = getDonationByReference(db, reference);
  if (!donation) return res.status(404).json({ message: "Donation not found" });

  try {
    if (donation.provider === "PAYSTACK") {
      const verification = await verifyPaystackDonation(reference);
      const payloadData = verification?.data || {};
      const { amountMatch, currencyMatch } = validatePaystackAmountCurrency(donation, payloadData);

      donation.gatewayPayload = {
        ...(donation.gatewayPayload || {}),
        verify: payloadData,
      };
      donation.verifiedAt = nowIso();

      if (isPaystackSuccess(payloadData) && amountMatch && currencyMatch) {
        await finalizeDonationSuccess(db, donation, payloadData, "verify_endpoint");
      } else if (!amountMatch || !currencyMatch || isPaystackFailure(payloadData)) {
        finalizeDonationFailure(db, donation, payloadData, "verify_endpoint");
      }
    } else {
      await finalizeDonationSuccess(
        db,
        donation,
        {
          reference: donation.paymentReference,
          amount: Math.round(normalizeMoney(donation.amount) * 100),
          currency: donation.currency || DONATION_CURRENCY,
          status: "success",
        },
        "mock_verify"
      );
    }

    writeDB(db);
    return res.json({
      verified: donation.status === "SUCCESS",
      donation: toPublicDonationRow(donation),
    });
  } catch (error) {
    writeDB(db);
    return res.status(502).json({ message: getErrorMessage(error, "Unable to verify donation payment") });
  }
});

router.post("/donations/webhook", async (req, res) => {
  const signature = req.headers["x-paystack-signature"];
  if (!verifyPaystackWebhookSignature(req.rawBody, signature)) {
    return res.status(401).json({ message: "Invalid webhook signature" });
  }

  const payload = req.body || {};
  const payloadData = payload?.data || {};
  const reference = str(payloadData.reference).toUpperCase();
  const event = str(payload?.event || payloadData?.status || "paystack_webhook");

  const db = readDB();
  ensureDonationCollections(db);

  const log = appendDonationWebhookLog(db, {
    reference,
    event,
    status: "received",
    payload,
  });

  if (!reference) {
    updateWebhookLog(log, { status: "ignored", notes: "Missing donation reference", processedAt: nowIso() });
    writeDB(db);
    return res.status(200).json({ ok: true });
  }

  const donation = getDonationByReference(db, reference);
  if (!donation) {
    updateWebhookLog(log, { status: "ignored", notes: "Donation not found", processedAt: nowIso() });
    writeDB(db);
    return res.status(200).json({ ok: true });
  }

  log.donationId = donation.id;
  donation.gatewayPayload = {
    ...(donation.gatewayPayload || {}),
    webhook: payload,
  };

  try {
    const { amountMatch, currencyMatch } = validatePaystackAmountCurrency(donation, payloadData);

    if (isPaystackSuccess(payloadData) && amountMatch && currencyMatch) {
      await finalizeDonationSuccess(db, donation, payloadData, event || "paystack_webhook");
      updateWebhookLog(log, { status: "processed", notes: "Donation marked successful", processedAt: nowIso() });
    } else if (!amountMatch || !currencyMatch || isPaystackFailure(payloadData)) {
      finalizeDonationFailure(db, donation, payloadData, event || "paystack_webhook");
      updateWebhookLog(log, { status: "processed", notes: "Donation marked failed", processedAt: nowIso() });
    } else {
      donation.verifiedAt = nowIso();
      donation.updatedAt = nowIso();
      appendDonationAudit(db, donation, "webhook_received", { actorId: "system", actorRole: "SYSTEM" }, "Webhook received while donation remains pending");
      updateWebhookLog(log, { status: "processed", notes: "Webhook received, donation still pending", processedAt: nowIso() });
    }

    writeDB(db);
    return res.status(200).json({ ok: true });
  } catch (error) {
    updateWebhookLog(log, { status: "failed", notes: getErrorMessage(error, "Webhook processing failed"), processedAt: nowIso() });
    writeDB(db);
    return res.status(500).json({ message: "Webhook processing failed" });
  }
});

router.get("/admin/donations/export", auth(), requireRole(...DONATION_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureDonationCollections(db);

  const rows = filterDonations(db, req.query || {})
    .slice()
    .sort((left, right) => str(right.createdAt).localeCompare(str(left.createdAt)))
    .map((item) => toAdminDonationRow(item));

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="donations-export-${Date.now()}.csv"`);
  return res.status(200).send(buildDonationCsv(rows));
});

router.get("/admin/donations", auth(), requireRole(...DONATION_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureDonationCollections(db);

  const records = filterDonations(db, req.query || {})
    .slice()
    .sort((left, right) => str(right.createdAt).localeCompare(str(left.createdAt)));

  return res.json({
    currency: DONATION_CURRENCY,
    providerOptions: DONATION_PROVIDERS,
    statusOptions: ["PENDING", "SUCCESS", "FAILED"],
    campaignOptions: getCampaignOptions(db),
    overview: buildDonationOverview(db, records),
    records: records.map((item) => toAdminDonationRow(item)),
    totalCount: records.length,
  });
});

router.get("/admin/donations/:id", auth(), requireRole(...DONATION_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureDonationCollections(db);

  const donation = getDonationById(db, req.params.id);
  if (!donation) return res.status(404).json({ message: "Donation not found" });

  const logs = {
    audit: (db.donationAuditLogs || [])
      .filter((item) => str(item.donationId) === str(donation.id))
      .sort((left, right) => str(right.createdAt).localeCompare(str(left.createdAt))),
    webhook: (db.donationWebhookLogs || [])
      .filter((item) => str(item.donationId) === str(donation.id) || str(item.reference).toUpperCase() === str(donation.paymentReference).toUpperCase())
      .sort((left, right) => str(right.receivedAt).localeCompare(str(left.receivedAt))),
    email: (db.donationEmailLogs || [])
      .filter((item) => str(item.donationId) === str(donation.id) || str(item.reference).toUpperCase() === str(donation.paymentReference).toUpperCase())
      .sort((left, right) => str(right.createdAt).localeCompare(str(left.createdAt))),
  };

  const donorHistory = (db.donations || [])
    .filter((item) => str(item.email).toLowerCase() === str(donation.email).toLowerCase())
    .sort((left, right) => str(right.createdAt).localeCompare(str(left.createdAt)))
    .map((item) => toAdminDonationRow(item));

  return res.json({
    donation: toAdminDonationRow(donation),
    donorHistory,
    logs,
  });
});

router.patch("/admin/donations/:id/note", auth(), requireRole(...DONATION_ADMIN_ROLES), (req, res) => {
  const db = readDB();
  ensureDonationCollections(db);

  const donation = getDonationById(db, req.params.id);
  if (!donation) return res.status(404).json({ message: "Donation not found" });

  donation.adminNote = str(req.body?.adminNote);
  donation.updatedAt = nowIso();
  donation.adminNoteUpdatedAt = nowIso();
  donation.adminNoteUpdatedBy = str(req.user?.id);

  appendDonationAudit(
    db,
    donation,
    "admin_note_updated",
    { actorId: req.user?.id, actorRole: req.user?.role },
    "Donation reconciliation note updated"
  );

  writeDB(db);
  return res.json({
    message: "Donation note updated",
    donation: toAdminDonationRow(donation),
  });
});

module.exports = router;
