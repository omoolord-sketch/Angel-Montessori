const nodemailer = require("nodemailer");

function providerMode() {
  return String(process.env.EMAIL_PROVIDER || 'SIMULATED').trim().toUpperCase();
}

function resolveEmailProviderMode() {
  const mode = providerMode();
  if (["RESEND", "BREVO", "SIMULATED", "SMTP", "HOSTINGER_SMTP"].includes(mode)) {
    return mode === "HOSTINGER_SMTP" ? "SMTP" : mode;
  }
  return "SIMULATED";
}

function fallbackToLogOnlyEnabled() {
  return String(process.env.EMAIL_FALLBACK_LOG_ONLY || 'true').toLowerCase() !== 'false';
}

function safeEmail(value) {
  const email = String(value || '').trim();
  if (!email || !email.includes('@')) return '';
  return email;
}

function getFromConfig() {
  const email = safeEmail(process.env.EMAIL_FROM || process.env.SCHOOL_EMAIL || 'info@angelmontessori.ng');
  const name = String(process.env.EMAIL_FROM_NAME || 'Angel Montessori School').trim() || 'Angel Montessori School';
  return { email, name };
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "boolean") return value;
  return ["1", "true", "yes", "on"].includes(String(value).trim().toLowerCase());
}

function getSmtpConfig() {
  const port = Number(process.env.SMTP_PORT || 465);
  return {
    host: String(process.env.SMTP_HOST || "").trim(),
    port: Number.isFinite(port) && port > 0 ? port : 465,
    secure: parseBoolean(process.env.SMTP_SECURE, port === 465),
    user: String(process.env.SMTP_USER || "").trim(),
    pass: String(process.env.SMTP_PASS || "").trim(),
  };
}

function getEmailProviderConfigStatus(mode = resolveEmailProviderMode()) {
  if (mode === 'RESEND') {
    const missing = [];
    if (!String(process.env.RESEND_API_KEY || '').trim()) missing.push('RESEND_API_KEY');
    if (!safeEmail(process.env.EMAIL_FROM || process.env.SCHOOL_EMAIL || '')) missing.push('EMAIL_FROM');
    return { provider: mode, isConfigured: missing.length === 0, missing };
  }

  if (mode === 'BREVO') {
    const missing = [];
    if (!String(process.env.BREVO_API_KEY || '').trim()) missing.push('BREVO_API_KEY');
    if (!safeEmail(process.env.EMAIL_FROM || process.env.SCHOOL_EMAIL || '')) missing.push('EMAIL_FROM');
    return { provider: mode, isConfigured: missing.length === 0, missing };
  }

  if (mode === "SMTP") {
    const smtp = getSmtpConfig();
    const missing = [];
    if (!smtp.host) missing.push("SMTP_HOST");
    if (!smtp.user) missing.push("SMTP_USER");
    if (!smtp.pass) missing.push("SMTP_PASS");
    if (!safeEmail(process.env.EMAIL_FROM || process.env.SCHOOL_EMAIL || '')) missing.push('EMAIL_FROM');
    return { provider: mode, isConfigured: missing.length === 0, missing };
  }

  return { provider: 'SIMULATED', isConfigured: true, missing: [] };
}

async function postJson(url, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Number(process.env.EMAIL_REQUEST_TIMEOUT_MS || 20000));
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: options.headers || {},
      body: options.body,
      signal: controller.signal,
    });
    const text = await response.text();
    let parsed = {};
    try {
      parsed = text ? JSON.parse(text) : {};
    } catch {
      parsed = { raw: text };
    }
    return { ok: response.ok, status: response.status, body: parsed };
  } finally {
    clearTimeout(timeout);
  }
}

