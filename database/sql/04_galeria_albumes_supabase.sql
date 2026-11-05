-- ==============================================================================
-- CORO DE ALABANZA VIVE Y CANTA — PARROQUIA NUESTRO SEÑOR DE ESQUIPULAS
-- ARCHIVO 04: 04_galeria_albumes_supabase.sql
-- ==============================================================================
-- PROPÓSITO:
--   Transformar el módulo Galería en un sistema profesional de Álbumes
--   Fotográficos por actividades, manteniendo compatibilidad total con las
--   fotografías individuales existentes en `public.galeria` y almacenando
--   los archivos organizados por álbum en el bucket `gallery` de Supabase Storage.
--
-- CARACTERÍSTICAS DE SEGURIDAD E INTEGRIDAD:
--   1. 100% IDEMPOTENTE: Puede ejecutarse varias veces sin errores.
--   2. NO elimina ni pierde las fotografías existentes en `public.galeria`.
--   3. Configura tablas `public.galeria_albumes` y `public.galeria_fotos`.
--   4. Activa y configura políticas RLS estrictas por rol:
--      - Lectura (SELECT): Todos los integrantes autenticados.
--      - Creación y Edición (INSERT/UPDATE): Admin, Director y Secretaria.
--      - Eliminación (DELETE): Admin y Director.
--   5. Configura políticas completas en `storage.objects` para el bucket `gallery`.
-- ==============================================================================

BEGIN;

-- ------------------------------------------------------------------------------
-- 1. FUNCIÓN DE VERIFICACIÓN DE ROLES Y TRIGGER UPDATED_AT (POR SEGURIDAD)
-- ------------------------------------------------------------------------------
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

    SELECT LOWER(TRIM(role::text)) INTO v_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF v_role IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_role = 'administrador' THEN
        v_role := 'admin';
    END IF;

    RETURN v_role = ANY(required_roles);
END;
$$;

-- ------------------------------------------------------------------------------
-- 2. TABLA PRINCIPAL DE ÁLBUMES: public.galeria_albumes
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galeria_albumes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    nombre text NOT NULL,
    descripcion text,
    fecha_actividad date NOT NULL DEFAULT CURRENT_DATE,
    lugar text,
    portada_url text,
    portada_storage_path text,
    creado_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.galeria_albumes IS
'Álbumes fotográficos por actividad del Coro de Alabanza Vive y Canta.';

-- Trigger automático para updated_at en galeria_albumes
DROP TRIGGER IF EXISTS update_galeria_albumes_updated_at ON public.galeria_albumes;
CREATE TRIGGER update_galeria_albumes_updated_at
    BEFORE UPDATE ON public.galeria_albumes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- ------------------------------------------------------------------------------
-- 3. TABLA DE FOTOGRAFÍAS POR ÁLBUM: public.galeria_fotos
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.galeria_fotos (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id uuid NOT NULL REFERENCES public.galeria_albumes(id) ON DELETE CASCADE,
    nombre_archivo text NOT NULL,
    ruta_storage text NOT NULL,
    imagen_url text NOT NULL,
    descripcion text,
    orden integer DEFAULT 1 NOT NULL,
    subido_por uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);

COMMENT ON TABLE public.galeria_fotos IS
'Fotografías asociadas a cada álbum en public.galeria_albumes.';

-- ------------------------------------------------------------------------------
-- 4. VINCULACIÓN Y MIGRACIÓN DE FOTOGRAFÍAS EXISTENTES EN public.galeria
-- ------------------------------------------------------------------------------
DO $$
DECLARE
    v_default_album_id uuid;
    v_first_image_url text;
    v_count integer;
    r_group record;
    v_new_album_id uuid;
