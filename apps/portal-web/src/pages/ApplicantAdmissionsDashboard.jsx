import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  getAdmissionsPublicConfig,
  getApplicantAdmissionAcknowledgement,
  getApplicantAdmissionApplication,
  getApplicantAcceptancePaymentSummary,
  getApplicantPaymentSummary,
  initializeApplicantAcceptanceFeePayment,
  initializeApplicantFeePayment,
  saveApplicantAdmissionApplication,
  submitApplicantAdmissionApplication,
  verifyPayment,
} from "../api/services";

const STEPS = [
  { key: "personal", label: "Step 1: Personal" },
  { key: "parent", label: "Step 2: Parent/Guardian" },
  { key: "academic", label: "Step 3: Academic" },
  { key: "medical", label: "Step 4: Medical" },
  { key: "documents", label: "Step 5: Documents" },
  { key: "payment", label: "Step 6: Payment" },
  { key: "review", label: "Step 7: Review & Submit" },
  { key: "status", label: "Status & Timeline" },
];

const STEP_ROUTE_MAP = {
  personal: "/applicant/application/personal",
  parent: "/applicant/application/parents",
  academic: "/applicant/application/academic",
  medical: "/applicant/application/medical",
  documents: "/applicant/application/documents",
  payment: "/applicant/application/payment",
  review: "/applicant/application/review",
  status: "/applicant/application/status",
};

const ROUTE_STEP_MAP = {
  personal: "personal",
  parents: "parent",
  academic: "academic",
  medical: "medical",
  documents: "documents",
  payment: "payment",
  review: "review",
  status: "status",
  acknowledgement: "status",
};

