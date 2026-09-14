const { nanoid } = require("nanoid");

const ACADEMIC_SYSTEMS = {
  BRITISH_EYFS: {
    code: "BRITISH_EYFS",
    name: "Early Years / British EYFS",
    description: "British EYFS framework, Montessori-informed, Nigerian context, Christian character.",
    curriculumFramework: "AMES_EYFS",
    assessmentFramework: "EYFS_AMES",
    reportFramework: "EYFS_REPORT",
  },
  NIGERIAN_AMES: {
    code: "NIGERIAN_AMES",
    name: "Main School / Nigerian",
    description: "Angel Montessori Nigerian academic programme for Basic, Junior Secondary, and Senior Secondary.",
    curriculumFramework: "AMES_NIGERIAN",
    assessmentFramework: "NIGERIAN_CA",
    reportFramework: "NIGERIAN_REPORT",
  },
};

const CURRICULUM_FRAMEWORKS = {
  AMES_EYFS: "AMES_EYFS",
  AMES_NIGERIAN: "AMES_NIGERIAN",
};

const ASSESSMENT_FRAMEWORKS = {
  EYFS_AMES: "EYFS_AMES",
  NIGERIAN_CA: "NIGERIAN_CA",
};

const REPORT_FRAMEWORKS = {
  EYFS_REPORT: "EYFS_REPORT",
  NIGERIAN_REPORT: "NIGERIAN_REPORT",
};

const CLASS_LEVELS = {
  EARLY_YEARS: "EARLY_YEARS",
  PRIMARY: "PRIMARY",
  JUNIOR_SECONDARY: "JUNIOR_SECONDARY",
  SENIOR_SECONDARY: "SENIOR_SECONDARY",
};

const EYFS_AREAS = [
  "Communication and Language",
  "Personal, Social and Emotional Development",
  "Physical Development",
  "Literacy",
  "Mathematics",
  "Understanding the World",
  "Expressive Arts and Design",
];

const AMES_EYFS_DIMENSIONS = [
  "Practical Life",
  "Montessori-Informed Practice",
  "Christian Character",
  "Nigerian / African Context",
  "Outdoor Learning",
  "Continuous Provision",
  "SEND / Access Adjustments",
  "Parent / Home Connection",
];

const EYFS_ASSESSMENT_DESCRIPTORS = [
  "EMERGING",
  "DEVELOPING",
  "SECURE",
];

const EYFS_DEVELOPMENTAL_PROGRESSIONS = [
  {
    classId: "creche",
    className: "Crèche",
    progressionName: "Crèche Developmental Progression",
    stages: ["EXPERIENCE", "RESPOND", "EXPLORE", "NAME"],
  },
  {
    classId: "nursery",
    className: "Nursery",
    progressionName: "Nursery Developmental Progression",
    stages: ["EXPLORE", "NAME", "DESCRIBE", "PRACTISE"],
  },
  {
    classId: "reception",
    className: "Reception",
    progressionName: "Reception Developmental Progression",
    stages: ["UNDERSTAND", "PRACTISE", "APPLY", "EXPLAIN"],
  },
  {
    classId: "basic-1-transition",
    className: "Transition to Basic 1",
    progressionName: "Transition to Basic 1 Readiness",
    stages: ["SECURE", "APPLY", "EXPLAIN", "REASON"],
  },
  {
    classId: "curriculum-principle",
    className: "AMES Curriculum Principle",
    progressionName: "Revisit, Deepen, Apply",
    stages: ["REVISIT", "DEEPEN", "APPLY"],
  },
];

const AMES_TEACHING_CYCLES = [
  {
    cycleName: "AMES Teaching and Assessment Cycle",
    stages: ["KNOW", "PLAN", "TEACH", "OBSERVE", "INTERPRET", "RESPOND", "REVIEW"],
  },
  {
    cycleName: "Focused Observation Cycle",
    stages: ["OBSERVE", "UNDERSTAND", "PLAN", "RESPOND"],
  },
];

