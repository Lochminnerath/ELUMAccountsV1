-- ELUM Account: approve new sign-ins, sign out one device, and preferences.
--
-- Sign-in approvals. With "Approve new sign-ins" on, a new password sign-in gets no access until
-- someone approves it from a device that is already signed in (in Type, ELUM Account or any ELUM
-- app). The approver picks the number the new device shows, out of three, so a stray tap or a
-- flood of prompts cannot let anyone in. A wrong number or "No, it's not me" ends that session.
--
-- How it is enforced: Supabase Auth calls public.elum_access_token_hook every time it issues an
-- access token (sign-in and every refresh). For an unapproved session the hook issues the token
-- with role elum_pending instead of authenticated. That role has no table access and can run only
-- elum_my_sign_in(), so nothing in Write, Type, Make or storage answers it, whatever the app does.
-- Once approved, the next refresh issues a normal token.
--
-- Sign-ins by email link (password reset, a link to a Type recovery address, the sign-in an ELUM
-- app hands to another) count as approved: they prove you can read that inbox. That is also the way
-- back in if no signed-in device is left.
--
-- After running this, turn the hook on: Supabase > Authentication > Hooks > Customize Access Token
-- (JWT) Claims > Postgres function public.elum_access_token_hook. Until then nothing changes.

-- ------------------------------------------------------------------ settings

create table elum.security (
  account_id uuid primary key references public.profiles (id) on delete cascade,
  approve_sign_ins boolean not null default false,
  updated_at timestamptz not null default now()
);

create table elum.preferences (
  account_id uuid primary key references public.profiles (id) on delete cascade,
  time_format text not null default 'auto' check (time_format in ('auto', '12h', '24h')),
  week_start text not null default 'auto' check (week_start in ('auto', 'monday', 'sunday', 'saturday')),
  start_app text not null default 'account' check (start_app in ('account', 'write', 'type', 'make', 'browse')),
  motion text not null default 'system' check (motion in ('system', 'reduce', 'full')),
  updated_at timestamptz not null default now()
);

-- One row per Supabase Auth session once approvals are on.
create table elum.sign_ins (
  session_id uuid primary key,
  account_id uuid not null references public.profiles (id) on delete cascade,
  status text not null check (status in ('pending', 'approved', 'denied')),
  -- The number shown on the new device, and the two wrong ones the approver also sees.
  code smallint not null check (code between 10 and 99),
  decoys smallint[] not null,
  method text,
  user_agent text,
  ip text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '10 minutes',
  decided_at timestamptz
);
create index sign_ins_pending_idx on elum.sign_ins (account_id) where status = 'pending';

alter table elum.security enable row level security;
alter table elum.preferences enable row level security;
alter table elum.sign_ins enable row level security;
revoke all on elum.security, elum.preferences, elum.sign_ins from public, anon, authenticated;

insert into elum.event_types (type, service_id, notify, description) values
  ('elum.sign_in.requested', 'elum', true, 'Someone signed in with your password and is waiting for approval. Payload: {device, notification}.')
on conflict (type) do nothing;

-- --------------------------------------------------------------- the role

do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'elum_pending') then
    create role elum_pending nologin noinherit;
  end if;
end $$;
grant elum_pending to authenticator;
grant usage on schema public to elum_pending;

-- Functions the platform made callable by everyone; nobody needs that, and elum_pending must not
-- reach them. Signed-in people keep their explicit grants.
revoke execute on function public.share_by_email(uuid, text, text) from public;
alter default privileges in schema public revoke execute on functions from public;

-- -------------------------------------------------------------- helpers

create function elum.current_session() returns uuid
language sql stable as $$
  select nullif(nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'session_id', '')::uuid
$$;

-- Two different numbers from 10 to 99, neither equal to p_code.
create function elum.decoys(p_code smallint) returns smallint[]
language plpgsql volatile as $$
declare
  a smallint;
  b smallint;
begin
  loop
    a := 10 + floor(random() * 90)::smallint;
    exit when a <> p_code;
  end loop;
  loop
    b := 10 + floor(random() * 90)::smallint;
    exit when b <> p_code and b <> a;
  end loop;
  return array[a, b];
end $$;

-- A readable device from a user agent, for the prompt: "Firefox on Linux".
create function elum.device_name(p_ua text) returns text
language sql immutable as $$
  select case when p_ua is null then 'A new device' else
    (case when p_ua ~ 'Edg/' then 'Edge' when p_ua ~ 'OPR/' then 'Opera' when p_ua ~ 'Firefox/' then 'Firefox'
          when p_ua ~ 'Chrome/' then 'Chrome' when p_ua ~ 'Safari/' then 'Safari' else 'A browser' end)
    || ' on ' ||
    (case when p_ua ~ 'iPhone' then 'iPhone' when p_ua ~ 'iPad' then 'iPad' when p_ua ~ 'Android' then 'Android'
          when p_ua ~ 'Mac OS X' then 'Mac' when p_ua ~ 'Windows' then 'Windows' when p_ua ~ 'Linux' then 'Linux' else 'another system' end)
  end
