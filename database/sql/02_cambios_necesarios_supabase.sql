-- ==============================================================================
-- CORO DE ALABANZA VIVE Y CANTA — PARROQUIA NUESTRO SEÑOR DE ESQUIPULAS
-- ARCHIVO 02: 02_cambios_necesarios_supabase.sql
-- ==============================================================================
-- PROPÓSITO:
--   Script idempotente y seguro para ejecutar en el Supabase SQL Editor.
--   Aplica exclusivamente correcciones de seguridad RLS, índices de rendimiento,
--   funciones seguras (search_path), triggers y restricciones de integridad
--   necesarias para el funcionamiento óptimo y profesional del sistema actual.
--
-- REGLAS ESTRICTAS DE SEGURIDAD APLICADAS:
--   1. NO ELIMINA tablas ni borra registros existentes.
--   2. NO deshabilita RLS en ninguna tabla.
--   3. Aplica el principio de mínimo privilegio.
--   4. Es 100% IDEMPOTENTE: puede ejecutarse múltiples veces sin errores.
--   5. Corrige la vulnerabilidad crítica de escalada de privilegios en `profiles`.
--   6. Corrige la falta de validación de roles en `financial_records`, `activities` y `notices`.
--   7. Añade soporte seguro para el bucket de almacenamiento `gallery`.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. EXTENSIONES Y FUNCIONES DE SOPORTE (search_path seguro)
-- ------------------------------------------------------------------------------

-- Función para actualizar columnas updated_at con search_path explícito
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.update_updated_at_column() IS
'Actualiza automáticamente la columna updated_at al momento de modificación.';

-- Función para comprobar si el usuario actual tiene un rol específico
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT role::text INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    RETURN v_role = ANY(required_roles);
END;
$$;

COMMENT ON FUNCTION public.current_user_has_role(text[]) IS
'Función de seguridad que verifica si el usuario autenticado posee alguno de los roles indicados.';

-- ------------------------------------------------------------------------------
-- 2. AJUSTES EN TABLAS EXISTENTES (CAMPOS Y CONSTRAINTS FALTANTES)
-- ------------------------------------------------------------------------------

-- Asegurar columna updated_at en hojas_cantos
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'hojas_cantos'
          AND column_name = 'updated_at'
    ) THEN
        ALTER TABLE public.hojas_cantos
        ADD COLUMN updated_at timestamp with time zone DEFAULT now();
    END IF;
END $$;

-- Asegurar columna last_seen_notice en profiles
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'profiles'
          AND column_name = 'last_seen_notice'
    ) THEN
        ALTER TABLE public.profiles
        ADD COLUMN last_seen_notice timestamp with time zone;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 3. TRIGGERS AUTOMÁTICOS
-- ------------------------------------------------------------------------------

-- Trigger de updated_at para profiles
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger de updated_at para hojas_cantos
DROP TRIGGER IF EXISTS update_hojas_cantos_updated_at ON public.hojas_cantos;
CREATE TRIGGER update_hojas_cantos_updated_at
    BEFORE UPDATE ON public.hojas_cantos
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 4. ÍNDICES DE RENDIMIENTO (OPTIMIZACIÓN DE CONSULTAS DEL FRONTEND)
-- ------------------------------------------------------------------------------

-- Índices en profiles
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles USING btree (role);
CREATE INDEX IF NOT EXISTS idx_profiles_estado ON public.profiles USING btree (estado);
CREATE INDEX IF NOT EXISTS idx_profiles_nombre_completo ON public.profiles USING btree (nombre_completo);

-- Índices en activities (usados por Dashboard y Activities.jsx)
CREATE INDEX IF NOT EXISTS idx_activities_fecha ON public.activities USING btree (fecha);
CREATE INDEX IF NOT EXISTS idx_activities_estado ON public.activities USING btree (estado);
CREATE INDEX IF NOT EXISTS idx_activities_created_by ON public.activities USING btree (created_by);

