
begin;
do $test$
declare
 m uuid; first_id uuid; second_id uuid; ref1 text:=gen_random_uuid()::text; ref2 text:=gen_random_uuid()::text;
 out1 jsonb; out2 jsonb; original_expiry timestamptz; original_current uuid; rejected boolean;
begin
 select user_id into m from public.profiles where role='house_manager' limit 1;
 if m is null then raise exception 'A manager fixture is required'; end if;
 select id into original_current from public.manager_subscriptions where manager_id=m and status='active';
 update public.manager_subscriptions set status='expired' where manager_id=m and status='active';
 insert into public.manager_subscriptions(manager_id,plan_id,status,payment_reference,payment_status,pesapal_tracking_id,checkout_amount,checkout_currency,checkout_duration_days)
 values(m,'3mo','failed',ref1,'failed',ref1,41500,'UGX',90) returning id into first_id;
 insert into public.manager_subscriptions(manager_id,plan_id,status,payment_reference,payment_status,pesapal_tracking_id,checkout_amount,checkout_currency,checkout_duration_days)
 values(m,'3mo','pending',ref2,'pending',ref2,10,'USD',90) returning id into second_id;

 rejected:=false;
 begin perform public.activate_verified_subscription(ref1,ref1,40000,'UGX');
 exception when others then rejected:=true; end;
 assert rejected,'Mismatched amount must fail';
 rejected:=false;
 begin perform public.activate_verified_subscription(ref1,ref1,41500,'USD');
 exception when others then rejected:=true; end;
 assert rejected,'Mismatched currency must fail';
 rejected:=false;
 begin perform public.activate_verified_subscription(ref1,ref2,41500,'UGX');
 exception when others then rejected:=true; end;
 assert rejected,'Mismatched tracking ID must fail';
 rejected:=false;
 begin perform public.activate_verified_subscription(ref1,null,41500,'UGX');
 exception when others then rejected:=true; end;
 assert rejected,'Missing tracking ID must fail';
 assert (select status='failed' from public.manager_subscriptions where id=first_id),'Validation must leave rows unchanged';

 out1:=public.activate_verified_subscription(ref1,ref1,41500,'UGX');
 assert (out1->>'activated')::boolean,'Failed record must recover on verified success';
 original_expiry:=(out1->'subscription'->>'expires_at')::timestamptz;
 assert original_expiry=now()+interval '90 days','Stored quote and duration must be used';
 out2:=public.activate_verified_subscription(ref1,ref1,41500,'UGX');
 assert not (out2->>'activated')::boolean,'Duplicate callback must not activate twice';
 assert (out2->'subscription'->>'expires_at')::timestamptz=original_expiry,'Duplicate must preserve expiry';

 -- Force a failure AFTER retirement (unique active index + trigger effects)
 -- using an invalid date interval, then verify the transaction rolls it back.
 update public.manager_subscriptions set checkout_duration_days=2147483647 where id=second_id;
 rejected:=false;
 begin perform public.activate_verified_subscription(ref2,ref2,10,'USD');
 exception when others then rejected:=true; end;
 assert rejected,'Activation failure must propagate';
 assert (select status='active' from public.manager_subscriptions where id=first_id),'Failed renewal must not retire current access';
 update public.manager_subscriptions set checkout_duration_days=90 where id=second_id;

 out2:=public.activate_verified_subscription(ref2,ref2,10,'USD');
 assert (out2->'subscription'->>'expires_at')::timestamptz=now()+interval '180 days','Second payment must add another 90 days';
 assert (select count(*)=1 from public.manager_subscriptions where manager_id=m and status='active'),'Only one active subscription';
 out1:=public.activate_verified_subscription(ref1,ref1,41500,'UGX');
 assert not (out1->>'activated')::boolean,'Old paid order must remain consumed after upgrade';
 assert (select expires_at=now()+interval '180 days' from public.manager_subscriptions where id=second_id),'Old callback must not add more days';

 update public.manager_subscriptions set status='expired',expires_at=now()-interval '1 day' where id=second_id;
 out2:=public.activate_verified_subscription(ref2,ref2,10,'USD');
 assert not (out2->>'activated')::boolean,'Expired paid order must not reactivate';

 update public.manager_subscriptions set payment_status='failed',started_at=null,credited_subscription_id=second_id where id=first_id;
 out1:=public.activate_verified_subscription(ref1,ref1,41500,'UGX');
 assert not (out1->>'activated')::boolean,'Manual support credit must not be counted twice';
 assert (select payment_status='completed' from public.manager_subscriptions where id=first_id),'Manual credit source can reconcile money';
 assert not has_function_privilege('anon','public.activate_verified_subscription(text,text,numeric,text)','execute'),'Anon must not activate payments';
 assert not has_function_privilege('authenticated','public.activate_verified_subscription(text,text,numeric,text)','execute'),'Users must not activate payments';
 assert has_function_privilege('service_role','public.activate_verified_subscription(text,text,numeric,text)','execute'),'Backend may activate';
end;
$test$;
rollback;
