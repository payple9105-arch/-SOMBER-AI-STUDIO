-- SOMBER AI STUDIO — esquema Supabase (pegar en SQL Editor)
-- Proyecto: sombra IA estudio / SOMBER AI STUDIO

-- Perfiles (1:1 con auth.users)
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

-- Historial de créditos
create table if not exists public.credit_ledger (
  id bigserial primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  delta integer not null,
  reason text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_id_idx on public.credit_ledger (user_id);

-- Trabajos de generación
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

create index if not exists jobs_user_id_idx on public.jobs (user_id);
create index if not exists jobs_created_at_idx on public.jobs (created_at desc);

-- Crear perfil al registrarse
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  starter int := 20;
  creator boolean := false;
begin
  if lower(new.email) = 'payple9105@gmail.com' then
    starter := 999999;
    creator := true;
  end if;

  insert into public.profiles (id, email, display_name, plan, credits, is_creator)
  values (
    new.id,
    new.email,
    split_part(coalesce(new.email, 'user'), '@', 1),
    case when creator then 'Estudio' else 'Basico' end,
    starter,
    creator
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Gastar créditos (atómico). Creadores no descuentan.
create or replace function public.spend_credits(
  p_amount integer,
  p_reason text default 'generate',
  p_meta jsonb default '{}'::jsonb
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.profiles;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Cantidad inválida';
  end if;

  select * into row from public.profiles where id = uid for update;
  if not found then
    raise exception 'Perfil no encontrado';
  end if;

  if row.is_creator then
    return row;
  end if;

  if row.credits < p_amount then
    raise exception 'Créditos insuficientes';
  end if;

  update public.profiles
  set credits = credits - p_amount,
      updated_at = now()
  where id = uid
  returning * into row;

  insert into public.credit_ledger (user_id, delta, reason, meta)
  values (uid, -p_amount, p_reason, p_meta);

  return row;
end;
$$;

-- Devolver créditos
create or replace function public.refund_credits(
  p_amount integer,
  p_reason text default 'refund',
  p_meta jsonb default '{}'::jsonb
)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
  row public.profiles;
begin
  if uid is null then
    raise exception 'No autenticado';
  end if;
  if p_amount is null or p_amount <= 0 then
    raise exception 'Cantidad inválida';
  end if;

  update public.profiles
  set credits = credits + p_amount,
      updated_at = now()
  where id = uid
  returning * into row;

  insert into public.credit_ledger (user_id, delta, reason, meta)
  values (uid, p_amount, p_reason, p_meta);

  return row;
end;
$$;

-- RLS
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

grant usage on schema public to anon, authenticated;
grant select, update on public.profiles to authenticated;
grant select on public.credit_ledger to authenticated;
grant select, insert, update on public.jobs to authenticated;
grant execute on function public.spend_credits(integer, text, jsonb) to authenticated;
grant execute on function public.refund_credits(integer, text, jsonb) to authenticated;
