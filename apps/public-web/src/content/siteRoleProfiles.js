export const FIXED_SITE_ROLE_TITLES = ["Head of School", "Deputy Head of School"];

export const FIXED_SITE_ROLE_PROFILES = {
  leadership: [
    {
      id: "fixed-head-of-school",
      name: "Joseph Samuel Omoolorun",
      roleTitle: "Head of School",
      imagePath: "/assets/director.jpg",
      description:
        "Provides strategic and academic leadership for Angel Montessori School, helping guide standards, discipline, staff coordination, and overall school growth.",
      isFixed: true,
    },
    {
      id: "fixed-deputy-head-of-school",
      name: "Tinuke Idowu",
      roleTitle: "Deputy Head of School",
      imagePath: "/assets/deputy-head-of-school.jpg",
      description:
        "Supports daily operations, school administration, and the steady running of the school environment.",
      isFixed: true,
    },
  ],
  governance: [
    {
      id: "fixed-governance-head-of-school",
      name: "Joseph Samuel Omoolorun",
      roleTitle: "Head of School",
      imagePath: "/assets/director.jpg",
      description:
        "Provides academic and operational leadership that keeps school governance connected to standards, structure, and implementation.",
      isFixed: true,
    },
  ],
};

export function getFixedSiteRoleProfiles(page) {
  const key = String(page || "").trim().toLowerCase();
  return Array.isArray(FIXED_SITE_ROLE_PROFILES[key]) ? FIXED_SITE_ROLE_PROFILES[key] : [];
}

export function isFixedSiteRoleTitle(value) {
  const target = String(value || "").trim().toLowerCase();
  return FIXED_SITE_ROLE_TITLES.some((item) => item.toLowerCase() === target);
}
