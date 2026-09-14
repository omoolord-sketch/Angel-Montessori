const fs = require("fs");
const path = require("path");
const { nanoid } = require("nanoid");

function resolveUploadsRoot() {
  const configuredPath = String(process.env.UPLOADS_ROOT_PATH || process.env.AMS_UPLOADS_ROOT_PATH || "").trim();
  if (!configuredPath) return path.join(__dirname, "..", "assets", "uploads");
  return path.resolve(configuredPath);
}

const UPLOADS_ROOT = resolveUploadsRoot();
const MIME_EXTENSION_MAP = {
  "application/pdf": ".pdf",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ".pptx",
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/heic": ".heic",
  "text/plain": ".txt",
  "text/csv": ".csv",
  "application/zip": ".zip",
  "application/x-zip-compressed": ".zip",
};

function ensureUploadsRoot() {
  fs.mkdirSync(UPLOADS_ROOT, { recursive: true });
  return UPLOADS_ROOT;
}

function sanitizeSegment(value, fallback = "file") {
  const cleaned = String(value || "")
    .trim()
    .replace(/[^a-z0-9._-]+/gi, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return cleaned || fallback;
}

function extensionFromInput(fileName, mimeType) {
  const fromName = path.extname(String(fileName || "")).trim();
  if (fromName) return fromName.toLowerCase();
  const fromMime = MIME_EXTENSION_MAP[String(mimeType || "").trim().toLowerCase()];
  return fromMime || ".bin";
}

function parseDataUrl(value) {
  const match = String(value || "").match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  return {
    mimeType: String(match[1] || "application/octet-stream").trim().toLowerCase(),
    base64: String(match[2] || "").trim(),
  };
}

function toBufferFromPayload(input) {
  const raw = String(input?.dataUrl || input?.base64 || input?.content || "").trim();
  const dataUrl = parseDataUrl(raw);
  if (dataUrl) {
    return {
      buffer: Buffer.from(dataUrl.base64, "base64"),
      mimeType: String(input?.mimeType || dataUrl.mimeType || "application/octet-stream").trim().toLowerCase(),
    };
  }

  if (raw) {
    return {
      buffer: Buffer.from(raw, "base64"),
      mimeType: String(input?.mimeType || "application/octet-stream").trim().toLowerCase(),
    };
  }

  return { buffer: null, mimeType: String(input?.mimeType || "application/octet-stream").trim().toLowerCase() };
}

function buildPublicFileUrl(req, relativePath) {
  const publicBase = String(process.env.PUBLIC_BACKEND_URL || "").trim().replace(/\/+$/, "");
  if (publicBase) return publicBase + relativePath;
  return req.protocol + "://" + req.get("host") + relativePath;
}

function storeUploadedFile(req, options = {}) {
  ensureUploadsRoot();
  const category = sanitizeSegment(options.category || "general", "general");
  const subdirectory = path.join(UPLOADS_ROOT, category);
  fs.mkdirSync(subdirectory, { recursive: true });

  const payload = Buffer.isBuffer(options.buffer)
    ? {
        buffer: options.buffer,
        mimeType: String(options.mimeType || "application/octet-stream").trim().toLowerCase(),
      }
    : toBufferFromPayload(options);
  const buffer = payload.buffer;
  const mimeType = payload.mimeType;
  if (!buffer || !buffer.length) {
    throw new Error("Uploaded file content is required.");
  }

  const originalName = String(options.fileName || "").trim();
  const safeBaseName = sanitizeSegment(path.basename(originalName, path.extname(originalName)), "upload");
  const extension = extensionFromInput(originalName, mimeType);
  const storedName = Date.now() + "-" + nanoid(10) + "-" + safeBaseName + extension;
  const absolutePath = path.join(subdirectory, storedName);
  fs.writeFileSync(absolutePath, buffer);

  const relativePath = "/media/" + category + "/" + storedName;
  return {
    filePath: buildPublicFileUrl(req, relativePath),
    relativePath,
    fileName: originalName || (safeBaseName + extension),
    fileMimeType: mimeType || "application/octet-stream",
    fileSize: buffer.length,
    storedName,
  };
}

module.exports = {
  UPLOADS_ROOT,
  ensureUploadsRoot,
  parseDataUrl,
  storeUploadedFile,
};
