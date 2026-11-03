# Guía de Base de Datos — Coro de Alabanza Vive y Canta
**Parroquia Nuestro Señor de Esquipulas · El Triunfo, Choluteca, Honduras**

Este directorio contiene la documentación completa, auditoría, migración segura y verificación de la base de datos PostgreSQL alojada en **Supabase** (`https://rvhdtmycdktxgzzuumcr.supabase.co`).

---

## 1. Inventario de Archivos en `database/sql/`

| Archivo | Tipo | ¿Se debe ejecutar en Supabase? | Propósito |
| :--- | :--- | :---: | :--- |
| **`01_estructura_existente.sql`** | Documentación de referencia | ❌ **NUNCA** | Contiene el DDL completo extraído del backup de clúster (`db_cluster-27-08-2026`). Sirve como espejo y consulta técnica histórica de la base de datos. Posee una salvaguarda automática que aborta si se intenta correr. |
| **`02_cambios_necesarios_supabase.sql`** | Migración idempotente | ✅ **SÍ (Único archivo a ejecutar)** | Contiene exclusivamente los índices de aceleración, funciones con `search_path` seguro, triggers de auditoría, corrección de claves foráneas con preservación de autoría, y las políticas RLS reforzadas que resuelven vulnerabilidades de seguridad. |
| **`03_verificacion_supabase.sql`** | Consultas diagnósticas | ✅ **SÍ (Solo lectura)** | Bloque de 10 consultas `SELECT` para comprobar el estado de las tablas, filas, integridad referencial, RLS, índices, triggers y buckets de almacenamiento. |
| **`README_DATABASE.md`** | Manual operativo | ℹ️ Guía humana | Este documento. |

---

## 2. Diferencia entre la estructura existente y los cambios a aplicar

### Lo que ya existe (y se conserva intacto):
1. **13 tablas en `public`:**
   - **Activas por el frontend:** `profiles`, `activities`, `financial_records`, `notices`, `hojas_cantos`, `hoja_cantos_detalle`, `libro_cantos`.
   - **Legado / Sin uso actual:** `actividades`, `avisos`, `caja_general`, `movimientos_financieros`, `reportes`, `galeria`. (No se eliminan para no perder datos históricos).
2. **Cantoral Litúrgico:** 992 cantos cargados en `libro_cantos`.
3. **Usuarios y perfiles:** 37 integrantes registrados con sus credenciales institucionales (`usuario@viveycanta.app`).
4. **Buckets de Supabase Storage:** `profiles` y `gallery` (ambos en modo público).

### Lo que agrega y corrige `02_cambios_necesarios_supabase.sql`:
1. **Blindaje de Row Level Security (RLS):**
   - **Vulnerabilidad corregida en `profiles`:** La política anterior `"Admins can update roles"` tenía `USING (true) WITH CHECK (true)`, permitiendo que cualquier integrante autenticado cambiara su propio rol o el de los demás a administrador. Se restringió estrictamente a administradores y se impidió que un integrante modifique su propio rol.
   - **Restricción de roles en `financial_records`:** Se limitó `INSERT`, `UPDATE` y `DELETE` exclusivamente a los roles `admin` y `tesorero`.
   - **Restricción de roles en `activities` y `notices`:** Se limitó la gestión a `admin`, `director` y `secretaria`.
   - **Políticas para `gallery`:** El bucket `gallery` no tenía políticas RLS en storage. Se agregaron políticas de lectura pública y subida/borrado para roles autorizados.
2. **Índices de Alto Rendimiento:**
   - Creación de 14 índices B-Tree en columnas frecuentemente filtradas y ordenadas (`fecha`, `estado`, `created_at`, `tipo`, `caja`, `fijado`, `hoja_id`, `numero`, `titulo`).
3. **Protección contra Bloqueos de Eliminación:**
   - Ajuste de las claves foráneas `created_by` hacia `profiles(id)` con regla `ON DELETE SET NULL`. Esto evita que al retirar un usuario se bloquee o se borren en cascada actividades, avisos u hojas de cantos que él haya registrado.
4. **Seguridad en Funciones:**
   - Inclusión de `SECURITY DEFINER` y `SET search_path = public, pg_temp` en funciones para prevenir ataques de secuestro de ruta de búsqueda.

---

## 3. Instrucciones de Ejecución Paso a Paso

### Paso 1: Verificación Previa (Diagnóstico Inicial)
1. Inicia sesión en tu consola de Supabase: [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Selecciona el proyecto **Vive y Canta** (`rvhdtmycdktxgzzuumcr`).
3. En el menú lateral izquierdo, ve a **SQL Editor**.
4. Abre una nueva pestaña de consulta ("New query").
5. Copia y pega el contenido del archivo **`03_verificacion_supabase.sql`**.
6. Haz clic en **Run** (Ejecutar).
7. Revisa las tablas y comprueba que todas las tablas tengan `rls_habilitado = true`.

### Paso 2: Aplicación de Mejoras (Migración)
1. En el **SQL Editor**, abre una nueva pestaña de consulta.
2. Copia todo el contenido del archivo **`02_cambios_necesarios_supabase.sql`**.
3. Haz clic en **Run** (Ejecutar).
4. El script se ejecutará dentro de una transacción segura (`BEGIN ... COMMIT`).
5. Debe retornar **`Success. No rows returned`** en verde.

### Paso 3: Verificación Posterior
1. Regresa a la pestaña con **`03_verificacion_supabase.sql`** (o vuelve a pegarlo).
2. Haz clic en **Run**.
3. Verifica:
   - En la consulta 3 (**pg_policies**): Comprobarás que las políticas activas ahora incluyen prefijos como `profiles_select_authenticated`, `financial_records_insert_authorized`, etc.
   - En la consulta 4 (**pg_indexes**): Aparecerán los índices `idx_activities_fecha`, `idx_financial_records_created_at`, etc.
   - En la consulta 5 (**foreign keys**): Las restricciones `created_by` mostrarán `accion_on_delete = SET NULL`.

---

## 4. Modificaciones que Requieren Intervención Manual / Decisiones Futuras

1. **Tablas Legadas (`actividades`, `avisos`, `movimientos_financieros`, `reportes`):**
   - Actualmente están en desuso porque el código React moderno utiliza `activities`, `notices` y `financial_records`.
   - **Recomendación:** Mantenerlas intactas en la base de datos hasta que el equipo directivo decida si desea archivar o eliminar formalmente esos esquemas. No afectan en absoluto el rendimiento ni la factura de Supabase.
2. **Depuración de Columnas en `profiles`:**
   - La tabla `profiles` cuenta con campos heredados como `foto_url` (el sistema usa `foto`), `contacto_emergencia_nombre` (usa `contacto_emergencia`) y `contacto_emergencia_telefono` (usa `telefono_emergencia`). No se eliminaron para no generar incompatibilidades con posibles integraciones anteriores.
3. **Usuarios Administradores:**
   - El sistema cuenta con un administrador inicial registrado en `profiles`. Cualquier cambio de rol a directores o tesoreros puede gestionarse directamente desde la interfaz en `/member/:id` o en `/members` por el administrador.
