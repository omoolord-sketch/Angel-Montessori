export const ACTIVE_CLASS_GROUPS = [
  { section: "Early Years", classes: ["Crèche", "Nursery", "Reception"] },
  { section: "Primary", classes: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"] },
  { section: "Junior Secondary", classes: ["JSS1", "JSS2", "JSS3"] },
  { section: "Senior Secondary", classes: ["SS1", "SS2", "SS3"] },
];

export const ACTIVE_CLASS_NAMES = ACTIVE_CLASS_GROUPS.flatMap((group) => group.classes);

export function normalizeAcademicClassKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}
