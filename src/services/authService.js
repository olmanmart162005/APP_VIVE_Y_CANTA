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
  const {
    data: { user },
  } =
    await supabase.auth.getUser()

  if (!user)
    return null

  const {
    data,
    error,
  } =
    await supabase
      .from("profiles")
      .select("*")
      .eq(
        "id",
        user.id
      )
      .single()

  if (error)
    return null

  return {
    ...data,
    email:
      user.email,
  }
}

export async function logout() {
  await supabase.auth.signOut()
}