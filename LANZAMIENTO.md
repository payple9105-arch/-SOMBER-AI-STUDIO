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
- [ ] Plan Render sin sleep / keep-alive
- [ ] Generación extremo a extremo verificada

### 2. Auth y datos (Supabase)
- [ ] Ejecutar `supabase/001_schema.sql`
- [ ] Secretos GitHub: `VITE_SUPABASE_URL` y `VITE_SUPABASE_ANON_KEY`
- [ ] Site URL / Redirect en Auth
- [ ] Probar registro + créditos
- [ ] Marcar cuenta creadora si ya existía el usuario

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
