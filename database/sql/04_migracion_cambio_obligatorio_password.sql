-- ==============================================================================
-- CORO DE ALABANZA VIVE Y CANTA — PARROQUIA NUESTRO SEÑOR DE ESQUIPULAS
-- ARCHIVO: 04_migracion_cambio_obligatorio_password.sql
-- ==============================================================================
-- PROPÓSITO:
--   1. Activar el cambio obligatorio de contraseña (`debe_cambiar_password = true`)
--      para TODOS los usuarios actuales del sistema (Administrador, Director,
--      Tesorero, Secretaria, Párroco e Integrantes) sin invalidar su contraseña
--      actual antes de que inicien sesión.
--   2. Garantizar que todo nuevo integrante creado tenga `debe_cambiar_password = true`
--      por defecto de forma permanente.
--   3. Proteger la integridad histórica del coro: configurar todas las claves
--      foráneas hacia `public.profiles(id)` con `ON DELETE SET NULL` para que
--      eliminar una cuenta jamás borre movimientos financieros, actividades,
--      avisos, hojas de cantos ni fotografías.
--   4. Implementar controles de seguridad a nivel de motor PostgreSQL (Triggers
--      y funciones RPC SECURITY DEFINER):
--      - Impedir que un integrante modifique su propio rol, usuario o estado.
--      - Impedir que un administrador elimine o desactive su propia cuenta.
--      - Impedir que se elimine o degrade al último administrador activo.
--      - Proveer procedimiento controlado `complete_mandatory_password_change()`
--        para actualizar `debe_cambiar_password = false` tras el cambio en Auth.
--
-- SEPARACIÓN ARQUITECTÓNICA (LO QUE YA EXISTE VS LO QUE SE AGREGA):
--   [YA EXISTE EN LA BASE DE DATOS]:
--     - Tabla `public.profiles` con columna `debe_cambiar_password boolean DEFAULT true`.
--     - Tipos ENUM `public.user_role` y `public.integrante_estado`.
--     - 37 usuarios en `auth.users` vinculados por UUID a `public.profiles`.
--     - Mecanismo de inicio de sesión por nombre de usuario (`usuario@viveycanta.app`).
--     - Bucket de almacenamiento `profiles` en Supabase Storage.
--   [SE AGREGA / ACTUALIZA EN ESTE SCRIPT]:
--     - Actualización masiva segura de `debe_cambiar_password = true` para los
--       perfiles existentes (sin alterar UUIDs, roles ni contraseñas en `auth.users`).
--     - Reglas `ON DELETE SET NULL` en todas las tablas históricas vinculadas a `profiles`.
--     - Función RPC `public.complete_mandatory_password_change()`.
--     - Función RPC `public.get_member_dependencies_summary(uuid)` para auditar
--       registros históricos antes de desactivar o eliminar un integrante.
--     - Trigger `trg_enforce_profile_security` para blindar roles, estado y
--       proteger al último administrador activo.
--
-- PRECAUCIÓN:
--   Revisar este script antes de ejecutarlo en el SQL Editor de producción.
--   Es 100% idempotente y se ejecuta dentro de una transacción segura (BEGIN/COMMIT).
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. FUNCIÓN DE VERIFICACIÓN DE ROL DEL SOLICITANTE (SECURITY DEFINER)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.current_user_has_role(required_roles text[])
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_role text;
    v_estado text;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN FALSE;
    END IF;

    SELECT LOWER(TRIM(role::text)), LOWER(TRIM(COALESCE(estado::text, 'activo')))
    INTO v_role, v_estado
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role IS NULL OR v_estado = 'retirado' THEN
        RETURN FALSE;
    END IF;

    IF v_role = 'administrador' THEN
        v_role := 'admin';
    END IF;

    RETURN v_role = ANY(required_roles);
END;
$$;

COMMENT ON FUNCTION public.current_user_has_role(text[]) IS
'Verifica en el servidor si el usuario autenticado está activo y posee alguno de los roles requeridos.';

-- ------------------------------------------------------------------------------
-- 2. ASEGURAR COLUMNAS Y VALORES POR DEFECTO EN public.profiles
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles
    ALTER COLUMN debe_cambiar_password SET DEFAULT true;

