const express = require("express");
const { nanoid } = require("nanoid");
const { readDB, writeDB } = require("../lib/jsonStore");
const { auth, requireRole } = require("../middleware/auth");
const { storeUploadedFile } = require("../lib/fileStorage");

const router = express.Router();

const ALLOWED_PAGES = new Set(["leadership", "governance"]);
const FIXED_ROLE_TITLES = new Set(["headofschool", "deputyheadofschool"]);
const MANAGE_ROLES = ["SUPER_ADMIN"];

function nowIso() {
  return new Date().toISOString();
}

function safeString(value) {
  return String(value || "").trim();
}

function safeLower(value) {
  return safeString(value).toLowerCase();
}

function safeNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeRoleKey(value) {
  return safeLower(value).replace(/[^a-z0-9]+/g, "");
}

function ensureCollections(db) {
  if (!Array.isArray(db.siteRoleProfiles)) {
    db.siteRoleProfiles = [];
    return true;
  }
  return false;
}

function matchesPageFilter(record, page) {
  const filter = safeLower(page);
  if (!filter) return true;
  return safeLower(record?.page) === filter;
}

function normalizeRecord(record) {
  const row = record && typeof record === "object" ? record : {};
  return {
    id: safeString(row.id),
    page: safeLower(row.page),
    roleTitle: safeString(row.roleTitle),
    name: safeString(row.name),
    description: safeString(row.description),
    imagePath: safeString(row.imagePath),
    imageRelativePath: safeString(row.imageRelativePath),
    sortOrder: safeNumber(row.sortOrder, 0),
    isActive: row.isActive !== false,
    createdBy: safeString(row.createdBy),
    updatedBy: safeString(row.updatedBy),
    createdAt: safeString(row.createdAt),
    updatedAt: safeString(row.updatedAt),
  };
}

function sortRecords(records = []) {
  return [...records].sort((left, right) => {
    const pageOrder = safeLower(left.page).localeCompare(safeLower(right.page));
    if (pageOrder !== 0) return pageOrder;

    const sortDelta = safeNumber(left.sortOrder, 0) - safeNumber(right.sortOrder, 0);
    if (sortDelta !== 0) return sortDelta;

    return safeString(left.roleTitle).localeCompare(safeString(right.roleTitle));
  });
}

function assertValidPage(page) {
  const normalized = safeLower(page);
  if (!ALLOWED_PAGES.has(normalized)) {
    const error = new Error("Select either leadership or governance.");
    error.status = 400;
    throw error;
  }
  return normalized;
}

function assertEditableRoleTitle(value) {
  const roleTitle = safeString(value);
  if (!roleTitle) {
    const error = new Error("Role title is required.");
    error.status = 400;
    throw error;
  }

  if (FIXED_ROLE_TITLES.has(normalizeRoleKey(roleTitle))) {
    const error = new Error("Head of School and Deputy Head of School are fixed positions and cannot be changed here.");
    error.status = 400;
    throw error;
  }

  return roleTitle;
}

function ensureUniqueRoleTitle(records, page, roleTitle, currentId = "") {
  const pageKey = safeLower(page);
  const roleKey = normalizeRoleKey(roleTitle);
  const duplicate = records.find((record) => (
    safeLower(record.page) === pageKey &&
    normalizeRoleKey(record.roleTitle) === roleKey &&
    safeString(record.id) !== safeString(currentId)
  ));

  if (duplicate) {
    const error = new Error("That role already has a record on this page. Edit the existing entry instead.");
    error.status = 400;
    throw error;
  }
}

function parseImagePayload(input) {
  const file = input && typeof input === "object" ? input : {};
  const dataUrl = safeString(file.dataUrl || file.base64 || file.content);
  if (!dataUrl) return null;
  return {
    fileName: safeString(file.fileName || file.name || "role-profile-image"),
    mimeType: safeString(file.mimeType || "image/jpeg").toLowerCase(),
    dataUrl,
  };
}

function storeProfileImage(req, input) {
  const file = parseImagePayload(input);
  if (!file) return null;

  const stored = storeUploadedFile(req, {
    category: "site-profiles",
    fileName: file.fileName,
    dataUrl: file.dataUrl,
    mimeType: file.mimeType,
  });

  return {
    imagePath: safeString(stored.relativePath || stored.filePath),
    imageRelativePath: safeString(stored.relativePath),
  };
}