$$;

-- ------------------------------------------------------------- the hook

create function public.elum_access_token_hook(event jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_user uuid := nullif(event ->> 'user_id', '')::uuid;
  v_claims jsonb := coalesce(event -> 'claims', '{}');
  v_session uuid := nullif(v_claims ->> 'session_id', '')::uuid;
  v_methods text[];
  v_row elum.sign_ins;
  v_code smallint;
  v_ua text;
  v_ip text;
begin
  if v_user is null or v_session is null or coalesce(v_claims ->> 'role', '') <> 'authenticated' then
    return event;
  end if;
  if not coalesce((select s.approve_sign_ins from elum.security s where s.account_id = v_user), false) then
    return event;
  end if;

  select * into v_row from elum.sign_ins where session_id = v_session;
  if v_row.status = 'approved' then
    return event;
  end if;

  if v_row.session_id is null then
    select coalesce(array_agg(m ->> 'method'), '{}') into v_methods from jsonb_array_elements(coalesce(v_claims -> 'amr', '[]')) m;
    select s.user_agent, host(s.ip) into v_ua, v_ip from auth.sessions s where s.id = v_session;
    v_code := 10 + floor(random() * 90)::smallint;
    -- An email link proves the inbox: approved straight away.
    if v_methods && array['otp', 'magiclink', 'recovery', 'email/signup', 'email_change', 'invite'] then
      insert into elum.sign_ins (session_id, account_id, status, code, decoys, method, user_agent, ip, decided_at)
      values (v_session, v_user, 'approved', v_code, elum.decoys(v_code), array_to_string(v_methods, ','), v_ua, v_ip, now())
      on conflict (session_id) do nothing;
      return event;
    end if;
    insert into elum.sign_ins (session_id, account_id, status, code, decoys, method, user_agent, ip)
    values (v_session, v_user, 'pending', v_code, elum.decoys(v_code), array_to_string(v_methods, ','), v_ua, v_ip)
    on conflict (session_id) do nothing;
    -- The notification is a courtesy: a failure here must never block or open the sign-in.
    begin
      perform elum.emit('elum.sign_in.requested', v_user, v_user,
        jsonb_build_object('device', elum.device_name(v_ua), 'notification', jsonb_build_object(
          'title', 'Is this you signing in?',
          'body', elum.device_name(v_ua) || ' is waiting for you to approve it.',
          'link', '/security')),
        null, 'sign_in:' || v_session);
    exception when others then
      null;
    end;
  end if;

  return jsonb_set(event, '{claims,role}', '"elum_pending"');
exception when others then
  -- Fail closed for accounts that asked for approvals, and never break anyone else's sign-in.
  if coalesce((select s.approve_sign_ins from elum.security s where s.account_id = v_user), false) then
    return jsonb_set(event, '{claims,role}', '"elum_pending"');
  end if;
  return event;
end $$;

revoke execute on function public.elum_access_token_hook(jsonb) from public, anon, authenticated;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'supabase_auth_admin') then
    grant usage on schema public to supabase_auth_admin;
    grant execute on function public.elum_access_token_hook(jsonb) to supabase_auth_admin;
  end if;
end $$;

-- ------------------------------------------------- the waiting device

-- For the new device: is it approved yet, and which number to show.
create function public.elum_my_sign_in() returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select coalesce((
    select jsonb_build_object(
      'status', case when s.status = 'pending' and s.expires_at <= now() then 'expired' else s.status end,
      'code', s.code, 'expiresAt', s.expires_at)
    from elum.sign_ins s where s.session_id = elum.current_session() and s.account_id = auth.uid()),
    jsonb_build_object('status', 'approved'))
$$;
revoke execute on function public.elum_my_sign_in() from public;
grant execute on function public.elum_my_sign_in() to authenticated, elum_pending;

-- ------------------------------------------------------ the approver

-- Sign-ins waiting for this account, newest first. Only sessions that are themselves approved get
-- here: unapproved ones run as elum_pending, which cannot call this.
create function public.elum_sign_in_requests() returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.session_id, 'device', elum.device_name(s.user_agent), 'ip', s.ip, 'at', s.created_at, 'expiresAt', s.expires_at,
      -- The right number among the decoys, in an order that does not give it away.
      'numbers', (select jsonb_agg(n order by n) from unnest(array[s.code] || s.decoys) n))
    order by s.created_at desc), '[]')
  from elum.sign_ins s
  where s.account_id = elum.require_me() and s.status = 'pending' and s.expires_at > now()
    and s.session_id is distinct from elum.current_session()
$$;

-- Approve with the number the new device shows. Any other number, or null ("It's not me"),
-- denies it and signs that device out.
create function public.elum_answer_sign_in(p_session uuid, p_number integer) returns text
language plpgsql security definer set search_path = elum, public, auth as $$
declare
  v_me uuid := elum.require_me();
  v_row elum.sign_ins;
