-- ============================================================================
-- DOCUMENTACIÓN DE ESTRUCTURA EXISTENTE DE BASE DE DATOS
-- PROYECTO: Sistema Coro Vive y Canta
-- ============================================================================
--
-- ARCHIVO DE REFERENCIA TÉCNICA - NO EJECUTAR EN PRODUCCIÓN
--
-- ¡¡¡ ADVERTENCIA CRÍTICA EN MAYÚSCULAS !!!
-- ESTE SCRIPT ES EXCLUSIVAMENTE UN DOCUMENTO DE CONSULTA Y AUDITORÍA.
-- BAJO NINGUNA CIRCUNSTANCIA DEBE EJECUTARSE DIRECTAMENTE SOBRE LA BASE DE DATOS
-- DE PRODUCCIÓN, YA QUE INTENTARÍA CREAR OBJETOS YA EXISTENTES (TIPOS ENUM,
-- TABLAS, ÍNDICES, DISPARADORES, POLÍTICAS RLS, ETC.), CAUSANDO ERRORES DE
-- CONFLICTO O POSIBLES INCONSISTENCIAS DE ESTADO.
--
-- FUENTE Y METADATOS DEL BACKUP:
-- - Archivo de origen: db_cluster-27-08-2026@06-47-34.backup-Vive y Canta
-- - Formato: Backup en texto plano generado con pg_dumpall sobre Supabase
-- - Fecha del backup: 27 de agosto de 2026
-- - Conteo de registros en el backup al momento de la extracción:
--     * auth.users: 37 usuarios registrados
--     * public.profiles: 37 perfiles asociados
--         Distribución de roles:
--           - admin: 1
--           - secretaria: 1
--           - director: 1
--           - tesorero: 1
--           - parroco: 1
--           - integrante: 32
--     * public.activities: 2 filas (tabla usada en frontend actual)
--     * public.actividades: 0 filas (tabla legada / sin uso)
--     * public.avisos: 0 filas (tabla legada / sin uso)
--     * public.caja_general: 1 fila (saldo: 0.00, tabla legada / desconectada)
--     * public.financial_records: 0 filas (tabla usada en frontend actual)
--     * public.galeria: 0 filas (marcador de pantalla sin consultas)
--     * public.hoja_cantos_detalle: 7 filas (tabla usada en frontend actual)
--     * public.hojas_cantos: 1 fila (tabla usada en frontend actual)
--     * public.libro_cantos: 992 cantos (secuencia libro_cantos_id_seq en 1979)
--     * public.movimientos_financieros: 0 filas (tabla legada / sin uso)
--     * public.notices: 0 filas (tabla usada en frontend actual)
--     * public.reportes: 0 filas (tabla legada / sin uso)
--     * storage.buckets: 'profiles' (public), 'gallery' (public)
--
-- NOTA DE ALCANCE:
-- Este documento refleja la estructura exacta extraída del backup del 27-08-2026.
-- NO representa necesariamente el estado actual de la base de datos de producción,
-- la cual pudo haber recibido modificaciones posteriores.
-- ============================================================================

-- Mecanismo de protección: abortar ejecución accidental inmediata
DO $$ BEGIN RAISE EXCEPTION 'Archivo de documentación: NO ejecutar (01_estructura_existente.sql)'; END $$;


-- ============================================================================
-- SECCIÓN 1: TIPOS ENUM
-- ============================================================================

CREATE TYPE public.actividad_estado AS ENUM (
    'programada',
    'finalizada',
    'cancelada'
);

CREATE TYPE public.actividad_tipo AS ENUM (
    'misa',
    'concierto',
    'ensayo',
    'quince_anios',
    'cuarenta_dias',
    'actividad_economica',
    'reunion'
);

CREATE TYPE public.integrante_estado AS ENUM (
    'activo',
    'permiso',
    'retirado'
);

CREATE TYPE public.movimiento_tipo AS ENUM (
    'ingreso',
    'gasto'
);

CREATE TYPE public.prioridad_aviso AS ENUM (
    'normal',
    'importante',
    'urgente'
);

CREATE TYPE public.user_role AS ENUM (
    'admin',
    'secretaria',
    'director',
    'tesorero',
    'integrante',
    'parroco'
);


-- ============================================================================
-- SECCIÓN 2: FUNCIONES
-- ============================================================================

CREATE FUNCTION public.actualizar_caja() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin

    update caja_general
    set saldo = (
        select coalesce(sum(balance),0)
        from actividades
        where estado != 'cancelada'
    ),
    updated_at = now();

    return new;
