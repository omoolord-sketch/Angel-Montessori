const CLASS_SUBJECTS = {
  "Creche": [
    "Sensory Play",
    "Music & Rhymes",
    "Movement & Motor Skills",
    "Social Interaction",
    "Early Language Development",
    "Visual Stimulation",
    "Health & Hygiene Habits"
  ],
  "Nursery 1": [
    "English Language (Oral)",
    "Number Work",
    "Rhymes & Songs",
    "Colour & Shape Recognition",
    "Social Habits",
    "Creative Activities",
    "Health Habits",
    "Storytelling",
    "Physical Play"
  ],
  "Nursery 2": [
    "English Language",
    "Number Work",
    "Phonics",
    "Rhymes",
    "Writing Readiness",
    "Social Habits",
    "Creative Arts",
    "Health Habits",
    "Physical Education",
    "Moral Instruction"
  ],
  "Reception": [
    "English Language",
    "Phonics",
    "Mathematics",
    "Basic Science",
    "Social Studies",
    "Creative Arts",
    "Handwriting",
    "Computer Awareness",
    "Physical & Health Education",
    "Religious Studies"
  ],
  "Basic 1": [
    "English Language",
    "Mathematics",
    "Basic Science & Technology",
    "National Values",
    "Cultural & Creative Arts",
    "Religious Studies",
    "Computer Studies",
    "Physical & Health Education",
    "Nigerian Language"
  ],
  "Basic 2": [
    "English Language",
    "Mathematics",
    "Basic Science & Technology",
    "National Values",
    "Cultural & Creative Arts",
    "Religious Studies",
    "Computer Studies",
    "Physical & Health Education",
    "Nigerian Language"
  ],
  "Basic 3": [
    "English Language",
    "Mathematics",
    "Basic Science & Technology",
    "National Values",
    "Cultural & Creative Arts",
    "Religious Studies",
    "Computer Studies",
    "Physical & Health Education",
    "Nigerian Language"
  ],
  "Basic 4": [
    "English Language",
    "Mathematics",
    "Basic Science & Technology",
    "National Values",
    "Cultural & Creative Arts",
    "Religious Studies",
    "Computer Studies",
    "Physical & Health Education",
    "French",
    "Nigerian Language"
  ],
  "Basic 5": [
    "English Language",
    "Mathematics",
    "Basic Science & Technology",
    "National Values",
    "Cultural & Creative Arts",
    "Religious Studies",
    "Computer Studies",
    "Physical & Health Education",
    "French",
    "Nigerian Language"
  ],
  "Basic 6": [
    "English Language",
    "Mathematics",
    "Basic Science & Technology",
    "National Values",
    "Cultural & Creative Arts",
    "Religious Studies",
    "Computer Studies",
    "Physical & Health Education",
    "French",
    "Nigerian Language"
  ],
  "JSS1": [
    "English Language",
    "Mathematics",
    "Basic Science",
    "Basic Technology",
    "Social Studies",
    "Civic Education",
    "Cultural & Creative Arts",
    "Computer Studies",
    "Agricultural Science",
    "Business Studies",
    "Physical & Health Education",
    "Nigerian Language",
    "French",
    "Religious Studies"
  ],
  "JSS2": [
    "English Language",
    "Mathematics",
    "Basic Science",
    "Basic Technology",
    "Social Studies",
    "Civic Education",
    "Cultural & Creative Arts",
    "Computer Studies",
    "Agricultural Science",
    "Business Studies",
    "Physical & Health Education",
    "Nigerian Language",
    "French",
    "Religious Studies"
  ],
  "JSS3": [
    "English Language",
    "Mathematics",
    "Basic Science",
    "Basic Technology",
    "Social Studies",
    "Civic Education",
    "Cultural & Creative Arts",
    "Computer Studies",
    "Agricultural Science",
    "Business Studies",
    "Physical & Health Education",
    "Nigerian Language",
    "French",
    "Religious Studies"
  ],
  "SSS1": [
    "English Language",
    "Mathematics",
    "Civic Education",
    "Trade / Entrepreneurship Subject",
    "Physics",
    "Chemistry",
    "Biology",
    "Further Mathematics",
    "Agricultural Science",
    "Computer Studies",
    "Technical Drawing",
    "Economics",
    "Commerce",
    "Financial Accounting",
    "Business Studies",
    "Government",
    "Marketing",
    "Literature in English",
    "History",
    "Geography",
    "Christian Religious Studies / Islamic Studies",
    "Fine Arts",
    "Music"
  ],
  "SSS2": [
    "English Language",
    "Mathematics",
    "Civic Education",
    "Trade / Entrepreneurship Subject",
    "Physics",
    "Chemistry",
    "Biology",
    "Further Mathematics",
    "Agricultural Science",
    "Computer Studies",
    "Technical Drawing",
    "Economics",
    "Commerce",
    "Financial Accounting",
    "Business Studies",
    "Government",
    "Marketing",
    "Literature in English",
    "History",
    "Geography",
    "Christian Religious Studies / Islamic Studies",
    "Fine Arts",
    "Music"
  ],
  "SSS3": [
    "English Language",
    "Mathematics",
    "Civic Education",
    "Trade / Entrepreneurship Subject",
    "Physics",
    "Chemistry",
    "Biology",
    "Further Mathematics",
    "Agricultural Science",
    "Computer Studies",
    "Technical Drawing",
    "Economics",
    "Commerce",
    "Financial Accounting",
    "Business Studies",
    "Government",
    "Marketing",
    "Literature in English",
    "History",
    "Geography",
    "Christian Religious Studies / Islamic Studies",
    "Fine Arts",
    "Music"
  ]
};

