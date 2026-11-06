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

    const { data: callerProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, estado")
      .eq("id", callerAuth.user.id)
      .single()

    if (!callerProfile || callerProfile.role !== "admin" || callerProfile.estado === "retirado") {
      return new Response(
        JSON.stringify({ error: "Acceso denegado: solo un administrador activo puede eliminar cuentas." }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      )
    }

    const { userId } = await req.json()
    if (!userId) {
      throw new Error("Falta el identificador del integrante (userId).")
    }

    // 2. Impedir que un administrador elimine su propia cuenta
    if (userId === callerAuth.user.id) {
      throw new Error("No puedes eliminar tu propia cuenta de administrador.")
    }

    // 3. Verificar que no se elimine al último administrador activo
    const { data: targetProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, role, estado, nombre_completo")
      .eq("id", userId)
      .maybeSingle()

    if (targetProfile?.role === "admin") {
      const { count: activeAdminsCount } = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin")
        .neq("estado", "retirado")
        .neq("id", userId)

      if ((activeAdminsCount ?? 0) < 1) {
        throw new Error("No se puede eliminar al último administrador activo del sistema.")
      }
    }

    // 4. Preservar registros históricos del coro desvinculando created_by / uploaded_by (SET NULL)
    await Promise.allSettled([
      supabaseAdmin.from("activities").update({ created_by: null }).eq("created_by", userId),
      supabaseAdmin.from("financial_records").update({ created_by: null }).eq("created_by", userId),
      supabaseAdmin.from("notices").update({ created_by: null }).eq("created_by", userId),
      supabaseAdmin.from("hojas_cantos").update({ created_by: null }).eq("created_by", userId),
      supabaseAdmin.from("galeria").update({ uploaded_by: null }).eq("uploaded_by", userId),
      supabaseAdmin.from("galeria_albumes").update({ creado_por: null }).eq("creado_por", userId),
      supabaseAdmin.from("galeria_fotos").update({ subido_por: null }).eq("subido_por", userId),
    ])

    // 5. Eliminar fila en public.profiles y usuario en auth.users
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .delete()
      .eq("id", userId)

    if (profileError) {
      throw new Error(`No se pudo eliminar el perfil: ${profileError.message}`)
    }

    const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(userId)
    if (authError && !String(authError.message || "").toLowerCase().includes("not found")) {
      throw authError
    }

    return new Response(
      JSON.stringify({ success: true }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Error al eliminar la cuenta"
    return new Response(
      JSON.stringify({ error: message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    )
  }
})
