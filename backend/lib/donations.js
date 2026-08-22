const crypto = require("crypto");
const { nanoid } = require("nanoid");
const { dispatchEmail } = require("./emailService");
const { nowIso, str, normalizeMoney, normalizeBool } = require("./paymentStore");

const DONATION_ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN", "FINANCE_OFFICER"];
const DONATION_STATUSES = ["PENDING", "SUCCESS", "FAILED"];
const DONATION_PROVIDERS = ["PAYSTACK", "MOCK"];
const DONATION_CURRENCY = String(process.env.SCHOOL_CURRENCY || "NGN").toUpperCase();

const DONATION_CAMPAIGN_SEED = [
  {
    id: "scholarship-fund",
    name: "Scholarship Fund",
    description: "Support tuition access, exam support, and learning continuity for pupils who need financial help.",
    suggestedAmounts: [5000, 10000, 25000, 50000],
    targetAmount: 5000000,
    accent: "#1c4d8c",
  },
  {
    id: "learning-materials",
    name: "Learning Materials",
    description: "Help provide books, digital learning tools, classroom resources, and practical learning supplies.",
    suggestedAmounts: [3000, 5000, 15000, 30000],
    targetAmount: 3000000,
    accent: "#947214",
  },
  {
    id: "classroom-development",
    name: "Classroom Development",
    description: "Fund furniture, classroom upgrades, child-friendly learning spaces, and teaching aids.",
    suggestedAmounts: [10000, 25000, 50000, 100000],
    targetAmount: 8000000,
    accent: "#12605e",
  },
  {
    id: "feeding-support",
    name: "Feeding Support",
    description: "Support pupil welfare through meal assistance and wellbeing interventions for vulnerable learners.",
    suggestedAmounts: [2000, 5000, 10000, 20000],
    targetAmount: 2000000,
    accent: "#b65c25",
  },
  {
    id: "infrastructure-project",
    name: "Infrastructure Project",
    description: "Contribute to campus growth, safety upgrades, school facilities, and long-term infrastructure projects.",
    suggestedAmounts: [25000, 50000, 100000, 250000],
    targetAmount: 15000000,
    accent: "#3a4659",
  },
];

function getPublicSiteUrl() {
  return str(process.env.PUBLIC_SITE_URL || process.env.PUBLIC_WEBSITE_URL || "https://angelmontessori.ng");
}

function getDonationCallbackUrl() {
  return str(process.env.DONATION_CALLBACK_URL) || `${getPublicSiteUrl()}/donate`;
}

function normalizeDonationStatus(value) {
  const safe = str(value).toUpperCase();
  return DONATION_STATUSES.includes(safe) ? safe : "PENDING";
}

function normalizeDonationProvider(value) {
  const safe = str(value).toUpperCase();
  if (safe === "PAYSTACK" || safe === "MOCK") return safe;
  return hasPaystackConfiguration() ? "PAYSTACK" : "MOCK";
}

function resolveDonationProvider(value) {
  const safe = str(value).toUpperCase();
  if (safe === "PAYSTACK" && hasPaystackConfiguration()) return "PAYSTACK";
  if (safe === "MOCK") return "MOCK";
  return hasPaystackConfiguration() ? "PAYSTACK" : "MOCK";
}

function hasPaystackConfiguration() {
  return Boolean(str(process.env.PAYSTACK_SECRET_KEY));
}

function buildDonationReference() {
  return `DON-${Date.now()}-${nanoid(6)}`.toUpperCase();
}

