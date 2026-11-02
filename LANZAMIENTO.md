# Checklist de lanzamiento — SOMBER AI STUDIO

Actualizado: 2026-11-01

## Hecho en este repositorio (código)

- [x] Interfaz pública en GitHub Pages
- [x] Pantallas de producto (crear, anime, editor, nube, planes, pago, panel, cuenta)
- [x] Términos de uso y política de privacidad dentro de la app
- [x] Pantalla de soporte
- [x] Banner de beta y estado del API
- [x] Generación con seguimiento (`/generate` + consulta de estado)
- [x] Límite de generaciones por hora en el navegador
- [x] Historial local de trabajos
- [x] Subida de archivos en el dispositivo
- [x] API FastAPI con `/health`, `/generate` y consulta por `request_id`
- [x] Documentación de lanzamiento en este archivo

## Lo hacemos juntos (necesita tus cuentas / secretos)

### 1. API siempre disponible
- [ ] Cuenta Render (o similar) con plan que no se duerma, o Keep-alive
- [ ] Variable secreta `FAL_KEY` configurada en el servicio
- [ ] Probar `GET /health` → `"fal_configurado": true`
- [ ] Probar una generación de extremo a extremo

### 2. Auth y datos reales
- [ ] Proyecto Supabase (o Neon) de producción
- [ ] Tablas: usuarios/perfiles, créditos, trabajos, archivos
- [ ] Login real (correo + opcional OAuth)
- [ ] Recuperar contraseña

### 3. Archivos en la nube
- [ ] Bucket (Supabase Storage / R2 / S3)
- [ ] Subida autenticada y URLs firmadas
- [ ] Sustituir IndexedDB como única “nube”

### 4. Pagos
- [ ] Cuenta Stripe
- [ ] Productos Básico / Pro / Estudio
- [ ] Checkout + webhooks que activen plan y créditos
- [ ] Quitar el aviso “no se cobra tarjeta” cuando esté vivo

### 5. Marca y confianza
- [ ] Dominio propio apuntando a Pages o al host final
- [ ] Correo de soporte real
- [ ] Revisar textos legales con un profesional si vas a cobrar

### 6. Seguridad operativa
- [ ] Rate limit en el **servidor** (no solo en el navegador)
- [ ] Logs de error (p. ej. Sentry)
- [ ] Backups de base de datos
- [ ] Revisar CORS: orígenes concretos en producción

## Criterio de “listo para público de pago”

Un usuario nuevo puede: registrarse → generar un vídeo → verlo al día siguiente → pagar un plan → recibir créditos.

Hasta entonces la web se presenta como **beta pública**.
