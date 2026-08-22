require("dotenv").config();
const os = require("os");
const app = require("./app");

const PORT = process.env.PORT || 5000;

function getLanUrls(port) {
  const interfaces = os.networkInterfaces();
  return Object.values(interfaces)
    .flat()
    .filter((entry) => entry && entry.family === "IPv4" && !entry.internal)
    .map((entry) => `http://${entry.address}:${port}`);
}

const server = app.listen(PORT, () => {
  const lanUrls = getLanUrls(PORT);
  console.log(`Angel Montessori backend running on http://localhost:${PORT}`);
  if (lanUrls.length) {
    console.log(`Phone access: ${lanUrls.join(", ")}`);
  }
});

/* ---------------- Graceful Shutdown ---------------- */
function shutdown(signal) {
  console.log(`\n${signal} received. Shutting down server...`);

  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });

  // Force shutdown if hanging
  setTimeout(() => {
    console.error("Force shutting down...");
    process.exit(1);
  }, 10000);
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));

/* ---------------- Crash Handling ---------------- */
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  shutdown("UNCAUGHT_EXCEPTION");
});

process.on("unhandledRejection", (err) => {
  // Keep API alive; log for investigation instead of terminating active sessions.
  console.error("Unhandled Rejection:", err);
});
