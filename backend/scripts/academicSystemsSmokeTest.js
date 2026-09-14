const assert = require("assert/strict");

const {
  ACADEMIC_SYSTEMS,
  ASSESSMENT_FRAMEWORKS,
  AMES_EYFS_DIMENSIONS,
  EYFS_AREAS,
  EYFS_ASSESSMENT_DESCRIPTORS,
  REPORT_FRAMEWORKS,
  ensureAcademicSystemShape,
  getApprovedClassConfig,
  getClassCapabilitySummary,
  getLegacyClassMapping,
  getReportFramework,
  getTeacherToolsetForClass,
  isEarlyYearsClass,
  supportsEYFSAssessment,
  supportsNigerianCA,
  supportsPhonicsTracking,
  supportsReceptionTransition,
} = require("../lib/academicSystems");

const now = new Date().toISOString();
const db = {
  classes: [
    { id: "legacy-nursery-one", name: "Nursery 1", section: "Early Years", createdAt: now },
    { id: "legacy-nursery-two", name: "Nursery 2", section: "Early Years", createdAt: now },
    { id: "legacy-kg", name: "Kindergarten", section: "Early Years", createdAt: now },
    { id: "legacy-playgroup", name: "Playgroup", section: "Early Years", createdAt: now },
  ],
  students: [
    { id: "student-1", name: "Legacy Child", classId: "legacy-nursery-one", className: "Nursery 1" },
    { id: "student-2", name: "Current Child", classId: "basic-1", className: "Basic 1" },
  ],
};

const shape = ensureAcademicSystemShape(db);
const activeNames = shape.activeClasses.map((row) => row.name);
const legacyNames = shape.legacyClasses.map((row) => row.name);

assert.deepEqual(activeNames.slice(0, 3), ["Crèche", "Nursery", "Reception"]);
assert.ok(activeNames.includes("Basic 1"));
assert.ok(activeNames.includes("JSS1"));
assert.ok(activeNames.includes("SS3"));
assert.equal(activeNames.includes("Nursery 1"), false);
assert.equal(activeNames.includes("Nursery 2"), false);
assert.equal(activeNames.includes("Kindergarten"), false);
assert.equal(activeNames.includes("Playgroup"), false);

assert.ok(legacyNames.includes("Nursery 1"));
assert.ok(legacyNames.includes("Nursery 2"));
assert.ok(legacyNames.includes("Kindergarten"));
assert.ok(legacyNames.includes("Playgroup"));

assert.equal(getLegacyClassMapping("Nursery 1").targetClassName, "Nursery");
assert.equal(getLegacyClassMapping("Nursery 2").targetClassName, "Nursery");
assert.equal(getLegacyClassMapping("Kindergarten").mappingMode, "ADMIN_REVIEW");
assert.equal(getApprovedClassConfig("Nursery 1"), null);
assert.equal(getApprovedClassConfig("Kindergarten"), null);

for (const name of ["Crèche", "Nursery", "Reception"]) {
  assert.equal(isEarlyYearsClass(name), true);
  assert.equal(supportsEYFSAssessment(name), true);
  assert.equal(supportsNigerianCA(name), false);
  assert.equal(getReportFramework(name), REPORT_FRAMEWORKS.EYFS_REPORT);
  assert.equal(getClassCapabilitySummary(name).academicSystem, ACADEMIC_SYSTEMS.BRITISH_EYFS.code);
}

for (const name of ["Basic 1", "Basic 6", "JSS1", "JSS3", "SS1", "SS3"]) {
  assert.equal(isEarlyYearsClass(name), false);
  assert.equal(supportsEYFSAssessment(name), false);
  assert.equal(supportsNigerianCA(name), true);
  assert.equal(getReportFramework(name), REPORT_FRAMEWORKS.NIGERIAN_REPORT);
  assert.equal(getClassCapabilitySummary(name).assessmentFramework, ASSESSMENT_FRAMEWORKS.NIGERIAN_CA);
}

assert.equal(supportsPhonicsTracking("Crèche"), false);
assert.equal(supportsPhonicsTracking("Nursery"), false);
assert.equal(supportsPhonicsTracking("Reception"), true);
assert.equal(supportsReceptionTransition("Reception"), true);

assert.equal(EYFS_AREAS.length, 7);
assert.deepEqual(AMES_EYFS_DIMENSIONS, [
  "Practical Life",
  "Montessori-Informed Practice",
  "Christian Character",
  "Nigerian / African Context",
  "Outdoor Learning",
  "Continuous Provision",
  "SEND / Access Adjustments",
  "Parent / Home Connection",
]);
assert.deepEqual(EYFS_ASSESSMENT_DESCRIPTORS, ["EMERGING", "DEVELOPING", "SECURE"]);
assert.equal(db.eyfsDevelopmentalProgressions.find((row) => row.classId === "creche").stages.join(">"), "EXPERIENCE>RESPOND>EXPLORE>NAME");
assert.equal(db.eyfsDevelopmentalProgressions.find((row) => row.classId === "nursery").stages.join(">"), "EXPLORE>NAME>DESCRIBE>PRACTISE");
assert.equal(db.eyfsDevelopmentalProgressions.find((row) => row.classId === "reception").stages.join(">"), "UNDERSTAND>PRACTISE>APPLY>EXPLAIN");

assert.ok(getTeacherToolsetForClass("Crèche").includes("EYFS Assessment"));
assert.equal(getTeacherToolsetForClass("Nursery").includes("Phonics & Reading"), false);
assert.ok(getTeacherToolsetForClass("Nursery").includes("Phonological Awareness"));
assert.ok(getTeacherToolsetForClass("Reception").includes("Phonics & Reading"));
assert.ok(getTeacherToolsetForClass("Reception").includes("Transition to Basic 1"));
assert.ok(getTeacherToolsetForClass("Basic 1").includes("Continuous Assessment"));
assert.equal(getTeacherToolsetForClass("Basic 1").includes("EYFS Observations"), false);

console.log("Academic systems smoke test passed.");
