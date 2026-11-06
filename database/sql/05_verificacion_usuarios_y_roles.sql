-- ==============================================================================
-- CORO DE ALABANZA VIVE Y CANTA — PARROQUIA NUESTRO SEÑOR DE ESQUIPULAS
-- ARCHIVO: 05_verificacion_usuarios_y_roles.sql
-- ==============================================================================
-- PROPÓSITO:
--   Script de auditoría y diagnóstico (solo lectura - SELECT) para ejecutar
--   antes y después de `04_migracion_cambio_obligatorio_password.sql`.
--   Permite verificar:
--     1. Todos los usuarios existentes en `auth.users` y su relación con `public.profiles`.
--     2. Distribución de roles y estado de cuentas (`activo`, `permiso`, `retirado`).
--     3. Estado del indicador `debe_cambiar_password` en toda la plantilla del coro.
--     4. Detección de cuentas huérfanas, incompletas o con correos/usuarios duplicados.
--     5. Verificación del formato de inicio de sesión (`usuario@viveycanta.app`).
--     6. Historial asociado por integrante (actividades, finanzas, avisos, cantos, galería).
--     7. Políticas RLS y triggers de seguridad activos sobre `public.profiles`.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. AUDITORÍA COMPLETA: RELACIÓN ENTRE auth.users Y public.profiles
-- ------------------------------------------------------------------------------
SELECT
    u.id AS auth_uuid,
    p.usuario AS usuario_login,
    u.email AS email_auth,
    p.email AS email_perfil,
    p.nombre_completo,
    p.role AS rol_sistema,
    p.estado AS estado_cuenta,
    p.debe_cambiar_password AS cambio_password_obligatorio,
    u.last_sign_in_at AS ultimo_inicio_sesion,
    u.created_at AS fecha_creacion_auth,
    CASE
        WHEN p.id IS NULL THEN 'ALERTA: Usuario en Auth sin fila en profiles'
        WHEN u.id IS NULL THEN 'ALERTA: Perfil sin cuenta en Auth'
        WHEN u.email NOT LIKE '%@viveycanta.app' THEN 'NOTA: Email Auth con dominio distinto a @viveycanta.app'
        ELSE 'OK: Sincronizado correctamente'
    END AS diagnostico_integridad
FROM auth.users u
FULL OUTER JOIN public.profiles p ON u.id = p.id
ORDER BY
    CASE p.role::text
        WHEN 'admin' THEN 1
        WHEN 'director' THEN 2
        WHEN 'tesorero' THEN 3
        WHEN 'secretaria' THEN 4
        WHEN 'parroco' THEN 5
        ELSE 6
    END,
    p.nombre_completo ASC;

-- ------------------------------------------------------------------------------
-- 2. RESUMEN POR ROL, ESTADO DE CUENTA Y ESTADO DE CAMBIO DE CONTRASEÑA
-- ------------------------------------------------------------------------------
SELECT
    COALESCE(role::text, 'sin_rol') AS rol,
    COALESCE(estado::text, 'activo') AS estado_cuenta,
    COUNT(*) AS total_integrantes,
    COUNT(*) FILTER (WHERE debe_cambiar_password = true) AS pendientes_cambio_password,
    COUNT(*) FILTER (WHERE debe_cambiar_password = false) AS password_personal_actualizada
FROM public.profiles
GROUP BY role, estado
ORDER BY total_integrantes DESC;

-- ------------------------------------------------------------------------------
-- 3. IDENTIFICACIÓN DE CUENTAS DESACTIVADAS O EN PERMISO
-- ------------------------------------------------------------------------------
SELECT
    id,
    usuario,
    nombre_completo,
    role,
    estado,
    telefono,
    updated_at
FROM public.profiles
WHERE estado IS DISTINCT FROM 'activo'::public.integrante_estado
ORDER BY estado, nombre_completo;

-- ------------------------------------------------------------------------------
-- 4. DETECCIÓN DE POSIBLES DUPLICADOS O PERFILES INCOMPLETOS
-- ------------------------------------------------------------------------------
-- 4.1 Usuarios o correos repetidos (si existieran)
SELECT
    LOWER(TRIM(usuario)) AS usuario_normalizado,
    COUNT(*) AS repeticiones
FROM public.profiles
GROUP BY LOWER(TRIM(usuario))
HAVING COUNT(*) > 1;

SELECT
    LOWER(TRIM(email)) AS email_normalizado,
    COUNT(*) AS repeticiones
FROM public.profiles
WHERE email IS NOT NULL AND TRIM(email) <> ''
GROUP BY LOWER(TRIM(email))
HAVING COUNT(*) > 1;

-- 4.2 Perfiles con datos clave faltantes
SELECT
    id,
    usuario,
    nombre_completo,
    role,
    estado,
    CASE WHEN TRIM(COALESCE(nombre_completo, '')) = '' THEN 'Sin nombre' ELSE 'OK' END AS check_nombre,
    CASE WHEN TRIM(COALESCE(usuario, '')) = '' THEN 'Sin usuario' ELSE 'OK' END AS check_usuario,
    CASE WHEN debe_cambiar_password IS NULL THEN 'NULL en debe_cambiar_password' ELSE 'OK' END AS check_flag_password
FROM public.profiles
WHERE TRIM(COALESCE(nombre_completo, '')) = ''
   OR TRIM(COALESCE(usuario, '')) = ''
   OR debe_cambiar_password IS NULL;

-- ------------------------------------------------------------------------------
-- 5. AUDITORÍA DE HISTORIAL ASOCIADO POR INTEGRANTE (PREVENCIÓN DE BORRADO)
-- ------------------------------------------------------------------------------
SELECT
    p.id,
    p.nombre_completo,
    p.usuario,
    p.role,
    p.estado,
    (SELECT COUNT(*) FROM public.activities a WHERE a.created_by = p.id) AS actividades_creadas,
    (SELECT COUNT(*) FROM public.financial_records f WHERE f.created_by = p.id) AS movimientos_financieros,
    (SELECT COUNT(*) FROM public.notices n WHERE n.created_by = p.id) AS avisos_publicados,
    (SELECT COUNT(*) FROM public.hojas_cantos h WHERE h.created_by = p.id) AS hojas_cantos_creadas,
    (SELECT COUNT(*) FROM public.galeria g WHERE g.uploaded_by = p.id) AS fotos_galeria
FROM public.profiles p
ORDER BY p.nombre_completo ASC;

-- ------------------------------------------------------------------------------
-- 6. VERIFICACIÓN DE CLAVES FORÁNEAS HACIA public.profiles (REGLA ON DELETE)
-- ------------------------------------------------------------------------------
-- Todas las tablas históricas deben mostrar accion_on_delete = 'SET NULL'
SELECT
    tc.table_name AS tabla_historica,
    kcu.column_name AS columna_referencia,
    rc.delete_rule AS accion_on_delete
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.referential_constraints AS rc
    ON tc.constraint_name = rc.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND ccu.table_name = 'profiles'
ORDER BY tc.table_name;

-- ------------------------------------------------------------------------------
-- 7. VERIFICACIÓN DE POLÍTICAS RLS Y TRIGGERS EN public.profiles
-- ------------------------------------------------------------------------------
SELECT
    policyname AS politica_rls,
    cmd AS operacion,
    roles AS roles_aplicables,
    qual::text AS condicion_using,
    with_check::text AS condicion_with_check
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'profiles'
ORDER BY cmd, policyname;
