import { supabase } from "../lib/supabase"

export const SHARED_LEGACY_PASSWORD = "Viveycanta2026@"
export const AUTH_DOMAIN = "viveycanta.app"

export const SYSTEM_ROLES = [
  { value: "admin", label: "Administrador" },
  { value: "director", label: "Director" },
  { value: "tesorero", label: "Tesorero" },
  { value: "integrante", label: "Integrante" },
  { value: "secretaria", label: "Secretaria" },
  { value: "parroco", label: "Párroco" },
]

export const ACCOUNT_STATES = [
  { value: "activo", label: "Activo (Acceso habilitado)" },
  { value: "permiso", label: "En permiso temporal" },
  { value: "retirado", label: "Desactivado / Inactivo" },
]

export const BLOOD_TYPES = ["O+", "O-", "A+", "A-", "B+", "B-", "AB+", "AB-"]

/**
 * Genera una contraseña temporal única y criptográficamente segura para cada nuevo integrante.
 * Cumple siempre: >= 10 caracteres, mayúsculas, minúsculas, números y símbolo.
 * Nunca se registra en console.log.
 */
export function generateTemporaryPassword() {
  const upper = "ABCDEFGHJKLMNPQRSTUVWXYZ"
  const lower = "abcdefghijkmnopqrstuvwxyz"
  const digits = "23456789"
  const symbols = "#$@!*"

  const randomChar = (charset) => {
    const arr = new Uint32Array(1)
    window.crypto.getRandomValues(arr)
    return charset[arr[0] % charset.length]
  }

  const part1 = randomChar(upper) + randomChar(lower) + randomChar(upper)
  const part2 = randomChar(digits) + randomChar(digits) + randomChar(digits)
  const part3 = randomChar(symbols) + randomChar(lower) + randomChar(upper)

  const candidate = `VyC-${part1}${part2}${part3}`
  if (candidate === SHARED_LEGACY_PASSWORD) {
    return generateTemporaryPassword()
  }
  return candidate
}

/**
 * Calcula automáticamente la edad en años cumplidos a partir de la fecha de nacimiento (YYYY-MM-DD)
 */
export function calculateAgeFromBirthdate(fechaNac) {
  if (!fechaNac) return null
  const clean = String(fechaNac).slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(clean)) return null

  const today = new Date()
  const birth = new Date(`${clean}T12:00:00`)
  if (Number.isNaN(birth.getTime())) return null

  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 && age <= 120 ? age : null
}

/**
 * Separa un `nombre_completo` en `{ nombres, apellidos }` de forma inteligente para edición
 */
export function splitFullName(nombreCompleto = "") {
  const parts = String(nombreCompleto || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (parts.length === 0) return { nombres: "", apellidos: "" }
  if (parts.length === 1) return { nombres: parts[0], apellidos: "" }
  if (parts.length === 2) return { nombres: parts[0], apellidos: parts[1] }
  if (parts.length === 3) return { nombres: `${parts[0]} ${parts[1]}`, apellidos: parts[2] }
  const half = Math.ceil(parts.length / 2)
  return {
    nombres: parts.slice(0, half).join(" "),
    apellidos: parts.slice(half).join(" "),
  }
}

/**
 * Genera sugerencia de nombre de usuario único basado en nombres y apellidos
 */
export function suggestUsername(nombres = "", apellidos = "", existingMembers = []) {
  const normalize = (str) =>
    String(str || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, "")
      .trim()

  const firstWord = normalize(nombres).split(/\s+/)[0] || ""
  const lastWord = normalize(apellidos).split(/\s+/)[0] || ""

  let base = firstWord && lastWord ? `${firstWord}.${lastWord}` : firstWord || lastWord
  if (!base) return ""

  const taken = new Set(
    (existingMembers || []).map((m) => String(m.usuario || "").trim().toLowerCase())
  )

  if (!taken.has(base)) return base

  let counter = 2
  while (taken.has(`${base}${counter}`)) {
    counter++
  }
  return `${base}${counter}`
}

/**
 * Formatea teléfono de Honduras (0000-0000)
 */
export function formatHondurasPhone(value = "") {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 8)
  if (digits.length <= 4) return digits
  return `${digits.slice(0, 4)}-${digits.slice(4)}`
}

