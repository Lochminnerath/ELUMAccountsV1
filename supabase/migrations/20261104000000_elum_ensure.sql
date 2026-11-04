-- ELUM Ensure: ELUM's own check that a person, not a script, is at the keyboard. No third party, no
-- AI, no cookies, no tracking.
--
-- How a check works:
--   1. The app asks for a challenge (elum_ensure_challenge). It gets a random salt and a difficulty.
--   2. While the person presses and holds the ELUM ring, the browser finds a number that, put after
--      the salt, gives a SHA-256 hash starting with that many zero bits. For a person this takes a
--      moment; for anything making thousands of attempts it adds up fast.
--   3. The app sends the number and how the press went (how long it was held, whether the pointer or
--      keys moved) to elum_ensure_verify. If both hold up, it gets a pass: a one-time token, good for
--      ten minutes and for one action (sign_up, sign_in, submit, send...).
--   4. The action spends the pass (elum.ensure_redeem). Sign-up is checked in the database itself,
--      by the "Before User Created" auth hook below, so it cannot be skipped by calling the API.
--
-- Unusual activity: every challenge, pass, failure and sign-up is noted against a one-way hash of
-- the internet address (salted, and the salt changes every day, so addresses cannot be read back or
-- followed across days). When an address does a lot in a short time, the difficulty rises and actions
-- that normally go through without a check (signing in, sending a public form) start asking for one.
-- Old notes are removed after 7 days.
--
-- Settings (elum.config): ensure.mode (on | off), ensure.base_bits (default 14).

