-- Passkeys on the ELUM Account website, and nearby approvals.
--
-- Passkeys: sign in with Face ID, Touch ID or the device PIN instead of a password. The browser
-- keeps the private key (in iCloud Keychain, Google Password Manager or another password manager);
-- only the public key comes here. The passkey function checks each sign-in and then signs the person
-- in with a one-time email-link token, which the approvals hook already treats as approved: a
-- passkey is stronger than a password. A passkey belongs to the site address it was made on
-- (elumaccounts.netlify.app today), so a move to account.elum.services means making new ones.
--
-- Nearby approvals: a waiting sign-in from the same network (the same public address) as the
-- device being asked is marked nearby, so that device can ask straight away. The number still
-- has to be picked: nothing is approved by itself.
-- Needs 20261030000000_elum_app_devices.sql first.

-- ------------------------------------------------------------------ passkeys

create table elum.passkeys (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  -- The credential id and COSE public key, base64url.
  credential_id text not null unique check (length(credential_id) between 16 and 1400),
  public_key text not null check (length(public_key) between 16 and 2000),
  counter bigint not null default 0,
  transports text[] not null default '{}',
  name text not null check (length(name) between 1 and 80),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index passkeys_account_idx on elum.passkeys (account_id);

-- One-time challenges for making a passkey or signing in with one. They last five minutes.
create table elum.passkey_challenges (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('register', 'login')),
  account_id uuid references public.profiles (id) on delete cascade,
  challenge text not null,
  rp_id text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '5 minutes'
);
create index passkey_challenges_expiry_idx on elum.passkey_challenges (expires_at);

alter table elum.passkeys enable row level security;
alter table elum.passkey_challenges enable row level security;
revoke all on elum.passkeys, elum.passkey_challenges from public, anon, authenticated;

-- For signed-in people: their passkeys, by name.
create function public.elum_my_passkeys() returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'createdAt', created_at, 'lastUsedAt', last_used_at)
    order by created_at), '[]')
  from elum.passkeys where account_id = elum.require_me()
$$;

create function public.elum_rename_passkey(p_id uuid, p_name text) returns void
language plpgsql security definer set search_path = elum, public as $$
begin
  if length(trim(coalesce(p_name, ''))) not between 1 and 80 then
    raise exception using errcode = 'PT400', message = 'Give the passkey a name of up to 80 characters.';
  end if;
  update elum.passkeys set name = trim(p_name) where id = p_id and account_id = elum.require_me();
  if not found then
    raise exception using errcode = 'PT404', message = 'That passkey is not in your account.';
  end if;
end $$;

create function public.elum_remove_passkey(p_id uuid) returns void
language plpgsql security definer set search_path = elum, public as $$
declare
  v_me uuid := elum.require_me();
  v_name text;
begin
  delete from elum.passkeys where id = p_id and account_id = v_me returning name into v_name;
  if v_name is null then
    raise exception using errcode = 'PT404', message = 'That passkey is not in your account.';
  end if;
  perform elum.audit(v_me, 'security.passkey_removed', 'elum', jsonb_build_object('passkey', v_name));
end $$;

-- Security settings, now saying whether there is a passkey.
create or replace function public.elum_security() returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select jsonb_build_object(
    'approveSignIns', coalesce((select approve_sign_ins from elum.security where account_id = elum.require_me()), false),
    'hasPasskey', exists (select 1 from elum.passkeys where account_id = elum.require_me()))
$$;

revoke execute on function public.elum_my_passkeys(), public.elum_rename_passkey(uuid, text), public.elum_remove_passkey(uuid) from public, anon;
grant execute on function public.elum_my_passkeys(), public.elum_rename_passkey(uuid, text), public.elum_remove_passkey(uuid),
  public.elum_security() to authenticated;

-- ------------------------------------------- for the passkey function only

-- A new challenge. Old ones are cleared on the way.
create function public.elum_passkey_challenge(p_kind text, p_account uuid, p_challenge text, p_rp_id text) returns uuid
language plpgsql security definer set search_path = elum, public as $$
declare
  v_id uuid;
begin
  delete from elum.passkey_challenges where expires_at < now() - interval '1 hour';
  insert into elum.passkey_challenges (kind, account_id, challenge, rp_id) values (p_kind, p_account, p_challenge, p_rp_id)
  returning id into v_id;
  return v_id;
end $$;

-- Uses a challenge up: it comes back once, and only while it lasts.
create function public.elum_passkey_take_challenge(p_id uuid, p_kind text) returns jsonb
language plpgsql security definer set search_path = elum, public as $$
declare
  v_row elum.passkey_challenges;