end;
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;


-- ============================================================================
-- SECCIÓN 3: TABLAS
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Tabla: public.actividades
-- Filas en backup: 0
-- Frontend actual: SIN USO en el código actual (LEGADO / DUPLICADA con 'activities')
-- ----------------------------------------------------------------------------
CREATE TABLE public.actividades (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(255) NOT NULL,
    tipo public.actividad_tipo NOT NULL,
    descripcion text,
    fecha date NOT NULL,
    hora time without time zone NOT NULL,
    lugar character varying(255),
    responsable uuid,
    estado public.actividad_estado DEFAULT 'programada'::public.actividad_estado,
    ingreso numeric(10,2) DEFAULT 0,
    gasto numeric(10,2) DEFAULT 0,
    balance numeric(10,2) GENERATED ALWAYS AS ((ingreso - gasto)) STORED,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.activities
-- Filas en backup: 2
-- Frontend actual: USADA activamente por el frontend actual
-- ----------------------------------------------------------------------------
CREATE TABLE public.activities (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    descripcion text,
    tipo text NOT NULL,
    lugar text NOT NULL,
    fecha date NOT NULL,
    hora text NOT NULL,
    responsable text,
    estado text DEFAULT 'pendiente'::text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.avisos
-- Filas en backup: 0
-- Frontend actual: SIN USO en el código actual (LEGADO / DUPLICADA con 'notices')
-- ----------------------------------------------------------------------------
CREATE TABLE public.avisos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(255) NOT NULL,
    mensaje text NOT NULL,
    imagen_url text,
    prioridad public.prioridad_aviso DEFAULT 'normal'::public.prioridad_aviso,
    publicado_por uuid,
    fecha_publicacion timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.caja_general
-- Filas en backup: 1 (saldo: 0.00)
-- Frontend actual: SIN USO en el código actual (LEGADO / DESCONECTADA)
-- ----------------------------------------------------------------------------
CREATE TABLE public.caja_general (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    saldo numeric(12,2) DEFAULT 0,
    updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.financial_records
-- Filas en backup: 0
-- Frontend actual: USADA activamente por el frontend actual
-- ----------------------------------------------------------------------------
CREATE TABLE public.financial_records (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tipo text NOT NULL,
    monto numeric(10,2) NOT NULL,
    descripcion text,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now(),
    categoria text,
    fecha date DEFAULT CURRENT_DATE,
    actividad text,
    caja text DEFAULT 'operativa'::text NOT NULL,
    CONSTRAINT financial_records_caja_check CHECK ((caja = ANY (ARRAY['operativa'::text, 'inversiones'::text])))
);

-- ----------------------------------------------------------------------------
-- Tabla: public.galeria
-- Filas en backup: 0
-- Frontend actual: SIN USO en el código actual (pantalla Galería es un marcador sin consultas)
-- ----------------------------------------------------------------------------
CREATE TABLE public.galeria (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo character varying(255),
    descripcion text,
    imagen_url text NOT NULL,
    uploaded_by uuid,
    created_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.hoja_cantos_detalle
-- Filas en backup: 7
-- Frontend actual: USADA activamente por el frontend actual
-- ----------------------------------------------------------------------------
CREATE TABLE public.hoja_cantos_detalle (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    hoja_id uuid,
    tipo text NOT NULL,
    numero_canto integer,
    texto_manual text,
    orden integer DEFAULT 1,
    created_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.hojas_cantos
-- Filas en backup: 1
-- Frontend actual: USADA activamente por el frontend actual
-- ----------------------------------------------------------------------------
CREATE TABLE public.hojas_cantos (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    fecha date NOT NULL,
    hora time without time zone,
    celebracion text NOT NULL,
    lugar text,
    observaciones text,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.libro_cantos
-- Filas en backup: 992 (secuencia libro_cantos_id_seq en 1979)
-- Frontend actual: USADA activamente por el frontend actual
-- ----------------------------------------------------------------------------
CREATE TABLE public.libro_cantos (
    id bigint NOT NULL,
    numero integer NOT NULL,
    titulo text NOT NULL,
    categoria text,
    observaciones text,
    created_at timestamp with time zone DEFAULT now(),
    letra text,
    letra_markdown text,
    tono text,
    compositor text
);

-- ----------------------------------------------------------------------------
-- Tabla: public.movimientos_financieros
-- Filas en backup: 0
-- Frontend actual: SIN USO en el código actual (LEGADO / DUPLICADA con 'financial_records')
-- ----------------------------------------------------------------------------
CREATE TABLE public.movimientos_financieros (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    actividad_id uuid,
    tipo public.movimiento_tipo NOT NULL,
    monto numeric(10,2) NOT NULL,
    descripcion text,
    registrado_por uuid,
    fecha timestamp with time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.notices
-- Filas en backup: 0
-- Frontend actual: USADA activamente por el frontend actual
-- ----------------------------------------------------------------------------
CREATE TABLE public.notices (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    titulo text NOT NULL,
    mensaje text NOT NULL,
    prioridad text DEFAULT 'media'::text,
    imagen text,
    fijado boolean DEFAULT false,
    created_by uuid,
    created_at timestamp without time zone DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Tabla: public.profiles
-- Filas en backup: 37 (auth.users: 37; admin: 1, secretaria: 1, director: 1, tesorero: 1, parroco: 1, integrante: 32)
-- Frontend actual: USADA activamente por el frontend actual
-- ----------------------------------------------------------------------------
CREATE TABLE public.profiles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    usuario character varying(100) NOT NULL,
    nombre_completo character varying(255) NOT NULL,
    email character varying(255),
    telefono character varying(30),
    edad integer,
    fecha_nacimiento date,
    tipo_sangre character varying(10),
    direccion text,
    sexo character varying(20),
    fecha_ingreso date DEFAULT CURRENT_DATE,
    estado public.integrante_estado DEFAULT 'activo'::public.integrante_estado,
    contacto_emergencia_nombre character varying(255),
    contacto_emergencia_telefono character varying(30),
    foto_url text,
    role public.user_role DEFAULT 'integrante'::public.user_role,
    debe_cambiar_password boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    foto text,
    dni text,
    ministerio text,
    instrumento text,
    voz text,
    contacto_emergencia text,
    telefono_emergencia text,
    last_seen_notice timestamp with time zone
);

-- ----------------------------------------------------------------------------
-- Tabla: public.reportes
-- Filas en backup: 0
-- Frontend actual: SIN USO en el código actual (LEGADO / SIN USO)
-- ----------------------------------------------------------------------------
CREATE TABLE public.reportes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    mes integer,
    anio integer,
    total_ingresos numeric(10,2) DEFAULT 0,
    total_gastos numeric(10,2) DEFAULT 0,
    balance_total numeric(10,2) DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


-- ============================================================================
-- SECCIÓN 4: SECUENCIAS Y DEFAULTS
-- ============================================================================

CREATE SEQUENCE public.libro_cantos_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

ALTER SEQUENCE public.libro_cantos_id_seq OWNED BY public.libro_cantos.id;

ALTER TABLE ONLY public.libro_cantos ALTER COLUMN id SET DEFAULT nextval('public.libro_cantos_id_seq'::regclass);

-- Estado de la secuencia registrado en el backup al 27-08-2026:
-- SELECT pg_catalog.setval('public.libro_cantos_id_seq', 1979, true);


-- ============================================================================
-- SECCIÓN 5: CLAVES PRIMARIAS Y RESTRICCIONES UNIQUE
-- ============================================================================

ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.avisos
    ADD CONSTRAINT avisos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.caja_general
    ADD CONSTRAINT caja_general_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.galeria
    ADD CONSTRAINT galeria_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hoja_cantos_detalle
    ADD CONSTRAINT hoja_cantos_detalle_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.hojas_cantos
    ADD CONSTRAINT hojas_cantos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.libro_cantos
    ADD CONSTRAINT libro_cantos_numero_key UNIQUE (numero);

ALTER TABLE ONLY public.libro_cantos
    ADD CONSTRAINT libro_cantos_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.movimientos_financieros
    ADD CONSTRAINT movimientos_financieros_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_pkey PRIMARY KEY (id);

ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_usuario_key UNIQUE (usuario);

ALTER TABLE ONLY public.reportes
    ADD CONSTRAINT reportes_pkey PRIMARY KEY (id);


-- ============================================================================
-- SECCIÓN 6: ÍNDICES
-- ============================================================================

CREATE INDEX idx_financial_records_caja ON public.financial_records USING btree (caja);

CREATE INDEX idx_libro_cantos_numero ON public.libro_cantos USING btree (numero);


-- ============================================================================
-- SECCIÓN 7: CLAVES FORÁNEAS (FOREIGN KEYS)
-- ============================================================================
-- Nota: Las claves sin cláusula explícita ON DELETE asumen el comportamiento
-- estándar de PostgreSQL (NO ACTION / RESTRICT por defecto).

-- actividades.created_by -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- actividades.responsable -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.actividades
    ADD CONSTRAINT actividades_responsable_fkey FOREIGN KEY (responsable) REFERENCES public.profiles(id);

-- activities.created_by -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.activities
    ADD CONSTRAINT activities_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- avisos.publicado_por -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.avisos
    ADD CONSTRAINT avisos_publicado_por_fkey FOREIGN KEY (publicado_por) REFERENCES public.profiles(id);

-- financial_records.created_by -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.financial_records
    ADD CONSTRAINT financial_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- galeria.uploaded_by -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.galeria
    ADD CONSTRAINT galeria_uploaded_by_fkey FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id);

-- hoja_cantos_detalle.hoja_id -> hojas_cantos.id (ON DELETE CASCADE)
ALTER TABLE ONLY public.hoja_cantos_detalle
    ADD CONSTRAINT hoja_cantos_detalle_hoja_id_fkey FOREIGN KEY (hoja_id) REFERENCES public.hojas_cantos(id) ON DELETE CASCADE;

-- hojas_cantos.created_by -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.hojas_cantos
    ADD CONSTRAINT hojas_cantos_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- movimientos_financieros.actividad_id -> actividades.id (ON DELETE SET NULL)
ALTER TABLE ONLY public.movimientos_financieros
    ADD CONSTRAINT movimientos_financieros_actividad_id_fkey FOREIGN KEY (actividad_id) REFERENCES public.actividades(id) ON DELETE SET NULL;

-- movimientos_financieros.registrado_por -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.movimientos_financieros
    ADD CONSTRAINT movimientos_financieros_registrado_por_fkey FOREIGN KEY (registrado_por) REFERENCES public.profiles(id);

-- notices.created_by -> profiles.id (ON DELETE NO ACTION / RESTRICT)
ALTER TABLE ONLY public.notices
    ADD CONSTRAINT notices_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id);

-- profiles.id -> auth.users.id (ON DELETE CASCADE)
ALTER TABLE ONLY public.profiles
    ADD CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


-- ============================================================================
-- SECCIÓN 8: TRIGGERS
-- ============================================================================

CREATE TRIGGER trigger_actualizar_caja
    AFTER INSERT OR DELETE OR UPDATE ON public.actividades
    FOR EACH STATEMENT
    EXECUTE FUNCTION public.actualizar_caja();

CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();


-- ============================================================================
-- SECCIÓN 9: ROW LEVEL SECURITY (HABILITACIÓN POR TABLA)
-- ============================================================================

ALTER TABLE public.actividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.avisos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.caja_general ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.financial_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.galeria ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hoja_cantos_detalle ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.hojas_cantos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.libro_cantos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.movimientos_financieros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reportes ENABLE ROW LEVEL SECURITY;


-- ============================================================================
-- SECCIÓN 10: POLÍTICAS RLS DEL ESQUEMA PUBLIC (AGRUPADAS POR TABLA)
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Políticas sobre public.profiles (6 políticas)
-- ----------------------------------------------------------------------------
CREATE POLICY "Admins can insert profiles" ON public.profiles
    FOR INSERT TO authenticated
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE POLICY "Admins can update profiles" ON public.profiles
    FOR UPDATE TO authenticated
    USING ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))))
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles p
  WHERE ((p.id = auth.uid()) AND (p.role = 'admin'::public.user_role)))));