async function sendViaResend(payload) {
  const from = getFromConfig();
  const requestPayload = {
    from: from.name ? `${from.name} <${from.email}>` : from.email,
    to: [payload.to],
    subject: payload.subject,
    text: payload.text,
    html: payload.html || undefined,
  };

  const result = await postJson(`${String(process.env.RESEND_API_BASE || 'https://api.resend.com').replace(/\/$/, '')}/emails`, {
    headers: {
      Authorization: `Bearer ${String(process.env.RESEND_API_KEY || '').trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });

  return {
    ok: result.ok,
    provider: 'RESEND',
    deliveryStatus: result.ok ? 'sent' : 'failed',
    errorMessage: result.ok ? '' : String(result.body?.message || result.body?.error || `HTTP ${result.status}`),
    requestPayload,
    responsePayload: result.body,
    providerMessageId: String(result.body?.id || ''),
  };
}

async function sendViaBrevo(payload) {
  const from = getFromConfig();
  const requestPayload = {
    sender: { email: from.email, name: from.name },
    to: [{ email: payload.to, name: payload.name || undefined }],
    subject: payload.subject,
    textContent: payload.text,
    htmlContent: payload.html || undefined,
  };

  const result = await postJson(`${String(process.env.BREVO_API_BASE || 'https://api.brevo.com').replace(/\/$/, '')}/v3/smtp/email`, {
    headers: {
      'api-key': String(process.env.BREVO_API_KEY || '').trim(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestPayload),
  });

  return {
    ok: result.ok,
    provider: 'BREVO',
    deliveryStatus: result.ok ? 'sent' : 'failed',
    errorMessage: result.ok ? '' : String(result.body?.message || result.body?.code || `HTTP ${result.status}`),
    requestPayload,
    responsePayload: result.body,
    providerMessageId: String(result.body?.messageId || result.body?.requestId || ''),
  };
}

async function sendViaSmtp(payload) {
  const from = getFromConfig();
  const smtp = getSmtpConfig();
  const requestPayload = {
    from: from.name ? `${from.name} <${from.email}>` : from.email,
    to: payload.name ? `${payload.name} <${payload.to}>` : payload.to,
    subject: payload.subject,
    text: payload.text,
    html: payload.html || undefined,
  };

  const transport = nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port,
    secure: smtp.secure,
    auth: {
      user: smtp.user,
      pass: smtp.pass,
    },
    connectionTimeout: Number(process.env.EMAIL_REQUEST_TIMEOUT_MS || 20000),
    greetingTimeout: Number(process.env.EMAIL_REQUEST_TIMEOUT_MS || 20000),
    socketTimeout: Number(process.env.EMAIL_REQUEST_TIMEOUT_MS || 20000),
  });

  try {
    const result = await transport.sendMail(requestPayload);
    return {
      ok: true,
      provider: 'SMTP',
      deliveryStatus: 'sent',
      errorMessage: '',
      requestPayload,
      responsePayload: {
        accepted: result.accepted || [],
        rejected: result.rejected || [],
        response: result.response || "",
      },
      providerMessageId: String(result.messageId || ''),
    };
  } catch (error) {
    return {
      ok: false,
      provider: 'SMTP',
      deliveryStatus: 'failed',
      errorMessage: String(error?.message || 'SMTP send failed'),
      requestPayload,
      responsePayload: {},
      providerMessageId: '',
    };
  }
}

async function dispatchEmail(payload = {}) {
  const safeTo = safeEmail(payload.to);
  if (!safeTo) {
    return {
      ok: false,
      provider: 'SIMULATED',
      deliveryStatus: 'failed',
      errorMessage: 'Missing recipient email',
      requestPayload: payload,
      responsePayload: {},
      providerMessageId: '',
    };
  }

  const mode = resolveEmailProviderMode();
  const config = getEmailProviderConfigStatus(mode);
  if (!config.isConfigured) {
    return {
      ok: fallbackToLogOnlyEnabled(),
      provider: `${mode}_LOG_ONLY`,
      deliveryStatus: fallbackToLogOnlyEnabled() ? 'logged' : 'failed',
      errorMessage: config.missing.join(', '),
      requestPayload: payload,
      responsePayload: { configured: false, missing: config.missing },
      providerMessageId: '',
    };
  }

  if (mode === 'RESEND') return sendViaResend(payload);
  if (mode === 'BREVO') return sendViaBrevo(payload);
  if (mode === 'SMTP') return sendViaSmtp(payload);

  return {
    ok: true,
    provider: 'SIMULATED',
    deliveryStatus: 'logged',
    errorMessage: '',
    requestPayload: payload,
    responsePayload: { simulated: true },
    providerMessageId: `EMAIL-SIM-${Date.now()}`,
  };
}

module.exports = {
  dispatchEmail,
  resolveEmailProviderMode,
  getEmailProviderConfigStatus,
  fallbackToLogOnlyEnabled,
};