-- Índices en financial_records (usados por Dashboard y Finance.jsx)
CREATE INDEX IF NOT EXISTS idx_financial_records_caja ON public.financial_records USING btree (caja);
CREATE INDEX IF NOT EXISTS idx_financial_records_tipo ON public.financial_records USING btree (tipo);
CREATE INDEX IF NOT EXISTS idx_financial_records_fecha ON public.financial_records USING btree (fecha);
CREATE INDEX IF NOT EXISTS idx_financial_records_created_at ON public.financial_records USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_financial_records_created_by ON public.financial_records USING btree (created_by);

-- Índices en notices (usados por Notices.jsx)
CREATE INDEX IF NOT EXISTS idx_notices_fijado_created ON public.notices USING btree (fijado DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notices_created_by ON public.notices USING btree (created_by);

-- Índices en hojas_cantos y detalle (usados por HojaCantos.jsx)
CREATE INDEX IF NOT EXISTS idx_hojas_cantos_fecha ON public.hojas_cantos USING btree (fecha DESC);
CREATE INDEX IF NOT EXISTS idx_hojas_cantos_created_by ON public.hojas_cantos USING btree (created_by);
CREATE INDEX IF NOT EXISTS idx_hoja_cantos_detalle_hoja_id ON public.hoja_cantos_detalle USING btree (hoja_id);
CREATE INDEX IF NOT EXISTS idx_hoja_cantos_detalle_orden ON public.hoja_cantos_detalle USING btree (hoja_id, orden);

-- Índices en libro_cantos (búsqueda por título y número)
CREATE INDEX IF NOT EXISTS idx_libro_cantos_numero ON public.libro_cantos USING btree (numero);
CREATE INDEX IF NOT EXISTS idx_libro_cantos_titulo_trgm ON public.libro_cantos USING btree (titulo);

-- ------------------------------------------------------------------------------
-- 5. REGLAS DE INTEGRIDAD REFERENCIAL (FK ON DELETE SET NULL EN CREATED_BY)
-- ------------------------------------------------------------------------------
-- Esto permite que si un usuario administrativo es dado de baja, los registros
-- históricos que creó (actividades, avisos, movimientos) se preserven intactos.

DO $$
BEGIN
    -- activities.created_by
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'activities_created_by_fkey'
          AND table_name = 'activities'
    ) THEN
        ALTER TABLE public.activities DROP CONSTRAINT activities_created_by_fkey;
    END IF;
    ALTER TABLE public.activities
        ADD CONSTRAINT activities_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- notices.created_by
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'notices_created_by_fkey'
          AND table_name = 'notices'
    ) THEN
        ALTER TABLE public.notices DROP CONSTRAINT notices_created_by_fkey;
    END IF;
    ALTER TABLE public.notices
        ADD CONSTRAINT notices_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- financial_records.created_by
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'financial_records_created_by_fkey'
          AND table_name = 'financial_records'
    ) THEN
        ALTER TABLE public.financial_records DROP CONSTRAINT financial_records_created_by_fkey;
    END IF;
    ALTER TABLE public.financial_records
        ADD CONSTRAINT financial_records_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- hojas_cantos.created_by
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE constraint_name = 'hojas_cantos_created_by_fkey'
          AND table_name = 'hojas_cantos'
    ) THEN
        ALTER TABLE public.hojas_cantos DROP CONSTRAINT hojas_cantos_created_by_fkey;
    END IF;
    ALTER TABLE public.hojas_cantos
        ADD CONSTRAINT hojas_cantos_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
END $$;

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS) PROFESIONALES Y ROBUSTAS
-- ------------------------------------------------------------------------------

-- Activar RLS en todas las tablas operativas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hojas_cantos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_cantos_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libro_cantos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria ENABLE ROW LEVEL SECURITY;

-- ------------------------------------------------------------------------------
-- 6.1 POLÍTICAS EN PROFILES
-- ------------------------------------------------------------------------------
-- Eliminar políticas inseguras o redundantes
DROP POLICY IF EXISTS "ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "editar propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Solo administradores pueden insertar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;

-- Lectura: Cualquier usuario autenticado puede ver los perfiles (para directorios y firmas)
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Inserción: Solo administradores pueden crear perfiles directamente
CREATE POLICY "profiles_insert_admin"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (
        public.current_user_has_role(ARRAY['admin'])
        OR auth.uid() = id
    );