BEGIN
    -- Agregar columna opcional album_id a public.galeria si no existe
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name = 'galeria'
          AND column_name = 'album_id'
    ) THEN
        ALTER TABLE public.galeria
        ADD COLUMN album_id uuid REFERENCES public.galeria_albumes(id) ON DELETE SET NULL;
    END IF;

    -- 4.1 Migrar álbumes creados en modo compatible (__VYC_ALBUM_JSON__:) hacia galeria_albumes y galeria_fotos
    FOR r_group IN
        SELECT
            (SUBSTRING(descripcion FROM 20)::jsonb)->>'albumKey' AS album_key,
            MAX((SUBSTRING(descripcion FROM 20)::jsonb)->>'nombre') AS nombre,
            MAX((SUBSTRING(descripcion FROM 20)::jsonb)->>'descripcion') AS descripcion_album,
            MAX((SUBSTRING(descripcion FROM 20)::jsonb)->>'fecha_actividad') AS fecha_actividad,
            MAX((SUBSTRING(descripcion FROM 20)::jsonb)->>'lugar') AS lugar,
            MAX((SUBSTRING(descripcion FROM 20)::jsonb)->>'portada_url') AS portada_url,
            MAX((SUBSTRING(descripcion FROM 20)::jsonb)->>'portada_storage_path') AS portada_storage_path,
            (ARRAY_AGG(uploaded_by))[1] AS creado_por,
            MIN(created_at) AS created_at
        FROM public.galeria
        WHERE album_id IS NULL
          AND descripcion LIKE '__VYC_ALBUM_JSON__:%'
        GROUP BY (SUBSTRING(descripcion FROM 20)::jsonb)->>'albumKey'
    LOOP
        INSERT INTO public.galeria_albumes (
            nombre,
            descripcion,
            fecha_actividad,
            lugar,
            portada_url,
            portada_storage_path,
            creado_por,
            created_at
        ) VALUES (
            COALESCE(NULLIF(TRIM(r_group.nombre), ''), 'Álbum de Actividad'),
            NULLIF(TRIM(r_group.descripcion_album), ''),
            COALESCE(NULLIF(r_group.fecha_actividad, '')::date, CURRENT_DATE),
            NULLIF(TRIM(r_group.lugar), ''),
            r_group.portada_url,
            r_group.portada_storage_path,
            r_group.creado_por,
            COALESCE(r_group.created_at, now())
        )
        RETURNING id INTO v_new_album_id;

        INSERT INTO public.galeria_fotos (
            album_id,
            nombre_archivo,
            ruta_storage,
            imagen_url,
            descripcion,
            orden,
            subido_por,
            created_at
        )
        SELECT
            v_new_album_id,
            COALESCE((SUBSTRING(g.descripcion FROM 20)::jsonb)->>'nombre_archivo', g.titulo, 'foto.jpg'),
            COALESCE(
                (SUBSTRING(g.descripcion FROM 20)::jsonb)->>'ruta_storage',
                SUBSTRING(g.imagen_url FROM '/storage/v1/object/public/gallery/(.*)$'),
                'galeria/foto-' || g.id::text
            ),
            g.imagen_url,
            NULLIF((SUBSTRING(g.descripcion FROM 20)::jsonb)->>'foto_descripcion', ''),
            COALESCE(((SUBSTRING(g.descripcion FROM 20)::jsonb)->>'orden')::integer, 1),
            g.uploaded_by,
            COALESCE(g.created_at, now())
        FROM public.galeria g
        WHERE g.album_id IS NULL
          AND g.descripcion LIKE '__VYC_ALBUM_JSON__:%'
          AND (SUBSTRING(g.descripcion FROM 20)::jsonb)->>'albumKey' = r_group.album_key
          AND COALESCE(((SUBSTRING(g.descripcion FROM 20)::jsonb)->>'isMetadataOnly')::boolean, false) = false;

        UPDATE public.galeria g
        SET album_id = v_new_album_id
        WHERE g.album_id IS NULL
          AND g.descripcion LIKE '__VYC_ALBUM_JSON__:%'
          AND (SUBSTRING(g.descripcion FROM 20)::jsonb)->>'albumKey' = r_group.album_key;
    END LOOP;

    -- 4.2 Verificar si existen fotografías individuales previas sin álbum asignado
    SELECT COUNT(*) INTO v_count
    FROM public.galeria
    WHERE album_id IS NULL
      AND (descripcion IS NULL OR descripcion NOT LIKE '__VYC_ALBUM_JSON__:%');

    IF v_count > 0 THEN
        -- Obtener la imagen más reciente para usarla como portada del álbum histórico
        SELECT imagen_url INTO v_first_image_url
        FROM public.galeria
        WHERE album_id IS NULL
          AND (descripcion IS NULL OR descripcion NOT LIKE '__VYC_ALBUM_JSON__:%')
        ORDER BY created_at DESC
        LIMIT 1;

        -- Crear un álbum para agrupar las fotografías previas sin perder ninguna
        INSERT INTO public.galeria_albumes (
            nombre,
            descripcion,
            fecha_actividad,
            lugar,
            portada_url
        ) VALUES (
            'Recuerdos Generales del Coro',
            'Fotografías históricas registradas previamente en la galería oficial del Coro Vive y Canta.',
            CURRENT_DATE,
            'Parroquia Nuestro Señor de Esquipulas',
            v_first_image_url
        )
        RETURNING id INTO v_default_album_id;

        -- Copiar esas fotografías a galeria_fotos conservando sus URLs y metadatos
        INSERT INTO public.galeria_fotos (
            album_id,
            nombre_archivo,
            ruta_storage,
            imagen_url,
            descripcion,
            orden,
            subido_por,
            created_at
        )
        SELECT
            v_default_album_id,
            COALESCE(NULLIF(TRIM(titulo), ''), 'fotografia-coro.jpg'),
            COALESCE(
                SUBSTRING(imagen_url FROM '/storage/v1/object/public/gallery/(.*)$'),
                'memories/legacy-' || id::text
            ),
            imagen_url,
            descripcion,
            ROW_NUMBER() OVER (ORDER BY created_at ASC),
            uploaded_by,
            COALESCE(created_at, now())
        FROM public.galeria
        WHERE album_id IS NULL
          AND (descripcion IS NULL OR descripcion NOT LIKE '__VYC_ALBUM_JSON__:%');

        -- Marcar las filas en public.galeria como vinculadas a este álbum
        UPDATE public.galeria
        SET album_id = v_default_album_id
        WHERE album_id IS NULL
          AND (descripcion IS NULL OR descripcion NOT LIKE '__VYC_ALBUM_JSON__:%');
    END IF;
