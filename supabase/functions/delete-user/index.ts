import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  // Handle CORS Preflight OPTIONS Request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Missing Supabase URL or Service Role Key env variables")
    }

    const supabaseClient = createClient(supabaseUrl, supabaseServiceKey)

    // Parse request body
    const { userId } = await req.json()

    if (!userId) {
      throw new Error("Missing required field: userId")
    }

    console.log(`Deleting user from profiles and auth: ${userId}`)

    // 1. Delete user profile from profiles table (safety cleanup)
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .delete()
      .eq("id", userId)

    if (profileError) {
      console.warn("Warning: Profile deletion error:", profileError.message)
    }

    // 2. Delete user from Supabase Auth
    const { error: authError } = await supabaseClient.auth.admin.deleteUser(userId)

    if (authError) {
      throw authError
    }

    console.log(`User ${userId} deleted successfully.`)

    return new Response(
      JSON.stringify({
        success: true
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 200,
      }
    )

  } catch (error) {
    console.error("Error in delete-user function:", error.message)
    return new Response(
      JSON.stringify({
        error: error.message,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      }
    )
  }
})
