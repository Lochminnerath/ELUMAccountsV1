-- Approving new sign-ins, signing out one device, and preferences.
\set ON_ERROR_STOP on
\set QUIET on

\set ada '00000000-0000-0000-0000-0000000000a1'
\set bo '00000000-0000-0000-0000-0000000000a2'
\set laptop '20000000-0000-0000-0000-000000000001'
\set phone '20000000-0000-0000-0000-000000000002'
\set thief '20000000-0000-0000-0000-000000000003'
\set link '20000000-0000-0000-0000-000000000004'
\set second '20000000-0000-0000-0000-000000000005'

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'ada', 'ada@example.org', now(), '{"name": "Ada Okafor"}'),
  (:'bo', 'bo@example.org', now(), '{"name": "Bo Lin"}');
insert into auth.sessions (id, user_id, user_agent, ip) values
  (:'laptop', :'ada', 'Mozilla/5.0 (X11; Linux x86_64) Firefox/131.0', '203.0.113.1'),
  (:'phone', :'ada', 'Mozilla/5.0 (iPhone) Safari/605.1', '203.0.113.2');

grant execute on function public.expect_error(text, text, text), public.expect(boolean, text) to elum_pending;

-- The hook, as Supabase Auth calls it.
create function pg_temp.hook(p_user uuid, p_session uuid, p_method text) returns jsonb language sql as $$
  select public.elum_access_token_hook(jsonb_build_object('user_id', p_user, 'claims', jsonb_build_object(
    'sub', p_user, 'role', 'authenticated', 'session_id', p_session,
    'amr', jsonb_build_array(jsonb_build_object('method', p_method, 'timestamp', 1)))))
$$;

