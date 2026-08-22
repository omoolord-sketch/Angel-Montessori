const express = require("express");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");

const router = express.Router();

const LIBRARY_STRUCTURE = [
  {
    section: "Early Years Library",
    subcategories: ["Creche", "Nursery 1", "Nursery 2", "Reception"],
  },
  {
    section: "Basic School Library",
    subcategories: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"],
  },
  {
    section: "Junior Secondary Library",
    subcategories: ["JSS1", "JSS2", "JSS3"],
  },
  {
    section: "Senior Secondary Library",
    subcategories: ["SS1", "SS2", "SS3"],
  },
  { section: "Video Learning", subcategories: [] },
  { section: "Digital Books", subcategories: [] },
  { section: "Past Questions", subcategories: [] },
  { section: "Teacher Resources", subcategories: [] },
  { section: "Research & Reference", subcategories: [] },
];

const DEFAULT_RESOURCES = [
  {
    title: "NERDC e-Curriculum Library",
    section: "Teacher Resources",
    subcategory: "",
    type: "Curriculum",
    description:
      "Official Nigerian curriculum, learning guides, and approved materials for Basic 1 to SS3.",
    url: "https://nerdc.gov.ng",
  },
  {
    title: "Open Library",
    section: "Digital Books",
    subcategory: "",
    type: "Ebook",
    description:
      "Large online library with children's books, science texts, literature, dictionaries, and history resources.",
    url: "https://openlibrary.org",
  },
  {
    title: "Project Gutenberg",
    section: "Digital Books",
    subcategory: "",
    type: "Ebook",
    description:
      "Free public-domain classics and educational texts useful for literature and language development.",
    url: "https://www.gutenberg.org",
  },
  {
    title: "World Digital Library Collection",
    section: "Research & Reference",
    subcategory: "",
    type: "Reference",
    description:
      "Historical maps, documents, and cultural references for geography and history learning.",
    url: "https://www.loc.gov/collections/world-digital-library/about-this-collection/",
  },
  {
    title: "British Council Digital Library",
    section: "Digital Books",
    subcategory: "",
    type: "Ebook",
    description:
      "English-language ebooks, audiobooks, magazines, and reading-development materials.",
    url: "https://library.britishcouncil.org/digital-library",
  },
  {
    title: "Afrilearn",
    section: "Video Learning",
    subcategory: "",
    type: "Video",
    description:
      "Nigerian curriculum-aligned video lessons, class notes, quizzes, and exam preparation support.",
    url: "https://www.myafrilearn.com",
  },
  {
    title: "uLesson",
    section: "Video Learning",
    subcategory: "",
    type: "Video",
    description:
      "Animated K-12 lessons and practice exercises for mathematics, sciences, and exam preparation.",
    url: "https://ulesson.com",
  },
  {
    title: "National Library of Nigeria",
    section: "Research & Reference",
    subcategory: "",
    type: "Reference",
    description:
      "Academic and cultural repository for research projects, history, and social sciences.",
    url: "https://nationallibrary.gov.ng",
  },
  {
    title: "Early Years Picture & Phonics Starter Pack",
    section: "Early Years Library",
    subcategory: "Reception",
    type: "Ebook",
    description:
      "Picture books, alphabet stories, phonics readers, and rhyme content for early learners.",
    url: "",
  },
  {
    title: "Basic Science Interactive Learning Videos",
    section: "Basic School Library",
    subcategory: "Basic 6",
    type: "Video",
    description:
      "Interactive science and technology concepts for upper basic pupils.",
    url: "",
  },
  {
    title: "BECE Practice Questions Bank",
    section: "Past Questions",
    subcategory: "",
    type: "Past Question",
    description:
      "Practice items for JSS students preparing for Basic Education Certificate Examination.",
    url: "",
  },
  {
    title: "Senior Secondary WAEC/NECO Revision Set",
    section: "Past Questions",
    subcategory: "",
    type: "Past Question",
    description:
      "Exam-focused question bank for SS1 to SS3 across science, commercial, and arts streams.",
    url: "",
  },
];

