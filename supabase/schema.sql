-- BlindPay Supabase foundation
-- Run in Supabase SQL Editor before using the application.
-- Create Auth users from Supabase Authentication; then create a profile row for each user.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  full_name text,
  role text not null default 'customer' check (role in ('admin','provider','customer','system')),
  status text not null default 'active' check (status in ('active','disabled','suspended')),
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.wallets (
  id uuid primary key default gen_random_uuid(),
  provider_name text not null,
  provider_email text,
  provider_type text not null default 'provider' check (provider_type in ('escrow_master','provider','customer_refund')),
  balance numeric(20,2) not null default 0 check (balance >= 0),
  locked_balance numeric(20,2) not null default 0 check (locked_balance >= 0),
  total_received numeric(20,2) not null default 0,
  total_sent numeric(20,2) not null default 0,
  currency text not null default 'UGX' check (currency in ('UGX','KES','TZS','RWF','USD')),
  status text not null default 'active' check (status in ('active','frozen','suspended','closed')),
  frozen_reason text,
  payout_method text,
  payout_details text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_ref text unique not null,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  total_amount numeric(20,2) not null check (total_amount > 0),
  currency text not null default 'UGX' check (currency in ('UGX','KES','TZS','RWF','USD')),
  status text not null default 'pending_deposit' check (status in ('pending_deposit','deposit_received','in_escrow','in_transit','pending_final_approval','completed','cancelled','disputed','refunded')),
  provider_chain uuid[] not null default '{}',
  current_stage integer not null default 0 check (current_stage >= 0),
  deposit_method text not null default 'mtn_momo',
  deposit_reference text,
  payout_method text,
  payout_reference text,
  risk_score numeric(5,2) not null default 0,
  risk_flags text[] not null default '{}',
  notes text,
  frozen boolean not null default false,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  tx_ref text unique not null,
  order_id uuid not null references public.orders(id) on delete restrict,
  type text not null check (type in ('deposit','internal_transfer','payout','refund','reversal')),
  from_wallet_id uuid references public.wallets(id),
  to_wallet_id uuid references public.wallets(id),
  from_provider text,
  to_provider text,
  amount numeric(20,2) not null check (amount > 0),
  gross_amount numeric(20,2),
  fee_amount numeric(20,2) not null default 0 check (fee_amount >= 0),
  currency text not null default 'UGX' check (currency in ('UGX','KES','TZS','RWF','USD')),
  status text not null default 'pending_approval' check (status in ('pending_approval','approved','executing','completed','rejected','failed','reversed','cancelled')),
  stage_index integer,
  approval_required_from text,
  approved_by text,
  approved_at timestamptz,
  rejected_by text,
  rejection_reason text,
  external_reference text,
  risk_flags text[] not null default '{}',
  notes text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  actor_email text not null,
  actor_role text not null,
  details jsonb,
  previous_state text,
  new_state text,
  ip_address text,
  created_date timestamptz not null default now()
);