const EARLY_YEARS_CLASS_CONFIGS = [
  {
    id: "creche",
    name: "Crèche",
    aliases: ["Creche", "Crèche"],
    section: "Early Years",
    level: CLASS_LEVELS.EARLY_YEARS,
    displayOrder: 1,
    academicSystem: ACADEMIC_SYSTEMS.BRITISH_EYFS.code,
    curriculumFramework: CURRICULUM_FRAMEWORKS.AMES_EYFS,
    assessmentFramework: ASSESSMENT_FRAMEWORKS.EYFS_AMES,
  },
  {
    id: "nursery",
    name: "Nursery",
    aliases: ["Nursery"],
    section: "Early Years",
    level: CLASS_LEVELS.EARLY_YEARS,
    displayOrder: 2,
    academicSystem: ACADEMIC_SYSTEMS.BRITISH_EYFS.code,
    curriculumFramework: CURRICULUM_FRAMEWORKS.AMES_EYFS,
    assessmentFramework: ASSESSMENT_FRAMEWORKS.EYFS_AMES,
  },
  {
    id: "reception",
    name: "Reception",
    aliases: ["Reception"],
    section: "Early Years",
    level: CLASS_LEVELS.EARLY_YEARS,
    displayOrder: 3,
    academicSystem: ACADEMIC_SYSTEMS.BRITISH_EYFS.code,
    curriculumFramework: CURRICULUM_FRAMEWORKS.AMES_EYFS,
    assessmentFramework: ASSESSMENT_FRAMEWORKS.EYFS_AMES,
  },
];

const PRIMARY_CLASS_CONFIGS = Array.from({ length: 6 }, (_, index) => {
  const number = index + 1;
  return {
    id: `basic-${number}`,
    name: `Basic ${number}`,
    aliases: [`Basic ${number}`, `Primary ${number}`],
    section: "Primary",
    level: CLASS_LEVELS.PRIMARY,
    displayOrder: 10 + number,
    academicSystem: ACADEMIC_SYSTEMS.NIGERIAN_AMES.code,
    curriculumFramework: CURRICULUM_FRAMEWORKS.AMES_NIGERIAN,
    assessmentFramework: ASSESSMENT_FRAMEWORKS.NIGERIAN_CA,
  };
});

const JUNIOR_SECONDARY_CLASS_CONFIGS = Array.from({ length: 3 }, (_, index) => {
  const number = index + 1;
  return {
    id: `jss${number}`,
    name: `JSS${number}`,
    aliases: [`JSS${number}`, `JSS ${number}`, `Junior Secondary ${number}`],
    section: "Junior Secondary",
    level: CLASS_LEVELS.JUNIOR_SECONDARY,
    displayOrder: 20 + number,
    academicSystem: ACADEMIC_SYSTEMS.NIGERIAN_AMES.code,
    curriculumFramework: CURRICULUM_FRAMEWORKS.AMES_NIGERIAN,
    assessmentFramework: ASSESSMENT_FRAMEWORKS.NIGERIAN_CA,
  };
});

const SENIOR_SECONDARY_CLASS_CONFIGS = Array.from({ length: 3 }, (_, index) => {
  const number = index + 1;
  return {
    id: `ss${number}`,
    name: `SS${number}`,
    aliases: [`SS${number}`, `SS ${number}`, `SSS${number}`, `SSS ${number}`, `Senior Secondary ${number}`],
    section: "Senior Secondary",
    level: CLASS_LEVELS.SENIOR_SECONDARY,
    displayOrder: 30 + number,
    academicSystem: ACADEMIC_SYSTEMS.NIGERIAN_AMES.code,
    curriculumFramework: CURRICULUM_FRAMEWORKS.AMES_NIGERIAN,
    assessmentFramework: ASSESSMENT_FRAMEWORKS.NIGERIAN_CA,
  };
});

const ACTIVE_CLASS_CONFIGS = [
  ...EARLY_YEARS_CLASS_CONFIGS,
  ...PRIMARY_CLASS_CONFIGS,
  ...JUNIOR_SECONDARY_CLASS_CONFIGS,
  ...SENIOR_SECONDARY_CLASS_CONFIGS,
].map((item) => ({
  ...item,
  isActive: true,
  order: item.displayOrder,
}));

