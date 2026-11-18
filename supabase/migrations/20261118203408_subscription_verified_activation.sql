
alter table public.manager_subscriptions
  add column if not exists checkout_amount numeric,
  add column if not exists checkout_currency text,
  add column if not exists checkout_duration_days integer,
  add column if not exists credited_subscription_id uuid references public.manager_subscriptions(id);
-- Snapshot the server-generated checkout quote; never compare to a later FX rate.
alter table public.manager_subscriptions
  add constraint subscription_checkout_amount_positive check (checkout_amount is null or checkout_amount > 0),
  add constraint subscription_checkout_duration_positive check (checkout_duration_days is null or checkout_duration_days > 0);
create or replace function public.activate_verified_subscription(
  p_reference text, p_tracking_id text, p_amount numeric, p_currency text
) returns jsonb language plpgsql security invoker set search_path = public as $$
declare
  s public.manager_subscriptions%rowtype;
  plan public.subscription_plans%rowtype;
  result public.manager_subscriptions%rowtype;
  v_manager uuid;
  v_base timestamptz;
  v_now timestamptz := now();
  v_expected numeric;
  v_currency text := upper(trim(p_currency));
  v_days integer;
begin
  select manager_id into v_manager from public.manager_subscriptions where payment_reference=p_reference;
  if not found then return null; end if;
  -- One lock for ALL activation paths and all orders of the same manager.
  perform pg_advisory_xact_lock(hashtextextended(v_manager::text, 0));
  select * into strict s from public.manager_subscriptions where payment_reference=p_reference for update;
  if p_tracking_id is null or s.pesapal_tracking_id is null or s.pesapal_tracking_id <> p_tracking_id then
    raise exception 'Payment tracking ID does not match subscription';
  end if;
  if p_amount is null or p_amount <= 0 or v_currency is null then
    raise exception 'Payment amount and currency are required';
  end if;
  if s.payment_status = 'refunded' then raise exception 'Refunded subscription cannot be activated'; end if;
  -- A successful order is consumed forever, even after expiry or upgrade.
  if s.payment_status='completed' and s.started_at is not null then
    return jsonb_build_object('subscription',to_jsonb(s),'activated',false);
  end if;
  select * into strict plan from public.subscription_plans where id=s.plan_id;
  v_days := coalesce(s.checkout_duration_days,plan.duration_days);
  if s.checkout_amount is not null then
    if v_currency is distinct from s.checkout_currency then raise exception 'Payment currency mismatch'; end if;
    v_expected := s.checkout_amount;
    if abs(p_amount-v_expected) > (case when v_currency='UGX' then 1 else 0.01 end) then
      raise exception 'Payment amount mismatch';
    end if;
  else
    -- Legacy orders predate stored quotes. Never infer a currency from amount.
    v_expected := case v_currency when 'USD' then plan.price_usd when 'UGX' then plan.price_ugx else null end;
    if v_expected is null or v_expected <= 0 or p_amount < v_expected then
      raise exception 'Legacy payment needs manual amount reconciliation';
    end if;
  end if;
  -- A support credit already supplied this order's time: reconcile money only.
  if s.credited_subscription_id is not null then
    update public.manager_subscriptions set payment_status='completed',updated_at=v_now where id=s.id;
    select * into strict result from public.manager_subscriptions where id=s.credited_subscription_id;
    return jsonb_build_object('subscription',to_jsonb(result),'activated',false);
  end if;
  if s.status not in ('pending','failed','cancelled') then
    raise exception 'Subscription is not awaiting activation';
  end if;
  select greatest(v_now,coalesce(max(expires_at),v_now)) into v_base
    from public.manager_subscriptions where manager_id=s.manager_id and status='active';
  update public.manager_subscriptions set status='expired',updated_at=v_now
    where manager_id=s.manager_id and status='active' and id<>s.id;
  update public.manager_subscriptions set status='active',payment_status='completed',
    started_at=v_now,expires_at=v_base+make_interval(days=>v_days),updated_at=v_now
    where id=s.id returning * into result;
  return jsonb_build_object('subscription',to_jsonb(result),'activated',true);
end;
$$;
revoke all on function public.activate_verified_subscription(text,text,numeric,text) from public,anon,authenticated;
grant execute on function public.activate_verified_subscription(text,text,numeric,text) to service_role;
