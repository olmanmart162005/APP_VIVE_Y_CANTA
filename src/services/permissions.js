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