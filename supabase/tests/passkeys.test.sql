-- Passkeys on the website, and nearby approvals.
\set ON_ERROR_STOP on
\set QUIET on

\set ada '00000000-0000-0000-0000-0000000000a1'
\set bo '00000000-0000-0000-0000-0000000000a2'
\set laptop '20000000-0000-0000-0000-000000000001'
\set home '20000000-0000-0000-0000-000000000002'
\set away '20000000-0000-0000-0000-000000000003'

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'ada', 'ada@example.org', now(), '{"name": "Ada Okafor"}'),
  (:'bo', 'bo@example.org', now(), '{"name": "Bo Lin"}');
insert into auth.sessions (id, user_id, user_agent, ip) values
  (:'laptop', :'ada', 'Mozilla/5.0 (X11; Linux x86_64) Firefox/131.0', '203.0.113.1');

-- ------------------------------------------------------------ making one
set role service_role;
select set_config('test.challenge', elum_passkey_challenge('register', :'ada', 'abc', 'accountsbyelum.netlify.app')::text, false);
select expect(elum_passkey_take_challenge(current_setting('test.challenge')::uuid, 'login') is null, 'a challenge only works for its own kind');
select expect((elum_passkey_take_challenge(current_setting('test.challenge')::uuid, 'register') ->> 'challenge') = 'abc', 'the challenge comes back');
select expect(elum_passkey_take_challenge(current_setting('test.challenge')::uuid, 'register') is null, 'but only once');
select set_config('test.old', elum_passkey_challenge('login', null, 'old', 'localhost')::text, false);
reset role;
update elum.passkey_challenges set expires_at = now() - interval '1 second' where id = current_setting('test.old')::uuid;
set role service_role;
select expect(elum_passkey_take_challenge(current_setting('test.old')::uuid, 'login') is null, 'challenges last five minutes');

select elum_passkey_add(:'ada', 'credential-ada-0001', 'public-key-0000000001', 0, array['internal', 'hybrid'], 'iPhone');
select expect_error(format('select elum_passkey_add(%L, %L, %L, 0, null, %L)', :'bo', 'credential-ada-0001', 'public-key-0000000001', 'x'), 'PT409', 'a passkey is saved once');
select expect(jsonb_array_length(elum_passkey_credentials(:'ada')) = 1, 'listed for the account');
select expect(jsonb_array_length(elum_passkey_credentials(null, ' ADA@example.org')) = 1, 'and by email');
select expect(jsonb_array_length(elum_passkey_credentials(null, 'nobody@example.org')) = 0, 'nobody has none');
select expect((elum_passkey_lookup('credential-ada-0001') ->> 'email') = 'ada@example.org', 'a sign-in finds whose it is');
select elum_passkey_used('credential-ada-0001', 7);
select elum_passkey_used('credential-ada-0001', 3);
select expect((elum_passkey_lookup('credential-ada-0001') ->> 'counter')::int = 7, 'the counter never goes back');
reset role;

-- -------------------------------------------------------- closed to apps
select expect(not has_function_privilege('authenticated', 'public.elum_passkey_lookup(text)', 'execute'), 'apps cannot look up passkeys');
select expect(not has_function_privilege('anon', 'public.elum_passkey_challenge(text, uuid, text, text)', 'execute'), 'or make challenges');
select expect(not has_function_privilege('anon', 'public.elum_my_passkeys()', 'execute'), 'signed-out visitors see nothing');

-- -------------------------------------------------------- your own list
select set_config('request.jwt.claims', json_build_object('sub', :'ada', 'session_id', :'laptop', 'role', 'authenticated')::text, false);
set role authenticated;
select expect_error($$select * from elum.passkeys$$, '42501', 'passkeys are server only');
select expect((elum_security() ->> 'hasPasskey') = 'true', 'security says there is a passkey');
select expect((elum_security() ->> 'approveSignIns') = 'false', 'and keeps the approvals setting');
select set_config('test.key', elum_my_passkeys() -> 0 ->> 'id', false);
select expect((elum_my_passkeys() -> 0 ->> 'name') = 'iPhone', 'listed by name');
select elum_rename_passkey(current_setting('test.key')::uuid, '  Work phone ');
select expect((elum_my_passkeys() -> 0 ->> 'name') = 'Work phone', 'renamed');
select expect_error(format('select elum_rename_passkey(%L, %L)', current_setting('test.key'), ''), 'PT400', 'a name is needed');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'bo', 'role', 'authenticated')::text, false);
set role authenticated;
select expect(jsonb_array_length(elum_my_passkeys()) = 0, 'other people see only theirs');
select expect_error(format('select elum_remove_passkey(%L)', current_setting('test.key')), 'PT404', 'and cannot remove yours');
select expect((elum_security() ->> 'hasPasskey') = 'false', 'no passkey, no flag');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'ada', 'session_id', :'laptop', 'role', 'authenticated')::text, false);
set role authenticated;
select elum_remove_passkey(current_setting('test.key')::uuid);
select expect(jsonb_array_length(elum_my_passkeys()) = 0, 'removed');
select expect((elum_security() ->> 'hasPasskey') = 'false', 'and the flag goes');

-- -------------------------------------------------------- nearby approvals
select elum_set_sign_in_approvals(true);
reset role;
insert into auth.sessions (id, user_id, user_agent, ip) values
  (:'away', :'ada', 'Mozilla/5.0 (Windows NT 10.0) Chrome/130.0', '198.51.100.9'),
  (:'home', :'ada', 'Mozilla/5.0 (iPhone) Safari/605.1', '203.0.113.1');
insert into elum.sign_ins (session_id, account_id, status, code, decoys, ip, created_at) values
  (:'home', :'ada', 'pending', 42, elum.decoys(42::smallint), '203.0.113.1', now() - interval '1 minute'),
  (:'away', :'ada', 'pending', 17, elum.decoys(17::smallint), '198.51.100.9', now());
set role authenticated;
select expect((elum_sign_in_requests() -> 0 ->> 'id') = :'home', 'a sign-in on the same network comes first');
select expect((elum_sign_in_requests() -> 0 ->> 'nearby') = 'true', 'and is nearby');
select expect((elum_sign_in_requests() -> 1 ->> 'nearby') = 'false', 'others are not');
select expect(elum_sign_in_requests() -> 0 ? 'challenge', 'the challenge is still there for the ELUM app');
select expect(elum_answer_sign_in(:'home', 42) = 'approved', 'nearby still needs the number');
reset role;

select 'Passkey and nearby checks passed.' as result \gset
\echo :result
