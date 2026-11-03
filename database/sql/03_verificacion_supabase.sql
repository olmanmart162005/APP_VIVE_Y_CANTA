-- ==============================================================================
-- CORO DE ALABANZA VIVE Y CANTA — PARROQUIA NUESTRO SEÑOR DE ESQUIPULAS
-- ARCHIVO 03: 03_verificacion_supabase.sql
-- ==============================================================================
-- PROPÓSITO:
--   Consultas de solo lectura (SELECT) para comprobar el estado, seguridad,
--   integridad y rendimiento de la base de datos en Supabase.
--   Puede ejecutarse antes y después de aplicar el script 02.
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. TABLAS EXISTENTES EN EL ESQUEMA PUBLIC Y CONTEO ESTIMADO DE REGISTROS
-- ------------------------------------------------------------------------------
SELECT
    t.table_name AS tabla,
    COALESCE(c.reltuples::bigint, 0) AS filas_estimadas,
    pg_size_pretty(pg_total_relation_size('"' || t.table_schema || '"."' || t.table_name || '"')) AS tamano_total
FROM information_schema.tables t
LEFT JOIN pg_class c ON c.relname = t.table_name
WHERE t.table_schema = 'public'
  AND t.table_type = 'BASE TABLE'
ORDER BY t.table_name;

-- ------------------------------------------------------------------------------
-- 2. VERIFICACIÓN DEL ESTADO DE ROW LEVEL SECURITY (RLS) POR TABLA
-- ------------------------------------------------------------------------------
-- TODAS las tablas deben mostrar rls_habilitado = TRUE
SELECT
    schemaname AS esquema,
    tablename AS tabla,
    rowsecurity AS rls_habilitado
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- ------------------------------------------------------------------------------
-- 3. POLÍTICAS DE ROW LEVEL SECURITY ACTIVAS
-- ------------------------------------------------------------------------------
SELECT
    schemaname AS esquema,
    tablename AS tabla,
    policyname AS politica,
    permissive AS tipo,
    roles AS roles_permitidos,
    cmd AS comando,
    SUBSTRING(qual::text FROM 1 FOR 60) AS expresion_using,
    SUBSTRING(with_check::text FROM 1 FOR 60) AS expresion_with_check
FROM pg_policies
WHERE schemaname IN ('public', 'storage')
ORDER BY schemaname, tablename, cmd, policyname;

-- ------------------------------------------------------------------------------
-- 4. ÍNDICES EXISTENTES EN TABLAS OPERATIVAS
-- ------------------------------------------------------------------------------
SELECT
    tablename AS tabla,
    indexname AS nombre_indice,
    indexdef AS definicion_indice
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- ------------------------------------------------------------------------------
-- 5. CLAVES FORÁNEAS Y REGLAS DE ELIMINACIÓN (ON DELETE)
-- ------------------------------------------------------------------------------
SELECT
    tc.table_name AS tabla_origen,
    kcu.column_name AS columna_origen,
    ccu.table_name AS tabla_destino,
    ccu.column_name AS columna_destino,
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
ORDER BY tc.table_name, kcu.column_name;

-- ------------------------------------------------------------------------------
-- 6. TRIGGERS ACTIVOS EN EL ESQUEMA PUBLIC
-- ------------------------------------------------------------------------------
SELECT
    event_object_table AS tabla,
    trigger_name AS nombre_trigger,
    event_manipulation AS evento,
    action_timing AS momento,
    action_statement AS accion
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;

-- ------------------------------------------------------------------------------
-- 7. BUCKETS DE ALMACENAMIENTO (STORAGE)
-- ------------------------------------------------------------------------------
SELECT
    id,
    name AS nombre,
    public AS es_publico,
    file_size_limit AS limite_tamano_bytes,
    allowed_mime_types AS tipos_mime_permitidos,
    created_at AS fecha_creacion
FROM storage.buckets
ORDER BY name;

-- ------------------------------------------------------------------------------
-- 8. INTEGRIDAD DE USUARIOS Y ROLES (AUTH VS PROFILES)
-- ------------------------------------------------------------------------------
-- Comprobar distribución de roles
SELECT
    COALESCE(role::text, 'sin_rol') AS rol,
    estado,
    COUNT(*) AS total_integrantes
FROM public.profiles
GROUP BY role, estado
ORDER BY total_integrantes DESC;

-- Comprobar si existen usuarios en auth sin fila en profiles (huérfanos)
SELECT
    u.id AS auth_user_id,
    u.email,
    u.created_at
FROM auth.users u
LEFT JOIN public.profiles p ON p.id = u.id
WHERE p.id IS NULL;

-- ------------------------------------------------------------------------------
-- 9. BALANCE Y INTEGRIDAD FINANCIERA (CAJAS Y MOVIMIENTOS)
-- ------------------------------------------------------------------------------
SELECT
    caja,
    tipo,
    COUNT(*) AS total_movimientos,
    SUM(monto) AS total_monto
FROM public.financial_records
GROUP BY caja, tipo
ORDER BY caja, tipo;

-- ------------------------------------------------------------------------------
-- 10. RESUMEN DE HOJAS DE CANTOS Y CANTORAL
-- ------------------------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM public.libro_cantos) AS total_cantos_en_libro,
    (SELECT COUNT(*) FROM public.hojas_cantos) AS total_hojas_creadas,
    (SELECT COUNT(*) FROM public.hoja_cantos_detalle) AS total_cantos_programados;