CREATE POLICY "Admins can update roles" ON public.profiles
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Solo administradores pueden insertar perfiles" ON public.profiles
    FOR INSERT
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles profiles_1
  WHERE ((profiles_1.id = auth.uid()) AND (profiles_1.role = 'admin'::public.user_role)))));

CREATE POLICY "editar propio perfil" ON public.profiles
    FOR UPDATE TO authenticated
    USING ((auth.uid() = id));

CREATE POLICY "ver perfiles" ON public.profiles
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.activities (6 políticas)
-- ----------------------------------------------------------------------------
CREATE POLICY "Permitir lectura a usuarios autenticados" ON public.activities
    FOR SELECT TO authenticated
    USING (true);

CREATE POLICY "Permitir modificaciones a usuarios autenticados" ON public.activities
    TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "crear actividades" ON public.activities
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "editar actividades" ON public.activities
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "eliminar actividades" ON public.activities
    FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "ver actividades" ON public.activities
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.hojas_cantos (4 políticas)
-- ----------------------------------------------------------------------------
CREATE POLICY "Solo admin director secretaria crean hojas" ON public.hojas_cantos
    FOR INSERT
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'director'::public.user_role, 'secretaria'::public.user_role]))))));

CREATE POLICY "Solo admin director secretaria eliminan hojas" ON public.hojas_cantos
    FOR DELETE
    USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'director'::public.user_role, 'secretaria'::public.user_role]))))));

