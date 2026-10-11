# LinguaConnect — Plataforma Internacional de Intercambio de Idiomas (+18)

> **Nota sobre la marca**: El nombre **LinguaConnect** es provisional. La configuración de identidad (`NEXT_PUBLIC_APP_NAME` y `NEXT_PUBLIC_APP_URL`) está desacoplada mediante variables de entorno para permitir cambiar de marca o dominio sin tocar la lógica de negocio.

---

## 1. Descripción General y Arquitectura (Web + Futuro Flutter)

**LinguaConnect** es una plataforma web profesional, responsive (mobile-first) y segura diseñada exclusivamente para que personas adultas (**+18 años**) de diferentes países encuentren compañeros con intereses lingüísticos complementarios, conversen en tiempo real y aprendan idiomas de manera natural.

### Compatibilidad nativa con futura App Móvil en Flutter
La arquitectura evita acoplar las reglas críticas al frontend de React:
- **Esquema PostgreSQL + Row Level Security (RLS)**: Todas las reglas de aislamiento de mensajes, privacidad de datos sensibles (`profile_private`), bloqueo bidireccional (`are_users_blocked`) y emparejamiento complementario (`find_language_partners` RPC) residen en migraciones SQL versionadas dentro de `supabase/migrations/`.
- **Autenticación unificada**: Supabase Auth (correo/contraseña + Google OAuth) emite JWT compatibles tanto con `@supabase/ssr` en Next.js como con `supabase_flutter` en iOS/Android.
- **API v1 desacoplada (`/api/v1/*`)**:
  - `POST /api/v1/livekit/token`: Genera tokens temporales WebRTC exclusivamente en el servidor tras verificar que ambos usuarios pertenecen a la conversación y no existe bloqueo.
  - `POST /api/v1/learning/translate`: Adaptador modular de traducción sujeto a límites diarios de consumo por usuario (nunca simula traducciones falsas si el proveedor no está configurado).
  - `POST /api/v1/moderation/report`: Creación validada de denuncias en servidor con límite anti-abuso.
  - `POST /api/v1/account/delete`: Baja definitiva de cuenta y purga en cascada.
  - `POST /api/v1/admin/action`: Operaciones administrativas protegidas por rol (`admin`/`moderator`) y registradas en `admin_audit_logs`.

---

## 2. Requisitos e Instalación Local

### Requisitos previos
- **Node.js**: `v20.x` o `v24.x` (probado en `v24.19.0`)
- **npm**: `v10+` / `v11+`
- **Git**: `v2.40+`

### Pasos de instalación
1. Abre la carpeta del proyecto como tu **Workspace activo**:
   ```powershell
   cd C:\Users\Thinkpad\.gemini\antigravity\scratch\linguaconnect
   ```
2. Copia la plantilla de variables de entorno:
   ```powershell
   Copy-Item .env.example .env.local
   ```
3. Instala las dependencias (si aún no están instaladas):
   ```powershell
   npm install
   ```
4. Inicia el servidor de desarrollo:
   ```powershell
   npm run dev
   ```
5. Abre `http://localhost:3000` en tu navegador.

---

## 3. Configuración de Variables de Entorno (`.env.local`)

