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
    const { usuario, nombre, email, role, password } = await req.json()

    if (!usuario || !nombre || !email || !role || !password) {
      throw new Error("Missing required fields: usuario, nombre, email, role, password")
    }

    console.log(`Creating user in auth: ${email}`)

    // 1. Create user in Supabase Auth using the admin client
    const { data: authData, error: authError } = await supabaseClient.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: nombre,
        role: role,
      }
    })

    if (authError) {
      throw authError
    }

    const user = authData.user
    if (!user) {
      throw new Error("Failed to create auth user")
    }

    console.log(`User created in auth with ID: ${user.id}. Inserting profile...`)

    // 2. Insert user profile into the profiles table
    const { error: profileError } = await supabaseClient
      .from("profiles")
      .insert({
        id: user.id,
        nombre_completo: nombre,
        usuario: usuario,
        email: email,
        role: role,
        estado: "activo",
        fecha_ingreso: new Date().toISOString().split("T")[0],
      })

    if (profileError) {
      console.error("Error creating profile, rolling back auth user:", profileError)
      // Rollback: delete the created auth user
      await supabaseClient.auth.admin.deleteUser(user.id)
      throw profileError
    }

    console.log(`Profile created successfully for user ID: ${user.id}`)

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
        }
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
    console.error("Error in create-user function:", error.message)
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