const LEGACY_CLASS_MAPPINGS = [
  {
    legacyName: "Nursery 1",
    targetClassId: "nursery",
    targetClassName: "Nursery",
    mappingMode: "SAFE_AUTO",
    note: "Historical Nursery 1 records are preserved; new current records should use Nursery.",
  },
  {
    legacyName: "Nursery 2",
    targetClassId: "nursery",
    targetClassName: "Nursery",
    mappingMode: "SAFE_AUTO",
    note: "Historical Nursery 2 records are preserved; new current records should use Nursery.",
  },
  {
    legacyName: "Kindergarten",
    targetClassId: "",
    targetClassName: "",
    mappingMode: "ADMIN_REVIEW",
    note: "Kindergarten must be reviewed by an admin before current records are moved.",
  },
  {
    legacyName: "KG",
    targetClassId: "",
    targetClassName: "",
    mappingMode: "ADMIN_REVIEW",
    note: "KG is treated as a Kindergarten legacy label and needs admin review before mapping.",
  },
  {
    legacyName: "Playgroup",
    targetClassId: "",
    targetClassName: "",
    mappingMode: "ADMIN_REVIEW",
    note: "Playgroup is historical/non-current and needs admin review before mapping.",
  },
];

function nowIso() {
  return new Date().toISOString();
}

function str(value) {
  return String(value || "").trim();
}