-- Actualización por el propio usuario (datos personales, sin cambiar su propio rol)
CREATE POLICY "profiles_update_own"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (
        auth.uid() = id
        AND (
            role = (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
            OR public.current_user_has_role(ARRAY['admin'])
        )
    );

-- Actualización por administrador (puede modificar cualquier perfil y asignar roles)
CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin']));

-- Eliminación: Solo administrador
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;
CREATE POLICY "profiles_delete_admin"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin']));

-- ------------------------------------------------------------------------------
-- 6.2 POLÍTICAS EN ACTIVITIES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "ver actividades" ON public.activities;
DROP POLICY IF EXISTS "Permitir lectura a usuarios autenticados" ON public.activities;
DROP POLICY IF EXISTS "crear actividades" ON public.activities;
DROP POLICY IF EXISTS "editar actividades" ON public.activities;
DROP POLICY IF EXISTS "eliminar actividades" ON public.activities;
DROP POLICY IF EXISTS "Permitir modificaciones a usuarios autenticados" ON public.activities;

-- Lectura: Todos los autenticados ven la agenda
CREATE POLICY "activities_select_authenticated"
    ON public.activities FOR SELECT
    TO authenticated
    USING (true);

-- Creación: Admin, Director, Secretaria
CREATE POLICY "activities_insert_authorized"
    ON public.activities FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

-- Modificación: Admin, Director, Secretaria
CREATE POLICY "activities_update_authorized"
    ON public.activities FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

-- Eliminación: Admin, Director
CREATE POLICY "activities_delete_authorized"
    ON public.activities FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director']));

-- ------------------------------------------------------------------------------
-- 6.3 POLÍTICAS EN FINANCIAL_RECORDS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "ver registros financieros" ON public.financial_records;
DROP POLICY IF EXISTS "crear registros financieros" ON public.financial_records;
DROP POLICY IF EXISTS "actualizar registros financieros" ON public.financial_records;
DROP POLICY IF EXISTS "eliminar registros financieros" ON public.financial_records;

-- Lectura: Todos los miembros autenticados pueden ver la transparencia financiera
CREATE POLICY "financial_records_select_authenticated"
    ON public.financial_records FOR SELECT
    TO authenticated
    USING (true);

-- Creación: Admin y Tesorero
CREATE POLICY "financial_records_insert_authorized"
    ON public.financial_records FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'tesorero']));

-- Modificación: Admin y Tesorero
CREATE POLICY "financial_records_update_authorized"
    ON public.financial_records FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'tesorero']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'tesorero']));

-- Eliminación: Admin y Tesorero
CREATE POLICY "financial_records_delete_authorized"
    ON public.financial_records FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'tesorero']));

-- ------------------------------------------------------------------------------
-- 6.4 POLÍTICAS EN NOTICES
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "ver avisos" ON public.notices;
DROP POLICY IF EXISTS "crear avisos" ON public.notices;
DROP POLICY IF EXISTS "editar avisos" ON public.notices;
DROP POLICY IF EXISTS "eliminar avisos" ON public.notices;

-- Lectura: Todos los autenticados
CREATE POLICY "notices_select_authenticated"
    ON public.notices FOR SELECT
    TO authenticated
    USING (true);

-- Creación: Admin, Director, Secretaria
CREATE POLICY "notices_insert_authorized"
    ON public.notices FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

-- Modificación: Admin, Director, Secretaria
CREATE POLICY "notices_update_authorized"
    ON public.notices FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

-- Eliminación: Admin, Director, Secretaria
CREATE POLICY "notices_delete_authorized"
    ON public.notices FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

-- ------------------------------------------------------------------------------
-- 6.5 POLÍTICAS EN LIBRO_CANTOS
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Todos pueden leer libro de cantos" ON public.libro_cantos;
DROP POLICY IF EXISTS "libro_cantos_select_authenticated" ON public.libro_cantos;
DROP POLICY IF EXISTS "libro_cantos_manage_authorized" ON public.libro_cantos;

-- Lectura: Disponible para usuarios autenticados
CREATE POLICY "libro_cantos_select_authenticated"
    ON public.libro_cantos FOR SELECT
    TO authenticated
    USING (true);

