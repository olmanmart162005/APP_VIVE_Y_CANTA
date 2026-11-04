export const canManageActivities = (role) =>
  ["admin", "director", "secretaria"].includes(normalizeRole(role))

export const canManageFinance = (role) =>
  ["admin", "tesorero"].includes(normalizeRole(role))

export const canManageNotices = (role) =>
  ["admin", "director", "secretaria"].includes(normalizeRole(role))

export const canManageMembers = (role) =>
  normalizeRole(role) === "admin"

export const canManageCantos = (role) =>
  ["admin", "director", "secretaria"].includes(normalizeRole(role))

export const canDeleteCantos = (role) =>
  ["admin", "director", "secretaria"].includes(normalizeRole(role))

export const canManageGallery = (role) =>
  ["admin", "director", "secretaria"].includes(normalizeRole(role))

export const canDeleteGallery = (role) =>
  ["admin", "director"].includes(normalizeRole(role))

function normalizeRole(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (normalized === "administrador") return "admin"
  return normalized
}
