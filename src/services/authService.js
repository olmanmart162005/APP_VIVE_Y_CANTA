import { supabase } from "../lib/supabase"

export const getCurrentUser = async () => {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const { data: profile, error } =
    await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single()

  if (error) {
    console.log(error)
    return null
  }

  return profile
}