/**
 * Formatea DNI de Honduras (0000-0000-00000)
 */
export function formatHondurasDni(value = "") {
  const digits = String(value || "").replace(/\D/g, "").slice(0, 13)
  let out = ""
  if (digits.length > 0) out += digits.slice(0, 4)
  if (digits.length > 4) out += `-${digits.slice(4, 8)}`
  if (digits.length > 8) out += `-${digits.slice(8, 13)}`
  return out
}

/**
 * Sube la fotografía de perfil de un integrante al bucket `profiles` de Supabase Storage
 */
export async function uploadMemberProfilePhoto(file, identifier = "member") {
  if (!file) return null
  if (!file.type?.startsWith("image/")) {
    throw new Error("Selecciona un archivo de imagen válido (JPG, PNG o WEBP).")
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new Error("La fotografía no debe superar los 10 MB.")
  }

  const ext = (file.name?.split(".").pop() || "jpg").toLowerCase()
  const safeId = String(identifier).replace(/[^a-zA-Z0-9_-]/g, "") || "integrante"
  const fileName = `perfil-${safeId}-${Date.now()}.${ext}`

  const { error: uploadError } = await supabase.storage
    .from("profiles")
    .upload(fileName, file, {
      cacheControl: "3600",
      upsert: true,
    })

  if (uploadError) {
    throw new Error(`No se pudo subir la fotografía: ${uploadError.message}`)
  }

  const { data } = supabase.storage.from("profiles").getPublicUrl(fileName)
  return data?.publicUrl || null
}

/**
 * Cuenta cuántos administradores activos existen en la lista de perfiles
 */
export function countActiveAdmins(members = [], excludeMemberId = null) {
  return (members || []).filter(
    (m) =>
      m.role === "admin" &&
      (m.estado === "activo" || !m.estado) &&
      m.id !== excludeMemberId
  ).length
}

/**
 * Crea una nueva cuenta de integrante en Supabase Auth + `public.profiles`
 * con contraseña temporal única y `debe_cambiar_password = true`.
 */