create table if not exists public.disputes (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  transaction_id uuid references public.transactions(id),
  raised_by text not null,
  raised_by_role text not null,
  reason text not null,
  category text not null,
  status text not null default 'open',
  resolution_notes text,
  resolved_by text,
  resolved_at timestamptz,
  evidence_urls text[] not null default '{}',
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.kyc_submissions (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  full_name text not null,
  id_type text not null default 'national_id',
  id_number text not null,
  date_of_birth date,
  nationality text,
  address text,
  document_front_url text,
  document_back_url text,
  selfie_url text,
  status text not null default 'pending',
  verified_at timestamptz,
  rejection_reason text,
  risk_level text not null default 'low',
  auto_check_passed boolean,
  admin_notes text,
  created_date timestamptz not null default now(),
  updated_date timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  message text not null,
  type text not null default 'system',
  severity text not null default 'info',
  entity_type text,
  entity_id uuid,
  target_email text,
  read boolean not null default false,
  read_at timestamptz,
  created_date timestamptz not null default now()
);

create index if not exists orders_status_idx on public.orders(status);
create index if not exists orders_created_idx on public.orders(created_date desc);
create index if not exists transactions_order_idx on public.transactions(order_id);
create index if not exists transactions_status_idx on public.transactions(status);
create index if not exists audit_entity_idx on public.audit_logs(entity_type, entity_id);
create index if not exists notifications_target_idx on public.notifications(target_email, read);

-- Keep updated_date current.
create or replace function public.set_updated_date()
returns trigger language plpgsql as $$
begin
  new.updated_date = now();
  return new;
end;
$$;

drop trigger if exists profiles_updated on public.profiles;
create trigger profiles_updated before update on public.profiles for each row execute function public.set_updated_date();
drop trigger if exists wallets_updated on public.wallets;
create trigger wallets_updated before update on public.wallets for each row execute function public.set_updated_date();
drop trigger if exists orders_updated on public.orders;
create trigger orders_updated before update on public.orders for each row execute function public.set_updated_date();
drop trigger if exists transactions_updated on public.transactions;
create trigger transactions_updated before update on public.transactions for each row execute function public.set_updated_date();
drop trigger if exists disputes_updated on public.disputes;
create trigger disputes_updated before update on public.disputes for each row execute function public.set_updated_date();
drop trigger if exists kyc_updated on public.kyc_submissions;
create trigger kyc_updated before update on public.kyc_submissions for each row execute function public.set_updated_date();

-- Admin helper. SECURITY DEFINER avoids recursive profile-policy checks.
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and status = 'active'
  );
$$;

-- Atomic deposit simulation. Replace this RPC with your real payment-provider webhook
-- when connecting MTN/Airtel/bank rails.
create or replace function public.record_order_deposit(p_order_id uuid, p_actor_email text default 'system')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_order orders%rowtype;
  v_wallet wallets%rowtype;
  v_tx_id uuid;
  v_ref text;
begin
  select * into v_order from orders where id = p_order_id for update;
  if not found then raise exception 'Order not found'; end if;
  if v_order.frozen then raise exception 'Order is frozen'; end if;
  if v_order.status <> 'pending_deposit' then raise exception 'Order is not awaiting deposit'; end if;

  select * into v_wallet from wallets
  where provider_type = 'escrow_master' and currency = v_order.currency and status = 'active'
  order by created_date asc limit 1 for update;
  if not found then raise exception 'No active escrow master wallet for %', v_order.currency; end if;

  v_ref := 'DEP-' || to_char(now(),'YYYYMMDDHH24MISS') || '-' || upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));

  insert into transactions(tx_ref, order_id, type, to_wallet_id, to_provider, amount, gross_amount, currency, status, stage_index)
  values(v_ref, v_order.id, 'deposit', v_wallet.id, v_wallet.provider_name, v_order.total_amount, v_order.total_amount, v_order.currency, 'completed', 0)
  returning id into v_tx_id;

  update wallets
  set locked_balance = locked_balance + v_order.total_amount,
      total_received = total_received + v_order.total_amount
  where id = v_wallet.id;

  update orders set status = 'in_escrow', deposit_reference = v_ref where id = v_order.id;

  insert into audit_logs(action, entity_type, entity_id, actor_email, actor_role, details, previous_state, new_state)
  values('deposit_received','order',v_order.id,p_actor_email,'system',
         jsonb_build_object('transaction_id',v_tx_id,'amount',v_order.total_amount),
         v_order.status,'in_escrow');

  return v_tx_id;
end;
$$;