CREATE POLICY "Solo admin director secretaria modifican hojas" ON public.hojas_cantos
    FOR UPDATE
    USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'director'::public.user_role, 'secretaria'::public.user_role]))))));

CREATE POLICY "Todos pueden leer hojas" ON public.hojas_cantos
    FOR SELECT
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.hoja_cantos_detalle (4 políticas)
-- ----------------------------------------------------------------------------
CREATE POLICY "Solo admin director secretaria crean detalles" ON public.hoja_cantos_detalle
    FOR INSERT
    WITH CHECK ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'director'::public.user_role, 'secretaria'::public.user_role]))))));

CREATE POLICY "Solo admin director secretaria eliminan detalles" ON public.hoja_cantos_detalle
    FOR DELETE
    USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'director'::public.user_role, 'secretaria'::public.user_role]))))));

CREATE POLICY "Solo admin director secretaria modifican detalles" ON public.hoja_cantos_detalle
    FOR UPDATE
    USING ((EXISTS ( SELECT 1
   FROM public.profiles
  WHERE ((profiles.id = auth.uid()) AND (profiles.role = ANY (ARRAY['admin'::public.user_role, 'director'::public.user_role, 'secretaria'::public.user_role]))))));

CREATE POLICY "Todos pueden leer detalles" ON public.hoja_cantos_detalle
    FOR SELECT
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.libro_cantos (1 política)
-- ----------------------------------------------------------------------------
CREATE POLICY "Todos pueden leer libro de cantos" ON public.libro_cantos
    FOR SELECT
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.financial_records (4 políticas)
-- ----------------------------------------------------------------------------
CREATE POLICY "actualizar registros financieros" ON public.financial_records
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "crear registros financieros" ON public.financial_records
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "eliminar registros financieros" ON public.financial_records
    FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "ver registros financieros" ON public.financial_records
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.notices (4 políticas)
-- ----------------------------------------------------------------------------
CREATE POLICY "crear avisos" ON public.notices
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY "editar avisos" ON public.notices
    FOR UPDATE TO authenticated
    USING (true)
    WITH CHECK (true);

