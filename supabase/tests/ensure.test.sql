-- ELUM Ensure: challenges, answers, passes, unusual activity and the sign-up hook.
\set ON_ERROR_STOP on
\set QUIET on

update elum.config set value = '4' where key = 'ensure.base_bits';
grant execute on function public.expect_error(text, text, text), public.expect(boolean, text) to anon;

-- Finds the number a browser would find: the first that gives enough zero bits.
create function public.t_solve(p_salt text, p_bits integer) returns text language plpgsql security definer as $$
declare n integer := 0;
begin
  loop
    if elum.ensure_zero_bits(sha256(convert_to(p_salt || ':' || n::text, 'UTF8'))) >= p_bits then return n::text; end if;
    n := n + 1;
  end loop;
end $$;
grant execute on function public.t_solve(text, integer) to anon;
-- And one that does not.
create function public.t_wrong(p_salt text, p_bits integer) returns text language plpgsql security definer as $$
declare n integer := 0;
begin
  loop
    if elum.ensure_zero_bits(sha256(convert_to(p_salt || ':' || n::text, 'UTF8'))) < p_bits then return n::text; end if;
    n := n + 1;
  end loop;
end $$;
grant execute on function public.t_wrong(text, integer) to anon;
create function public.t_from(p_ip text) returns void language sql as $$
  select set_config('request.headers', json_build_object('x-real-ip', p_ip)::text, false), null
$$;
grant execute on function public.t_from(text) to anon;
create temporary table t (k text primary key, v jsonb);
grant all on t to anon;

select expect(elum.ensure_zero_bits('\x00ff'::bytea) = 8, 'eight zero bits');
select expect(elum.ensure_zero_bits('\x0f'::bytea) = 4, 'four zero bits');
select expect(elum.ensure_who('203.0.113.1') <> elum.ensure_who('203.0.113.2'), 'addresses hash apart');
select expect(length(elum.ensure_who('203.0.113.1')) = 32 and elum.ensure_who('203.0.113.1') !~ '203', 'only a hash is kept');

set role anon;
select t_from('203.0.113.10');
select expect((elum_ensure_needed('sign_up') ->> 'needed')::boolean, 'sign-up always asks');
select expect(not (elum_ensure_needed('sign_in') ->> 'needed')::boolean, 'sign-in does not, when nothing is unusual');

-- A person: solves the work and holds the ring.
insert into t values ('c', elum_ensure_challenge('sign_up'));
select expect((select (v ->> 'bits')::integer from t where k = 'c') = 4, 'easy when nothing is unusual');
insert into t select 'p', elum_ensure_verify((v ->> 'id')::uuid, t_solve(v ->> 'salt', (v ->> 'bits')::integer), '{"hold": 900, "moves": 6, "elapsed": 1400}') from t where k = 'c';
select expect(length((select v ->> 'pass' from t where k = 'p')) = 64, 'a pass comes back');
select expect_error(format('select elum_ensure_verify(%L, %L, %L)', (select v ->> 'id' from t where k = 'c'), '1', '{"hold": 900, "moves": 6, "elapsed": 1400}'), 'PT400', 'a challenge is used once');

-- A script: no press, or a wrong answer.
insert into t values ('c2', elum_ensure_challenge('sign_up'));
select expect_error(format('select elum_ensure_verify(%L, %L, %L)', (select v ->> 'id' from t where k = 'c2'), (select t_solve(v ->> 'salt', (v ->> 'bits')::integer) from t where k = 'c2'), '{"hold": 20, "moves": 0, "elapsed": 30}'), 'PT400', 'no press, no pass');
insert into t values ('c3', elum_ensure_challenge('sign_up'));
select expect_error(format('select elum_ensure_verify(%L, %L, %L)', (select v ->> 'id' from t where k = 'c3'), (select t_wrong(v ->> 'salt', (v ->> 'bits')::integer) from t where k = 'c3'), '{"hold": 900, "moves": 6, "elapsed": 1400}'), 'PT400', 'wrong work, no pass');