function normalizeResource(item) {
  const title = String(item?.title || item?.name || "").trim();
  if (!title) return null;

  return {
    id: String(item?.id || nanoid()),
    title,
    section: String(item?.section || "Digital Books").trim() || "Digital Books",
    subcategory: String(item?.subcategory || "").trim(),
    type: String(item?.type || "Ebook").trim() || "Ebook",
    description: String(item?.description || "").trim(),
    url: String(item?.url || "").trim(),
    createdAt: String(item?.createdAt || new Date().toISOString()),
  };
}

function isValidSection(section) {
  return LIBRARY_STRUCTURE.some((item) => item.section === section);
}

function getSection(section) {
  return LIBRARY_STRUCTURE.find((item) => item.section === section) || null;
}

function ensureStructuredResources(db) {
  const current = Array.isArray(db.books) ? db.books : [];
  const normalized = current.map(normalizeResource).filter(Boolean);

  const seen = new Set(
    normalized.map((item) => `${item.section}__${item.subcategory}__${item.title}`.toLowerCase())
  );

  let changed = normalized.length !== current.length;

  for (const def of DEFAULT_RESOURCES) {
    const resource = normalizeResource(def);
    const key = `${resource.section}__${resource.subcategory}__${resource.title}`.toLowerCase();
    if (seen.has(key)) continue;
    normalized.push(resource);
    seen.add(key);
    changed = true;
  }

  if (changed) {
    db.books = normalized;
    writeDB(db);
  }

  return normalized;
}

router.get("/", auth(), requireRole("ADMIN", "TEACHER", "STUDENT", "APPLICANT"), (req, res) => {
  const db = readDB();
  const resources = ensureStructuredResources(db)
    .slice()
    .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")));

  res.json({
    structure: LIBRARY_STRUCTURE,
    resources,
  });
});

router.post("/", auth(), requireRole("ADMIN"), (req, res) => {
  const { title, name, section, subcategory, type, description, url } = req.body || {};
  const safeTitle = String(title || name || "").trim();
  const safeSection = String(section || "").trim();
  const safeSubcategory = String(subcategory || "").trim();

  if (!safeTitle) return res.status(400).json({ message: "title is required" });
  if (!safeSection) return res.status(400).json({ message: "section is required" });
  if (!isValidSection(safeSection)) return res.status(400).json({ message: "Invalid library section" });

  const sectionDef = getSection(safeSection);
  if (sectionDef?.subcategories?.length > 0 && safeSubcategory && !sectionDef.subcategories.includes(safeSubcategory)) {
    return res.status(400).json({ message: "Invalid class/subcategory for selected section" });
  }

  if (sectionDef?.subcategories?.length === 0 && safeSubcategory) {
    return res.status(400).json({ message: "Selected section does not accept class/subcategory" });
  }

  const db = readDB();
  const resources = ensureStructuredResources(db);

  const duplicate = resources.some(
    (item) =>
      String(item.title).toLowerCase() === safeTitle.toLowerCase() &&
      String(item.section).toLowerCase() === safeSection.toLowerCase() &&
      String(item.subcategory).toLowerCase() === safeSubcategory.toLowerCase()
  );

  if (duplicate) {
    return res.status(409).json({ message: "Resource already exists in this section" });
  }

  const resource = normalizeResource({
    id: nanoid(),
    title: safeTitle,
    section: safeSection,
    subcategory: safeSubcategory,
    type: String(type || "Ebook").trim() || "Ebook",
    description: String(description || "").trim(),
    url: String(url || "").trim(),
    createdAt: new Date().toISOString(),
  });

  db.books = [resource, ...resources];
  writeDB(db);
  res.status(201).json(resource);
});

module.exports = router;
