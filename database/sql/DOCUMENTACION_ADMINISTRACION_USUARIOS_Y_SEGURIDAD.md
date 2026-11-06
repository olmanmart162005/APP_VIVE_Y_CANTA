# Documentación Técnica: Administración de Integrantes y Cambio Obligatorio de Contraseña
## Coro de Alabanza Vive y Canta — Parroquia Nuestro Señor de Esquipulas

---

## 1. Separación Arquitectónica: Lo que Ya Existe vs. Lo que se Agrega

### A. Elementos que YA EXISTEN en el Proyecto y en Supabase
1. **Tabla `public.profiles`**:
   - Vinculada por `id (uuid)` con `auth.users(id) ON DELETE CASCADE`.
   - Ya cuenta con las columnas `usuario`, `nombre_completo`, `email`, `telefono`, `edad`, `fecha_nacimiento`, `tipo_sangre`, `dni`, `role`, `estado`, `foto`, `foto_url` y `debe_cambiar_password boolean DEFAULT true`.
2. **Mecanismo de Inicio de Sesión por Nombre de Usuario**:
   - Los integrantes ingresan únicamente su `usuario` (ej. `juan.perez`) y el cliente construye internamente `juan.perez@viveycanta.app` para autenticar contra Supabase Auth.
3. **Edge Functions de Administración (`supabase/functions/`)**:
   - `create-user/index.ts`
   - `delete-user/index.ts`
4. **Bucket de Storage `profiles`**:
   - Almacena las fotografías de perfil de los integrantes.

---

### B. Elementos que SE AGREGAN / MEJORAN en esta Implementación

1. **Migración SQL (`database/sql/04_migracion_cambio_obligatorio_password.sql`)**:
   - Activa `debe_cambiar_password = true` para todos los perfiles existentes en `public.profiles` **sin invalidar ni cambiar su contraseña actual en `auth.users`**, permitiendo que cada usuario inicie sesión por última vez con su clave actual y sea redirigido obligatoriamente a crear su contraseña personal.
   - Configura `ON DELETE SET NULL` en todas las claves foráneas históricas (`activities.created_by`, `financial_records.created_by`, `notices.created_by`, `hojas_cantos.created_by`, `galeria.uploaded_by`) para que eliminar una cuenta **jamás borre movimientos financieros ni actividades históricas**.
   - Crea la función RPC segura `public.complete_mandatory_password_change()` (`SECURITY DEFINER`) para cambiar `debe_cambiar_password = false` únicamente para el usuario autenticado tras actualizar su clave.
   - Crea la función RPC `public.get_member_dependencies_summary(uuid)` para auditar los registros históricos asociados antes de desactivar o eliminar un integrante.
   - Crea el trigger `trg_enforce_profile_security` sobre `public.profiles` que impide en el motor PostgreSQL:
     - Que un usuario sin rol `admin` cambie su propio `role`, `usuario` o `estado`.
     - Que un administrador elimine su propia cuenta activa.
     - Que se elimine, degrade o desactive al último administrador activo del sistema.

2. **Auditoría SQL (`database/sql/05_verificacion_usuarios_y_roles.sql`)**:
   - Consultas de solo lectura (`SELECT`) para auditar la sincronización entre `auth.users` y `public.profiles`, cuentas desactivadas, posibles duplicados, estado de `debe_cambiar_password`, historial por integrante y políticas RLS.

3. **Endurecimiento de Supabase Edge Functions (`create-user` y `delete-user`)**:
   - Ambas funciones verifican en el servidor el token JWT (`Authorization: Bearer ...`) del solicitante y comprueban en `public.profiles` que tenga `role = 'admin'` y `estado = 'activo'`.
   - `create-user` recibe todos los campos personales del integrante, verifica unicidad de `usuario` y `email`, crea la cuenta en `auth.users` con `usuario@viveycanta.app` y guarda `debe_cambiar_password = true` sin imprimir nunca la contraseña en los logs.
   - `delete-user` impide auto-eliminación del administrador, protege al último administrador activo y desvincula (`SET NULL`) cualquier registro histórico antes de borrar el perfil y la cuenta de `auth.users`.

4. **Frontend React**:
   - **[memberService.js](file:///C:/Users/marti/sistema-coro-vive-y-canta/src/services/memberService.js)**: Generador criptográfico de contraseñas temporales únicas (`window.crypto.getRandomValues`), cálculo automático de edad, subida de fotografía de perfil al bucket `profiles`, creación, edición, desactivación recomendada y eliminación controlada.
   - **[ForcePasswordChange.jsx](file:///C:/Users/marti/sistema-coro-vive-y-canta/src/pages/ForcePasswordChange.jsx)**: Pantalla obligatoria **ACTUALIZA TU CONTRASEÑA** con validación de contraseña actual, requisitos mínimos (8 caracteres, mayúscula, minúscula, número, diferente a la compartida/actual), indicador de fortaleza y confirmación.
   - **[App.jsx](file:///C:/Users/marti/sistema-coro-vive-y-canta/src/App.jsx)** y **[Login.jsx](file:///C:/Users/marti/sistema-coro-vive-y-canta/src/pages/Login.jsx)**: Bloqueo total de rutas mientras `debe_cambiar_password = true` (redirigiendo `/dashboard`, `/finanzas`, `/integrantes`, `/actividades`, `/galeria`, `/perfil`, `/avisos`, etc. hacia `/actualizar-password`).
   - **[Members.jsx](file:///C:/Users/marti/sistema-coro-vive-y-canta/src/pages/Members.jsx)** y **[MemberDetails.jsx](file:///C:/Users/marti/sistema-coro-vive-y-canta/src/pages/MemberDetails.jsx)**: Modales completos de Agregar Integrante, Credenciales Temporales Privadas, Editar Integrante y Confirmación de Baja/Eliminación con auditoría de historial.

---

## 2. Orden Recomendado deAplicación en Producción

1. **El código del frontend ya está activo**: El flujo de redirección a `/actualizar-password` está listo antes de activar el indicador en la base de datos, evitando que ningún usuario quede bloqueado.
2. **Revisar y ejecutar diagnóstico previo (Opcional)**:
   - Ejecutar `database/sql/05_verificacion_usuarios_y_roles.sql` en el SQL Editor de Supabase.
3. **Activar el cambio obligatorio y blindaje en base de datos**:
   - Ejecutar `database/sql/04_migracion_cambio_obligatorio_password.sql` en el SQL Editor de Supabase.
4. **Actualizar Edge Functions (Opcional si se usa Supabase CLI)**:
   - `supabase functions deploy create-user`
   - `supabase functions deploy delete-user`
   *(Nota: `memberService.js` incluye sincronización directa de todos los campos adicionales sobre `public.profiles`, por lo que el registro completo de integrantes funciona de inmediato incluso antes de redesplegar las Edge Functions).*
