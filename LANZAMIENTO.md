# Checklist de lanzamiento — SOMBER AI STUDIO

Actualizado: 2026-11-01

## Hecho en este repositorio (código)

- [x] Interfaz pública en GitHub Pages
- [x] Pantallas de producto
- [x] Términos, privacidad, soporte
- [x] Generación con seguimiento
- [x] Rate limit cliente y servidor
- [x] Esquema Supabase (`supabase/001_schema.sql`)
- [x] Cliente Supabase + login/registro + créditos + jobs
- [x] Documentación `SUPABASE.md`
- [x] Workflow deploy con secretos `VITE_SUPABASE_*`

## Lo hacemos juntos

### 1. API
- [x] FAL_KEY configurada (health OK)
- [x] Créditos comprobados en el servidor (`server_claim_job` en Supabase)
- [x] Director IA (`POST /enhance`, Claude) + botón «✨ Mejorar con IA»
- [ ] Render: añadir `SUPABASE_SERVICE_ROLE_KEY` y `ANTHROPIC_API_KEY`
- [ ] Plan Render sin sleep / keep-alive
- [ ] Generación extremo a extremo verificada

### 2. Auth y datos (Supabase)
- [x] Esquema endurecido: créditos solo vía `charge_job` / `refund_job`
- [x] Proyecto `somber-ai-studio` (París) creado y `supabase/001_schema.sql` aplicado
- [x] URL y clave publicable integradas en `src/lib/supabase.ts` (no hacen falta secretos)
- [ ] Site URL / Redirect en Auth
- [ ] Probar registro + créditos
- [ ] Marcar cuenta creadora a mano (SQL en `SUPABASE.md`)

### 3. Archivos en la nube
- [ ] Bucket Storage
- [ ] Subida autenticada

### 4. Pagos
- [ ] Stripe + webhooks

### 5. Marca
- [ ] Dominio propio + correo soporte

### 6. Seguridad
- [x] Rate limit servidor
- [ ] Sentry / backups / CORS estricto

## Criterio de listo para cobro

Registrarse → generar → ver vídeo → pagar plan → recibir créditos.