begin
  if not elum.take_rate_limit('sign_in_answer:' || v_me, 30, 3600) then
    raise exception using errcode = 'PT429', message = 'Too many answers. Try again later.';
  end if;
  select * into v_row from elum.sign_ins where session_id = p_session and account_id = v_me for update;
  if v_row.session_id is null or v_row.status <> 'pending' then
    raise exception using errcode = 'PT404', message = 'That sign-in is no longer waiting.';
  end if;
  if p_session = elum.current_session() then
    raise exception using errcode = 'PT403', message = 'Approve a sign-in from another device.';
  end if;
  if v_row.expires_at > now() and p_number is not null and p_number = v_row.code then
    update elum.sign_ins set status = 'approved', decided_at = now() where session_id = p_session;
    perform elum.audit(v_me, 'security.sign_in_approved', 'elum', jsonb_build_object('device', elum.device_name(v_row.user_agent)));
    return 'approved';
  end if;
  update elum.sign_ins set status = 'denied', decided_at = now() where session_id = p_session;
  delete from auth.sessions where id = p_session and user_id = v_me;
  perform elum.audit(v_me, 'security.sign_in_denied', 'elum', jsonb_build_object('device', elum.device_name(v_row.user_agent), 'ip', v_row.ip));
  return 'denied';
end $$;

-- ------------------------------------------------------------ settings

create function public.elum_security() returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select jsonb_build_object('approveSignIns', coalesce((select approve_sign_ins from elum.security where account_id = elum.require_me()), false))
$$;

-- Turning approvals on trusts every device signed in right now; sign out the ones you do not know.
create function public.elum_set_sign_in_approvals(p_on boolean) returns jsonb
language plpgsql security definer set search_path = elum, public, auth as $$
declare
  v_me uuid := elum.require_me();
  v_code smallint;
  s record;
begin
  insert into elum.security (account_id, approve_sign_ins) values (v_me, coalesce(p_on, false))
  on conflict (account_id) do update set approve_sign_ins = excluded.approve_sign_ins, updated_at = now();
  if p_on then
    for s in select id, user_agent, host(ip) as ip from auth.sessions where user_id = v_me loop
      v_code := 10 + floor(random() * 90)::smallint;
      insert into elum.sign_ins (session_id, account_id, status, code, decoys, user_agent, ip, decided_at)
      values (s.id, v_me, 'approved', v_code, elum.decoys(v_code), s.user_agent, s.ip, now())
      on conflict (session_id) do nothing;
    end loop;
  end if;
  perform elum.audit(v_me, case when p_on then 'security.approvals_on' else 'security.approvals_off' end);
  return public.elum_security();
end $$;

-- Sign out one device (not this one: use Sign out for that).
create function public.elum_sign_out_device(p_session uuid) returns void
language plpgsql security definer set search_path = elum, public, auth as $$
declare
  v_me uuid := elum.require_me();
begin
  if p_session = elum.current_session() then
    raise exception using errcode = 'PT400', message = 'To sign out of this device, use Sign out.';
  end if;
  delete from auth.sessions where id = p_session and user_id = v_me;
  if not found then
    raise exception using errcode = 'PT404', message = 'That device is already signed out.';
  end if;
  perform elum.audit(v_me, 'sessions.revoked_one');
end $$;

create function public.elum_preferences() returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select jsonb_build_object('timeFormat', coalesce(p.time_format, 'auto'), 'weekStart', coalesce(p.week_start, 'auto'),
                            'startApp', coalesce(p.start_app, 'account'), 'motion', coalesce(p.motion, 'system'))
  from (select elum.require_me() as id) me left join elum.preferences p on p.account_id = me.id
$$;

create function public.elum_set_preferences(p_time_format text default null, p_week_start text default null,
                                            p_start_app text default null, p_motion text default null) returns jsonb
language plpgsql security definer set search_path = elum, public as $$
declare
  v_me uuid := elum.require_me();
begin
  insert into elum.preferences (account_id) values (v_me) on conflict (account_id) do nothing;
  begin
    update elum.preferences set
      time_format = coalesce(p_time_format, time_format), week_start = coalesce(p_week_start, week_start),
      start_app = coalesce(p_start_app, start_app), motion = coalesce(p_motion, motion), updated_at = now()
    where account_id = v_me;
  exception when check_violation then
    raise exception using errcode = 'PT400', message = 'That setting is not one of the choices.';
  end;
  return public.elum_preferences();
end $$;

revoke execute on function public.elum_sign_in_requests(), public.elum_answer_sign_in(uuid, integer), public.elum_security(),
  public.elum_set_sign_in_approvals(boolean), public.elum_sign_out_device(uuid), public.elum_preferences(),
  public.elum_set_preferences(text, text, text, text) from public;
grant execute on function public.elum_sign_in_requests(), public.elum_answer_sign_in(uuid, integer), public.elum_security(),
  public.elum_set_sign_in_approvals(boolean), public.elum_sign_out_device(uuid), public.elum_preferences(),
  public.elum_set_preferences(text, text, text, text) to authenticated;