CREATE POLICY "eliminar avisos" ON public.notices
    FOR DELETE TO authenticated
    USING (true);

CREATE POLICY "ver avisos" ON public.notices
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.actividades (1 política)
-- ----------------------------------------------------------------------------
CREATE POLICY "ver actividades" ON public.actividades
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.avisos (1 política)
-- ----------------------------------------------------------------------------
CREATE POLICY "ver avisos" ON public.avisos
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.caja_general (1 política)
-- ----------------------------------------------------------------------------
CREATE POLICY "ver caja" ON public.caja_general
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Políticas sobre public.galeria (1 política)
-- ----------------------------------------------------------------------------
CREATE POLICY "ver galeria" ON public.galeria
    FOR SELECT TO authenticated
    USING (true);

-- ----------------------------------------------------------------------------
-- Tablas sin políticas definidas en el backup:
-- - public.movimientos_financieros: RLS habilitado, 0 políticas (acceso denegado por defecto).
-- - public.reportes: RLS habilitado, 0 políticas (acceso denegado por defecto).
-- ----------------------------------------------------------------------------


-- ============================================================================
-- SECCIÓN 11: POLÍTICAS DE STORAGE (ESQUEMA storage.objects)
-- ============================================================================

CREATE POLICY "editar fotos" ON storage.objects
    FOR UPDATE
    USING ((bucket_id = 'profiles'::text));

CREATE POLICY "eliminar fotos" ON storage.objects
    FOR DELETE
    USING ((bucket_id = 'profiles'::text));

CREATE POLICY "subir fotos" ON storage.objects
    FOR INSERT
    WITH CHECK ((bucket_id = 'profiles'::text));

CREATE POLICY "ver fotos" ON storage.objects
    FOR SELECT
    USING ((bucket_id = 'profiles'::text));


