import { createClient } from "https://esm.sh/@supabase/supabase-js@2.42.0"

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error("Configuración incompleta en el servidor (SUPABASE_URL / SERVICE_ROLE_KEY).")
    }

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Verificar en el servidor que el solicitante sea un Administrador autenticado
    const authHeader = req.headers.get("Authorization")
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "No autorizado: falta token de sesión." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const token = authHeader.replace(/^Bearer\s+/i, "")
    const { data: callerAuth, error: callerErr } = await supabaseAdmin.auth.getUser(token)
    if (callerErr || !callerAuth?.user) {
      return new Response(
        JSON.stringify({ error: "Sesión inválida o expirada." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      )
    }

    const { data: callerProfile, error: callerProfileErr } = await supabaseAdmin
      .from("profiles")
      .select("role, estado")
      .eq("id", callerAuth.user.id)
      .single()

    if (
      callerProfileErr ||
      !callerProfile ||
      callerProfile.role !== "admin" ||
      callerProfile.estado === "retirado"
    ) {
      return new Response(
        JSON.stringify({ error: "Acceso denegado: solo un administrador activo puede crear cuentas." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      )
    }

    // 2. Leer y validar datos del nuevo integrante (NUNCA registrar la contraseña en logs)
    const body = await req.json()
    const cleanUsuario = String(body.usuario || "").trim().toLowerCase()
    const nombreCompleto = String(body.nombre || body.nombre_completo || "").trim()
    const role = String(body.role || "integrante").trim().toLowerCase()
    const password = String(body.password || "")
    const authEmail = `${cleanUsuario}@viveycanta.app`
    const profileEmail = String(body.correo_personal || body.email || authEmail).trim().toLowerCase()

    if (!cleanUsuario || !nombreCompleto || !role || !password) {
      throw new Error("Faltan campos obligatorios: nombre, usuario, rol o contraseña temporal.")
    }

    if (password.length < 8) {
      throw new Error("La contraseña temporal debe tener al menos 8 caracteres.")
    }

    // 3. Verificar unicidad de nombre de usuario y correo electrónico
    const { data: existingUser } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .ilike("usuario", cleanUsuario)
      .maybeSingle()

    if (existingUser) {
      throw new Error(`El nombre de usuario "${cleanUsuario}" ya está registrado.`)
    }

    if (profileEmail) {
      const { data: existingEmail } = await supabaseAdmin
        .from("profiles")
        .select("id")
        .ilike("email", profileEmail)
        .maybeSingle()

      if (existingEmail) {
        throw new Error(`El correo electrónico "${profileEmail}" ya está asociado a otro integrante.`)
      }
    }

    // 4. Crear cuenta en Supabase Auth conservando el mecanismo usuario@viveycanta.app
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: authEmail,
      password: password,
      email_confirm: true,
      user_metadata: {
        nombre_completo: nombreCompleto,
        usuario: cleanUsuario,
        role: role,
      },
    })

    if (authError) {
      throw authError
    }

    const createdAuthUser = authData.user
    if (!createdAuthUser) {
      throw new Error("No se pudo crear el usuario en Supabase Auth.")
    }

    // 5. Insertar perfil completo en public.profiles con debe_cambiar_password = true
    const profilePayload: Record<string, unknown> = {
      id: createdAuthUser.id,
      nombre_completo: nombreCompleto,
      usuario: cleanUsuario,
      email: profileEmail,
      role: role,
      estado: body.estado || "activo",
      debe_cambiar_password: true,
      fecha_ingreso: new Date().toISOString().split("T")[0],
    }

    if (body.telefono !== undefined) profilePayload.telefono = body.telefono || null
    if (body.fecha_nacimiento !== undefined) profilePayload.fecha_nacimiento = body.fecha_nacimiento || null
    if (body.edad !== undefined && body.edad !== null && body.edad !== "") {
      profilePayload.edad = Number(body.edad)
    }
    if (body.tipo_sangre !== undefined) profilePayload.tipo_sangre = body.tipo_sangre || null
    if (body.dni !== undefined) profilePayload.dni = body.dni || null
    if (body.foto !== undefined) {
      profilePayload.foto = body.foto || null
      profilePayload.foto_url = body.foto || null
    }

    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert(profilePayload, { onConflict: "id" })

    if (profileError) {
      // Revertir usuario en Auth si falló la creación del perfil
      await supabaseAdmin.auth.admin.deleteUser(createdAuthUser.id)
      throw profileError
    }

    return new Response(
      JSON.stringify({
        success: true,
        user: {
          id: createdAuthUser.id,
          usuario: cleanUsuario,
          email: profileEmail,
          auth_email: authEmail,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error interno al crear integrante"
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