-- Garantizar que ningún registro tenga NULL en debe_cambiar_password
UPDATE public.profiles
SET debe_cambiar_password = true
WHERE debe_cambiar_password IS NULL;

-- ------------------------------------------------------------------------------
-- 3. ACTIVAR CAMBIO OBLIGATORIO DE CONTRASEÑA PARA TODOS LOS USUARIOS ACTUALES
-- ------------------------------------------------------------------------------
-- IMPORTANTE: No se modifica `auth.users.encrypted_password`, ni los UUIDs,
-- ni los roles, ni los nombres de usuario. Todos los usuarios actuales podrán
-- iniciar sesión con su contraseña actual por última vez y serán redirigidos
-- de forma obligatoria a la pantalla de actualización de contraseña personal.
UPDATE public.profiles
SET debe_cambiar_password = true,
    updated_at = NOW();

-- ------------------------------------------------------------------------------
-- 4. PROTECCIÓN DEL HISTORIAL DEL CORO (CLAVES FORÁNEAS ON DELETE SET NULL)
-- ------------------------------------------------------------------------------
-- Garantiza que si se elimina una cuenta de integrante, JAMÁS se borren
-- movimientos financieros, actividades, avisos, hojas de cantos ni fotos.
DO $$
BEGIN
    -- 4.1 public.activities.created_by -> ON DELETE SET NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'activities'
          AND constraint_name = 'activities_created_by_fkey'
    ) THEN
        ALTER TABLE public.activities DROP CONSTRAINT activities_created_by_fkey;
    END IF;
    ALTER TABLE public.activities
        ADD CONSTRAINT activities_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- 4.2 public.financial_records.created_by -> ON DELETE SET NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'financial_records'
          AND constraint_name = 'financial_records_created_by_fkey'
    ) THEN
        ALTER TABLE public.financial_records DROP CONSTRAINT financial_records_created_by_fkey;
    END IF;
    ALTER TABLE public.financial_records
        ADD CONSTRAINT financial_records_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- 4.3 public.notices.created_by -> ON DELETE SET NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'notices'
          AND constraint_name = 'notices_created_by_fkey'
    ) THEN
        ALTER TABLE public.notices DROP CONSTRAINT notices_created_by_fkey;
    END IF;
    ALTER TABLE public.notices
        ADD CONSTRAINT notices_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- 4.4 public.hojas_cantos.created_by -> ON DELETE SET NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'hojas_cantos'
          AND constraint_name = 'hojas_cantos_created_by_fkey'
    ) THEN
        ALTER TABLE public.hojas_cantos DROP CONSTRAINT hojas_cantos_created_by_fkey;
    END IF;
    ALTER TABLE public.hojas_cantos
        ADD CONSTRAINT hojas_cantos_created_by_fkey
        FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- 4.5 public.galeria.uploaded_by -> ON DELETE SET NULL
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'galeria'
          AND constraint_name = 'galeria_uploaded_by_fkey'
    ) THEN
        ALTER TABLE public.galeria DROP CONSTRAINT galeria_uploaded_by_fkey;
    END IF;
    ALTER TABLE public.galeria
        ADD CONSTRAINT galeria_uploaded_by_fkey
        FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

    -- 4.6 Tablas legadas (por seguridad si tienen constraint hacia profiles)
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'actividades'
          AND constraint_name = 'actividades_created_by_fkey'
    ) THEN
        ALTER TABLE public.actividades DROP CONSTRAINT actividades_created_by_fkey;
        ALTER TABLE public.actividades
            ADD CONSTRAINT actividades_created_by_fkey
            FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'actividades'
          AND constraint_name = 'actividades_responsable_fkey'
    ) THEN
        ALTER TABLE public.actividades DROP CONSTRAINT actividades_responsable_fkey;
        ALTER TABLE public.actividades
            ADD CONSTRAINT actividades_responsable_fkey
            FOREIGN KEY (responsable) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'avisos'
          AND constraint_name = 'avisos_publicado_por_fkey'
    ) THEN
        ALTER TABLE public.avisos DROP CONSTRAINT avisos_publicado_por_fkey;
        ALTER TABLE public.avisos
            ADD CONSTRAINT avisos_publicado_por_fkey
            FOREIGN KEY (publicado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints
        WHERE table_schema = 'public' AND table_name = 'movimientos_financieros'
          AND constraint_name = 'movimientos_financieros_registrado_por_fkey'
    ) THEN
        ALTER TABLE public.movimientos_financieros DROP CONSTRAINT movimientos_financieros_registrado_por_fkey;
        ALTER TABLE public.movimientos_financieros
            ADD CONSTRAINT movimientos_financieros_registrado_por_fkey
            FOREIGN KEY (registrado_por) REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. PROCEDIMIENTO SEGURO PARA COMPLETAR EL CAMBIO DE CONTRASEÑA OBLIGATORIO
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.complete_mandatory_password_change()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_uid uuid;
BEGIN
    v_uid := auth.uid();
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'No existe una sesión autenticada válida.';
    END IF;

    UPDATE public.profiles
    SET debe_cambiar_password = false,
        updated_at = NOW()
    WHERE id = v_uid;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'No se encontró el perfil del usuario autenticado.';
    END IF;

    RETURN TRUE;