-- ============================================================================
-- SECCIÓN 12: BUCKETS DE STORAGE EXISTENTES
-- ============================================================================
-- Información extraída del dump de Supabase (esquema storage.buckets):
-- NOTA: Documentación de referencia, NO ejecutar como sentencias INSERT.
--
-- 1. Bucket: 'profiles'
--    - id: 'profiles'
--    - name: 'profiles'
--    - public: true
--    - Uso: Almacenamiento de fotos de perfil de los integrantes del coro.
--    - Políticas asociadas: ver fotos, subir fotos, editar fotos, eliminar fotos.
--
-- 2. Bucket: 'gallery'
--    - id: 'gallery'
--    - name: 'gallery'
--    - public: true
--    - Uso: Galería fotográfica del coro (actualmente sin políticas RLS asociadas ni uso activo).


-- ============================================================================
-- SECCIÓN 13: PRIVILEGIOS (GRANTS) RELEVANTES RESUMIDOS
-- ============================================================================
-- Concesión de privilegios a roles de Supabase ('anon', 'authenticated', 'service_role'):

GRANT ALL ON FUNCTION public.actualizar_caja() TO anon;
GRANT ALL ON FUNCTION public.actualizar_caja() TO authenticated;
GRANT ALL ON FUNCTION public.actualizar_caja() TO service_role;

GRANT ALL ON FUNCTION public.update_updated_at_column() TO anon;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO authenticated;
GRANT ALL ON FUNCTION public.update_updated_at_column() TO service_role;

GRANT ALL ON TABLE public.actividades TO anon;
GRANT ALL ON TABLE public.actividades TO authenticated;
GRANT ALL ON TABLE public.actividades TO service_role;

GRANT ALL ON TABLE public.activities TO anon;
GRANT ALL ON TABLE public.activities TO authenticated;
GRANT ALL ON TABLE public.activities TO service_role;

GRANT ALL ON TABLE public.avisos TO anon;
GRANT ALL ON TABLE public.avisos TO authenticated;
GRANT ALL ON TABLE public.avisos TO service_role;

GRANT ALL ON TABLE public.caja_general TO anon;
GRANT ALL ON TABLE public.caja_general TO authenticated;
GRANT ALL ON TABLE public.caja_general TO service_role;

GRANT ALL ON TABLE public.financial_records TO anon;
GRANT ALL ON TABLE public.financial_records TO authenticated;
GRANT ALL ON TABLE public.financial_records TO service_role;

GRANT ALL ON TABLE public.galeria TO anon;
GRANT ALL ON TABLE public.galeria TO authenticated;
GRANT ALL ON TABLE public.galeria TO service_role;

GRANT ALL ON TABLE public.hoja_cantos_detalle TO anon;
GRANT ALL ON TABLE public.hoja_cantos_detalle TO authenticated;
GRANT ALL ON TABLE public.hoja_cantos_detalle TO service_role;

GRANT ALL ON TABLE public.hojas_cantos TO anon;
GRANT ALL ON TABLE public.hojas_cantos TO authenticated;
GRANT ALL ON TABLE public.hojas_cantos TO service_role;

GRANT ALL ON TABLE public.libro_cantos TO anon;
GRANT ALL ON TABLE public.libro_cantos TO authenticated;
GRANT ALL ON TABLE public.libro_cantos TO service_role;

GRANT ALL ON SEQUENCE public.libro_cantos_id_seq TO anon;
GRANT ALL ON SEQUENCE public.libro_cantos_id_seq TO authenticated;
GRANT ALL ON SEQUENCE public.libro_cantos_id_seq TO service_role;

GRANT ALL ON TABLE public.movimientos_financieros TO anon;
GRANT ALL ON TABLE public.movimientos_financieros TO authenticated;
GRANT ALL ON TABLE public.movimientos_financieros TO service_role;

GRANT ALL ON TABLE public.notices TO anon;
GRANT ALL ON TABLE public.notices TO authenticated;
GRANT ALL ON TABLE public.notices TO service_role;

GRANT ALL ON TABLE public.profiles TO anon;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

GRANT ALL ON TABLE public.reportes TO anon;
GRANT ALL ON TABLE public.reportes TO authenticated;
GRANT ALL ON TABLE public.reportes TO service_role;

