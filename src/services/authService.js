import { supabase } from "../lib/supabase"

export async function login(
  email,
  password
) {
  const {
    data,
    error,
  } =
    await supabase.auth.signInWithPassword({
      email,
      password,
    })

  if (error)
    throw error

  return data.user
}

export async function getCurrentUser() {
  try {
    console.log("[getCurrentUser] Obteniendo usuario autenticado desde Supabase Auth...")
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError) {
      console.error("[getCurrentUser] Error de autenticación de Supabase:", authError)
      return null
    }

    if (!user) {
      console.log("[getCurrentUser] No se encontró ninguna sesión activa en Supabase Auth.")
      return null
    }

    console.log("[getCurrentUser] Usuario autenticado encontrado:", user.email, "ID:", user.id)
    console.log("[getCurrentUser] Consultando fila de perfil en la base de datos...")
    
    const {
      data,
      error,
    } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

    if (error) {
      console.error("[getCurrentUser] Error al consultar la tabla 'profiles':", error)
      // Si la fila del perfil no existe o está bloqueada, devolvemos un objeto de respaldo básico
      console.log("[getCurrentUser] Devolviendo perfil de respaldo básico...")
      return {
        id: user.id,
        email: user.email,
        nombre_completo: user.email.split("@")[0],
        role: "integrante"
      }
    }

    console.log("[getCurrentUser] Perfil cargado exitosamente desde la base de datos:", data)
    return {
      ...data,
      email: user.email,
    }
  } catch (err) {
    console.error("[getCurrentUser] Excepción inesperada:", err)
    return null
  }
}

export async function logout() {
  await supabase.auth.signOut()
}