-- Someone else's challenge cannot be answered from another address.
select t_from('198.51.100.7');
insert into t values ('c4', elum_ensure_challenge('submit'));
select t_from('203.0.113.10');
select expect_error(format('select elum_ensure_verify(%L, %L, %L)', (select v ->> 'id' from t where k = 'c4'), (select t_solve(v ->> 'salt', (v ->> 'bits')::integer) from t where k = 'c4'), '{"hold": 900, "moves": 6, "elapsed": 1400}'), 'PT400', 'challenges stay with their address');
reset role;

-- Spending passes.
select expect(not elum.ensure_redeem((select v ->> 'pass' from t where k = 'p'), 'sign_in'), 'a pass is for its own action');
select expect(elum.ensure_redeem((select v ->> 'pass' from t where k = 'p'), 'sign_up'), 'a pass works once');
select expect(not elum.ensure_redeem((select v ->> 'pass' from t where k = 'p'), 'sign_up'), 'and only once');
select expect(not elum.ensure_redeem('nope', 'sign_up'), 'made-up passes do not work');

-- The sign-up hook.
set role anon;
insert into t values ('c5', elum_ensure_challenge('sign_up'));
insert into t select 'p5', elum_ensure_verify((v ->> 'id')::uuid, t_solve(v ->> 'salt', (v ->> 'bits')::integer), '{"hold": 700, "keys": true, "elapsed": 900}') from t where k = 'c5';
reset role;
select expect(elum_ensure_before_user_created(jsonb_build_object('user', jsonb_build_object('user_metadata', jsonb_build_object('ensure_pass', (select v ->> 'pass' from t where k = 'p5'))))) = '{}'::jsonb, 'the hook lets a checked sign-up in');
select expect(elum_ensure_before_user_created('{"user": {"user_metadata": {}}}') -> 'error' ->> 'http_code' = '403', 'and refuses one without a pass');
select expect(elum_ensure_before_user_created('{"user": {"user_metadata": {"ensure": "checked"}}}') ? 'error', 'people cannot mark themselves checked');
select expect(elum_ensure_before_user_created('{"user": {"app_metadata": {"ensure": "checked"}}}') = '{}'::jsonb, 'but an ELUM function can');

-- Unusual activity: failed sign-ins pile up, checks get harder, and sign-in starts asking.
set role anon;
select t_from('192.0.2.50');
select elum_ensure_report('sign_in', 'failed') from generate_series(1, 6);
select expect((elum_ensure_needed('sign_in') ->> 'needed')::boolean, 'after failed sign-ins, sign-in asks');
insert into t values ('c6', elum_ensure_challenge('sign_in'));
select expect((select (v ->> 'bits')::integer from t where k = 'c6') > 4, 'and the work is harder');
select t_from('203.0.113.99');
select expect(not (elum_ensure_needed('sign_in') ->> 'needed')::boolean, 'other addresses are not affected');
reset role;

-- The guard for actions that only check when something is unusual.
select set_config('request.headers', '{"x-real-ip": "203.0.113.99"}', false);
select elum.ensure_guard('submit');
select set_config('request.headers', '{"x-real-ip": "192.0.2.50"}', false);
select expect_error('select elum.ensure_guard(''submit'')', 'PT428', 'unusual activity needs a check');

-- Off switch.
update elum.config set value = 'off' where key = 'ensure.mode';
select expect(elum_ensure_before_user_created('{"user": {}}') = '{}'::jsonb, 'off lets everything through');
select elum.ensure_guard('submit');
update elum.config set value = 'on' where key = 'ensure.mode';

-- Nobody outside reads the notes.
set role anon;
select expect_error('select count(*) from elum.ensure_events', '42501', 'notes are private');
select expect_error('select elum.ensure_redeem(''x'', ''sign_up'')', '42501', 'only ELUM functions spend passes');
reset role;
\echo 'ELUM Ensure checks passed.'
-- The Console's controls need the ELUM team (the Console migration); without it they refuse.
set role authenticated;
select expect_error('select elum_ensure_summary()', 'PT403', 'the summary is for the team');
select expect_error('select elum_ensure_set(''off'', 14)', 'PT403', 'and so are the controls');
reset role;
