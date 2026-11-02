# Integrar Supabase en SOMBER AI STUDIO

## 1. Proyecto

1. Entra en [supabase.com](https://supabase.com) y abre tu proyecto **sombra IA estudio** (o crea uno nuevo).
2. Ve a **Project Settings → API**.
3. Copia:
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public** key → `VITE_SUPABASE_ANON_KEY`

> Nunca subas la clave **service_role** al repositorio ni a GitHub Pages.

## 2. Tablas y funciones

1. En Supabase: **SQL → New query**.
2. Pega todo el contenido de `supabase/001_schema.sql`.
3. Ejecuta (**Run**).

Eso crea:

- `profiles` (plan, créditos, flag creador)
- `credit_ledger`
- `jobs`
- trigger al registrarse
- `spend_credits` / `refund_credits`
- RLS (cada usuario solo ve lo suyo)

La cuenta `payple9105@gmail.com` se marca como **creadora** con créditos altos al registrarse.

Si ya existía el usuario antes del trigger:

```sql
update public.profiles
set is_creator = true, credits = 999999, plan = 'Estudio'
where lower(email) = 'payple9105@gmail.com';
```

## 3. Auth

En **Authentication → Providers**:

- Email: activado
- Confirm email: puedes desactivarlo en desarrollo

En **Authentication → URL configuration**:

- Site URL: `https://payple9105-arch.github.io/-SOMBER-AI-STUDIO/`
- Redirect URLs: la misma + `http://localhost:5173/`

## 4. Variables en el build (GitHub Pages)

En el repo de GitHub: **Settings → Secrets and variables → Actions**

Crea:

| Name | Value |
|------|--------|
| `VITE_SUPABASE_URL` | `https://XXXX.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | tu anon key |

El workflow de deploy las inyecta en el build.

Localmente, crea `.env.local` (no se sube a git):

```
VITE_SUPABASE_URL=https://XXXX.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

## 5. Probar

1. `npm install`
2. `npm run dev`
3. Registrarse / entrar
4. Ver créditos en Panel / Cuenta
5. Generar un vídeo (gasta 1 crédito si no eres creador)

## Coste de generación

Por defecto la app gasta **1 crédito** por vídeo. Ajusta en `src/App.tsx` (`CREDIT_COST`).