router.get("/role-profiles", (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  if (mutated) writeDB(db);

  const page = safeLower(req.query?.page);
  if (page && !ALLOWED_PAGES.has(page)) {
    return res.status(400).json({ message: "Invalid page filter." });
  }

  const records = sortRecords(
    db.siteRoleProfiles
      .map((record) => normalizeRecord(record))
      .filter((record) => record.isActive && matchesPageFilter(record, page))
  );

  return res.json({ records });
});

router.get("/admin/role-profiles", auth(), requireRole(...MANAGE_ROLES), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  if (mutated) writeDB(db);

  const page = safeLower(req.query?.page);
  if (page && !ALLOWED_PAGES.has(page)) {
    return res.status(400).json({ message: "Invalid page filter." });
  }

  const records = sortRecords(
    db.siteRoleProfiles
      .map((record) => normalizeRecord(record))
      .filter((record) => matchesPageFilter(record, page))
  );

  return res.json({
    records,
    pages: Array.from(ALLOWED_PAGES),
    fixedRoleTitles: ["Head of School", "Deputy Head of School"],
  });
});

router.post("/admin/role-profiles", auth(), requireRole(...MANAGE_ROLES), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);

  try {
    const page = assertValidPage(req.body?.page);
    const roleTitle = assertEditableRoleTitle(req.body?.roleTitle);
    const name = safeString(req.body?.name);
    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    ensureUniqueRoleTitle(db.siteRoleProfiles, page, roleTitle);

    const image = storeProfileImage(req, req.body?.imageFile);
    const timestamp = nowIso();
    const record = normalizeRecord({
      id: "site-role-" + nanoid(10),
      page,
      roleTitle,
      name,
      description: safeString(req.body?.description),
      imagePath: image?.imagePath || "",
      imageRelativePath: image?.imageRelativePath || "",
      sortOrder: safeNumber(req.body?.sortOrder, db.siteRoleProfiles.length + 1),
      isActive: req.body?.isActive !== false,
      createdBy: safeString(req.user?.id || req.user?.username || req.user?.name),
      updatedBy: safeString(req.user?.id || req.user?.username || req.user?.name),
      createdAt: timestamp,
      updatedAt: timestamp,
    });

    db.siteRoleProfiles.push(record);
    if (mutated) {
      // collection was created in-memory; just proceed to write full db
    }
    writeDB(db);
    return res.status(201).json({ record });
  } catch (error) {
    return res.status(Number(error?.status || 500)).json({ message: error?.message || "Failed to create role profile." });
  }
});

router.patch("/admin/role-profiles/:id", auth(), requireRole(...MANAGE_ROLES), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const record = db.siteRoleProfiles.find((item) => safeString(item.id) === safeString(req.params.id));

  if (!record) {
    return res.status(404).json({ message: "Role profile not found." });
  }

  try {
    const page = assertValidPage(req.body?.page || record.page);
    const roleTitle = assertEditableRoleTitle(req.body?.roleTitle || record.roleTitle);
    const name = safeString(req.body?.name || record.name);
    if (!name) {
      return res.status(400).json({ message: "Name is required." });
    }

    ensureUniqueRoleTitle(db.siteRoleProfiles, page, roleTitle, record.id);

    const image = storeProfileImage(req, req.body?.imageFile);
    record.page = page;
    record.roleTitle = roleTitle;
    record.name = name;
    record.description = safeString(req.body?.description);
    record.sortOrder = safeNumber(req.body?.sortOrder, record.sortOrder);
    record.isActive = req.body?.isActive !== false;
    record.updatedBy = safeString(req.user?.id || req.user?.username || req.user?.name);
    record.updatedAt = nowIso();

    if (image) {
      record.imagePath = image.imagePath;
      record.imageRelativePath = image.imageRelativePath;
    }

    if (mutated) {
      // collection was normalized in-memory; write full db below
    }
    writeDB(db);
    return res.json({ record: normalizeRecord(record) });
  } catch (error) {
    return res.status(Number(error?.status || 500)).json({ message: error?.message || "Failed to update role profile." });
  }
});

router.delete("/admin/role-profiles/:id", auth(), requireRole(...MANAGE_ROLES), (req, res) => {
  const db = readDB();
  const mutated = ensureCollections(db);
  const index = db.siteRoleProfiles.findIndex((item) => safeString(item.id) === safeString(req.params.id));

  if (index === -1) {
    return res.status(404).json({ message: "Role profile not found." });
  }

  db.siteRoleProfiles.splice(index, 1);
  if (mutated) {
    // collection was normalized in-memory; write full db below
  }
  writeDB(db);
  return res.json({ success: true });
});

module.exports = router;
