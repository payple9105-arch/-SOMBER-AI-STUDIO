-- SOMBER AI STUDIO — esquema Supabase (pegar en SQL Editor y ejecutar)
-- Se puede ejecutar varias veces: también corrige una instalación anterior.
--
-- Seguridad:
--   * El navegador NO puede cambiar credits, plan ni is_creator.
--   * Los créditos solo se gastan/devuelven por trabajo (charge_job / refund_job):
--     una devolución solo es posible una vez y solo si ese trabajo se cobró.

-- ── Tablas ──────────────────────────────────────────────────────────────

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  plan text not null default 'Basico',
  credits integer not null default 20,
  is_creator boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  prompt text not null,
  style text,
  aspect text default '9:16',
  duration_sec integer default 5,
  provider_request_id text,
  status text not null default 'queued',
  video_url text,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Columnas de cobro (solo las tocan las funciones security definer)
alter table public.jobs add column if not exists credits_charged integer not null default 0;
alter table public.jobs add column if not exists charged_at timestamptz;
alter table public.jobs add column if not exists refunded_at timestamptz;

create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);

alter table public.profiles drop constraint if exists profiles_credits_nonneg;
alter table public.profiles add constraint profiles_credits_nonneg check (credits >= 0);

-- ── Alta de usuario ─────────────────────────────────────────────────────
-- Cada cuenta nueva recibe 20 créditos. La cuenta creadora se marca a mano
-- (ver SUPABASE.md); así nadie puede registrarse con ese correo y heredar
-- créditos ilimitados antes de que el dueño confirme la cuenta.

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (new.id, new.email, split_part(coalesce(new.email, 'user'), '@', 1))
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ── Créditos por trabajo ────────────────────────────────────────────────

-- Versiones antiguas: permitían devolver créditos sin límite.
drop function if exists public.spend_credits(integer, text, jsonb);
drop function if exists public.refund_credits(integer, text, jsonb);

-- Cobra un trabajo propio que aún no se ha cobrado. Creadores: coste 0.
create or replace function public.charge_job(
  p_job_id uuid,
  p_amount integer default 1,
  p_reason text default 'generate'
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
  job public.jobs;
  cost integer;
begin
  if uid is null then raise exception 'No autenticado'; end if;
  if p_amount is null or p_amount <= 0 or p_amount > 100 then
    raise exception 'Cantidad inválida';
  end if;

  select * into prof from public.profiles where id = uid for update;
  if not found then raise exception 'Perfil no encontrado'; end if;

  select * into job from public.jobs where id = p_job_id and user_id = uid for update;
  if not found then raise exception 'Trabajo no encontrado'; end if;
  if job.charged_at is not null then raise exception 'Trabajo ya cobrado'; end if;

  cost := case when prof.is_creator then 0 else p_amount end;
  if prof.credits < cost then raise exception 'Créditos insuficientes'; end if;

  update public.jobs
  set credits_charged = cost, charged_at = now(), updated_at = now()
  where id = p_job_id;

  if cost > 0 then
    update public.profiles
    set credits = credits - cost, updated_at = now()
    where id = uid
    returning * into prof;

    insert into public.credit_ledger (user_id, delta, reason, meta)
    values (uid, -cost, left(coalesce(p_reason, 'generate'), 40), jsonb_build_object('job_id', p_job_id));
  end if;

  return prof;
end;
$$;

-- Devuelve lo cobrado por un trabajo propio, una sola vez.
create or replace function public.refund_job(
  p_job_id uuid,
  p_error text default null
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  prof public.profiles;
  job public.jobs;
begin
  if uid is null then raise exception 'No autenticado'; end if;

  select * into prof from public.profiles where id = uid for update;
  if not found then raise exception 'Perfil no encontrado'; end if;

  select * into job from public.jobs where id = p_job_id and user_id = uid for update;
  if not found then raise exception 'Trabajo no encontrado'; end if;

  update public.jobs
  set status = 'error',
      error_message = coalesce(left(p_error, 500), error_message),
      refunded_at = coalesce(refunded_at, case when charged_at is not null then now() end),
      updated_at = now()
  where id = p_job_id;

  if job.charged_at is null or job.refunded_at is not null or job.credits_charged <= 0 then
    return prof;
  end if;

  update public.profiles
  set credits = credits + job.credits_charged, updated_at = now()
  where id = uid
  returning * into prof;

  insert into public.credit_ledger (user_id, delta, reason, meta)
  values (uid, job.credits_charged, 'refund_failed_job', jsonb_build_object('job_id', p_job_id));

  return prof;
end;
$$;

-- ── RLS y permisos ──────────────────────────────────────────────────────

alter table public.profiles enable row level security;
alter table public.credit_ledger enable row level security;
alter table public.jobs enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id)
  with check (auth.uid() = id);

drop policy if exists "ledger_select_own" on public.credit_ledger;
create policy "ledger_select_own" on public.credit_ledger
  for select using (auth.uid() = user_id);

drop policy if exists "jobs_select_own" on public.jobs;
create policy "jobs_select_own" on public.jobs
  for select using (auth.uid() = user_id);

drop policy if exists "jobs_insert_own" on public.jobs;
create policy "jobs_insert_own" on public.jobs
  for insert with check (auth.uid() = user_id);

drop policy if exists "jobs_update_own" on public.jobs;
create policy "jobs_update_own" on public.jobs
  for update using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Quitar permisos amplios (incluidos los que Supabase da por defecto)
revoke all on public.profiles, public.credit_ledger, public.jobs from anon, authenticated;
revoke all on sequence public.credit_ledger_id_seq from anon, authenticated;

grant usage on schema public to anon, authenticated;

-- profiles: leer todo lo propio, cambiar solo el nombre visible
grant select on public.profiles to authenticated;
grant update (display_name, updated_at) on public.profiles to authenticated;

grant select on public.credit_ledger to authenticated;

-- jobs: no se pueden tocar las columnas de cobro
grant select on public.jobs to authenticated;
grant insert (user_id, prompt, style, aspect, duration_sec, provider_request_id, status)
  on public.jobs to authenticated;
grant update (provider_request_id, status, video_url, error_message, updated_at)
  on public.jobs to authenticated;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.charge_job(uuid, integer, text) from public, anon;
revoke all on function public.refund_job(uuid, text) from public, anon;
grant execute on function public.charge_job(uuid, integer, text) to authenticated;
grant execute on function public.refund_job(uuid, text) to authenticated;