function normalizeKey(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const SUBJECT_OPTIONS = Array.from(
  new Set(Object.values(CLASS_SUBJECTS).flat())
);

const SUBJECT_ALIAS_MAP = new Map(
  SUBJECT_OPTIONS.map((subject) => [normalizeKey(subject), subject])
);

[
  ["english", "English Language"],
  ["math", "Mathematics"],
  ["science", "Basic Science"],
  ["accounting", "Financial Accounting"],
  ["literature", "Literature in English"],
  ["physicalandhealtheducation", "Physical & Health Education"],
  ["englishlanguageoral", "English Language (Oral)"],
  ["englishoral", "English Language (Oral)"],
  ["musicandrhymes", "Music & Rhymes"],
  ["movementandmotorskills", "Movement & Motor Skills"],
  ["healthandhygienehabits", "Health & Hygiene Habits"],
  ["rhymesandsongs", "Rhymes & Songs"],
  ["colourandshaperecognition", "Colour & Shape Recognition"],
  ["basicscienceandtechnology", "Basic Science & Technology"],
  ["culturalandcreativearts", "Cultural & Creative Arts"],
  ["physicalandhealtheducation", "Physical & Health Education"],
  ["religiousstudiescrsirs", "Religious Studies"],
  ["nigerianlanguageyorubaigbohausa", "Nigerian Language"],
  ["christianreligiousstudiesislamicstudies", "Christian Religious Studies / Islamic Studies"],
  ["crs", "Religious Studies"],
  ["irs", "Religious Studies"],
  ["phe", "Physical & Health Education"]
].forEach(([alias, canonical]) => {
  SUBJECT_ALIAS_MAP.set(alias, canonical);
});

const CLASS_ALIAS_MAP = new Map([
  [normalizeKey("Creche"), "Creche"],
  [normalizeKey("Nursery 1"), "Nursery 1"],
  [normalizeKey("Nursery 2"), "Nursery 2"],
  [normalizeKey("Reception"), "Reception"],
  [normalizeKey("Basic 1"), "Basic 1"],
  [normalizeKey("Basic 2"), "Basic 2"],
  [normalizeKey("Basic 3"), "Basic 3"],
  [normalizeKey("Basic 4"), "Basic 4"],
  [normalizeKey("Basic 5"), "Basic 5"],
  [normalizeKey("Basic 6"), "Basic 6"],
  [normalizeKey("JSS1"), "JSS1"],
  [normalizeKey("JSS2"), "JSS2"],
  [normalizeKey("JSS3"), "JSS3"],
  [normalizeKey("SSS1"), "SSS1"],
  [normalizeKey("SSS2"), "SSS2"],
  [normalizeKey("SSS3"), "SSS3"],
  [normalizeKey("Playgroup"), "Nursery 1"],
  [normalizeKey("Pre-Nursery"), "Nursery 1"],
  [normalizeKey("Primary 1"), "Basic 1"],
  [normalizeKey("Primary 2"), "Basic 2"],
  [normalizeKey("Primary 3"), "Basic 3"],
  [normalizeKey("Primary 4"), "Basic 4"],
  [normalizeKey("Primary 5"), "Basic 5"],
  [normalizeKey("Primary 6"), "Basic 6"]
]);

function normalizeSubject(subject) {
  const key = normalizeKey(subject);
  if (!key) return null;
  return SUBJECT_ALIAS_MAP.get(key) || null;
}

function normalizeSubjectList(subjects) {
  const list = Array.isArray(subjects) ? subjects : [];
  const seen = new Set();
  const normalized = [];
  const invalid = [];

  for (const item of list) {
    const canonical = normalizeSubject(item);
    if (!canonical) {
      invalid.push(String(item));
      continue;
    }

    const key = canonical.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      normalized.push(canonical);
    }
  }

  return { subjects: normalized, invalid };
}

function resolveClassKey(className) {
  const key = normalizeKey(className);
  if (!key) return null;
  return CLASS_ALIAS_MAP.get(key) || null;
}

function getSubjectsForClassName(className) {
  const classKey = resolveClassKey(className);
  if (!classKey) return [];
  return CLASS_SUBJECTS[classKey] || [];
}

module.exports = {
  SUBJECT_OPTIONS,
  CLASS_SUBJECTS,
  normalizeSubject,
  normalizeSubjectList,
  getSubjectsForClassName,
};