-- ----------------------------------------------------------- off by default
select expect((pg_temp.hook(:'ada', :'thief', 'password') #>> '{claims,role}') = 'authenticated', 'approvals are off until you turn them on');
select expect(not exists (select 1 from elum.sign_ins), 'nothing is recorded while they are off');

-- ------------------------------------------------------------ turning on
select set_config('request.jwt.claims', json_build_object('sub', :'ada', 'session_id', :'laptop', 'role', 'authenticated')::text, false);
set role authenticated;
select expect((elum_security() ->> 'approveSignIns') = 'false', 'off to start');
select expect((elum_set_sign_in_approvals(true) ->> 'approveSignIns') = 'true', 'turned on');
select expect_error($$select * from elum.sign_ins$$, '42501', 'sign-ins are server only');
select expect_error($$select * from elum.security$$, '42501', 'settings are server only');
reset role;
select expect((select count(*) from elum.sign_ins where account_id = :'ada' and status = 'approved') = 2,
              'the devices signed in when you turned it on are trusted');
select expect((pg_temp.hook(:'ada', :'phone', 'password') #>> '{claims,role}') = 'authenticated', 'a trusted device refreshes normally');

-- ---------------------------------------------------- a new password sign-in
insert into auth.sessions (id, user_id, user_agent, ip) values (:'thief', :'ada', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', '198.51.100.9');
select expect((pg_temp.hook(:'ada', :'thief', 'password') #>> '{claims,role}') = 'elum_pending', 'a new password sign-in waits');
select expect((pg_temp.hook(:'ada', :'thief', 'token_refresh') #>> '{claims,role}') = 'elum_pending', 'and keeps waiting on refresh');
select expect((select count(*) from elum.sign_ins where session_id = :'thief') = 1, 'one request, however often it refreshes');
select expect((select count(*) from elum.events where type = 'elum.sign_in.requested' and recipient_id = :'ada') = 1,
              'you get one notification for it');
select expect((pg_temp.hook(:'bo', '20000000-0000-0000-0000-0000000000b1', 'password') #>> '{claims,role}') = 'authenticated',
              'other people are not affected');

-- What the waiting role can do: only ask about itself.
select set_config('request.jwt.claims', json_build_object('sub', :'ada', 'session_id', :'thief', 'role', 'elum_pending')::text, false);
set role elum_pending;
select expect((elum_my_sign_in() ->> 'status') = 'pending', 'the new device sees it is waiting');
select expect((elum_my_sign_in() ->> 'code')::int between 10 and 99, 'and the number to show');
select expect_error($$select elum_account()$$, '42501', 'a waiting sign-in cannot read the account');
select expect_error($$select elum_sign_in_requests()$$, '42501', 'nor approve itself');
select expect_error($$select elum_answer_sign_in('20000000-0000-0000-0000-000000000003', 10)$$, '42501', 'nor answer');
select expect_error($$select * from public.profiles$$, '42501', 'nor read any table');
select expect_error($$select share_by_email('00000000-0000-0000-0000-000000000000', 'x@example.org', 'viewer')$$, '42501', 'nor call functions that were open to everyone');
reset role;

-- The approver on the laptop.
select set_config('request.jwt.claims', json_build_object('sub', :'ada', 'session_id', :'laptop', 'role', 'authenticated')::text, false);
set role authenticated;
select expect(jsonb_array_length(elum_sign_in_requests()) = 1, 'the laptop sees the request');
select expect((elum_sign_in_requests() -> 0 ->> 'device') = 'Chrome on Windows', 'with a readable device');
select expect(jsonb_array_length(elum_sign_in_requests() -> 0 -> 'numbers') = 3, 'and three numbers to choose from');
reset role;
select set_config('test.code', (select code::text from elum.sign_ins where session_id = :'thief'), false);
select set_config('test.wrong', (select decoys[1]::text from elum.sign_ins where session_id = :'thief'), false);
set role authenticated;
select expect((elum_sign_in_requests() -> 0 -> 'numbers') @> to_jsonb(current_setting('test.code')::int), 'the right number is among them');
reset role;
set role authenticated;
-- The wrong number denies it and ends that session.
select expect(elum_answer_sign_in(:'thief', current_setting('test.wrong')::int) = 'denied', 'a wrong number denies the sign-in');
reset role;
select expect(not exists (select 1 from auth.sessions where id = :'thief'), 'and signs that device out');
select expect((select status from elum.sign_ins where session_id = :'thief') = 'denied', 'recorded as denied');
select expect(exists (select 1 from elum.audit_log where account_id = :'ada' and action = 'security.sign_in_denied'), 'in your activity');
select expect((pg_temp.hook(:'ada', :'thief', 'token_refresh') #>> '{claims,role}') = 'elum_pending', 'a denied session never gets access');

-- A second attempt, approved with the right number.
insert into auth.sessions (id, user_id, user_agent) values (:'second', :'ada', 'Mozilla/5.0 (Macintosh; Mac OS X) Safari/605.1');
select expect((pg_temp.hook(:'ada', :'second', 'password') #>> '{claims,role}') = 'elum_pending', 'waits');
select set_config('test.code', (select code::text from elum.sign_ins where session_id = :'second'), false);
set role authenticated;
select expect_error($$select elum_answer_sign_in('20000000-0000-0000-0000-0000000000ff', 10)$$, 'PT404', 'unknown sign-ins are refused');
select expect(elum_answer_sign_in(:'second', current_setting('test.code')::int) = 'approved', 'the right number approves');
select expect_error(format('select elum_answer_sign_in(%L, 10)', :'second'), 'PT404', 'and it cannot be answered twice');
reset role;
select expect((pg_temp.hook(:'ada', :'second', 'token_refresh') #>> '{claims,role}') = 'authenticated', 'the next token has access');

-- Someone else cannot answer Ada's sign-ins.
insert into auth.sessions (id, user_id) values ('20000000-0000-0000-0000-000000000006', :'ada');
select pg_temp.hook(:'ada', '20000000-0000-0000-0000-000000000006', 'password');
select set_config('request.jwt.claims', json_build_object('sub', :'bo', 'session_id', '20000000-0000-0000-0000-0000000000b1', 'role', 'authenticated')::text, false);
set role authenticated;
select expect(jsonb_array_length(elum_sign_in_requests()) = 0, 'Bo sees none of Ada''s requests');
select expect_error($$select elum_answer_sign_in('20000000-0000-0000-0000-000000000006', 10)$$, 'PT404', 'and cannot answer them');
reset role;

-- Expired requests cannot be approved.
update elum.sign_ins set expires_at = now() - interval '1 minute' where session_id = '20000000-0000-0000-0000-000000000006';
select set_config('test.code', (select code::text from elum.sign_ins where session_id = '20000000-0000-0000-0000-000000000006'), false);
select set_config('request.jwt.claims', json_build_object('sub', :'ada', 'session_id', :'laptop', 'role', 'authenticated')::text, false);
set role authenticated;
select expect(jsonb_array_length(elum_sign_in_requests()) = 0, 'expired requests are not shown');
select expect(elum_answer_sign_in('20000000-0000-0000-0000-000000000006', current_setting('test.code')::int) = 'denied', 'and cannot be approved');
reset role;

-- An email link (reset, recovery, an ELUM app handing over a sign-in) is approved straight away.
insert into auth.sessions (id, user_id) values (:'link', :'ada');
select expect((pg_temp.hook(:'ada', :'link', 'otp') #>> '{claims,role}') = 'authenticated', 'email links prove the inbox');
select expect((select status from elum.sign_ins where session_id = :'link') = 'approved', 'and are recorded as approved');

-- ---------------------------------------------------------- one device out
set role authenticated;
select expect_error(format('select elum_sign_out_device(%L)', :'laptop'), 'PT400', 'not this device');
select elum_sign_out_device(:'phone');
select expect_error(format('select elum_sign_out_device(%L)', :'phone'), 'PT404', 'already gone');
reset role;
select expect(not exists (select 1 from auth.sessions where id = :'phone'), 'the phone is signed out');

-- Turning approvals off lets new sign-ins straight in again.
set role authenticated;
select elum_set_sign_in_approvals(false);
reset role;
select expect((pg_temp.hook(:'ada', '20000000-0000-0000-0000-000000000007', 'password') #>> '{claims,role}') = 'authenticated', 'off again');

-- ------------------------------------------------------------- preferences
set role authenticated;
select expect(elum_preferences() = '{"timeFormat": "auto", "weekStart": "auto", "startApp": "account", "motion": "system"}', 'sensible defaults');
select expect((elum_set_preferences('24h', 'monday', 'type', 'reduce') ->> 'startApp') = 'type', 'saved');
select expect((elum_preferences() ->> 'timeFormat') = '24h' and (elum_preferences() ->> 'motion') = 'reduce', 'and read back');
select expect((elum_set_preferences(null, 'sunday') ->> 'timeFormat') = '24h', 'one at a time keeps the rest');
select expect_error($$select elum_set_preferences('25h')$$, 'PT400', 'only real choices');
reset role;

-- The hook is for Supabase Auth only.
select expect(not has_function_privilege('authenticated', 'public.elum_access_token_hook(jsonb)', 'execute'), 'apps cannot call the hook');

select 'Sign-in approval checks passed.' as result \gset
\echo :result