insert into elum.config (key, value) values
  ('ensure.mode', 'on'),
  ('ensure.base_bits', '14'),
  ('ensure.salt', encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'))
on conflict (key) do nothing;

create table if not exists elum.ensure_challenges (
  id uuid primary key default gen_random_uuid(),
  action text not null check (action ~ '^[a-z_]{2,32}$'),
  salt text not null,
  bits integer not null check (bits between 0 and 26),
  who text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '3 minutes',
  solved_at timestamptz
);
create index if not exists ensure_challenges_who on elum.ensure_challenges (who, created_at desc);

create table if not exists elum.ensure_passes (
  token_hash text primary key,
  action text not null,
  who text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  used_at timestamptz
);

create table if not exists elum.ensure_events (
  id bigint generated always as identity primary key,
  who text not null,
  action text not null,
  outcome text not null check (outcome in ('challenge', 'passed', 'failed', 'redeemed', 'refused', 'note')),
  detail text,
  at timestamptz not null default now()
);
create index if not exists ensure_events_who on elum.ensure_events (who, at desc);
create index if not exists ensure_events_at on elum.ensure_events (at desc);

alter table elum.ensure_challenges enable row level security;
alter table elum.ensure_passes enable row level security;
alter table elum.ensure_events enable row level security;
revoke all on elum.ensure_challenges, elum.ensure_passes, elum.ensure_events from public, anon, authenticated;

-- ------------------------------------------------------------------- who is asking

/** The caller's internet address, as the API gateway passes it on. */
create or replace function elum.ensure_ip() returns text
language sql stable set search_path = pg_catalog as $$
  select coalesce(
    nullif(btrim(current_setting('request.headers', true)::json ->> 'cf-connecting-ip'), ''),
    nullif(btrim(current_setting('request.headers', true)::json ->> 'x-real-ip'), ''),
    nullif(btrim(split_part(current_setting('request.headers', true)::json ->> 'x-forwarded-for', ',', 1)), ''),
    'unknown')
$$;

/** A one-way, salted hash of an address. The salt changes every day. */
create or replace function elum.ensure_who(p_ip text default null) returns text
language sql stable security definer set search_path = elum, pg_catalog as $$
  select left(encode(sha256(convert_to(
    coalesce(p_ip, elum.ensure_ip()) || '|' || current_date::text || '|' || coalesce((select value from elum.config where key = 'ensure.salt'), ''),
    'UTF8')), 'hex'), 32)
$$;

create or replace function elum.ensure_on() returns boolean
language sql stable security definer set search_path = elum, pg_catalog as $$
  select coalesce((select value from elum.config where key = 'ensure.mode'), 'on') <> 'off'
$$;

/**
 * How unusual this address has been lately, from 0 (nothing unusual) to 3 (clearly automated).
 * Plain counting, no guessing: lots of sign-ups, failed sign-ins, failed checks or requests in a
 * short time each raise it.
 */
create or replace function elum.ensure_risk(p_who text) returns integer
language plpgsql stable security definer set search_path = elum, pg_catalog as $$
declare
  v_signups integer;
  v_signups_day integer;
  v_failed_signins integer;
  v_failed_checks integer;
  v_challenges integer;
  v_risk integer := 0;
begin
  select count(*) filter (where action = 'sign_up' and outcome = 'redeemed' and at > now() - interval '1 hour'),
         count(*) filter (where action = 'sign_up' and outcome = 'redeemed' and at > now() - interval '1 day'),
         count(*) filter (where action = 'sign_in' and outcome = 'note' and detail = 'failed' and at > now() - interval '15 minutes'),
         count(*) filter (where outcome = 'failed' and at > now() - interval '10 minutes'),
         count(*) filter (where outcome = 'challenge' and at > now() - interval '10 minutes')
    into v_signups, v_signups_day, v_failed_signins, v_failed_checks, v_challenges
    from elum.ensure_events where who = p_who and at > now() - interval '1 day';
  if v_signups >= 3 or v_failed_signins >= 5 or v_failed_checks >= 3 or v_challenges >= 12 then v_risk := 1; end if;
  if v_signups >= 6 or v_signups_day >= 12 or v_failed_signins >= 12 or v_failed_checks >= 8 or v_challenges >= 30 then v_risk := 2; end if;
  if v_signups_day >= 30 or v_failed_signins >= 40 or v_failed_checks >= 25 or v_challenges >= 80 then v_risk := 3; end if;
  return v_risk;
end $$;

create or replace function elum.ensure_note(p_who text, p_action text, p_outcome text, p_detail text default null) returns void
language sql security definer set search_path = elum, pg_catalog as $$
  insert into elum.ensure_events (who, action, outcome, detail) values (p_who, p_action, p_outcome, left(p_detail, 200))
$$;

/** How many leading zero bits a hash has. */
create or replace function elum.ensure_zero_bits(p_hash bytea) returns integer
language plpgsql immutable set search_path = pg_catalog as $$
declare
  n integer := 0;
  b integer;
begin
  for i in 0 .. length(p_hash) - 1 loop
    b := get_byte(p_hash, i);
    if b = 0 then
      n := n + 8;
    else
      while b < 128 loop
        n := n + 1;
        b := b << 1;
      end loop;
      return n;
    end if;
  end loop;
  return n;
end $$;

-- ------------------------------------------------------------------- what apps call

/** Should this action ask for a check right now? Sign-up always does; others when activity is unusual. */
create or replace function public.elum_ensure_needed(p_action text) returns jsonb
language plpgsql stable security definer set search_path = elum, pg_catalog as $$
declare
  v_risk integer := elum.ensure_risk(elum.ensure_who());
begin
  if not elum.ensure_on() then return jsonb_build_object('needed', false, 'level', 0); end if;
  return jsonb_build_object('needed', p_action = 'sign_up' or v_risk >= 1, 'level', v_risk);
end $$;

/** A new challenge for this action. Harder the more unusual this address has been. */
create or replace function public.elum_ensure_challenge(p_action text) returns jsonb
language plpgsql security definer set search_path = elum, pg_catalog as $$
declare
  v_who text := elum.ensure_who();
  v_risk integer := elum.ensure_risk(v_who);
  v_bits integer;
  v_row elum.ensure_challenges;
begin
  if p_action is null or p_action !~ '^[a-z_]{2,32}$' then
    raise exception using errcode = 'PT400', message = 'That check is not one ELUM knows.';
  end if;
  if (select count(*) from elum.ensure_events where who = v_who and outcome = 'challenge' and at > now() - interval '10 minutes') >= 120 then
    raise exception using errcode = 'PT429', message = 'Too many checks from here. Wait a few minutes and try again.';
  end if;
  v_bits := least(20, coalesce((select value::integer from elum.config where key = 'ensure.base_bits'), 14) + v_risk * 2);
  insert into elum.ensure_challenges (action, salt, bits, who)
  values (p_action, encode(sha256(convert_to(gen_random_uuid()::text || clock_timestamp()::text, 'UTF8')), 'hex'), v_bits, v_who)
  returning * into v_row;
  perform elum.ensure_note(v_who, p_action, 'challenge', v_bits::text);
  -- Tidy up as we go: challenges and passes are short-lived, notes are kept a week.
  delete from elum.ensure_challenges where expires_at < now() - interval '1 hour';
  delete from elum.ensure_passes where expires_at < now() - interval '1 day';
  delete from elum.ensure_events where at < now() - interval '7 days';
  return jsonb_build_object('id', v_row.id, 'salt', v_row.salt, 'bits', v_row.bits, 'level', v_risk, 'expiresAt', v_row.expires_at);
end $$;

/**
 * Checks an answer. The number must give a hash with enough zero bits, and the press must look like
 * a person's: held for at least half a second, with some movement of the pointer or the keys, and
 * not finished impossibly fast. Returns a one-time pass for the action.
 */
create or replace function public.elum_ensure_verify(p_id uuid, p_nonce text, p_signals jsonb default '{}') returns jsonb
language plpgsql security definer set search_path = elum, pg_catalog as $$
declare
  v_who text := elum.ensure_who();
  v_row elum.ensure_challenges;
  v_hold integer := coalesce(nullif(p_signals ->> 'hold', '')::integer, 0);
  v_moves integer := coalesce(nullif(p_signals ->> 'moves', '')::integer, 0);
  v_keys boolean := coalesce((p_signals ->> 'keys')::boolean, false);
  v_elapsed integer := coalesce(nullif(p_signals ->> 'elapsed', '')::integer, 0);
  v_token text;
  v_problem text;
begin
  select * into v_row from elum.ensure_challenges where id = p_id for update;
  if not found or v_row.who <> v_who then
    v_problem := 'unknown';
  elsif v_row.solved_at is not null then
    v_problem := 'used';
  elsif v_row.expires_at < now() then
    v_problem := 'expired';
  elsif p_nonce is null or length(p_nonce) > 32 or elum.ensure_zero_bits(sha256(convert_to(v_row.salt || ':' || p_nonce, 'UTF8'))) < v_row.bits then
    v_problem := 'work';
  elsif v_hold < 450 or v_hold > 60000 or v_elapsed < 600 or (v_moves < 2 and not v_keys) then
    v_problem := 'press';
  end if;

  if v_problem is not null then
    perform elum.ensure_note(v_who, coalesce(v_row.action, 'unknown'), 'failed', v_problem);
    raise exception using errcode = 'PT400', message = case v_problem
      when 'expired' then 'That check took too long. Try it again.'
      when 'used' then 'That check was already used. Try it again.'
      when 'press' then 'Press and hold the ring until it fills.'
      else 'That check did not go through. Try it again.' end;
  end if;

  update elum.ensure_challenges set solved_at = now() where id = p_id;
  v_token := encode(sha256(convert_to(gen_random_uuid()::text || gen_random_uuid()::text || v_row.salt, 'UTF8')), 'hex');
  insert into elum.ensure_passes (token_hash, action, who) values (encode(sha256(convert_to(v_token, 'UTF8')), 'hex'), v_row.action, v_who);
  perform elum.ensure_note(v_who, v_row.action, 'passed', null);
  return jsonb_build_object('pass', v_token, 'action', v_row.action, 'expiresAt', now() + interval '10 minutes');
end $$;

/** Notes something an app saw, such as a failed sign-in, so unusual activity is noticed. */
create or replace function public.elum_ensure_report(p_action text, p_detail text) returns void
language plpgsql security definer set search_path = elum, pg_catalog as $$
declare
  v_who text := elum.ensure_who();
begin
  if p_action is null or p_action !~ '^[a-z_]{2,32}$' or p_detail is null or p_detail !~ '^[a-z_]{2,32}$' then return; end if;
  if (select count(*) from elum.ensure_events where who = v_who and outcome = 'note' and at > now() - interval '10 minutes') >= 200 then return; end if;
  perform elum.ensure_note(v_who, p_action, 'note', p_detail);
end $$;

/**
 * Spends a pass on an action. For the functions that guard an action (the sign-up hook, Type's
 * sign-up, public forms...). True once, for a pass that is real, unused, unexpired and for that
 * action; false otherwise.
 */
create or replace function elum.ensure_redeem(p_pass text, p_action text, p_who text default null) returns boolean
language plpgsql security definer set search_path = elum, pg_catalog as $$
declare
  v_row elum.ensure_passes;
begin
  if p_pass is null or length(p_pass) <> 64 then
    perform elum.ensure_note(coalesce(p_who, elum.ensure_who()), p_action, 'refused', 'missing');
    return false;
  end if;
  update elum.ensure_passes set used_at = now()
   where token_hash = encode(sha256(convert_to(p_pass, 'UTF8')), 'hex') and action = p_action and used_at is null and expires_at > now()
  returning * into v_row;
  if not found then
    perform elum.ensure_note(coalesce(p_who, elum.ensure_who()), p_action, 'refused', 'invalid');
    return false;
  end if;
  perform elum.ensure_note(v_row.who, p_action, 'redeemed', null);
  return true;
end $$;

/** For edge functions (service role): spend a pass, with the caller's address. */
create or replace function public.elum_ensure_redeem(p_pass text, p_action text, p_ip text default null) returns boolean
language sql security definer set search_path = elum, pg_catalog as $$
  select case when not elum.ensure_on() then true
              else elum.ensure_redeem(p_pass, p_action, case when p_ip is null then null else elum.ensure_who(p_ip) end) end
$$;

/**
 * Guards an action that only needs a check when activity is unusual (signing in, a public form):
 * passes when nothing is unusual, or when a pass for the action comes with it. Otherwise raises
 * PT428 "ensure_required", which apps answer by showing the check and trying again with its pass.
 */
create or replace function elum.ensure_guard(p_action text, p_pass text default null) returns void
language plpgsql security definer set search_path = elum, pg_catalog as $$
declare
  v_who text := elum.ensure_who();
begin
  if not elum.ensure_on() then return; end if;
  if p_pass is not null and elum.ensure_redeem(p_pass, p_action, v_who) then return; end if;
  if elum.ensure_risk(v_who) >= 1 then
    perform elum.ensure_note(v_who, p_action, 'refused', 'unusual');
    raise exception using errcode = 'PT428', message = 'ensure_required', hint = 'Confirm you are not a robot to carry on.';
  end if;
end $$;

-- ------------------------------------------------------------------- sign-up, in the database

/**
 * Supabase "Before User Created" auth hook. Turn it on in Supabase > Authentication > Hooks, with
 * this Postgres function. Every new account must carry a sign-up pass in its sign-up data
 * (options.data.ensure_pass), unless a trusted ELUM function created it and marked it checked
 * itself (app_metadata.ensure = 'checked', which only the service role can set).
 */
create or replace function public.elum_ensure_before_user_created(event jsonb) returns jsonb
language plpgsql security definer set search_path = elum, pg_catalog as $$
declare
  v_ip text := nullif(event -> 'metadata' ->> 'ip_address', '');
  v_pass text := coalesce(event -> 'user' -> 'user_metadata' ->> 'ensure_pass', event -> 'user' -> 'raw_user_meta_data' ->> 'ensure_pass');
begin
  if not elum.ensure_on() then return '{}'::jsonb; end if;
  if coalesce(event -> 'user' -> 'app_metadata' ->> 'ensure', '') = 'checked' then return '{}'::jsonb; end if;
  if elum.ensure_redeem(v_pass, 'sign_up', case when v_ip is null then null else elum.ensure_who(v_ip) end) then
    return '{}'::jsonb;
  end if;
  return jsonb_build_object('error', jsonb_build_object('http_code', 403, 'message', 'Confirm you are not a robot to create an account.'));
end $$;

-- ------------------------------------------------------------------- the team can see it

/** What ELUM Ensure has seen in the last day, for the Console: totals and the busiest addresses (hashed). */
create or replace function public.elum_ensure_summary() returns jsonb
language plpgsql stable security definer set search_path = elum, pg_catalog as $$
begin
  if to_regprocedure('elum.require_staff(text)') is null then
    raise exception using errcode = 'PT403', message = 'That needs the ELUM team.';
  end if;
  execute 'select elum.require_staff(''viewer'')';
  return jsonb_build_object(
    'mode', case when elum.ensure_on() then 'on' else 'off' end,
    'baseBits', coalesce((select value::integer from elum.config where key = 'ensure.base_bits'), 14),
    'day', (select coalesce(jsonb_object_agg(outcome, n), '{}') from (
              select outcome, count(*) n from elum.ensure_events where at > now() - interval '1 day' group by outcome) t),
    'busiest', (select coalesce(jsonb_agg(jsonb_build_object('who', left(who, 8), 'events', n, 'risk', elum.ensure_risk(who)) order by n desc), '[]') from (
              select who, count(*) n from elum.ensure_events where at > now() - interval '1 hour' group by who order by count(*) desc limit 10) t));
end $$;

/** For the Console (admins): switch ELUM Ensure on or off, and set how hard the work starts. */
create or replace function public.elum_ensure_set(p_mode text, p_base_bits integer) returns jsonb
language plpgsql security definer set search_path = elum, pg_catalog as $$
begin
  if to_regprocedure('elum.require_staff(text)') is null then
    raise exception using errcode = 'PT403', message = 'That needs the ELUM team.';
  end if;
  execute 'select elum.require_staff(''admin'')';
  if p_mode not in ('on', 'off') then
    raise exception using errcode = 'PT400', message = 'ELUM Ensure is either on or off.';
  end if;
  if p_base_bits is null or p_base_bits not between 10 and 18 then
    raise exception using errcode = 'PT400', message = 'Choose a difficulty from 10 to 18.';
  end if;
  insert into elum.config (key, value) values ('ensure.mode', p_mode), ('ensure.base_bits', p_base_bits::text)
  on conflict (key) do update set value = excluded.value;
  if to_regprocedure('elum.staff_log(text,uuid,jsonb)') is not null then
    execute 'select elum.staff_log($1, null, $2)' using 'console.ensure.changed', jsonb_build_object('mode', p_mode, 'baseBits', p_base_bits);
  end if;
  return public.elum_ensure_summary();
end $$;

-- ------------------------------------------------------------------- who may call what

revoke all on function elum.ensure_ip(), elum.ensure_who(text), elum.ensure_on(), elum.ensure_risk(text), elum.ensure_note(text, text, text, text),
  elum.ensure_zero_bits(bytea), elum.ensure_redeem(text, text, text), elum.ensure_guard(text, text) from public, anon, authenticated;
revoke all on function public.elum_ensure_needed(text), public.elum_ensure_challenge(text), public.elum_ensure_verify(uuid, text, jsonb),
  public.elum_ensure_report(text, text), public.elum_ensure_redeem(text, text, text), public.elum_ensure_before_user_created(jsonb),
  public.elum_ensure_summary(), public.elum_ensure_set(text, integer) from public, anon, authenticated;
grant execute on function public.elum_ensure_needed(text), public.elum_ensure_challenge(text), public.elum_ensure_verify(uuid, text, jsonb),
  public.elum_ensure_report(text, text) to anon, authenticated;
grant execute on function public.elum_ensure_summary(), public.elum_ensure_set(text, integer) to authenticated;
grant execute on function public.elum_ensure_redeem(text, text, text) to service_role;
do $$
begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.elum_ensure_before_user_created(jsonb) to supabase_auth_admin;
  end if;
end $$;