END;
$$;

REVOKE ALL ON FUNCTION public.complete_mandatory_password_change() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.complete_mandatory_password_change() TO authenticated;

COMMENT ON FUNCTION public.complete_mandatory_password_change() IS
'Marca debe_cambiar_password = false de manera controlada para el usuario autenticado después de actualizar su contraseña en Supabase Auth.';

-- ------------------------------------------------------------------------------
-- 6. FUNCIÓN DE AUDITORÍA DE HISTORIAL ASOCIADO A UN INTEGRANTE
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_member_dependencies_summary(p_member_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_activities integer := 0;
    v_finance integer := 0;
    v_notices integer := 0;
    v_cantos integer := 0;
    v_gallery integer := 0;
    v_total integer := 0;
BEGIN
    IF NOT public.current_user_has_role(ARRAY['admin']) THEN
        RAISE EXCEPTION 'Acceso denegado: solo los administradores pueden consultar dependencias.';
    END IF;

    SELECT COUNT(*) INTO v_activities FROM public.activities WHERE created_by = p_member_id;
    SELECT COUNT(*) INTO v_finance FROM public.financial_records WHERE created_by = p_member_id;
    SELECT COUNT(*) INTO v_notices FROM public.notices WHERE created_by = p_member_id;
    SELECT COUNT(*) INTO v_cantos FROM public.hojas_cantos WHERE created_by = p_member_id;
    SELECT COUNT(*) INTO v_gallery FROM public.galeria WHERE uploaded_by = p_member_id;

    v_total := v_activities + v_finance + v_notices + v_cantos + v_gallery;

    RETURN jsonb_build_object(
        'activities', v_activities,
        'financial_records', v_finance,
        'notices', v_notices,
        'hojas_cantos', v_cantos,
        'gallery', v_gallery,
        'total', v_total,
        'has_history', (v_total > 0)
    );
END;
$$;

REVOKE ALL ON FUNCTION public.get_member_dependencies_summary(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_member_dependencies_summary(uuid) TO authenticated;

-- ------------------------------------------------------------------------------
-- 7. TRIGGER DE BLINDAJE DE SEGURIDAD EN public.profiles
-- ------------------------------------------------------------------------------
-- Protege contra:
--   a) Escalada de privilegios (un no-admin intentando cambiar su rol, estado o usuario).
--   b) Auto-eliminación del administrador actual.
--   c) Eliminación o desactivación del último administrador activo del sistema.
CREATE OR REPLACE FUNCTION public.enforce_profile_security_rules()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_is_admin boolean;
    v_remaining_admins integer;