Ninguna clave privada se expone en el cliente (`SUPABASE_SERVICE_ROLE_KEY`, `LIVEKIT_API_SECRET`, `TRANSLATION_API_KEY` son leídas exclusivamente en el servidor mediante `getServerSecrets()` en [`src/lib/env.ts`](file:///C:/Users/Thinkpad/.gemini/antigravity/scratch/linguaconnect/src/lib/env.ts)).

| Variable | Ámbito | Descripción |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_NAME` | Público | Nombre visible de la plataforma (por defecto `LinguaConnect`). |
| `NEXT_PUBLIC_APP_URL` | Público | URL base de la aplicación (`http://localhost:3000` en desarrollo). |
| `NEXT_PUBLIC_DEMO_MODE` | Público | `"true"` habilita los perfiles ficticios de prueba de `demo_seed.sql` cuando no se han conectado aún credenciales en la nube. En producción debe establecerse en `"false"`. |
| `NEXT_PUBLIC_SUPABASE_URL` | Público | URL del proyecto Supabase (`https://<project-ref>.supabase.co`). |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Público | Clave anónima pública de Supabase (segura gracias a Row Level Security). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Servidor** | Clave `service_role` de Supabase. **Jamás exponer en el cliente.** Se usa solo para eliminación completa de cuenta y tareas administrativas del servidor. |
| `NEXT_PUBLIC_LIVEKIT_URL` | Público | URL WebSocket de tu instancia LiveKit (`wss://<tu-proyecto>.livekit.cloud`). |
| `LIVEKIT_API_KEY` | **Servidor** | API Key de LiveKit Cloud para firmar tokens temporales de sala. |
| `LIVEKIT_API_SECRET` | **Servidor** | Secret de LiveKit Cloud. **Exclusivo de backend.** |
| `TRANSLATION_PROVIDER` | **Servidor** | Proveedor opcional: `"deepl"`, `"google"`, `"libretranslate"` o vacío `""`. |
| `TRANSLATION_API_KEY` | **Servidor** | Clave del proveedor de traducción (si aplica). |
| `TRANSLATION_API_URL` | **Servidor** | Endpoint personalizado (requerido para `libretranslate`). |
| `TRANSLATION_DAILY_LIMIT_PER_USER` | **Servidor** | Cuota máxima de traducciones por usuario al día (por defecto `30`). |
| `NEXT_PUBLIC_ADSENSE_CLIENT_ID` | Público | ID real de editor de Google AdSense (`ca-pub-XXXXXXXXXXXXXXXX`). Si está vacío, se muestra un contenedor técnico transparente y **nunca** se inventa un ID ni se simulan anuncios falsos. |
| `NEXT_PUBLIC_ADSENSE_SLOT_DASHBOARD` | Público | ID del bloque de anuncios para el panel principal. |
| `NEXT_PUBLIC_ADSENSE_SLOT_EXPLORE` | Público | ID del bloque de anuncios para el explorador. |

---

## 4. Base de Datos, Migraciones SQL y Verificación RLS

Las migraciones están ordenadas secuencialmente en `supabase/migrations/`:

1. [`0001_enums_and_extensions.sql`](file:///C:/Users/Thinkpad/.gemini/antigravity/scratch/linguaconnect/supabase/migrations/0001_enums_and_extensions.sql): Extensiones `pgcrypto`, `citext` y tipos `ENUM` del dominio (`cefr_level`, `user_role`, `call_status`, etc.).
2. [`0002_core_tables.sql`](file:///C:/Users/Thinkpad/.gemini/antigravity/scratch/linguaconnect/supabase/migrations/0002_core_tables.sql): Crea las 14 tablas requeridas (`profiles`, `languages`, `user_languages`, `interests`, `user_interests`, `conversation_requests`, `conversations`, `conversation_participants`, `messages`, `message_reports`, `user_blocks`, `call_sessions`, `notifications`, `user_consents`) más `profile_private` (bóveda aislada para `birth_date` con `CHECK` de mayoría de edad +18), `saved_vocabulary`, `admin_audit_logs` y `platform_settings`.
3. [`0003_views_and_functions.sql`](file:///C:/Users/Thinkpad/.gemini/antigravity/scratch/linguaconnect/supabase/migrations/0003_views_and_functions.sql): Funciones de seguridad (`are_users_blocked`, `is_authorized_conversation_member`, `is_admin_or_moderator`), vista pública segura `public_profiles_safe` (sin correo, fecha de nacimiento ni ubicación exacta) y RPC `find_language_partners`.
4. [`0004_rls_policies.sql`](file:///C:/Users/Thinkpad/.gemini/antigravity/scratch/linguaconnect/supabase/migrations/0004_rls_policies.sql): Políticas estrictas de Row Level Security en todas las tablas.
5. [`0005_retention_and_triggers.sql`](file:///C:/Users/Thinkpad/.gemini/antigravity/scratch/linguaconnect/supabase/migrations/0005_retention_and_triggers.sql): Triggers de verificación +18, promoción automática de solicitud aceptada a conversación, límites de tasa en BD y procedimiento `run_data_retention_cleanup()`.

### Aplicar migraciones en Supabase
Con Supabase CLI o desde el SQL Editor de tu proyecto Supabase:
```bash
supabase db push
# Opcionalmente (solo en entorno de desarrollo/demostración):
psql $DATABASE_URL -f supabase/seed/demo_seed.sql
```

### Ejecutar pruebas negativas de RLS en PostgreSQL
Para comprobar en la base de datos que un tercer usuario (`Mallory`) no puede leer ni inyectar mensajes en la conversación privada de `Alice` y `Bob`, ni leer `birth_date` ajenos, ni leer mensajes tras un bloqueo:
```bash
psql $DATABASE_URL -f supabase/tests/rls_negative_tests.sql
```

---

## 5. Calidad, Compilación y Pruebas Automatizadas

Ejecuta los siguientes comandos para verificar el estado del proyecto:

```powershell
# 1. Verificación estática de tipos TypeScript
npx tsc --noEmit

# 2. Análisis estático con ESLint
npm run lint

# 3. Suite de pruebas unitarias e integración (Vitest)
npx vitest run

# 4. Compilación de producción de Next.js
npm run build
```

### Pruebas de Llamadas y Chat entre Dos Navegadores / Pestañas
El sistema sincroniza eventos en tiempo real (Supabase Realtime cuando está conectado + bus `BroadcastChannel` y `storage` en modo local/demo) manteniendo la sesión activa por pestaña (`sessionStorage`):
1. Abre **Navegador/Ventana A** en `http://localhost:3000/login` e inicia sesión como **Elena Vargas (Demo)**.
2. Abre **Navegador/Ventana B** (o una pestaña independiente) en `http://localhost:3000/login` e inicia sesión como **Liam O’Connor (Demo)**.
3. En la Ventana A, entra a `/messages/conv-demo-elena-liam`, envía un mensaje o una corrección gramatical y haz clic en **Videollamada**.
4. En la Ventana B aparecerá en tiempo real la barra de **Llamada entrante** con los botones **Aceptar llamada** y **Rechazar**.

---

## 6. Despliegue y Plan de Recuperación (Backup & DR)

### Despliegue en proveedor compatible con Next.js (Vercel / Cloudflare / Docker)
1. Conecta el repositorio Git a tu proveedor de alojamiento Next.js.
2. Configura las variables de entorno listadas en la Sección 3 y asegúrate de establecer `NEXT_PUBLIC_DEMO_MODE="false"`.
3. Configura en Supabase Authentication las URLs de redirección permitidas (`https://tu-dominio.com/**`) para verificación de correo y Google OAuth.

### Plan de Recuperación y Retención de Datos
- **Backups de Base de Datos**: Activa Point-in-Time Recovery (PITR) o copias diarias automáticas en Supabase PostgreSQL.
- **Migraciones Reproducibles**: Ante cualquier desastre de infraestructura, el esquema completo y todas sus políticas RLS se reconstruyen ejecutando `0001` a `0005` en orden.
- **Limpieza de Retención (GDPR)**: Programa con `pg_cron` en Supabase la ejecución diaria de `SELECT public.run_data_retention_cleanup();`, que purga notificaciones expiradas (>90 días), solicitudes rechazadas/canceladas (>30 días) y mensajes marcados para borrado.

---

## 7. Costes Estimados y Límites de Servicios Externos

| Servicio | Nivel Gratuito / Inicial | Límites Aplicados en LinguaConnect | Escalado / Coste Estimado en Producción |
| :--- | :--- | :--- | :--- |
| **Supabase (DB, Auth, Realtime, Storage)** | Free Tier: 500 MB DB, 1 GB Storage, 50.000 MAU, 2M mensajes Realtime/mes. | Notas de voz limitadas a **máx. 5 MB** y 180s; máximo **45 mensajes/min** y **20 solicitudes/día** por usuario; purga automática de retención. | Plan Pro (~25 USD/mes) incluye 8 GB DB, 100 GB Storage y backups diarios automáticos. |
| **LiveKit Cloud (WebRTC Audio/Video)** | Free Tier: 5.000 minutos de participante/mes, sin coste fijo inicial. | Tokens con expiración estricta (`ttl: 15m`), máximo **12 sesiones/hora** por usuario, **grabación desactivada por defecto** (`roomRecord: false`). | Uso adicional: ~0.0005 USD/min en audio y ~0.004 USD/min en video 1-a-1. |
| **Traducción Modular (DeepL / Google / LibreTranslate)** | DeepL API Free: 500.000 caracteres/mes gratuitos. | Cuota configurable en servidor (`TRANSLATION_DAILY_LIMIT_PER_USER=30` traducciones/día por usuario) y caché en `messages.translation_data`. | ~20 USD por cada millón de caracteres adicionales (o coste fijo si se autoaloja LibreTranslate). |
| **Google AdSense** | Sin coste (genera ingresos por impresiones/clics). | Se desactiva automáticamente en páginas de llamadas, páginas con contenido denunciado o pendiente de moderación, y respeta el modo no personalizado (`NPA=1`). | Ingresos variables según RPM de la región del usuario adulto. |
