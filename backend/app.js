const express = require("express");
const fs = require("fs");
const path = require("path");
const cors = require("cors");
require("dotenv").config();

const { securityHeaders, corsOptionsDelegate } = require("./middleware/security");
const { createRateLimiter } = require("./middleware/rateLimit");
const { ensureUploadsRoot } = require("./lib/fileStorage");

const app = express();
const frontendBuildPath = path.resolve(__dirname, "..", "frontend", "build");
const frontendIndexPath = path.join(frontendBuildPath, "index.html");
const hasFrontendBuild = fs.existsSync(frontendIndexPath);
const shouldServeFrontendBuild = hasFrontendBuild && String(
  process.env.SERVE_FRONTEND_BUILD || (process.env.NODE_ENV === "production" ? "false" : "true")
).trim().toLowerCase() === "true";

ensureUploadsRoot();

app.set("trust proxy", 1);
app.disable("x-powered-by");

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is required in environment variables");
}

const globalLimiter = createRateLimiter({
  windowMs: Number(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.GLOBAL_RATE_LIMIT_MAX || 800),
  keyPrefix: "global",
  message: "Too many requests. Please try again later.",
});

app.use(securityHeaders);
app.use(cors(corsOptionsDelegate));
app.options("*", cors(corsOptionsDelegate));
app.use(globalLimiter);

app.use(express.json({
  limit: "15mb",
  verify: (req, res, buf) => {
    req.rawBody = Buffer.from(buf);
  },
}));
app.use(express.urlencoded({ extended: true, limit: "15mb" }));

app.get("/api/health", (req, res) => {
  res.json({ ok: true, message: "Angel Montessori backend is running" });
});

app.use("/media", express.static(path.join(__dirname, "assets", "uploads"), {
  fallthrough: false,
  etag: true,
  maxAge: "7d",
}));

app.use("/api/auth", require("./routes/auth.routes"));
app.use("/api/public-site", require("./routes/publicSite.routes"));
app.use("/api/public-site", require("./routes/publicSiteProfiles.routes"));
app.use("/api/academic-calendar", require("./routes/academicCalendar.routes"));
app.use("/api/scheme-of-work", require("./routes/schemeOfWork.routes"));
app.use("/api/lesson-notes", require("./routes/lessonNotes.routes"));
app.use("/api/admin", require("./routes/admin.routes"));
app.use("/api/report-card", require("./routes/reportCard.routes"));
app.use("/api/report-card", require("./routes/broadsheet.routes"));
app.use("/api/continuous-assessment", require("./routes/continuousAssessment.routes"));
app.use("/api/grading", require("./routes/grading.routes"));
app.use("/api/promotion", require("./routes/promotion.routes"));
app.use("/api/attendance", require("./routes/attendance.routes"));
app.use("/api/cbt", require("./routes/cbt.routes"));
app.use("/api/sms", require("./routes/sms.routes"));
app.use("/api/homework", require("./routes/homework.routes"));
app.use("/api/library", require("./routes/library.routes"));
app.use("/api/lms", require("./routes/lms.routes"));
app.use("/api/lms/virtual-classes", require("./routes/lmsVirtual.routes"));
app.use("/api/teacher-analytics", require("./routes/teacherAnalytics.routes"));
app.use("/api/admissions", require("./routes/admissions.routes"));
app.use("/api/enquiries", require("./routes/enquiries.routes"));
app.use("/api/careers", require("./routes/careers.routes"));
app.use("/api/portal", require("./routes/portal.routes"));
app.use("/api/activities", require("./routes/activities.routes"));
app.use("/api/payments", require("./routes/payments.routes"));
app.use("/api", require("./routes/donations.routes"));
app.use("/api/finance", require("./routes/finance.routes"));
app.use("/api/finance", require("./routes/financeSchoolFees.routes"));
app.use("/api/transport", require("./routes/transport.routes"));

if (shouldServeFrontendBuild) {
  app.use(express.static(frontendBuildPath, {
    etag: true,
    maxAge: "1h",
  }));
}

app.use((req, res) => {
  if (shouldServeFrontendBuild && req.method === "GET" && !req.path.startsWith("/api") && !req.path.startsWith("/media")) {
    return res.sendFile(frontendIndexPath);
  }

  return res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (err?.type === "entity.too.large") {
    return res.status(413).json({ message: "Uploaded file is too large. Please use a smaller file." });
  }

  const status = Number(err?.status || err?.statusCode || 500);
  return res.status(status >= 400 && status < 600 ? status : 500).json({
    message: err?.message || "Internal server error",
  });
});

module.exports = app;