function getStepFromPathname(pathname) {
  const path = String(pathname || "");
  if (path === "/portal/applicant" || path === "/applicant/dashboard") return "personal";
  const match = path.match(/\/applicant\/application\/([^/?#]+)/i);
  const segment = String(match?.[1] || "status").toLowerCase();
  return ROUTE_STEP_MAP[segment] || "status";
}

function formatCurrency(amount, currency = "NGN") {
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(Number(amount || 0));
}

function prettyProviderLabel(value) {
  const safe = String(value || "").toUpperCase();
  if (!safe) return "";
  if (safe === "MOCK") return "Offline Demo";
  return safe;
}

export default function ApplicantAdmissionsDashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const [application, setApplication] = useState(null);
  const [publicConfig, setPublicConfig] = useState(null);
  const [acknowledgement, setAcknowledgement] = useState(null);
  const [activeStep, setActiveStep] = useState("personal");

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [paymentSummary, setPaymentSummary] = useState({ paid: false, amount: 0, currency: "NGN", pendingReference: "", pendingAuthorizationUrl: "" });
  const [acceptanceSummary, setAcceptanceSummary] = useState({ eligible: false, paid: false, amount: 0, currency: "NGN", status: "", pendingReference: "", pendingAuthorizationUrl: "" });
  const [availableProviders, setAvailableProviders] = useState(["MOCK"]);
  const [applicationPaymentProvider, setApplicationPaymentProvider] = useState("MOCK");
  const [acceptancePaymentProvider, setAcceptancePaymentProvider] = useState("MOCK");
  const [paying, setPaying] = useState(false);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [payingAcceptance, setPayingAcceptance] = useState(false);
  const [verifyingAcceptance, setVerifyingAcceptance] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [applicationRes, paymentRes, configRes] = await Promise.all([
        getApplicantAdmissionApplication(),
        getApplicantPaymentSummary(),
        getAdmissionsPublicConfig(),
      ]);

      const nextApp = applicationRes?.data || null;
      setApplication(nextApp);
      setPublicConfig(configRes?.data || null);
      const providerList =
        Array.isArray(paymentRes?.data?.providers) && paymentRes.data.providers.length
          ? paymentRes.data.providers.map((item) => String(item || "").toUpperCase()).filter(Boolean)
          : ["MOCK"];
      const defaultProvider = String(paymentRes?.data?.defaultProvider || providerList[0] || "MOCK").toUpperCase();

      setAvailableProviders(providerList);
      setApplicationPaymentProvider((prev) => (providerList.includes(prev) ? prev : defaultProvider));
      setAcceptancePaymentProvider((prev) => (providerList.includes(prev) ? prev : defaultProvider));

      setPaymentSummary({
        paid: Boolean(paymentRes?.data?.paid),
        amount: Number(paymentRes?.data?.amount || 0),
        currency: paymentRes?.data?.currency || "NGN",
        pendingReference: String(paymentRes?.data?.pendingReference || ""),
        pendingAuthorizationUrl: String(paymentRes?.data?.pendingAuthorizationUrl || ""),
      });

      try {
        const acceptanceRes = await getApplicantAcceptancePaymentSummary();
        setAcceptanceSummary({
          eligible: Boolean(acceptanceRes?.data?.eligible),
          paid: Boolean(acceptanceRes?.data?.paid),
          amount: Number(acceptanceRes?.data?.amount || 0),
          currency: acceptanceRes?.data?.currency || "NGN",
          status: String(acceptanceRes?.data?.status || ""),
          pendingReference: String(acceptanceRes?.data?.pendingReference || ""),
          pendingAuthorizationUrl: String(acceptanceRes?.data?.pendingAuthorizationUrl || ""),
        });
      } catch {
        setAcceptanceSummary({ eligible: false, paid: false, amount: 0, currency: "NGN", status: "", pendingReference: "", pendingAuthorizationUrl: "" });
      }

      if (nextApp?.submittedAt) {
        try {
          const ackRes = await getApplicantAdmissionAcknowledgement();
          setAcknowledgement(ackRes?.data || null);
        } catch {
          setAcknowledgement(null);
        }
      } else {
        setAcknowledgement(null);
      }
    } catch (e) {
      setApplication(null);
      setError(e?.response?.data?.message || "Failed to load application");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setActiveStep(getStepFromPathname(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    load();
  }, []);

  const classOptions = useMemo(() => {
    const rows = Array.isArray(publicConfig?.classes) ? publicConfig.classes : [];
    return rows.map((row) => ({ id: row.id, name: row.className }));
  }, [publicConfig]);

  const sessionOptions = useMemo(() => {
    const rows = Array.isArray(publicConfig?.sessions) ? publicConfig.sessions : [];
    return rows.map((row) => ({ id: row.id, name: row.title || row.academicSession }));
  }, [publicConfig]);

  const setField = (section, key, value) => {
    setApplication((prev) => ({
      ...(prev || {}),
      [section]: {
        ...((prev && prev[section]) || {}),
        [key]: value,
      },
    }));
  };

  const goToStep = (stepKey) => {
    const nextStep = STEP_ROUTE_MAP[stepKey] ? stepKey : "personal";
    setActiveStep(nextStep);
    navigate(STEP_ROUTE_MAP[nextStep]);
  };

  const saveDraft = async () => {
    if (!application) return;

    try {
      setSaving(true);
      setError("");
      setMessage("");
      const payload = {
        sessionId: application.sessionId || "",
        classId: application.classId || "",
        personal: application.personal || {},
        parentInfo: application.parentInfo || {},
        academicHistory: application.academicHistory || {},
        medicalSupport: application.medicalSupport || {},
        documents: application.documents || {},
        notes: application.notes || "",
        declarationAccepted: Boolean(application.declarationAccepted),
      };
      const res = await saveApplicantAdmissionApplication(payload);
      setApplication(res.data || null);
      setMessage("Draft saved successfully.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to save draft");
    } finally {
      setSaving(false);
    }
  };

  const startApplicationPayment = async () => {
    try {
      setPaying(true);
      setError("");
      setMessage("");
      const res = await initializeApplicantFeePayment({ provider: applicationPaymentProvider });
      const data = res?.data || {};

      if (String(data.provider || "").toUpperCase() === "MOCK") {
        await verifyPayment(data.reference);
        setMessage("Application fee paid successfully.");
        await load();
        return;
      }

      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
      }

      setPaymentSummary((prev) => ({ ...prev, pendingReference: String(data.reference || ""), pendingAuthorizationUrl: String(data.authorizationUrl || "") }));
      setMessage("Payment initialized. Complete payment and click Verify Payment.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to initialize application payment");
    } finally {
      setPaying(false);
    }
  };

  const verifyApplicationPayment = async () => {
    const reference = String(paymentSummary.pendingReference || "").trim();
    if (!reference) return;

    try {
      setVerifyingPayment(true);
      setError("");
      setMessage("");
      const res = await verifyPayment(reference);
      const status = String(res?.data?.status || "");
      if (status === "SUCCESS") {
        setMessage("Payment verified successfully.");
      } else {
        setMessage("Payment verification completed but status is not successful yet.");
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to verify payment");
    } finally {
      setVerifyingPayment(false);
    }
  };
  const startAcceptancePayment = async () => {
    try {
      setPayingAcceptance(true);
      setError("");
      setMessage("");
      const res = await initializeApplicantAcceptanceFeePayment({ provider: acceptancePaymentProvider });
      const data = res?.data || {};

      if (String(data.provider || "").toUpperCase() === "MOCK") {
        await verifyPayment(data.reference);
        setMessage("Acceptance fee paid successfully.");
        await load();
        return;
      }

      if (data.authorizationUrl) {
        window.open(data.authorizationUrl, "_blank", "noopener,noreferrer");
      }

      setAcceptanceSummary((prev) => ({
        ...prev,
        pendingReference: String(data.reference || ""),
        pendingAuthorizationUrl: String(data.authorizationUrl || ""),
      }));
      setMessage("Acceptance fee payment initialized. Complete payment and click Verify Acceptance Payment.");
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to initialize acceptance payment");
    } finally {
      setPayingAcceptance(false);
    }
  };

  const verifyAcceptancePayment = async () => {
    const reference = String(acceptanceSummary.pendingReference || "").trim();
    if (!reference) return;

    try {
      setVerifyingAcceptance(true);
      setError("");
      setMessage("");
      const res = await verifyPayment(reference);
      const status = String(res?.data?.status || "");
      if (status === "SUCCESS") {
        setMessage("Acceptance fee payment verified successfully.");
      } else {
        setMessage("Acceptance fee verification completed but status is not successful yet.");
      }
      await load();
    } catch (e) {
      setError(e?.response?.data?.message || "Failed to verify acceptance payment");
    } finally {
      setVerifyingAcceptance(false);
    }
  };

  const submitApplication = async () => {
    try {
      setSubmitting(true);
      setError("");
      setMessage("");

      if (!paymentSummary.paid) {
        setError("Application fee payment is required before submission.");
        return;
      }

      await saveDraft();
      const res = await submitApplicantAdmissionApplication();
      setApplication(res.data || null);
      setMessage("Application submitted successfully. Admissions team will review it.");
      goToStep("status");
      await load();
    } catch (e) {
      const details = e?.response?.data?.errors;
      const base = e?.response?.data?.message || "Failed to submit application";
      setError(Array.isArray(details) && details.length ? `${base}: ${details.join(", ")}` : base);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div style={{ padding: 20 }}>Loading application...</div>;

  return (
    <div style={{ padding: 20, background: "#f3f7fd", minHeight: "100vh" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        <h2 style={{ marginBottom: 6 }}>Admission Application Portal</h2>
        <p style={{ color: "#4a627e", margin: "0 0 8px" }}>
          Complete your Angel Montessori admission application, upload supporting records, and follow each next step from one applicant view.
        </p>
        <p style={{ color: "#4a627e", marginTop: 0 }}>
          Application No: <strong>{application?.applicationNo || "-"}</strong>
          {" | "}
          Status: <strong>{application?.status || "-"}</strong>
          {" | "}
          Progress: <strong>{application?.progress?.percent || 0}%</strong>
        </p>

        {error ? <p style={{ color: "crimson" }}>{error}</p> : null}
        {message ? <p style={{ color: "#1f6f3a" }}>{message}</p> : null}

        <div style={{ display: "grid", gridTemplateColumns: "280px 1fr", gap: 12, alignItems: "start" }}>
          <aside style={{ background: "#fff", border: "1px solid #d9e4f0", borderRadius: 12, padding: 12 }}>
            <h4 style={{ marginTop: 0 }}>Application Sections</h4>
            <div style={{ display: "grid", gap: 6 }}>
              {STEPS.map((step) => (
                <button
                  key={step.key}
                  type="button"
                  onClick={() => goToStep(step.key)}
                  style={{
                    textAlign: "left",
                    border: "1px solid #d5e3f3",
                    background: activeStep === step.key ? "#e8f2ff" : "#fff",
                    borderRadius: 8,
                    padding: "8px 10px",
                    cursor: "pointer",
                  }}
                >
                  {step.label}
                </button>
              ))}
            </div>

            <div style={{ marginTop: 12, borderTop: "1px solid #e5edf6", paddingTop: 10 }}>
              <p style={{ margin: 0, fontSize: 13 }}>
                Session: <strong>{application?.sessionName || "-"}</strong>
              </p>
              <p style={{ margin: "4px 0 0", fontSize: 13 }}>
                Applied Class: <strong>{application?.className || "-"}</strong>
              </p>
              <p style={{ margin: "6px 0 0", fontSize: 13 }}>
                Assigned Officer: <strong>{application?.assignedOfficerName || "Pending"}</strong>
              </p>
            </div>
          </aside>

          <section style={{ background: "#fff", border: "1px solid #d9e4f0", borderRadius: 12, padding: 14 }}>
            {activeStep === "personal" ? (
              <StepPanel title="Step 1: Personal Information">
                <Grid2>
                  <Field label="Surname"><input value={application?.personal?.surname || ""} onChange={(e) => setField("personal", "surname", e.target.value)} /></Field>
                  <Field label="First Name"><input value={application?.personal?.firstName || ""} onChange={(e) => setField("personal", "firstName", e.target.value)} /></Field>
                  <Field label="Middle Name"><input value={application?.personal?.middleName || ""} onChange={(e) => setField("personal", "middleName", e.target.value)} /></Field>
                  <Field label="Gender">
                    <select value={application?.personal?.gender || ""} onChange={(e) => setField("personal", "gender", e.target.value)}>
                      <option value="">Select gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </Field>
                  <Field label="Date of Birth"><input type="date" value={application?.personal?.dateOfBirth || ""} onChange={(e) => setField("personal", "dateOfBirth", e.target.value)} /></Field>
                  <Field label="Nationality"><input value={application?.personal?.nationality || ""} onChange={(e) => setField("personal", "nationality", e.target.value)} /></Field>
                  <Field label="State of Origin"><input value={application?.personal?.stateOfOrigin || ""} onChange={(e) => setField("personal", "stateOfOrigin", e.target.value)} /></Field>
                  <Field label="LGA"><input value={application?.personal?.lga || ""} onChange={(e) => setField("personal", "lga", e.target.value)} /></Field>
                  <Field label="Religion"><input value={application?.personal?.religion || ""} onChange={(e) => setField("personal", "religion", e.target.value)} /></Field>
                  <Field label="Admission Session">
                    <select value={application?.sessionId || ""} onChange={(e) => setApplication((prev) => ({ ...(prev || {}), sessionId: e.target.value }))}>
                      <option value="">Select session</option>
                      {sessionOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                  </Field>
                  <Field label="Apply To Class">
                    <select value={application?.classId || ""} onChange={(e) => setApplication((prev) => ({ ...(prev || {}), classId: e.target.value }))}>
                      <option value="">Select class</option>
                      {classOptions.map((row) => <option key={row.id} value={row.id}>{row.name}</option>)}
                    </select>
                  </Field>
                </Grid2>
                <Field label="Residential Address">
                  <textarea rows={3} value={application?.personal?.residentialAddress || ""} onChange={(e) => setField("personal", "residentialAddress", e.target.value)} />
                </Field>
              </StepPanel>
            ) : null}

            {activeStep === "parent" ? (
              <StepPanel title="Step 2: Parent / Guardian Information">
                <Grid2>
                  <Field label="Father's Name"><input value={application?.parentInfo?.fatherName || ""} onChange={(e) => setField("parentInfo", "fatherName", e.target.value)} /></Field>
                  <Field label="Father's Phone"><input value={application?.parentInfo?.fatherPhone || ""} onChange={(e) => setField("parentInfo", "fatherPhone", e.target.value)} /></Field>
                  <Field label="Father's Email"><input type="email" value={application?.parentInfo?.fatherEmail || ""} onChange={(e) => setField("parentInfo", "fatherEmail", e.target.value)} /></Field>
                  <Field label="Mother's Name"><input value={application?.parentInfo?.motherName || ""} onChange={(e) => setField("parentInfo", "motherName", e.target.value)} /></Field>
                  <Field label="Mother's Phone"><input value={application?.parentInfo?.motherPhone || ""} onChange={(e) => setField("parentInfo", "motherPhone", e.target.value)} /></Field>
                  <Field label="Mother's Email"><input type="email" value={application?.parentInfo?.motherEmail || ""} onChange={(e) => setField("parentInfo", "motherEmail", e.target.value)} /></Field>
                  <Field label="Guardian's Name"><input value={application?.parentInfo?.guardianName || ""} onChange={(e) => setField("parentInfo", "guardianName", e.target.value)} /></Field>
                  <Field label="Guardian's Phone"><input value={application?.parentInfo?.guardianPhone || ""} onChange={(e) => setField("parentInfo", "guardianPhone", e.target.value)} /></Field>
                  <Field label="Guardian's Email"><input type="email" value={application?.parentInfo?.guardianEmail || ""} onChange={(e) => setField("parentInfo", "guardianEmail", e.target.value)} /></Field>
                  <Field label="Occupation"><input value={application?.parentInfo?.occupation || ""} onChange={(e) => setField("parentInfo", "occupation", e.target.value)} /></Field>
                  <Field label="Emergency Contact Name"><input value={application?.parentInfo?.emergencyContactName || ""} onChange={(e) => setField("parentInfo", "emergencyContactName", e.target.value)} /></Field>
                  <Field label="Emergency Contact Phone"><input value={application?.parentInfo?.emergencyContactPhone || ""} onChange={(e) => setField("parentInfo", "emergencyContactPhone", e.target.value)} /></Field>
                </Grid2>
                <Field label="Contact Address">
                  <textarea rows={3} value={application?.parentInfo?.contactAddress || ""} onChange={(e) => setField("parentInfo", "contactAddress", e.target.value)} />
                </Field>
              </StepPanel>
            ) : null}

            {activeStep === "academic" ? (
              <StepPanel title="Step 3: Academic History">
                <Grid2>
                  <Field label="Previous School"><input value={application?.academicHistory?.previousSchool || ""} onChange={(e) => setField("academicHistory", "previousSchool", e.target.value)} /></Field>
                  <Field label="Last Class Completed"><input value={application?.academicHistory?.lastClassCompleted || ""} onChange={(e) => setField("academicHistory", "lastClassCompleted", e.target.value)} /></Field>
                  <Field label="Last Session Attended"><input value={application?.academicHistory?.lastSessionAttended || ""} onChange={(e) => setField("academicHistory", "lastSessionAttended", e.target.value)} /></Field>
                  <Field label="Intended Class"><input value={application?.academicHistory?.intendedClass || ""} onChange={(e) => setField("academicHistory", "intendedClass", e.target.value)} /></Field>
                </Grid2>
                <Field label="Reason for Leaving">
                  <textarea rows={2} value={application?.academicHistory?.reasonForLeaving || ""} onChange={(e) => setField("academicHistory", "reasonForLeaving", e.target.value)} />
                </Field>
                <Field label="Academic Strengths">
                  <textarea rows={2} value={application?.academicHistory?.academicStrengths || ""} onChange={(e) => setField("academicHistory", "academicStrengths", e.target.value)} />
                </Field>
                <Field label="Special Notes">
                  <textarea rows={2} value={application?.academicHistory?.specialNotes || ""} onChange={(e) => setField("academicHistory", "specialNotes", e.target.value)} />
                </Field>
              </StepPanel>
            ) : null}

            {activeStep === "medical" ? (
              <StepPanel title="Step 4: Medical / Support Information">
                <Field label="Known Allergies"><textarea rows={2} value={application?.medicalSupport?.allergies || ""} onChange={(e) => setField("medicalSupport", "allergies", e.target.value)} /></Field>
                <Field label="Medical Conditions"><textarea rows={2} value={application?.medicalSupport?.medicalConditions || ""} onChange={(e) => setField("medicalSupport", "medicalConditions", e.target.value)} /></Field>
                <Field label="Current Medications"><textarea rows={2} value={application?.medicalSupport?.medications || ""} onChange={(e) => setField("medicalSupport", "medications", e.target.value)} /></Field>
                <Field label="Learning Support Needs"><textarea rows={2} value={application?.medicalSupport?.learningSupportNeeds || ""} onChange={(e) => setField("medicalSupport", "learningSupportNeeds", e.target.value)} /></Field>
                <Field label="Emergency Medical Notes"><textarea rows={2} value={application?.medicalSupport?.emergencyMedicalNotes || ""} onChange={(e) => setField("medicalSupport", "emergencyMedicalNotes", e.target.value)} /></Field>
              </StepPanel>
            ) : null}

            {activeStep === "documents" ? (
              <StepPanel title="Step 5: Document Upload (URL Links)">
                <p style={{ color: "#4b637f", marginTop: 0 }}>Allowed formats: JPG, PNG, PDF. Provide each uploaded file link.</p>
                <Grid2>
                  <Field label="Passport Photograph URL"><input value={application?.documents?.passportPhotoUrl || ""} onChange={(e) => setField("documents", "passportPhotoUrl", e.target.value)} /></Field>
                  <Field label="Birth Certificate URL"><input value={application?.documents?.birthCertificateUrl || ""} onChange={(e) => setField("documents", "birthCertificateUrl", e.target.value)} /></Field>
                  <Field label="Previous Result URL"><input value={application?.documents?.previousResultUrl || ""} onChange={(e) => setField("documents", "previousResultUrl", e.target.value)} /></Field>
                  <Field label="Testimonial URL"><input value={application?.documents?.testimonialUrl || ""} onChange={(e) => setField("documents", "testimonialUrl", e.target.value)} /></Field>
                  <Field label="Transfer Letter URL"><input value={application?.documents?.transferLetterUrl || ""} onChange={(e) => setField("documents", "transferLetterUrl", e.target.value)} /></Field>
                  <Field label="Immunization Card URL"><input value={application?.documents?.immunizationCardUrl || ""} onChange={(e) => setField("documents", "immunizationCardUrl", e.target.value)} /></Field>
                </Grid2>
              </StepPanel>
            ) : null}

            {activeStep === "payment" ? (
              <StepPanel title="Step 6: Application Fee Payment">
                <p style={{ margin: "6px 0" }}>Fee Amount: <strong>{formatCurrency(paymentSummary.amount, paymentSummary.currency)}</strong></p>
                <p style={{ margin: "6px 0" }}>
                  Payment Status: <strong style={{ color: paymentSummary.paid ? "#1b7d2c" : "#b45309" }}>{paymentSummary.paid ? "PAID" : "UNPAID"}</strong>
                </p>
                {!paymentSummary.paid ? (
                  <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                    <label style={{ display: "grid", gap: 4, minWidth: 180 }}>
                      <span style={{ fontSize: 12, color: "#475569" }}>Payment Provider</span>
                      <select value={applicationPaymentProvider} onChange={(e) => setApplicationPaymentProvider(e.target.value)}>
                        {availableProviders.map((provider) => (
                          <option key={provider} value={provider}>{prettyProviderLabel(provider)}</option>
                        ))}
                      </select>
                    </label>
                    <button onClick={startApplicationPayment} disabled={paying || verifyingPayment}>
                      {paying ? "Processing..." : "Pay Application Fee"}
                    </button>
                    {paymentSummary.pendingReference ? (
                      <button onClick={verifyApplicationPayment} disabled={verifyingPayment}>
                        {verifyingPayment ? "Verifying..." : "Verify Payment"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                  <p style={{ marginTop: 8, color: "#1f6f3a" }}>Payment confirmed. You can proceed to final submission.</p>
                )}
              </StepPanel>
            ) : null}

            {activeStep === "review" ? (
              <StepPanel title="Step 7: Review and Final Submission">
                <p style={{ marginTop: 0 }}>Confirm that each section is complete before you submit the application to the school.</p>
                <div style={{ border: "1px solid #d9e4f0", borderRadius: 10, padding: 10, marginBottom: 10 }}>
                  {(application?.progress?.steps || []).map((item) => (
                    <div key={item.key} style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span>{item.label}</span>
                      <strong style={{ color: item.done ? "#1f6f3a" : "#b45309" }}>{item.done ? "Done" : "Pending"}</strong>
                    </div>
                  ))}
                </div>

                <label style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 12 }}>
                  <input
                    type="checkbox"
                    checked={Boolean(application?.declarationAccepted)}
                    onChange={(e) => setApplication((prev) => ({ ...(prev || {}), declarationAccepted: e.target.checked }))}
                  />
                  I confirm that the information provided is correct.
                </label>

                <button
                  onClick={submitApplication}
                  disabled={
                    submitting ||
                    !paymentSummary.paid ||
                    !Boolean(application?.declarationAccepted) ||
                    (application?.status && !["REGISTERED", "IN_PROGRESS", "SUBMITTED"].includes(application.status))
                  }
                >
                  {submitting ? "Submitting..." : "Submit Application"}
                </button>
              </StepPanel>
            ) : null}

            {activeStep === "status" ? (
              <StepPanel title="Application Status and Timeline">
                {acknowledgement ? (
                  <div style={{ border: "1px solid #d9e4f0", borderRadius: 10, padding: 10, marginBottom: 12, background: "#f8fbff" }}>
                    <strong>Application Acknowledgement Slip</strong>
                    <p style={{ margin: "6px 0" }}>Application No: {acknowledgement.applicationNo}</p>
                    <p style={{ margin: "6px 0" }}>Applicant: {acknowledgement.applicantName}</p>
                    <p style={{ margin: "6px 0" }}>Class: {acknowledgement.className}</p>
                    <p style={{ margin: "6px 0" }}>Session: {acknowledgement.sessionName}</p>
                    <p style={{ margin: "6px 0" }}>Submitted: {acknowledgement.submittedAt ? new Date(acknowledgement.submittedAt).toLocaleString() : "-"}</p>
                    <button type="button" onClick={() => window.print()}>Print Acknowledgement</button>
                  </div>
                ) : null}

                <div style={{ border: "1px solid #d9e4f0", borderRadius: 10, padding: 12, background: "#fff" }}>
                  {(application?.statusHistory || []).length === 0 ? <p>No admission updates have been posted yet.</p> : null}
                  {(application?.statusHistory || []).map((item) => (
                    <div key={item.id} style={{ borderBottom: "1px dashed #dbe4ef", padding: "6px 0" }}>
                      <strong>{item.status}</strong> - {new Date(item.changedAt).toLocaleString()}
                      <div style={{ color: "#4d647f", fontSize: 13 }}>
                        {item.changedByName || "System"}
                        {item.note ? ` | ${item.note}` : ""}
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 10, display: "grid", gap: 6 }}>
                  <p style={{ margin: 0 }}><strong>Screening:</strong> {application?.screening?.date ? `${application.screening.date} ${application.screening.time || ""} - ${application.screening.venue || ""}` : "Pending"}</p>
                  <p style={{ margin: 0 }}><strong>Decision:</strong> {application?.decision?.decision || "Pending"}</p>
                  <p style={{ margin: 0 }}><strong>Enrollment:</strong> {application?.enrollment?.admissionNo ? `Completed (${application.enrollment.admissionNo})` : "Pending"}</p>
                </div>

                {acceptanceSummary.eligible ? (
                  <div style={{ border: "1px solid #d9e4f0", borderRadius: 10, padding: 10, marginTop: 10, background: "#f8fbff" }}>
                    <strong>Acceptance Fee Payment</strong>
                    <p style={{ margin: "6px 0" }}>Amount: <strong>{formatCurrency(acceptanceSummary.amount, acceptanceSummary.currency)}</strong></p>
                    <p style={{ margin: "6px 0" }}>
                      Status: <strong style={{ color: acceptanceSummary.paid ? "#1b7d2c" : "#b45309" }}>{acceptanceSummary.paid ? "PAID" : "UNPAID"}</strong>
                    </p>

                    {!acceptanceSummary.paid ? (
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <label style={{ display: "grid", gap: 4, minWidth: 180 }}>
                          <span style={{ fontSize: 12, color: "#475569" }}>Payment Provider</span>
                          <select value={acceptancePaymentProvider} onChange={(e) => setAcceptancePaymentProvider(e.target.value)}>
                            {availableProviders.map((provider) => (
                              <option key={provider} value={provider}>{prettyProviderLabel(provider)}</option>
                            ))}
                          </select>
                        </label>
                        <button onClick={startAcceptancePayment} disabled={payingAcceptance || verifyingAcceptance}>
                          {payingAcceptance ? "Processing..." : "Pay Acceptance Fee"}
                        </button>
                        {acceptanceSummary.pendingReference ? (
                          <button onClick={verifyAcceptancePayment} disabled={verifyingAcceptance}>
                            {verifyingAcceptance ? "Verifying..." : "Verify Acceptance Payment"}
                          </button>
                        ) : null}
                      </div>
                    ) : (
                      <p style={{ margin: "6px 0", color: "#1f6f3a" }}>Acceptance fee confirmed.</p>
                    )}
                  </div>
                ) : null}
              </StepPanel>
            ) : null}

            <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
              <button onClick={saveDraft} disabled={saving || submitting}>{saving ? "Saving..." : "Save Draft"}</button>
              <button onClick={load} type="button">Refresh</button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function StepPanel({ title, children }) {
  return (
    <div>
      <h3 style={{ marginTop: 0 }}>{title}</h3>
      {children}
    </div>
  );
}

function Grid2({ children }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
      {children}
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label style={{ display: "grid", gap: 4, fontSize: 14 }}>
      <span>{label}</span>
      {children}
    </label>
  );
}

