-- Atomic approval: moves funds, records the approval, advances the chain and
-- completes the order after the last provider stage.
create or replace function public.approve_transaction(p_tx_id uuid, p_actor_email text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tx transactions%rowtype;
  v_order orders%rowtype;
  v_from wallets%rowtype;
  v_to wallets%rowtype;
  v_master wallets%rowtype;
  v_gross numeric;
  v_next integer;
  v_new_status text;
begin
  if not public.is_admin() then raise exception 'Admin permission required'; end if;

  select * into v_tx from transactions where id = p_tx_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.status <> 'pending_approval' then raise exception 'Transaction is not pending approval'; end if;
  if v_tx.type <> 'internal_transfer' then raise exception 'Only internal transfers can be approved here'; end if;

  select * into v_order from orders where id = v_tx.order_id for update;
  if v_order.frozen then raise exception 'Order is frozen'; end if;

  select * into v_from from wallets where id = v_tx.from_wallet_id for update;
  select * into v_to from wallets where id = v_tx.to_wallet_id for update;
  if not found then raise exception 'Transfer wallet not found'; end if;
  if v_from.status <> 'active' or v_to.status <> 'active' then raise exception 'Source or destination wallet is not active'; end if;
  if v_from.currency <> v_tx.currency or v_to.currency <> v_tx.currency then raise exception 'Currency mismatch'; end if;

  v_gross := v_tx.amount + coalesce(v_tx.fee_amount,0);

  if v_from.provider_type = 'escrow_master' then
    if v_from.locked_balance < v_gross then raise exception 'Insufficient escrow locked balance'; end if;
    update wallets set locked_balance = locked_balance - v_gross, total_sent = total_sent + v_gross where id = v_from.id;
  else
    if v_from.balance < v_gross then raise exception 'Insufficient wallet balance'; end if;
    update wallets set balance = balance - v_gross, total_sent = total_sent + v_gross where id = v_from.id;
  end if;

  update wallets set balance = balance + v_tx.amount, total_received = total_received + v_tx.amount where id = v_to.id;

  if coalesce(v_tx.fee_amount,0) > 0 then
    select * into v_master from wallets
    where provider_type = 'escrow_master' and currency = v_tx.currency and status = 'active'
    order by created_date asc limit 1 for update;
    if found and v_master.id <> v_from.id then
      update wallets set balance = balance + v_tx.fee_amount, total_received = total_received + v_tx.fee_amount where id = v_master.id;
    end if;
  end if;

  v_next := coalesce(v_tx.stage_index,0) + 1;
  if v_next >= coalesce(array_length(v_order.provider_chain,1),0) then
    v_new_status := 'completed';
  else
    v_new_status := 'in_transit';
  end if;

  update transactions
  set status='completed', approved_by=p_actor_email, approved_at=now()
  where id=v_tx.id;

  update orders set current_stage=v_next, status=v_new_status where id=v_order.id;

  insert into audit_logs(action, entity_type, entity_id, actor_email, actor_role, details, previous_state, new_state)
  values('transfer_approved','transaction',v_tx.id,p_actor_email,'admin',
         jsonb_build_object('amount',v_tx.amount,'fee',v_tx.fee_amount,'stage',v_tx.stage_index),
         v_tx.status,'completed');
end;
$$;

create or replace function public.reject_transaction(p_tx_id uuid, p_actor_email text, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
declare v_tx transactions%rowtype;
begin
  if not public.is_admin() then raise exception 'Admin permission required'; end if;
  select * into v_tx from transactions where id=p_tx_id for update;
  if not found then raise exception 'Transaction not found'; end if;
  if v_tx.status <> 'pending_approval' then raise exception 'Transaction is not pending approval'; end if;
  update transactions set status='rejected', rejected_by=p_actor_email, rejection_reason=p_reason where id=v_tx.id;
  update orders set status='in_escrow' where id=v_tx.order_id and status='in_transit';
  insert into audit_logs(action, entity_type, entity_id, actor_email, actor_role, details, previous_state, new_state)
  values('transfer_rejected','transaction',v_tx.id,p_actor_email,'admin',
         jsonb_build_object('reason',p_reason),v_tx.status,'rejected');
end;
$$;

-- RLS
alter table public.profiles enable row level security;
alter table public.wallets enable row level security;
alter table public.orders enable row level security;
alter table public.transactions enable row level security;
alter table public.audit_logs enable row level security;
alter table public.disputes enable row level security;
alter table public.kyc_submissions enable row level security;
alter table public.notifications enable row level security;

drop policy if exists profiles_self_or_admin on public.profiles;
create policy profiles_self_or_admin on public.profiles for select
using (id = auth.uid() or public.is_admin());

drop policy if exists wallets_access on public.wallets;
create policy wallets_access on public.wallets for select
using (public.is_admin() or provider_email = (select email from public.profiles where id = auth.uid()));
create policy wallets_admin_write on public.wallets for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists orders_access on public.orders;
create policy orders_access on public.orders for select
using (
  public.is_admin()
  or customer_email = (select email from public.profiles where id = auth.uid())
  or exists (
    select 1 from public.wallets w
    where w.provider_email = (select email from public.profiles where id = auth.uid())
      and w.id = any(provider_chain)
  )
);
create policy orders_admin_write on public.orders for all
using (public.is_admin()) with check (public.is_admin());
create policy orders_customer_create on public.orders for insert
with check (
  customer_email = (select email from public.profiles where id = auth.uid())
  and (select role from public.profiles where id = auth.uid()) = 'customer'
);

drop policy if exists transactions_access on public.transactions;
create policy transactions_access on public.transactions for select
using (
  public.is_admin()
  or exists (
    select 1 from public.orders o
    where o.id = order_id
      and (
        o.customer_email = (select email from public.profiles where id = auth.uid())
        or exists (
          select 1 from public.wallets w
          where w.provider_email = (select email from public.profiles where id = auth.uid())
            and (w.id = any(o.provider_chain) or w.id = from_wallet_id or w.id = to_wallet_id)
        )
      )
  )
);
create policy transactions_admin_write on public.transactions for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists admin_audit_logs on public.audit_logs;
create policy admin_audit_logs on public.audit_logs for select using (public.is_admin());
create policy admin_audit_insert on public.audit_logs for insert
with check (public.is_admin() or actor_role = 'system');

drop policy if exists disputes_access on public.disputes;
create policy disputes_access on public.disputes for select
using (
  public.is_admin()
  or raised_by = (select email from public.profiles where id = auth.uid())
  or exists (
    select 1 from public.orders o
    where o.id = order_id and (
      o.customer_email = (select email from public.profiles where id = auth.uid())
      or exists (
        select 1 from public.wallets w
        where w.provider_email = (select email from public.profiles where id = auth.uid())
          and w.id = any(o.provider_chain)
      )
    )
  )
);
create policy disputes_admin_write on public.disputes for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists kyc_access on public.kyc_submissions;
create policy kyc_access on public.kyc_submissions for select
using (public.is_admin() or user_email = (select email from public.profiles where id = auth.uid()));
create policy kyc_admin_write on public.kyc_submissions for all
using (public.is_admin()) with check (public.is_admin());

drop policy if exists notifications_access on public.notifications;
create policy notifications_access on public.notifications for select
using (public.is_admin() or target_email is null or target_email = (select email from public.profiles where id = auth.uid()));
create policy notifications_update on public.notifications for update
using (public.is_admin() or target_email = (select email from public.profiles where id = auth.uid()));

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;

-- KYC storage bucket. It is public here so the current browser-only KYC viewer works.
-- For production, switch this bucket to private and use signed URLs.
insert into storage.buckets (id, name, public)
values ('kyc', 'kyc', true)
on conflict (id) do update set public = true;

drop policy if exists kyc_bucket_upload on storage.objects;
create policy kyc_bucket_upload on storage.objects for insert to authenticated
with check (bucket_id = 'kyc' and public.is_admin());

drop policy if exists kyc_bucket_read on storage.objects;
create policy kyc_bucket_read on storage.objects for select to authenticated
using (bucket_id = 'kyc' and public.is_admin());