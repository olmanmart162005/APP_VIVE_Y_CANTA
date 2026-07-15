export const canManageActivities =
  (role) =>
    [
      "admin",
      "director",
      "secretaria",
    ].includes(role)

export const canManageFinance =
  (role) =>
    [
      "admin",
      "tesorero",
    ].includes(role)

export const canManageNotices =
  (role) =>
    [
      "admin",
      "director",
      "secretaria",
    ].includes(role)

export const canManageMembers =
  (role) =>
    role === "admin"

export const canManageCantos =
  (role) =>
    ["admin", "director", "secretaria"].includes(normalizeRole(role))

export const canDeleteCantos =
  (role) =>
    ["admin", "director", "secretaria"].includes(normalizeRole(role))

function normalizeRole(role) {
  const normalized = String(role || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")

  if (normalized === "administrador") return "admin"
  return normalized
}