export async function createMemberAccount({
  nombres,
  apellidos,
  usuario,
  email,
  telefono,
  fecha_nacimiento,
  edad,
  tipo_sangre,
  dni,
  role = "integrante",
  estado = "activo",
  photoFile = null,
  existingMembers = [],
}) {
  const cleanNombres = String(nombres || "").trim()
  const cleanApellidos = String(apellidos || "").trim()
  const nombreCompleto = `${cleanNombres} ${cleanApellidos}`.trim()
  const cleanUsuario = String(usuario || "").trim().toLowerCase()
  const authEmail = `${cleanUsuario}@${AUTH_DOMAIN}`
  const cleanEmail = String(email || "").trim().toLowerCase() || authEmail
  const normalizedRole = String(role || "integrante").trim().toLowerCase()

  if (!cleanNombres || !cleanApellidos) {
    throw new Error("Ingresa los nombres y apellidos del integrante.")
  }

  if (!cleanUsuario || !/^[a-z0-9._-]+$/.test(cleanUsuario)) {
    throw new Error("El nombre de usuario solo puede contener letras minúsculas, números, puntos o guiones.")
  }

  // Validar unicidad de usuario
  const duplicateUser = (existingMembers || []).some(
    (m) => String(m.usuario || "").trim().toLowerCase() === cleanUsuario
  )
  if (duplicateUser) {
    throw new Error(`El nombre de usuario "${cleanUsuario}" ya está en uso por otro integrante.`)
  }

  // Validar formato y unicidad de correo electrónico
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    throw new Error("Ingresa un correo electrónico válido.")
  }

  const duplicateEmail = (existingMembers || []).some(
    (m) => m.email && String(m.email).trim().toLowerCase() === cleanEmail
  )
  if (duplicateEmail) {
    throw new Error(`El correo electrónico "${cleanEmail}" ya está registrado en otra cuenta.`)
  }

  // Generar contraseña temporal única y segura para este integrante
  const temporaryPassword = generateTemporaryPassword()

  // Si seleccionó foto de perfil, subirla primero al bucket `profiles`
  let uploadedPhotoUrl = null
  if (photoFile) {
    uploadedPhotoUrl = await uploadMemberProfilePhoto(photoFile, cleanUsuario)
  }

  const calculatedAge =
    edad !== undefined && edad !== null && edad !== ""
      ? Number(edad)
      : calculateAgeFromBirthdate(fecha_nacimiento)

  // 1. Invocar la Edge Function `create-user` para crear la cuenta en Supabase Auth (`usuario@viveycanta.app`)
  const { data: fnData, error: fnError } = await supabase.functions.invoke("create-user", {
    body: {
      usuario: cleanUsuario,
      nombre: nombreCompleto,
      nombre_completo: nombreCompleto,
      email: authEmail, // Se envía el email de autenticación @viveycanta.app para garantizar el login por usuario
      correo_personal: cleanEmail,
      role: normalizedRole,
      password: temporaryPassword,
      telefono: telefono?.trim() || null,
      fecha_nacimiento: fecha_nacimiento || null,
      edad: calculatedAge,
      tipo_sangre: tipo_sangre || null,
      dni: dni?.trim() || null,
      foto: uploadedPhotoUrl,
      estado: estado || "activo",
    },
  })

  if (fnError) {
    throw new Error(fnError.message || "Error al crear la cuenta en el servidor de autenticación.")
  }

  if (fnData?.error) {
    throw new Error(fnData.error)
  }

  const createdUserId = fnData?.user?.id

  // 2. Sincronizar todos los campos adicionales en `public.profiles` y asegurar `debe_cambiar_password = true`
  const profileUpdatePayload = {
    nombre_completo: nombreCompleto,
    usuario: cleanUsuario,
    email: cleanEmail,
    telefono: telefono?.trim() || null,
    fecha_nacimiento: fecha_nacimiento || null,
    edad: calculatedAge,
    tipo_sangre: tipo_sangre || null,
    dni: dni?.trim() || null,
    role: normalizedRole,
    estado: estado || "activo",
    debe_cambiar_password: true,
  }

  if (uploadedPhotoUrl) {
    profileUpdatePayload.foto = uploadedPhotoUrl
    profileUpdatePayload.foto_url = uploadedPhotoUrl
  }

  if (createdUserId) {
    const { error: syncErr } = await supabase
      .from("profiles")
      .update(profileUpdatePayload)
      .eq("id", createdUserId)

    if (syncErr) {
      console.warn("Aviso al sincronizar campos extendidos del perfil:", syncErr.message)
    }
  } else {
    await supabase
      .from("profiles")
      .update(profileUpdatePayload)
      .eq("usuario", cleanUsuario)
  }

  return {
    id: createdUserId,
    nombre_completo: nombreCompleto,
    usuario: cleanUsuario,
    email: cleanEmail,
    authEmail,
    role: normalizedRole,
    temporaryPassword,
  }
}

/**
 * Actualiza los datos de un integrante existente sin alterar su cuenta de autenticación en Supabase Auth
 */