function getCampaignId(value) {
  return str(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function ensureDonationCollections(db) {
  if (!Array.isArray(db.donations)) db.donations = [];
  if (!Array.isArray(db.donationCampaigns)) db.donationCampaigns = [];
  if (!Array.isArray(db.donationWebhookLogs)) db.donationWebhookLogs = [];
  if (!Array.isArray(db.donationEmailLogs)) db.donationEmailLogs = [];
  if (!Array.isArray(db.donationAuditLogs)) db.donationAuditLogs = [];

  const now = nowIso();
  const seen = new Set();

  for (const item of db.donationCampaigns) {
    const id = getCampaignId(item.id || item.slug || item.name);
    if (!id || seen.has(id)) continue;
    seen.add(id);
  }

  for (const campaign of DONATION_CAMPAIGN_SEED) {
    const id = getCampaignId(campaign.id);
    const existing = db.donationCampaigns.find((row) => getCampaignId(row.id || row.slug || row.name) === id);
    if (existing) {
      existing.id = id;
      existing.name = str(existing.name) || campaign.name;
      existing.slug = id;
      existing.description = str(existing.description) || campaign.description;
      existing.suggestedAmounts = normalizeSuggestedAmounts(existing.suggestedAmounts, campaign.suggestedAmounts);
      existing.targetAmount = normalizeMoney(existing.targetAmount || campaign.targetAmount);
      existing.accent = str(existing.accent) || campaign.accent;
      existing.isActive = existing.isActive === undefined ? true : normalizeBool(existing.isActive);
      existing.updatedAt = str(existing.updatedAt) || now;
      continue;
    }

    db.donationCampaigns.push({
      id,
      slug: id,
      name: campaign.name,
      description: campaign.description,
      suggestedAmounts: normalizeSuggestedAmounts(campaign.suggestedAmounts, campaign.suggestedAmounts),
      targetAmount: normalizeMoney(campaign.targetAmount),
      accent: campaign.accent,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  }

  db.donationCampaigns = db.donationCampaigns
    .map((item) => ({
      ...item,
      id: getCampaignId(item.id || item.slug || item.name),
      slug: getCampaignId(item.slug || item.id || item.name),
      name: str(item.name),
      description: str(item.description),
      suggestedAmounts: normalizeSuggestedAmounts(item.suggestedAmounts, []),
      targetAmount: normalizeMoney(item.targetAmount),
      accent: str(item.accent) || "#1c4d8c",
      isActive: item.isActive === undefined ? true : normalizeBool(item.isActive),
      createdAt: str(item.createdAt) || now,
      updatedAt: str(item.updatedAt) || now,
    }))
    .filter((item) => item.id && item.name)
    .sort((left, right) => left.name.localeCompare(right.name));

  db.donations = (db.donations || []).map((item) => normalizeDonationRecord(item));
  db.donationWebhookLogs = (db.donationWebhookLogs || []).map((item) => ({
    ...item,
    id: str(item.id),
    donationId: str(item.donationId),
    reference: str(item.reference),
    event: str(item.event),
    status: str(item.status || "received").toLowerCase(),
    receivedAt: str(item.receivedAt) || now,
    processedAt: str(item.processedAt),
    notes: str(item.notes),
  }));
  db.donationEmailLogs = (db.donationEmailLogs || []).map((item) => ({
    ...item,
    id: str(item.id),
    donationId: str(item.donationId),
    reference: str(item.reference),
    provider: str(item.provider || "SIMULATED"),
    deliveryStatus: str(item.deliveryStatus || "logged"),
    recipientEmail: str(item.recipientEmail),
    subject: str(item.subject),
    createdAt: str(item.createdAt) || now,
    errorMessage: str(item.errorMessage),
  }));
  db.donationAuditLogs = (db.donationAuditLogs || []).map((item) => ({
    ...item,
    id: str(item.id),
    donationId: str(item.donationId),
    reference: str(item.reference),
    action: str(item.action),
    actorId: str(item.actorId),
    actorRole: str(item.actorRole).toUpperCase(),
    notes: str(item.notes),
    createdAt: str(item.createdAt) || now,
  }));
}

function normalizeSuggestedAmounts(value, fallback = []) {
  const source = Array.isArray(value) ? value : Array.isArray(fallback) ? fallback : [];
  const seen = new Set();
  const amounts = [];

  for (const item of source) {
    const amount = normalizeMoney(item);
    if (amount <= 0) continue;
    if (seen.has(amount)) continue;
    seen.add(amount);
    amounts.push(amount);
  }

  return amounts.sort((left, right) => left - right);
}

function normalizeDonationRecord(item = {}) {
  const safeAmount = normalizeMoney(item.amount);
  const currency = str(item.currency || DONATION_CURRENCY).toUpperCase() || DONATION_CURRENCY;
  const donorName = str(item.donorName || item.name);
  const campaign = getCampaignId(item.campaign || item.campaignId || item.cause);
  return {
    ...item,
    id: str(item.id),
    donorName,
    email: str(item.email).toLowerCase(),
    phone: str(item.phone),
    amount: safeAmount,
    campaign,
    campaignLabel: str(item.campaignLabel),
    paymentReference: str(item.paymentReference || item.reference),
    provider: normalizeDonationProvider(item.provider),
    status: normalizeDonationStatus(item.status),
    anonymous: normalizeBool(item.anonymous),
    message: str(item.message),
    currency,
    createdAt: str(item.createdAt) || nowIso(),
    updatedAt: str(item.updatedAt) || str(item.createdAt) || nowIso(),
    paidAt: str(item.paidAt),
    verifiedAt: str(item.verifiedAt),
    callbackUrl: str(item.callbackUrl || getDonationCallbackUrl()),
    adminNote: str(item.adminNote),
    receiptSentAt: str(item.receiptSentAt),
    thankYouEmailStatus: str(item.thankYouEmailStatus),
    gatewayReference: str(item.gatewayReference),
    lastWebhookEvent: str(item.lastWebhookEvent),
  };
}

function resolveCampaign(db, value) {
  ensureDonationCollections(db);
  const safe = getCampaignId(value);
  if (!safe) {
    return db.donationCampaigns.find((item) => item.isActive) || null;
  }

  return (
    db.donationCampaigns.find((item) => getCampaignId(item.id) === safe) ||
    db.donationCampaigns.find((item) => getCampaignId(item.slug) === safe) ||
    db.donationCampaigns.find((item) => getCampaignId(item.name) === safe) ||
    null
  );
}

function getDonationByReference(db, reference) {
  const safe = str(reference).toUpperCase();
  return (db.donations || []).find((item) => str(item.paymentReference).toUpperCase() === safe) || null;
}

function getDonationById(db, id) {
  const safe = str(id);
  return (db.donations || []).find((item) => str(item.id) === safe) || null;
}

function appendDonationAudit(db, donation, action, actor = {}, notes = "", extra = {}) {
  ensureDonationCollections(db);
  const row = {
    id: nanoid(),
    donationId: str(donation?.id),
    reference: str(donation?.paymentReference),
    action: str(action),
    actorId: str(actor.id || actor.actorId || actor.userId),
    actorRole: str(actor.role || actor.actorRole).toUpperCase(),
    notes: str(notes),
    details: extra,
    createdAt: nowIso(),
  };
  db.donationAuditLogs.unshift(row);
  return row;
}

function appendDonationWebhookLog(db, payload = {}) {
  ensureDonationCollections(db);
  const row = {
    id: nanoid(),
    donationId: str(payload.donationId),
    reference: str(payload.reference),
    event: str(payload.event),
    status: str(payload.status || "received").toLowerCase(),
    notes: str(payload.notes),
    payload: payload.payload || {},
    receivedAt: nowIso(),
    processedAt: str(payload.processedAt),
  };
  db.donationWebhookLogs.unshift(row);
  return row;
}

function updateWebhookLog(log, fields = {}) {
  if (!log || typeof log !== "object") return;
  Object.assign(log, fields);
  if (!log.processedAt && fields.status && fields.status !== "received") {
    log.processedAt = nowIso();
  }
}

function appendDonationEmailLog(db, payload = {}) {
  ensureDonationCollections(db);
  const row = {
    id: nanoid(),
    donationId: str(payload.donationId),
    reference: str(payload.reference),
    provider: str(payload.provider || "SIMULATED"),
    deliveryStatus: str(payload.deliveryStatus || "logged"),
    recipientEmail: str(payload.recipientEmail),
    subject: str(payload.subject),
    errorMessage: str(payload.errorMessage),
    payload: payload.payload || {},
    createdAt: nowIso(),
  };
  db.donationEmailLogs.unshift(row);
  return row;
}

function getCampaignBreakdown(db, donations) {
  const campaigns = getCampaignOptions(db);
  return campaigns.map((campaign) => {
    const rows = donations.filter((item) => getCampaignId(item.campaign) === campaign.id && item.status === "SUCCESS");
    const totalRaised = rows.reduce((sum, item) => sum + normalizeMoney(item.amount), 0);
    return {
      id: campaign.id,
      name: campaign.name,
      description: campaign.description,
      suggestedAmounts: campaign.suggestedAmounts,
      targetAmount: campaign.targetAmount,
      accent: campaign.accent,
      donationCount: rows.length,
      totalRaised: normalizeMoney(totalRaised),
    };
  });
}

function getCampaignOptions(db) {
  ensureDonationCollections(db);
  return (db.donationCampaigns || [])
    .filter((item) => item.isActive)
    .map((item) => ({
      id: item.id,
      name: item.name,
      description: item.description,
      suggestedAmounts: item.suggestedAmounts,
      targetAmount: item.targetAmount,
      accent: item.accent,
    }));
}

function buildDonationOverview(db, filters = null) {
  ensureDonationCollections(db);
  const donations = Array.isArray(filters) ? filters : db.donations || [];
  const successful = donations.filter((item) => item.status === "SUCCESS");
  const pending = donations.filter((item) => item.status === "PENDING");
  const failed = donations.filter((item) => item.status === "FAILED");

  const currentMonthKey = new Date().toISOString().slice(0, 7);
  const monthRaised = successful
    .filter((item) => str(item.paidAt || item.createdAt).slice(0, 7) === currentMonthKey)
    .reduce((sum, item) => sum + normalizeMoney(item.amount), 0);

  const donorKeys = new Set(
    successful
      .map((item) => str(item.email || item.phone || item.donorName).toLowerCase())
      .filter(Boolean)
  );

  return {
    currency: DONATION_CURRENCY,
    totalCount: donations.length,
    successfulCount: successful.length,
    pendingCount: pending.length,
    failedCount: failed.length,
    totalRaised: normalizeMoney(successful.reduce((sum, item) => sum + normalizeMoney(item.amount), 0)),
    monthRaised: normalizeMoney(monthRaised),
    donorCount: donorKeys.size,
    campaignBreakdown: getCampaignBreakdown(db, donations),
  };
}

function getPublicDonationOverview(db) {
  ensureDonationCollections(db);
  const successful = (db.donations || []).filter((item) => item.status === "SUCCESS");
  const recentSupport = successful
    .slice()
    .sort((left, right) => str(right.paidAt || right.createdAt).localeCompare(str(left.paidAt || left.createdAt)))
    .slice(0, 6)
    .map((item) => ({
      id: item.id,
      amount: normalizeMoney(item.amount),
      campaign: str(item.campaign),
      campaignLabel: str(item.campaignLabel),
      donorName: item.anonymous ? "Anonymous Donor" : str(item.donorName),
      anonymous: Boolean(item.anonymous),
      paidAt: str(item.paidAt || item.createdAt),
    }));

  return {
    provider: normalizeDonationProvider(""),
    callbackUrl: getDonationCallbackUrl(),
    currency: DONATION_CURRENCY,
    campaigns: getCampaignBreakdown(db, db.donations || []),
    totals: buildDonationOverview(db, db.donations || []),
    recentSupport,
  };
}

function filterDonations(db, query = {}) {
  ensureDonationCollections(db);
  const safeStatus = str(query.status).toUpperCase();
  const safeCampaign = getCampaignId(query.campaign || query.campaignId);
  const safeProvider = str(query.provider).toUpperCase();
  const safeSearch = str(query.search).toLowerCase();
  const safeFrom = str(query.from);
  const safeTo = str(query.to);
  const anonymousFilter = query.anonymous === undefined || query.anonymous === null || query.anonymous === ""
    ? ""
    : normalizeBool(query.anonymous);

  return (db.donations || [])
    .filter((item) => !safeStatus || item.status === safeStatus)
    .filter((item) => !safeCampaign || getCampaignId(item.campaign) === safeCampaign)
    .filter((item) => !safeProvider || str(item.provider).toUpperCase() === safeProvider)
    .filter((item) => anonymousFilter === "" || Boolean(item.anonymous) === Boolean(anonymousFilter))
    .filter((item) => !safeFrom || str(item.createdAt).slice(0, 10) >= safeFrom)
    .filter((item) => !safeTo || str(item.createdAt).slice(0, 10) <= safeTo)
    .filter((item) => {
      if (!safeSearch) return true;
      const bag = [
        item.donorName,
        item.email,
        item.phone,
        item.paymentReference,
        item.campaignLabel,
        item.message,
        item.adminNote,
      ]
        .map((value) => str(value).toLowerCase())
        .join(" ");
      return bag.includes(safeSearch);
    });
}

function toPublicDonationRow(donation) {
  return {
    id: str(donation.id),
    donorName: donation.anonymous ? "Anonymous Donor" : str(donation.donorName),
    email: str(donation.email),
    amount: normalizeMoney(donation.amount),
    campaign: str(donation.campaign),
    campaignLabel: str(donation.campaignLabel),
    paymentReference: str(donation.paymentReference),
    provider: str(donation.provider),
    status: str(donation.status),
    anonymous: Boolean(donation.anonymous),
    message: str(donation.message),
    currency: str(donation.currency || DONATION_CURRENCY),
    createdAt: str(donation.createdAt),
    paidAt: str(donation.paidAt),
    callbackUrl: str(donation.callbackUrl || getDonationCallbackUrl()),
  };
}

function toAdminDonationRow(donation) {
  return {
    id: str(donation.id),
    donorName: str(donation.donorName),
    email: str(donation.email),
    phone: str(donation.phone),
    amount: normalizeMoney(donation.amount),
    campaign: str(donation.campaign),
    campaignLabel: str(donation.campaignLabel),
    paymentReference: str(donation.paymentReference),
    provider: str(donation.provider),
    status: str(donation.status),
    anonymous: Boolean(donation.anonymous),
    message: str(donation.message),
    adminNote: str(donation.adminNote),
    currency: str(donation.currency || DONATION_CURRENCY),
    createdAt: str(donation.createdAt),
    updatedAt: str(donation.updatedAt),
    paidAt: str(donation.paidAt),
    verifiedAt: str(donation.verifiedAt),
    receiptSentAt: str(donation.receiptSentAt),
    thankYouEmailStatus: str(donation.thankYouEmailStatus),
    callbackUrl: str(donation.callbackUrl || getDonationCallbackUrl()),
  };
}

async function paystackRequest(pathname, options = {}) {
  const secret = str(process.env.PAYSTACK_SECRET_KEY);
  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is required for donation payments");
  }

  const response = await fetch(`https://api.paystack.co${pathname}`, {
    method: options.method || "GET",
    headers: {
      Authorization: `Bearer ${secret}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok || payload?.status === false) {
    throw new Error(str(payload?.message) || `Paystack request failed (${response.status})`);
  }

  return payload;
}

async function initializePaystackDonation(donation) {
  return paystackRequest("/transaction/initialize", {
    method: "POST",
    body: {
      email: donation.email,
      amount: Math.round(normalizeMoney(donation.amount) * 100),
      currency: donation.currency || DONATION_CURRENCY,
      reference: donation.paymentReference,
      callback_url: donation.callbackUrl || getDonationCallbackUrl(),
      metadata: {
        module: "donations",
        donationId: donation.id,
        campaign: donation.campaign,
        campaignLabel: donation.campaignLabel,
        donorName: donation.donorName,
        anonymous: Boolean(donation.anonymous),
        message: donation.message,
      },
    },
  });
}

async function verifyPaystackDonation(reference) {
  return paystackRequest(`/transaction/verify/${encodeURIComponent(reference)}`, { method: "GET" });
}

function verifyPaystackWebhookSignature(rawBody, signature) {
  const safeSignature = str(signature);
  const secret = str(process.env.PAYSTACK_SECRET_KEY);
  if (!safeSignature || !secret || !Buffer.isBuffer(rawBody)) return false;
  const expected = crypto.createHmac("sha512", secret).update(rawBody).digest("hex");
  return safeSignature === expected;
}

function validatePaystackAmountCurrency(donation, payloadData = {}) {
  const remoteAmount = normalizeMoney(Number(payloadData.amount || 0) / 100);
  const remoteCurrency = str(payloadData.currency || donation.currency).toUpperCase() || DONATION_CURRENCY;
  const amountMatch = normalizeMoney(donation.amount) === remoteAmount;
  const currencyMatch = remoteCurrency === str(donation.currency || DONATION_CURRENCY).toUpperCase();
  return { amountMatch, currencyMatch, remoteAmount, remoteCurrency };
}

function isPaystackSuccess(payloadData = {}) {
  return str(payloadData.status).toLowerCase() === "success";
}

function isPaystackFailure(payloadData = {}) {
  const status = str(payloadData.status).toLowerCase();
  return ["failed", "abandoned", "reversed"].includes(status);
}

function createDonationReceiptSubject(donation) {
  return `Thank you for your donation to Angel Montessori School`;
}

function createDonationReceiptText(donation) {
  const donorName = str(donation.donorName) || "Supporter";
  const campaignLabel = str(donation.campaignLabel || donation.campaign || "School Support");
  return [
    `Dear ${donorName},`,
    "",
    "Thank you for supporting Angel Montessori School.",
    "",
    `Donation reference: ${donation.paymentReference}`,
    `Campaign: ${campaignLabel}`,
    `Amount: ${DONATION_CURRENCY} ${normalizeMoney(donation.amount).toLocaleString("en-NG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    `Date received: ${str(donation.paidAt || donation.createdAt)}`,
    "",
    "Your support will help the school continue to serve pupils and families meaningfully.",
    "",
    "Angel Montessori School",
    "152 Okedogbon Road, Owo, Ondo State, Nigeria",
    "info@angelmontessori.ng",
  ].join("\n");
}

function createDonationReceiptHtml(donation) {
  const donorName = str(donation.donorName) || "Supporter";
  const campaignLabel = str(donation.campaignLabel || donation.campaign || "School Support");
  const amountLabel = `${DONATION_CURRENCY} ${normalizeMoney(donation.amount).toLocaleString("en-NG", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
  return `
    <div style="font-family: Georgia, serif; color: #17325c; line-height: 1.6;">
      <p>Dear ${escapeHtml(donorName)},</p>
      <p>Thank you for supporting <strong>Angel Montessori School</strong>.</p>
      <p>Your donation has been received successfully.</p>
      <table style="border-collapse: collapse; margin: 16px 0;">
        <tr><td style="padding: 6px 12px 6px 0;"><strong>Reference</strong></td><td>${escapeHtml(donation.paymentReference)}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0;"><strong>Campaign</strong></td><td>${escapeHtml(campaignLabel)}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0;"><strong>Amount</strong></td><td>${escapeHtml(amountLabel)}</td></tr>
        <tr><td style="padding: 6px 12px 6px 0;"><strong>Date</strong></td><td>${escapeHtml(str(donation.paidAt || donation.createdAt))}</td></tr>
      </table>
      <p>Your support helps Angel Montessori continue to invest in pupils, classrooms, and school development.</p>
      <p>Angel Montessori School<br/>152 Okedogbon Road, Owo, Ondo State, Nigeria<br/>info@angelmontessori.ng</p>
    </div>
  `;
}

async function sendDonationReceipt(db, donation) {
  ensureDonationCollections(db);
  if (!donation || donation.receiptSentAt || !str(donation.email)) {
    return { skipped: true };
  }

  const payload = {
    to: donation.email,
    name: donation.donorName,
    subject: createDonationReceiptSubject(donation),
    text: createDonationReceiptText(donation),
    html: createDonationReceiptHtml(donation),
  };

  const result = await dispatchEmail(payload);
  appendDonationEmailLog(db, {
    donationId: donation.id,
    reference: donation.paymentReference,
    provider: result.provider,
    deliveryStatus: result.deliveryStatus,
    recipientEmail: donation.email,
    subject: payload.subject,
    errorMessage: result.errorMessage,
    payload: result.responsePayload || {},
  });

  donation.thankYouEmailStatus = str(result.deliveryStatus || (result.ok ? "sent" : "failed"));
  donation.updatedAt = nowIso();
  if (result.ok) {
    donation.receiptSentAt = donation.receiptSentAt || nowIso();
  }

  return result;
}

async function finalizeDonationSuccess(db, donation, payloadData = {}, source = "verify") {
  ensureDonationCollections(db);
  if (!donation) return null;

  const now = nowIso();
  const { remoteAmount, remoteCurrency } = validatePaystackAmountCurrency(donation, payloadData);

  donation.status = "SUCCESS";
  donation.paidAt = donation.paidAt || str(payloadData.paid_at) || now;
  donation.verifiedAt = now;
  donation.gatewayReference = str(payloadData.reference || donation.gatewayReference || donation.paymentReference);
  donation.lastWebhookEvent = str(source);
  donation.currency = remoteCurrency || donation.currency || DONATION_CURRENCY;
  donation.updatedAt = now;

  if (remoteAmount > 0) {
    donation.amount = remoteAmount;
  }

  appendDonationAudit(db, donation, "payment_success", { actorId: "system", actorRole: "SYSTEM" }, `Donation marked successful via ${source}`);
  await sendDonationReceipt(db, donation);
  return donation;
}

function finalizeDonationFailure(db, donation, payloadData = {}, source = "verify") {
  ensureDonationCollections(db);
  if (!donation) return null;
  if (donation.status === "SUCCESS") return donation;

  donation.status = "FAILED";
  donation.verifiedAt = nowIso();
  donation.gatewayReference = str(payloadData.reference || donation.gatewayReference || donation.paymentReference);
  donation.lastWebhookEvent = str(source);
  donation.updatedAt = nowIso();
  appendDonationAudit(db, donation, "payment_failed", { actorId: "system", actorRole: "SYSTEM" }, `Donation marked failed via ${source}`);
  return donation;
}

function escapeCsvValue(value) {
  const safe = String(value ?? "");
  if (!safe.includes(",") && !safe.includes('"') && !safe.includes("\n")) return safe;
  return `"${safe.replace(/"/g, '""')}"`;
}

function buildDonationCsv(rows = []) {
  const headers = [
    "paymentReference",
    "donorName",
    "email",
    "phone",
    "campaignLabel",
    "amount",
    "currency",
    "provider",
    "status",
    "anonymous",
    "createdAt",
    "paidAt",
    "adminNote",
  ];

  const lines = [headers.join(",")];
  for (const row of rows) {
    lines.push(headers.map((key) => escapeCsvValue(row[key])).join(","));
  }
  return lines.join("\n");
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = {
  DONATION_ADMIN_ROLES,
  DONATION_CURRENCY,
  DONATION_PROVIDERS,
  ensureDonationCollections,
  resolveCampaign,
  getCampaignOptions,
  buildDonationOverview,
  getPublicDonationOverview,
  resolveDonationProvider,
  normalizeDonationProvider,
  normalizeDonationStatus,
  buildDonationReference,
  getDonationCallbackUrl,
  getDonationByReference,
  getDonationById,
  appendDonationAudit,
  appendDonationWebhookLog,
  updateWebhookLog,
  appendDonationEmailLog,
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
};