BEGIN
    -- Permitir operaciones internas del motor / service_role cuando auth.uid() es NULL
    -- pero siempre protegiendo al último administrador activo.
    v_is_admin := public.current_user_has_role(ARRAY['admin']);

    IF TG_OP = 'DELETE' THEN
        -- No permitir que un administrador elimine su propia cuenta desde sesión activa
        IF auth.uid() IS NOT NULL AND OLD.id = auth.uid() THEN
            RAISE EXCEPTION 'Operación bloqueada: No puedes eliminar tu propia cuenta de administrador.';
        END IF;

        -- No permitir eliminar al último administrador activo
        IF OLD.role = 'admin'::public.user_role AND COALESCE(OLD.estado, 'activo'::public.integrante_estado) = 'activo'::public.integrante_estado THEN
            SELECT COUNT(*) INTO v_remaining_admins
            FROM public.profiles
            WHERE role = 'admin'::public.user_role
              AND COALESCE(estado, 'activo'::public.integrante_estado) = 'activo'::public.integrante_estado
              AND id <> OLD.id;

            IF v_remaining_admins < 1 THEN
                RAISE EXCEPTION 'Operación bloqueada: No se puede eliminar al último administrador activo del sistema.';
            END IF;
        END IF;

        RETURN OLD;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        -- Si hay un usuario autenticado en sesión y NO es administrador:
        IF auth.uid() IS NOT NULL AND NOT v_is_admin THEN
            IF NEW.id <> auth.uid() THEN
                RAISE EXCEPTION 'Operación bloqueada: No tienes permisos para modificar el perfil de otro integrante.';
            END IF;

            IF NEW.role IS DISTINCT FROM OLD.role THEN
                RAISE EXCEPTION 'Operación bloqueada: No tienes permisos para modificar tu rol en el sistema.';
            END IF;

            IF NEW.usuario IS DISTINCT FROM OLD.usuario THEN
                RAISE EXCEPTION 'Operación bloqueada: El nombre de usuario solo puede ser administrado por un administrador.';
            END IF;

            IF NEW.estado IS DISTINCT FROM OLD.estado THEN
                RAISE EXCEPTION 'Operación bloqueada: No puedes modificar el estado administrativo de tu cuenta.';
            END IF;
        END IF;

        -- Proteger al último administrador activo contra cambio de rol o desactivación
        IF OLD.role = 'admin'::public.user_role
           AND COALESCE(OLD.estado, 'activo'::public.integrante_estado) = 'activo'::public.integrante_estado
           AND (
               NEW.role <> 'admin'::public.user_role
               OR COALESCE(NEW.estado, 'activo'::public.integrante_estado) <> 'activo'::public.integrante_estado
           )
        THEN
            SELECT COUNT(*) INTO v_remaining_admins
            FROM public.profiles
            WHERE role = 'admin'::public.user_role
              AND COALESCE(estado, 'activo'::public.integrante_estado) = 'activo'::public.integrante_estado
              AND id <> OLD.id;

            IF v_remaining_admins < 1 THEN
                RAISE EXCEPTION 'Operación bloqueada: El sistema debe conservar al menos un administrador activo.';
            END IF;
        END IF;

        RETURN NEW;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_profile_security ON public.profiles;
CREATE TRIGGER trg_enforce_profile_security
    BEFORE UPDATE OR DELETE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.enforce_profile_security_rules();

-- ------------------------------------------------------------------------------
-- 8. POLÍTICAS RLS EN public.profiles Y STORAGE BUCKET `profiles`
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ver perfiles" ON public.profiles;
DROP POLICY IF EXISTS "editar propio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update roles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Solo administradores pueden insertar perfiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_authenticated" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON public.profiles;

-- Lectura: Usuarios autenticados
CREATE POLICY "profiles_select_authenticated"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (true);

-- Inserción: Solo Administradores
CREATE POLICY "profiles_insert_admin"
    ON public.profiles FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin']));

-- Actualización propia: El usuario puede actualizar sus propios datos personales
-- (el trigger `trg_enforce_profile_security` impide que cambie su rol, estado o usuario)
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

-- Actualización administrativa: El Administrador puede editar cualquier perfil
CREATE POLICY "profiles_update_admin"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin']));

-- Eliminación administrativa: Solo el Administrador (sujeto al trigger de seguridad)
CREATE POLICY "profiles_delete_admin"
    ON public.profiles FOR DELETE
    TO authenticated
    USING (
        public.current_user_has_role(ARRAY['admin'])
        AND id <> auth.uid()
    );

COMMIT;