function normalizeAcademicKey(value) {
  return str(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function slugify(value) {
  return str(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "class";
}

const activeConfigById = new Map(ACTIVE_CLASS_CONFIGS.map((item) => [item.id, item]));
const activeConfigByKey = new Map();
for (const item of ACTIVE_CLASS_CONFIGS) {
  activeConfigByKey.set(normalizeAcademicKey(item.id), item);
  activeConfigByKey.set(normalizeAcademicKey(item.name), item);
  for (const alias of item.aliases || []) activeConfigByKey.set(normalizeAcademicKey(alias), item);
}

const legacyMappingByKey = new Map(LEGACY_CLASS_MAPPINGS.map((item) => [normalizeAcademicKey(item.legacyName), item]));

function classIdFromName(name) {
  const config = getApprovedClassConfig(name);
  return config?.id || slugify(name);
}

function getLegacyClassMapping(value) {
  return legacyMappingByKey.get(normalizeAcademicKey(value)) || null;
}

function getApprovedClassConfig(input) {
  const key = normalizeAcademicKey(typeof input === "object" && input ? input.id || input.classId || input.name || input.className : input);
  if (!key) return null;
  return activeConfigById.get(str(typeof input === "object" && input ? input.id || input.classId : "")) || activeConfigByKey.get(key) || null;
}

function inferAcademicSystemFromSection(section) {
  const key = normalizeAcademicKey(section);
  if (key.includes("early") || key.includes("nursery") || key.includes("preschool")) {
    return ACADEMIC_SYSTEMS.BRITISH_EYFS.code;
  }
  return ACADEMIC_SYSTEMS.NIGERIAN_AMES.code;
}

function enrichClassConfig(row = {}) {
  const sourceName = str(row.name || row.className);
  const sourceId = str(row.id || row.classId);
  const legacy = getLegacyClassMapping(sourceName) || getLegacyClassMapping(sourceId);
  const active = legacy ? null : getApprovedClassConfig(sourceId) || getApprovedClassConfig(sourceName);
  const now = nowIso();

  if (active) {
    return {
      ...row,
      id: active.id,
      name: active.name,
      className: row.className || active.name,
      section: active.section,
      level: active.level,
      academicSystem: active.academicSystem,
      curriculumFramework: active.curriculumFramework,
      assessmentFramework: active.assessmentFramework,
      isActive: row.isActive === undefined ? true : Boolean(row.isActive),
      order: Number(row.order ?? row.displayOrder ?? active.displayOrder),
      displayOrder: Number(row.displayOrder ?? row.order ?? active.displayOrder),
      createdAt: str(row.createdAt) || now,
      updatedAt: str(row.updatedAt) || now,
    };
  }

  const academicSystem = str(row.academicSystem) || inferAcademicSystemFromSection(row.section);
  return {
    ...row,
    id: sourceId || slugify(sourceName),
    name: sourceName,
    className: row.className || sourceName,
    section: str(row.section) || "Other",
    level: str(row.level) || "LEGACY",
    academicSystem,
    curriculumFramework: str(row.curriculumFramework) || (academicSystem === ACADEMIC_SYSTEMS.BRITISH_EYFS.code ? CURRICULUM_FRAMEWORKS.AMES_EYFS : CURRICULUM_FRAMEWORKS.AMES_NIGERIAN),
    assessmentFramework: str(row.assessmentFramework) || (academicSystem === ACADEMIC_SYSTEMS.BRITISH_EYFS.code ? ASSESSMENT_FRAMEWORKS.EYFS_AMES : ASSESSMENT_FRAMEWORKS.NIGERIAN_CA),
    isActive: legacy ? false : row.isActive === undefined ? false : Boolean(row.isActive),
    legacyStatus: legacy ? (legacy.mappingMode === "SAFE_AUTO" ? "mapped_to_active" : "requires_admin_review") : str(row.legacyStatus || "historical"),
    legacyTargetClassId: legacy?.targetClassId || str(row.legacyTargetClassId),
    legacyTargetClassName: legacy?.targetClassName || str(row.legacyTargetClassName),
    legacyMappingMode: legacy?.mappingMode || str(row.legacyMappingMode),
    legacyNote: legacy?.note || str(row.legacyNote),
    order: Number(row.order ?? row.displayOrder ?? 999),
    displayOrder: Number(row.displayOrder ?? row.order ?? 999),
    createdAt: str(row.createdAt) || now,
    updatedAt: str(row.updatedAt) || now,
  };
}

function sortAcademicClasses(classes = []) {
  return [...classes].sort((a, b) => {
    const orderA = Number(a.displayOrder ?? a.order ?? 999);
    const orderB = Number(b.displayOrder ?? b.order ?? 999);
    if (orderA !== orderB) return orderA - orderB;
    return str(a.name || a.className).localeCompare(str(b.name || b.className));
  });
}

function getActiveClassConfigs() {
  return ACTIVE_CLASS_CONFIGS.map((item) => ({ ...item }));
}

function ensureSeedRows(db) {
  if (!Array.isArray(db.eyfsCurriculumAreas)) db.eyfsCurriculumAreas = [];
  if (!Array.isArray(db.amesCurriculumDimensions)) db.amesCurriculumDimensions = [];
  if (!Array.isArray(db.eyfsDevelopmentalProgressions)) db.eyfsDevelopmentalProgressions = [];
  if (!Array.isArray(db.eyfsAssessmentDescriptors)) db.eyfsAssessmentDescriptors = [];
  if (!Array.isArray(db.amesTeachingCycles)) db.amesTeachingCycles = [];

  const seedTextRows = (collection, rows, field) => {
    const existing = new Set(db[collection].map((item) => normalizeAcademicKey(item[field] || item.name)));
    rows.forEach((name, index) => {
      if (existing.has(normalizeAcademicKey(name))) return;
      db[collection].push({
        id: `${collection}-${slugify(name)}`,
        [field]: name,
        displayOrder: index + 1,
        isActive: true,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    });
  };

  seedTextRows("eyfsCurriculumAreas", EYFS_AREAS, "areaName");
  seedTextRows("amesCurriculumDimensions", AMES_EYFS_DIMENSIONS, "dimensionName");
  seedTextRows("eyfsAssessmentDescriptors", EYFS_ASSESSMENT_DESCRIPTORS, "descriptorName");

  const descriptorKeys = new Set(EYFS_ASSESSMENT_DESCRIPTORS.map((item) => normalizeAcademicKey(item)));
  db.eyfsDevelopmentalProgressions = db.eyfsDevelopmentalProgressions.map((row) => {
    const key = normalizeAcademicKey(row.progressionName || row.name);
    if (!descriptorKeys.has(key) || Array.isArray(row.stages)) return row;
    return {
      ...row,
      isActive: false,
      legacyStatus: "moved_to_descriptor_reference",
      updatedAt: nowIso(),
    };
  });

  const progressionKeys = new Set(db.eyfsDevelopmentalProgressions.map((item) => normalizeAcademicKey(item.progressionName || item.className)));
  EYFS_DEVELOPMENTAL_PROGRESSIONS.forEach((row, index) => {
    if (progressionKeys.has(normalizeAcademicKey(row.progressionName))) return;
    db.eyfsDevelopmentalProgressions.push({
      id: `eyfs-progression-${slugify(row.classId)}`,
      classId: row.classId,
      className: row.className,
      progressionName: row.progressionName,
      stages: row.stages,
      displayOrder: index + 1,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  });

  const cycleKeys = new Set(db.amesTeachingCycles.map((item) => normalizeAcademicKey(item.cycleName)));
  AMES_TEACHING_CYCLES.forEach((row, index) => {
    if (cycleKeys.has(normalizeAcademicKey(row.cycleName))) return;
    db.amesTeachingCycles.push({
      id: `ames-cycle-${slugify(row.cycleName)}`,
      cycleName: row.cycleName,
      stages: row.stages,
      displayOrder: index + 1,
      isActive: true,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
  });
}

function ensureAcademicSystemShape(db) {
  if (!Array.isArray(db.classes)) db.classes = [];
  if (!Array.isArray(db.academicSystemAuditLogs)) db.academicSystemAuditLogs = [];
  if (!Array.isArray(db.academicClassMigrationPlans)) db.academicClassMigrationPlans = [];
  if (!Array.isArray(db.eyfsObservations)) db.eyfsObservations = [];
  if (!Array.isArray(db.receptionPhonicsRecords)) db.receptionPhonicsRecords = [];
  if (!Array.isArray(db.receptionEyfsReferences)) db.receptionEyfsReferences = [];

  const byId = new Map();
  const byName = new Map();

  const addOrMerge = (row) => {
    const enriched = enrichClassConfig(row);
    if (!enriched.id || !enriched.name) return;
    const existing = byId.get(enriched.id) || byName.get(normalizeAcademicKey(enriched.name));
    if (existing) {
      Object.assign(existing, {
        ...existing,
        ...enriched,
        teacherId: str(existing.teacherId || enriched.teacherId),
        classTeacherId: str(existing.classTeacherId || enriched.classTeacherId),
        createdAt: str(existing.createdAt || enriched.createdAt) || nowIso(),
        updatedAt: nowIso(),
      });
      byId.set(existing.id, existing);
      byName.set(normalizeAcademicKey(existing.name), existing);
      return;
    }
    byId.set(enriched.id, enriched);
    byName.set(normalizeAcademicKey(enriched.name), enriched);
  };

  db.classes.forEach(addOrMerge);
  ACTIVE_CLASS_CONFIGS.forEach(addOrMerge);
  LEGACY_CLASS_MAPPINGS.forEach((mapping, index) => {
    const exists = byName.get(normalizeAcademicKey(mapping.legacyName));
    if (exists) return;
    addOrMerge({
      id: slugify(mapping.legacyName),
      name: mapping.legacyName,
      section: "Early Years",
      order: 900 + index,
      isActive: false,
    });
  });

  db.classes = sortAcademicClasses(Array.from(byId.values()));
  ensureSeedRows(db);

  return {
    academicSystems: ACADEMIC_SYSTEMS,
    classes: db.classes,
    activeClasses: db.classes.filter((item) => item.isActive !== false),
    legacyClasses: db.classes.filter((item) => item.isActive === false),
  };
}

function appendAcademicAuditLog(db, actor = {}, action = "", details = {}) {
  if (!Array.isArray(db.academicSystemAuditLogs)) db.academicSystemAuditLogs = [];
  db.academicSystemAuditLogs.unshift({
    id: `acad-audit-${nanoid(10)}`,
    action: str(action),
    actorId: str(actor.id),
    actorName: str(actor.name || actor.username),
    actorRole: str(actor.role),
    details,
    createdAt: nowIso(),
  });
}

function isEarlyYearsClass(input) {
  const cfg = getApprovedClassConfig(input);
  if (cfg) return cfg.academicSystem === ACADEMIC_SYSTEMS.BRITISH_EYFS.code;
  return inferAcademicSystemFromSection(input?.section || input?.className || input?.name || input) === ACADEMIC_SYSTEMS.BRITISH_EYFS.code;
}

function supportsNigerianCA(input) {
  const cfg = getApprovedClassConfig(input);
  if (cfg) return cfg.assessmentFramework === ASSESSMENT_FRAMEWORKS.NIGERIAN_CA;
  return !isEarlyYearsClass(input);
}

function supportsEYFSAssessment(input) {
  return isEarlyYearsClass(input);
}

function isNigerianSystemClass(input) {
  return supportsNigerianCA(input);
}

function supportsPhonicsTracking(input) {
  const cfg = getApprovedClassConfig(input);
  return normalizeAcademicKey(cfg?.name || input?.name || input) === "reception";
}

function supportsReceptionTransition(input) {
  return supportsPhonicsTracking(input);
}

function getReportFramework(input) {
  return isEarlyYearsClass(input) ? REPORT_FRAMEWORKS.EYFS_REPORT : REPORT_FRAMEWORKS.NIGERIAN_REPORT;
}

function getClassCapabilitySummary(input) {
  const cfg = getApprovedClassConfig(input) || enrichClassConfig(input || {});
  const earlyYears = isEarlyYearsClass(cfg);
  return {
    classId: cfg.id,
    className: cfg.name,
    academicSystem: earlyYears ? ACADEMIC_SYSTEMS.BRITISH_EYFS.code : ACADEMIC_SYSTEMS.NIGERIAN_AMES.code,
    curriculumFramework: earlyYears ? CURRICULUM_FRAMEWORKS.AMES_EYFS : CURRICULUM_FRAMEWORKS.AMES_NIGERIAN,
    assessmentFramework: earlyYears ? ASSESSMENT_FRAMEWORKS.EYFS_AMES : ASSESSMENT_FRAMEWORKS.NIGERIAN_CA,
    reportFramework: getReportFramework(cfg),
    supportsNigerianCA: supportsNigerianCA(cfg),
    supportsEYFSAssessment: earlyYears,
    supportsObservationAssessment: earlyYears,
    supportsContinuousProvision: earlyYears,
    supportsPracticalLife: earlyYears,
    supportsPhonicsTracking: supportsPhonicsTracking(cfg),
    supportsELGReference: supportsPhonicsTracking(cfg),
    supportsReceptionTransition: supportsReceptionTransition(cfg),
    supportsSubjectAssessment: !earlyYears,
    supportsExaminationScores: !earlyYears,
  };
}

function getTeacherToolsetForClass(input) {
  const caps = getClassCapabilitySummary(input);
  if (caps.supportsEYFSAssessment) {
    const key = normalizeAcademicKey(caps.className);
    const common = [
      "Curriculum",
      "Weekly Planning",
      "EYFS Observations",
      "EYFS Assessment",
      "Continuous Provision",
      "Practical Life",
      "SEND / Access",
      "Parent Partnership",
      "Attendance",
      "Reports",
    ];
    if (key === "nursery") {
      return [
        ...common,
        "Literacy Foundations",
        "Phonological Awareness",
      ];
    }
    if (key === "reception") {
      return [
        ...common,
        "Phonics & Reading",
        "Writing",
        "Mathematics",
        "Transition to Basic 1",
      ];
    }
    return [
      ...common,
      "Communication",
      "Relationships",
      "Self-Care",
      "Parent Communication",
    ];
  }
  return [
    "Continuous Assessment",
    "Lesson Notes",
    "Scheme of Work",
    "Homework",
    "Broadsheet",
    "CBT",
  ];
}

module.exports = {
  ACADEMIC_SYSTEMS,
  CURRICULUM_FRAMEWORKS,
  ASSESSMENT_FRAMEWORKS,
  REPORT_FRAMEWORKS,
  CLASS_LEVELS,
  EYFS_AREAS,
  AMES_EYFS_DIMENSIONS,
  EYFS_ASSESSMENT_DESCRIPTORS,
  EYFS_DEVELOPMENTAL_PROGRESSIONS,
  AMES_TEACHING_CYCLES,
  ACTIVE_CLASS_CONFIGS,
  LEGACY_CLASS_MAPPINGS,
  normalizeAcademicKey,
  classIdFromName,
  getActiveClassConfigs,
  getApprovedClassConfig,
  getLegacyClassMapping,
  enrichClassConfig,
  sortAcademicClasses,
  ensureAcademicSystemShape,
  appendAcademicAuditLog,
  isEarlyYearsClass,
  isNigerianSystemClass,
  supportsNigerianCA,
  supportsEYFSAssessment,
  supportsPhonicsTracking,
  supportsReceptionTransition,
  getReportFramework,
  getClassCapabilitySummary,
  getTeacherToolsetForClass,
};