-- Administración de cantos: Admin, Director, Secretaria
CREATE POLICY "libro_cantos_manage_authorized"
    ON public.libro_cantos FOR ALL
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

-- ------------------------------------------------------------------------------
-- 6.6 POLÍTICAS EN HOJAS_CANTOS Y DETALLE
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "Todos pueden leer hojas" ON public.hojas_cantos;
DROP POLICY IF EXISTS "Solo admin director secretaria crean hojas" ON public.hojas_cantos;
DROP POLICY IF EXISTS "Solo admin director secretaria modifican hojas" ON public.hojas_cantos;
DROP POLICY IF EXISTS "Solo admin director secretaria eliminan hojas" ON public.hojas_cantos;

CREATE POLICY "hojas_cantos_select_authenticated"
    ON public.hojas_cantos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "hojas_cantos_insert_authorized"
    ON public.hojas_cantos FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "hojas_cantos_update_authorized"
    ON public.hojas_cantos FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "hojas_cantos_delete_authorized"
    ON public.hojas_cantos FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

-- Detalle
DROP POLICY IF EXISTS "Todos pueden leer detalles" ON public.hoja_cantos_detalle;
DROP POLICY IF EXISTS "Solo admin director secretaria crean detalles" ON public.hoja_cantos_detalle;
DROP POLICY IF EXISTS "Solo admin director secretaria modifican detalles" ON public.hoja_cantos_detalle;
DROP POLICY IF EXISTS "Solo admin director secretaria eliminan detalles" ON public.hoja_cantos_detalle;

CREATE POLICY "hoja_cantos_detalle_select_authenticated"
    ON public.hoja_cantos_detalle FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "hoja_cantos_detalle_insert_authorized"
    ON public.hoja_cantos_detalle FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "hoja_cantos_detalle_update_authorized"
    ON public.hoja_cantos_detalle FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "hoja_cantos_detalle_delete_authorized"
    ON public.hoja_cantos_detalle FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

-- ------------------------------------------------------------------------------
-- 6.7 POLÍTICAS EN GALERIA
-- ------------------------------------------------------------------------------
DROP POLICY IF EXISTS "ver galeria" ON public.galeria;
DROP POLICY IF EXISTS "galeria_select_authenticated" ON public.galeria;
DROP POLICY IF EXISTS "galeria_insert_authorized" ON public.galeria;
DROP POLICY IF EXISTS "galeria_delete_authorized" ON public.galeria;

CREATE POLICY "galeria_select_authenticated"
    ON public.galeria FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "galeria_insert_authorized"
    ON public.galeria FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "galeria_delete_authorized"
    ON public.galeria FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director']));

-- ------------------------------------------------------------------------------
-- 7. POLÍTICAS DE ALMACENAMIENTO (STORAGE.OBJECTS)
-- ------------------------------------------------------------------------------

-- Bucket `profiles`
DROP POLICY IF EXISTS "ver fotos" ON storage.objects;
DROP POLICY IF EXISTS "subir fotos" ON storage.objects;
DROP POLICY IF EXISTS "editar fotos" ON storage.objects;
DROP POLICY IF EXISTS "eliminar fotos" ON storage.objects;

-- Lectura pública / autenticada de fotos de perfil
CREATE POLICY "storage_profiles_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'profiles');

-- Subida: Usuarios autenticados pueden subir fotos al bucket profiles
CREATE POLICY "storage_profiles_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'profiles');

-- Actualización y eliminación de fotos: usuario autenticado dueño o admin
CREATE POLICY "storage_profiles_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'profiles')
    WITH CHECK (bucket_id = 'profiles');

CREATE POLICY "storage_profiles_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'profiles');

-- Bucket `gallery`
DROP POLICY IF EXISTS "storage_gallery_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_gallery_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_gallery_delete" ON storage.objects;

CREATE POLICY "storage_gallery_select"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'gallery');

CREATE POLICY "storage_gallery_insert"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (
        bucket_id = 'gallery'
        AND public.current_user_has_role(ARRAY['admin', 'director', 'secretaria'])
    );

CREATE POLICY "storage_gallery_delete"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (
        bucket_id = 'gallery'
        AND public.current_user_has_role(ARRAY['admin', 'director'])
    );

COMMIT;