-- Privilegios por defecto configurados en el backup:
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON FUNCTIONS TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public GRANT ALL ON TABLES TO service_role;

ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO postgres;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO anon;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE supabase_admin IN SCHEMA public GRANT ALL ON TABLES TO service_role;


-- ============================================================================
-- SECCIÓN 14: OBSERVACIONES DETECTADAS (HALLAZGOS DE AUDITORÍA Y ARQUITECTURA)
-- ============================================================================
/*
1. TABLAS DUPLICADAS Y ESQUEMA LEGADO SIN USO:
   - 'actividades' vs 'activities':
     * El frontend actual utiliza exclusivamente 'activities' (con columnas de tipo texto simple: tipo, lugar, hora, estado, y fecha tipo date). Cuenta con 2 registros en el backup.
     * La tabla 'actividades' posee 0 registros, utiliza tipos ENUM ('actividad_tipo' y 'actividad_estado'), campos numéricos de ingreso/gasto y una columna generada 'balance'. Corresponde a un diseño previo no conectado al frontend.
   - 'avisos' vs 'notices':
     * El frontend actual utiliza 'notices' (con campos de texto para prioridad, boolean fijado, etc.).
     * La tabla 'avisos' posee 0 registros, emplea el tipo ENUM 'prioridad_aviso' y no recibe consultas desde la aplicación actual.
   - 'movimientos_financieros' vs 'financial_records':
     * El módulo financiero del frontend actual opera sobre 'financial_records' (diferenciando caja 'operativa'/'inversiones', categorías, actividades y fechas).
     * La tabla 'movimientos_financieros' posee 0 registros, se vincula con la tabla legada 'actividades' y está sin uso en el código actual.
   - 'caja_general' y trigger 'trigger_actualizar_caja':
     * Posee 1 único registro con saldo 0.00.
     * Su función trigger ('actualizar_caja') se ejecuta exclusivamente sobre 'actividades'. Dado que 'actividades' no se utiliza, el saldo de 'caja_general' jamás fue recalculado y quedó desconectado de los movimientos reales de 'financial_records'.
   - 'reportes':
     * Tabla con 0 registros sin integración ni interfaz en el frontend actual.
   - 'galeria' y bucket 'gallery':
     * Posee 0 registros. La vista 'Galería' en el cliente web es un marcador de posición estático sin consultas hacia la base de datos ni integración con storage.

2. COLUMNAS DUPLICADAS E INCONSISTENCIAS EN 'profiles':
   - 'foto' vs 'foto_url': Coexisten dos columnas para la dirección/URL de la fotografía del integrante.
   - 'contacto_emergencia' vs 'contacto_emergencia_nombre': Ambas almacenan el nombre de la persona de contacto en emergencias.
   - 'telefono_emergencia' vs 'contacto_emergencia_telefono': Ambas almacenan el número de contacto de emergencias.
   - 'edad': Campo entero estático que requiere actualización manual para no perder vigencia; representa un dato redundante que puede derivarse dinámicamente de 'fecha_nacimiento'.

3. ENUM 'prioridad_aviso' HUÉRFANO:
   - Creado con los valores ('normal', 'importante', 'urgente'), solo era referenciado en la tabla legada 'avisos'. La tabla activa 'notices' almacena la prioridad en una columna de tipo text con valores ('alta', 'media', 'baja'), dejando este ENUM en desuso.

4. FUNCIONES SIN 'SET search_path':
   - Las funciones 'actualizar_caja()' y 'update_updated_at_column()' no especifican la cláusula 'SET search_path = public' (o pg_catalog). En entornos PostgreSQL/Supabase, las funciones de trigger sin search_path fijado son vulnerables a ataques de secuestro de esquemas (search_path hijacking).

5. LÓGICA DEFECTUOSA EN 'actualizar_caja()':
   - La sentencia 'UPDATE caja_general SET saldo = ..., updated_at = now();' omite la cláusula WHERE. Aunque en el backup solo existe un registro, la ausencia de condición actualizaría indiscriminadamente todas las filas de la tabla si existiera más de una.

6. AUSENCIA DE TRIGGER 'updated_at' EN 'hojas_cantos':
   - La tabla 'hojas_cantos' define la columna 'updated_at timestamp with time zone DEFAULT now()', pero no posee ningún trigger asociado para actualizarla automáticamente ante modificaciones (a diferencia de 'profiles', que cuenta con 'update_profiles_updated_at').

7. AUSENCIA DE ÍNDICES EN COLUMNAS CRÍTICAS DE BÚSQUEDA, FILTRO Y CLAVES FORÁNEAS:
   - 'activities.fecha': Consultada recurrentemente para filtrar cronogramas, ensayos y presentaciones por fecha o rangos.
   - 'financial_records.created_at', 'financial_records.fecha' y 'financial_records.created_by': Vitales para el ordenamiento cronológico, reportes y balances financieros por fecha o responsable.
   - 'hoja_cantos_detalle.hoja_id': Clave foránea utilizada constantemente en los JOINs para obtener los cantos de cada celebración; la falta de índice penaliza el rendimiento.
   - 'notices.created_at': Utilizada para ordenar las publicaciones en el muro de avisos.

8. CLAVES FORÁNEAS A 'profiles' SIN 'ON DELETE':
   - Prácticamente todas las referencias a 'profiles(id)' ('activities.created_by', 'financial_records.created_by', 'notices.created_by', 'hojas_cantos.created_by', 'actividades.created_by', 'actividades.responsable', 'avisos.publicado_por', 'movimientos_financieros.registrado_por', 'galeria.uploaded_by') carecen de cláusula 'ON DELETE', adoptando NO ACTION / RESTRICT por defecto.
   - Consecuencia: No es posible dar de baja o eliminar el perfil de un integrante si figura como creador de alguna actividad, registro financiero, aviso u hoja de cantos, produciendo errores de integridad referencial. Debería implementarse 'ON DELETE SET NULL' o un mecanismo de borrado lógico (soft delete).

9. POLÍTICAS RLS EXCESIVAMENTE PERMISIVAS Y FALLAS DE CONTROL DE ACCESO:
   - 'profiles' - Escalada de privilegios y bypass de roles:
     * La política "Admins can update roles" establece USING (true) WITH CHECK (true) para cualquier usuario autenticado ('authenticated'). Esto anula cualquier control de acceso: cualquier usuario que inicie sesión puede alterar libremente perfiles ajenos y asignarse a sí mismo o a otros el rol 'admin'.
     * La política "editar propio perfil" permite UPDATE si auth.uid() = id, pero no restringe las columnas modificables mediante WITH CHECK ni triggers. Un usuario común puede editar su propio registro y cambiar su columna 'role' a 'admin'.
     * Duplicidad de políticas: Existen dos políticas de inserción redundantes ("Admins can insert profiles" y "Solo administradores pueden insertar perfiles").
   - 'activities', 'financial_records' y 'notices' - Operaciones abiertas a cualquier usuario autenticado:
     * Las políticas "crear actividades", "editar actividades", "eliminar actividades", "Permitir modificaciones a usuarios autenticados", "crear avisos", "editar avisos", "eliminar avisos", "crear registros financieros", "actualizar registros financieros" y "eliminar registros financieros" utilizan USING (true) WITH CHECK (true) sobre 'authenticated'.
     * Cualquier usuario registrado puede crear, modificar o eliminar registros contables, actividades del coro y avisos, sin requerir roles administrativos (admin, tesorero, director) ni verificar la autoría del registro.
   - Políticas de Storage en bucket 'profiles' abiertas a usuarios anónimos:
     * Las políticas sobre 'storage.objects' ("ver fotos", "subir fotos", "editar fotos", "eliminar fotos") no definen la cláusula 'TO authenticated'.
     * Consecuencia: Aplican a 'anon' (público general en Internet), permitiendo a usuarios no autenticados subir, modificar o eliminar archivos del bucket de perfiles sin ninguna credencial.
   - Políticas de lectura de cantos sin cláusula 'TO':
     * "Todos pueden leer libro de cantos", "Todos pueden leer hojas" y "Todos pueden leer detalles" no tienen cláusula 'TO authenticated', lo que permite la lectura anónima ('anon') de todo el cancionero y repertorios.
   - Privilegios globales 'GRANT ALL' al rol 'anon':
     * El backup incluye 'GRANT ALL ON TABLE ... TO anon' y 'GRANT ALL ON SEQUENCE ... TO anon' en todas las tablas del esquema 'public'. Aunque RLS restringe parcialmente las operaciones, conceder privilegios estructurales 'ALL' a visitantes anónimos vulnera el principio de privilegio mínimo.
   - Bucket 'gallery' sin políticas de storage:
     * A pesar de que el bucket 'gallery' está creado como público, no tiene definida ninguna política RLS en 'storage.objects', por lo que cualquier intento de carga o modificación a través de la API de Supabase será denegado por defecto.
*/
