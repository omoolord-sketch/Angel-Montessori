export const ACTIVE_CLASS_GROUPS = [
  {
    section: "Early Years",
    classes: ["Crèche", "Nursery", "Reception"],
  },
  {
    section: "Primary",
    classes: ["Basic 1", "Basic 2", "Basic 3", "Basic 4", "Basic 5", "Basic 6"],
  },
  {
    section: "Junior Secondary",
    classes: ["JSS1", "JSS2", "JSS3"],
  },
  {
    section: "Senior Secondary",
    classes: ["SS1", "SS2", "SS3"],
  },
];

export const ACTIVE_CLASS_NAMES = ACTIVE_CLASS_GROUPS.flatMap((group) => group.classes);

export function normalizeAcademicClassKey(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

const classAliases = new Map([
  ["creche", "Crèche"],
  ["nursery", "Nursery"],
  ["reception", "Reception"],
  ["primary1", "Basic 1"],
  ["primary2", "Basic 2"],
  ["primary3", "Basic 3"],
  ["primary4", "Basic 4"],
  ["primary5", "Basic 5"],
  ["primary6", "Basic 6"],
  ["ss1", "SS1"],
  ["ss2", "SS2"],
  ["ss3", "SS3"],
  ["sss1", "SS1"],
  ["sss2", "SS2"],
  ["sss3", "SS3"],
]);

ACTIVE_CLASS_NAMES.forEach((name) => {
  classAliases.set(normalizeAcademicClassKey(name), name);
});

export function resolveActiveClassName(value) {
  return classAliases.get(normalizeAcademicClassKey(value)) || "";
}

export function isEarlyYearsClass(value) {
  return ["creche", "nursery", "reception"].includes(normalizeAcademicClassKey(resolveActiveClassName(value) || value));
}