begin
  delete from elum.passkey_challenges where id = p_id and kind = p_kind returning * into v_row;
  if v_row.id is null or v_row.expires_at <= now() then
    return null;
  end if;
  return jsonb_build_object('challenge', v_row.challenge, 'accountId', v_row.account_id, 'rpId', v_row.rp_id);
end $$;

-- The passkeys of an account (to avoid making the same one twice), or of an email address (a hint
-- when signing in). Only ids and transports: nothing secret.
create function public.elum_passkey_credentials(p_account uuid default null, p_email text default null) returns jsonb
language sql stable security definer set search_path = elum, public, auth as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', p.credential_id, 'transports', p.transports)), '[]')
  from elum.passkeys p
  where p.account_id = coalesce(p_account, (select u.id from auth.users u where lower(u.email) = lower(trim(p_email)) limit 1))
$$;

create function public.elum_passkey_add(p_account uuid, p_credential_id text, p_public_key text, p_counter bigint,
                                        p_transports text[], p_name text) returns jsonb
language plpgsql security definer set search_path = elum, public as $$
declare
  v_id uuid;
begin
  if (select count(*) from elum.passkeys where account_id = p_account) >= 20 then
    raise exception using errcode = 'PT409', message = 'You have 20 passkeys already. Remove one first.';
  end if;
  begin
    insert into elum.passkeys (account_id, credential_id, public_key, counter, transports, name)
    values (p_account, p_credential_id, p_public_key, coalesce(p_counter, 0), coalesce(p_transports, '{}'),
            coalesce(nullif(left(trim(p_name), 80), ''), 'Passkey'))
    returning id into v_id;
  exception when unique_violation then
    raise exception using errcode = 'PT409', message = 'That passkey is already saved.';
  when check_violation then
    raise exception using errcode = 'PT400', message = 'That passkey is not one we can use.';
  end;
  perform elum.audit(p_account, 'security.passkey_added', 'elum', jsonb_build_object('passkey', coalesce(nullif(trim(p_name), ''), 'Passkey')));
  return jsonb_build_object('id', v_id);
end $$;

-- A passkey being used to sign in: its key, counter and whose it is.
create function public.elum_passkey_lookup(p_credential_id text) returns jsonb
language sql stable security definer set search_path = elum, public, auth as $$
  select jsonb_build_object('accountId', p.account_id, 'publicKey', p.public_key, 'counter', p.counter,
                            'transports', p.transports, 'email', u.email)
  from elum.passkeys p join auth.users u on u.id = p.account_id
  where p.credential_id = p_credential_id
$$;

create function public.elum_passkey_used(p_credential_id text, p_counter bigint) returns void
language sql security definer set search_path = elum, public as $$
  update elum.passkeys set counter = greatest(counter, coalesce(p_counter, 0)), last_used_at = now() where credential_id = p_credential_id
$$;

revoke execute on function public.elum_passkey_challenge(text, uuid, text, text), public.elum_passkey_take_challenge(uuid, text),
  public.elum_passkey_credentials(uuid, text), public.elum_passkey_add(uuid, text, text, bigint, text[], text),
  public.elum_passkey_lookup(text), public.elum_passkey_used(text, bigint) from public, anon, authenticated;
grant execute on function public.elum_passkey_challenge(text, uuid, text, text), public.elum_passkey_take_challenge(uuid, text),
  public.elum_passkey_credentials(uuid, text), public.elum_passkey_add(uuid, text, text, bigint, text[], text),
  public.elum_passkey_lookup(text), public.elum_passkey_used(text, bigint) to service_role;

-- ---------------------------------------------------------- nearby approvals

-- Waiting sign-ins, with 'nearby' when one comes from the same network as this device. Nearby first.
create or replace function public.elum_sign_in_requests() returns jsonb
language sql stable security definer set search_path = elum, public, auth as $$
  with me as (select host(ip) as ip from auth.sessions where id = elum.current_session())
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.session_id, 'device', elum.device_name(s.user_agent), 'ip', s.ip, 'at', s.created_at, 'expiresAt', s.expires_at,
      'challenge', s.challenge,
      'nearby', coalesce(s.ip is not null and s.ip = (select ip from me), false),
      'numbers', (select jsonb_agg(n order by n) from unnest(array[s.code] || s.decoys) n))
    order by coalesce(s.ip is not null and s.ip = (select ip from me), false) desc, s.created_at desc), '[]')
  from elum.sign_ins s
  where s.account_id = elum.require_me() and s.status = 'pending' and s.expires_at > now()
    and s.session_id is distinct from elum.current_session()
$$;
grant execute on function public.elum_sign_in_requests() to authenticated;