export async function updateMemberProfile({
  memberId,
  nombres,
  apellidos,
  email,
  telefono,
  fecha_nacimiento,
  edad,
  tipo_sangre,
  dni,
  direccion,
  ministerio,
  contacto_emergencia,
  telefono_emergencia,
  role,
  estado,
  debe_cambiar_password,
  photoFile = null,
  currentPhotoUrl = null,
  currentUser = null,
  existingMembers = [],
}) {
  if (!memberId) {
    throw new Error("Identificador de integrante inválido.")
  }

  if (currentUser?.role !== "admin") {
    throw new Error("Solo un administrador puede editar la información de los integrantes.")
  }

  const targetMember = (existingMembers || []).find((m) => m.id === memberId)
  const cleanNombres = String(nombres || "").trim()
  const cleanApellidos = String(apellidos || "").trim()
  const nombreCompleto = `${cleanNombres} ${cleanApellidos}`.trim()

  if (!nombreCompleto) {
    throw new Error("El nombre del integrante no puede quedar vacío.")
  }

  // Protección: un administrador no puede desactivar su propia cuenta ni quitarse el rol de administrador
  if (currentUser?.id === memberId) {
    if (estado && estado !== "activo") {
      throw new Error("Por seguridad, no puedes desactivar tu propia cuenta de administrador.")
    }
    if (role && role !== "admin") {
      throw new Error("Por seguridad, no puedes quitarte el rol de administrador a ti mismo.")
    }
  }

  // Protección: no dejar al sistema sin ningún administrador activo
  if (targetMember?.role === "admin") {
    const isLosingAdmin = (role && role !== "admin") || (estado && estado !== "activo")
    if (isLosingAdmin) {
      const otherActiveAdmins = countActiveAdmins(existingMembers, memberId)
      if (otherActiveAdmins < 1) {
        throw new Error("No se puede cambiar el rol ni desactivar al único administrador activo del sistema.")
      }
    }
  }

  // Validar correo electrónico si fue modificado
  const cleanEmail = String(email || "").trim().toLowerCase()
  if (cleanEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      throw new Error("El formato del correo electrónico no es válido.")
    }
    const emailTaken = (existingMembers || []).some(
      (m) =>
        m.id !== memberId &&
        m.email &&
        String(m.email).trim().toLowerCase() === cleanEmail
    )
    if (emailTaken) {
      throw new Error(`El correo "${cleanEmail}" ya está asignado a otro integrante.`)
    }
  }

  let finalPhotoUrl = currentPhotoUrl || targetMember?.foto || targetMember?.foto_url || null
  if (photoFile) {
    finalPhotoUrl = await uploadMemberProfilePhoto(photoFile, targetMember?.usuario || memberId)
  }

  const calculatedAge =
    edad !== undefined && edad !== null && edad !== ""
      ? Number(edad)
      : calculateAgeFromBirthdate(fecha_nacimiento)

  const updatePayload = {
    nombre_completo: nombreCompleto,
    email: cleanEmail || targetMember?.email || null,
    telefono: telefono?.trim() || null,
    fecha_nacimiento: fecha_nacimiento || null,
    edad: calculatedAge,
    tipo_sangre: tipo_sangre || null,
    dni: dni?.trim() || null,
    direccion: direccion?.trim() || null,
    ministerio: ministerio?.trim() || null,
    contacto_emergencia: contacto_emergencia?.trim() || null,
    contacto_emergencia_nombre: contacto_emergencia?.trim() || null,
    telefono_emergencia: telefono_emergencia?.trim() || null,
    contacto_emergencia_telefono: telefono_emergencia?.trim() || null,
    role: role || targetMember?.role || "integrante",
    estado: estado || targetMember?.estado || "activo",
    foto: finalPhotoUrl,
    foto_url: finalPhotoUrl,
    updated_at: new Date().toISOString(),
  }

  if (typeof debe_cambiar_password === "boolean") {
    updatePayload.debe_cambiar_password = debe_cambiar_password
  }

  const { data, error } = await supabase
    .from("profiles")
    .update(updatePayload)
    .eq("id", memberId)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || "No se pudieron guardar los cambios del integrante.")
  }

  return data
}

/**
 * Analiza si el integrante tiene registros históricos asociados (actividades, finanzas, avisos, cantos, galería)
 */
