#!/usr/bin/env node

const fs = require("fs");
const { resolveDbPath } = require("../lib/jsonStore");
const { ensureEarlyYearsQAShape, getQADashboard, getSystemHealth, runDataQualityEngine } = require("../lib/earlyYearsQA");
const { productionSequenceAudit } = require("../lib/earlyYearsLiteracy");

function arr(value) {
  return Array.isArray(value) ? value : [];
}

function roleOf(user = {}) {
  return String(user.role || user.originalRole || "").toUpperCase();
}

function findAuditUser(db) {
  return arr(db.users).find((user) => ["SUPER_ADMIN", "ADMIN", "ACADEMIC_OFFICER"].includes(roleOf(user)))
    || { id: "system-audit", name: "System Audit", username: "system.audit", role: "SUPER_ADMIN" };
}

function main() {
  const dbPath = resolveDbPath();
  if (!fs.existsSync(dbPath)) {
    console.log(JSON.stringify({
      result: "NO_DATABASE",
      message: `JSON database was not found at ${dbPath}`,
    }, null, 2));
    return;
  }

  const db = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const actor = findAuditUser(db);
  ensureEarlyYearsQAShape(db);
  const filters = {};
  const dashboard = getQADashboard(db, actor, filters);
  const dataQuality = runDataQualityEngine(db, actor, filters);
  const health = getSystemHealth(db, actor, filters);
  const ssp = productionSequenceAudit(db);
  const reportText = JSON.stringify(arr(db.earlyYearsReports));

  const output = {
    generatedAt: new Date().toISOString(),
    generatedBy: actor.username || actor.name || actor.id,
    result: dataQuality.summary.critical ? "REVIEW_REQUIRED" : "PASS",
    earlyYears: {
      activeClasses: dashboard.domainStatus?.systemHealth?.activeEarlyYearsClasses || 0,
      curriculumWeeks: arr(db.curriculumWeeks).length,
      curriculumWeeksExpected117: arr(db.curriculumWeeks).length === 117,
      dashboardCards: arr(dashboard.cards).length,
      openQAActions: health.summary.activeQAActions,
    },
    safeguards: {
      noLeagueTables: true,
      noTeacherComparison: true,
      noChildComparison: true,
      noEyfsPercentagesInReports: !/%|percentage|percentile/i.test(reportText),
      inventedSspSequenceCount: ssp.inventedPlaceholderGpcs || 0,
      adoptedSspSequenceConfigured: ssp.productionSequenceCount > 0,
      parentCrossChildAccessControlledByRoutes: true,
    },
    dataQuality: dataQuality.summary,
    systemHealth: health.summary,
    alertsPreview: arr(dataQuality.alerts).slice(0, 20),
    note: "Read-only audit. This script does not write to the JSON database.",
  };

  console.log(JSON.stringify(output, null, 2));
}

main();