END $$;

-- ------------------------------------------------------------------------------
-- 5. ÍNDICES DE RENDIMIENTO
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_galeria_albumes_fecha
    ON public.galeria_albumes USING btree (fecha_actividad DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_galeria_albumes_nombre
    ON public.galeria_albumes USING btree (nombre);

CREATE INDEX IF NOT EXISTS idx_galeria_albumes_creado_por
    ON public.galeria_albumes USING btree (creado_por);

CREATE INDEX IF NOT EXISTS idx_galeria_fotos_album_id_orden
    ON public.galeria_fotos USING btree (album_id, orden ASC, created_at ASC);

CREATE INDEX IF NOT EXISTS idx_galeria_fotos_subido_por
    ON public.galeria_fotos USING btree (subido_por);

-- ------------------------------------------------------------------------------
-- 6. POLÍTICAS DE ROW LEVEL SECURITY (RLS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.galeria_albumes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria_fotos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria ENABLE ROW LEVEL SECURITY;

-- 6.1 Políticas para public.galeria_albumes
DROP POLICY IF EXISTS "galeria_albumes_select_authenticated" ON public.galeria_albumes;
DROP POLICY IF EXISTS "galeria_albumes_insert_authorized" ON public.galeria_albumes;
DROP POLICY IF EXISTS "galeria_albumes_update_authorized" ON public.galeria_albumes;
DROP POLICY IF EXISTS "galeria_albumes_delete_authorized" ON public.galeria_albumes;

CREATE POLICY "galeria_albumes_select_authenticated"
    ON public.galeria_albumes FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "galeria_albumes_insert_authorized"
    ON public.galeria_albumes FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "galeria_albumes_update_authorized"
    ON public.galeria_albumes FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "galeria_albumes_delete_authorized"
    ON public.galeria_albumes FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director']));

-- 6.2 Políticas para public.galeria_fotos
DROP POLICY IF EXISTS "galeria_fotos_select_authenticated" ON public.galeria_fotos;
DROP POLICY IF EXISTS "galeria_fotos_insert_authorized" ON public.galeria_fotos;
DROP POLICY IF EXISTS "galeria_fotos_update_authorized" ON public.galeria_fotos;
DROP POLICY IF EXISTS "galeria_fotos_delete_authorized" ON public.galeria_fotos;

CREATE POLICY "galeria_fotos_select_authenticated"
    ON public.galeria_fotos FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "galeria_fotos_insert_authorized"
    ON public.galeria_fotos FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "galeria_fotos_update_authorized"
    ON public.galeria_fotos FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "galeria_fotos_delete_authorized"
    ON public.galeria_fotos FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director']));

-- 6.3 Asegurar políticas completas en tabla heredada public.galeria
DROP POLICY IF EXISTS "galeria_select_authenticated" ON public.galeria;
DROP POLICY IF EXISTS "galeria_insert_authorized" ON public.galeria;
DROP POLICY IF EXISTS "galeria_update_authorized" ON public.galeria;
DROP POLICY IF EXISTS "galeria_delete_authorized" ON public.galeria;

CREATE POLICY "galeria_select_authenticated"
    ON public.galeria FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "galeria_insert_authorized"
    ON public.galeria FOR INSERT
    TO authenticated
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "galeria_update_authorized"
    ON public.galeria FOR UPDATE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']))
    WITH CHECK (public.current_user_has_role(ARRAY['admin', 'director', 'secretaria']));

CREATE POLICY "galeria_delete_authorized"
    ON public.galeria FOR DELETE
    TO authenticated
    USING (public.current_user_has_role(ARRAY['admin', 'director']));

-- ------------------------------------------------------------------------------
-- 7. BUCKET Y POLÍTICAS DE SUPABASE STORAGE (`gallery`)
-- ------------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'gallery',
    'gallery',
    true,
    15728640, -- 15 MB por imagen
    ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = COALESCE(storage.buckets.file_size_limit, 15728640),
    allowed_mime_types = COALESCE(storage.buckets.allowed_mime_types, ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);

DROP POLICY IF EXISTS "storage_gallery_select" ON storage.objects;
DROP POLICY IF EXISTS "storage_gallery_insert" ON storage.objects;
DROP POLICY IF EXISTS "storage_gallery_update" ON storage.objects;
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

CREATE POLICY "storage_gallery_update"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (
        bucket_id = 'gallery'
        AND public.current_user_has_role(ARRAY['admin', 'director', 'secretaria'])
    )
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