export async function inspectMemberHistory(memberId) {
  if (!memberId) {
    return {
      activities: 0,
      financial_records: 0,
      notices: 0,
      hojas_cantos: 0,
      gallery: 0,
      total: 0,
      has_history: false,
    }
  }

  // Intentar primero mediante la función RPC si ya se ejecutó la migración 04
  const { data: rpcData, error: rpcErr } = await supabase.rpc(
    "get_member_dependencies_summary",
    { p_member_id: memberId }
  )

  if (!rpcErr && rpcData) {
    return rpcData
  }

  // Respaldo mediante conteos directos en paralelo
  const [actRes, finRes, notRes, canRes, galRes] = await Promise.all([
    supabase.from("activities").select("id", { count: "exact", head: true }).eq("created_by", memberId),
    supabase.from("financial_records").select("id", { count: "exact", head: true }).eq("created_by", memberId),
    supabase.from("notices").select("id", { count: "exact", head: true }).eq("created_by", memberId),
    supabase.from("hojas_cantos").select("id", { count: "exact", head: true }).eq("created_by", memberId),
    supabase.from("galeria").select("id", { count: "exact", head: true }).eq("uploaded_by", memberId),
  ])

  const activities = actRes.count || 0
  const financial_records = finRes.count || 0
  const notices = notRes.count || 0
  const hojas_cantos = canRes.count || 0
  const gallery = galRes.count || 0
  const total = activities + financial_records + notices + hojas_cantos + gallery

  return {
    activities,
    financial_records,
    notices,
    hojas_cantos,
    gallery,
    total,
    has_history: total > 0,
  }
}

/**
 * Desactiva la cuenta de un integrante (`estado = 'retirado'`) conservando su perfil e historial intactos
 */
export async function deactivateMemberAccount({ member, currentUser, existingMembers = [] }) {
  if (!member?.id) throw new Error("Integrante inválido.")
  if (currentUser?.role !== "admin") {
    throw new Error("Solo un administrador puede desactivar cuentas.")
  }
  if (member.id === currentUser?.id) {
    throw new Error("No puedes desactivar tu propia cuenta de administrador.")
  }
  if (member.role === "admin" && countActiveAdmins(existingMembers, member.id) < 1) {
    throw new Error("No se puede desactivar al único administrador activo del sistema.")
  }

  const { data, error } = await supabase
    .from("profiles")
    .update({
      estado: "retirado",
      updated_at: new Date().toISOString(),
    })
    .eq("id", member.id)
    .select()
    .single()

  if (error) {
    throw new Error(error.message || "Error al desactivar la cuenta del integrante.")
  }

  return data
}

/**
 * Elimina definitivamente la cuenta de un integrante de forma controlada,
 * preservando antes todos los movimientos financieros y actividades históricas del coro.
 */
export async function deleteMemberAccountSafely({ member, currentUser, existingMembers = [] }) {
  if (!member?.id) throw new Error("Integrante inválido.")
  if (currentUser?.role !== "admin") {
    throw new Error("No tienes permisos administrativos para eliminar cuentas.")
  }
  if (member.id === currentUser?.id) {
    throw new Error("Por seguridad, no puedes eliminar tu propia cuenta de administrador.")
  }
  if (member.role === "admin" && countActiveAdmins(existingMembers, member.id) < 1) {
    throw new Error("Operación bloqueada: No se puede eliminar al último administrador activo del sistema.")
  }

  // 1. Desvincular referencias históricas (SET NULL) para garantizar que jamás se borre ni falle ningún registro histórico
  await Promise.allSettled([
    supabase.from("activities").update({ created_by: null }).eq("created_by", member.id),
    supabase.from("financial_records").update({ created_by: null }).eq("created_by", member.id),
    supabase.from("notices").update({ created_by: null }).eq("created_by", member.id),
    supabase.from("hojas_cantos").update({ created_by: null }).eq("created_by", member.id),
    supabase.from("galeria").update({ uploaded_by: null }).eq("uploaded_by", member.id),
  ])

  // 2. Invocar Edge Function `delete-user` para eliminar en `profiles` y `auth.users`
  const { data, error } = await supabase.functions.invoke("delete-user", {
    body: { userId: member.id },
  })

  if (error) {
    throw new Error(error.message || "No se pudo eliminar la cuenta en el servidor.")
  }

  if (data?.error) {
    throw new Error(data.error)
  }

  return true
}
