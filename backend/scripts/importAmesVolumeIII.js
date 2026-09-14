#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const { readDB, writeDB } = require("../lib/jsonStore");
const {
  importCurriculumPayload,
  seedDirectory,
  validateImportPayload,
} = require("../lib/earlyYearsCurriculum");

const STAGES = {
  A: ["creche-term-1.json", "creche-term-2.json", "creche-term-3.json"],
  B: ["nursery-term-1.json", "nursery-term-2.json", "nursery-term-3.json"],
  C: ["reception-term-1.json", "reception-term-2.json", "reception-term-3.json"],
};

function parseArgs(argv) {
  const args = { stage: "ALL", dryRun: false };
  argv.forEach((arg, index) => {
    if (arg === "--dry-run") args.dryRun = true;
    if (arg === "--stage") args.stage = String(argv[index + 1] || "ALL").toUpperCase();
    if (arg.startsWith("--stage=")) args.stage = arg.split("=")[1].toUpperCase();
  });
  return args;
}

function filesForStage(stage) {
  if (stage === "ALL") return [...STAGES.A, ...STAGES.B, ...STAGES.C];
  if (!STAGES[stage]) {
    throw new Error("Unknown stage. Use A, B, C, or ALL.");
  }
  return STAGES[stage];
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseDir = seedDirectory();
  const files = filesForStage(args.stage).map((file) => path.join(baseDir, file));

  const validationReports = files.map((filePath) => {
    if (!fs.existsSync(filePath)) {
      return {
        sourceFile: filePath,
        errors: [`Missing curriculum seed file: ${filePath}`],
        warnings: [],
      };
    }
    const raw = readJson(filePath);
    const result = validateImportPayload(raw, filePath);
    return {
      sourceFile: filePath,
      class: result.payload.className,
      term: result.payload.termName,
      weeksDetected: result.payload.weeks.length,
      itemsDetected: result.payload.weeks.reduce((sum, week) => sum + (Array.isArray(week.items) ? week.items.length : 0), 0),
      errors: result.errors,
      warnings: result.warnings,
    };
  });

  const hasErrors = validationReports.some((report) => report.errors.length);
  if (hasErrors) {
    console.log(JSON.stringify({
      stage: args.stage,
      dryRun: args.dryRun,
      result: "FAILED_VALIDATION",
      reports: validationReports,
    }, null, 2));
    process.exitCode = 1;
    return;
  }

  if (args.dryRun) {
    console.log(JSON.stringify({
      stage: args.stage,
      dryRun: true,
      result: "DRY_RUN_PASS",
      reports: validationReports,
    }, null, 2));
    return;
  }

  const db = readDB();
  const reports = files.map((filePath) => importCurriculumPayload(db, readJson(filePath), {
    sourceFile: filePath,
    actor: { id: "curriculum-import-cli", name: "Curriculum Import CLI", role: "ADMIN" },
  }));
  writeDB(db);

  console.log(JSON.stringify({
    stage: args.stage,
    dryRun: false,
    result: "PASS",
    reports,
  }, null, 2));
}

try {
  main();
} catch (error) {
  console.error(error.message || error);
  process.exitCode = 1;
}
