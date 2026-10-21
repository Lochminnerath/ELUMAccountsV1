-- ELUM app: phones and computers that approve sign-ins with Face ID, Touch ID or a fingerprint.
--
-- The ELUM app makes a key pair inside the device's secure chip (Secure Enclave / StrongBox),
-- locked behind the device's biometrics. Only the public key comes here. ELUM never sees a face,
-- a fingerprint or the private key. To approve a sign-in the app signs that sign-in's one-time
-- challenge; the elum-approve function checks the signature against the public key stored here.
-- Needs 20261026000000_sign_in_approvals.sql first.

create table elum.devices (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (length(name) between 1 and 80),
  platform text not null check (platform in ('ios', 'ipados', 'android', 'macos', 'windows')),
  -- P-256 public key, SubjectPublicKeyInfo DER, base64.
  public_key text not null check (length(public_key) between 80 and 400),
  push_provider text check (push_provider in ('apns', 'fcm')),
  push_token text check (length(push_token) <= 4096),
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index devices_account_idx on elum.devices (account_id);
alter table elum.devices enable row level security;
revoke all on elum.devices from public, anon, authenticated;

-- Each waiting sign-in gets a random challenge the app signs, and remembers who decided it.
alter table elum.sign_ins
  add column challenge text not null default encode(decode(replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''), 'hex'), 'base64'),
  add column decided_by_device uuid references elum.devices (id) on delete set null,
  add column pushed_at timestamptz;

-- Register this device after the person set it up with biometrics. At most 10 per account.
create function public.elum_register_device(p_name text, p_platform text, p_public_key text,
                                            p_push_provider text default null, p_push_token text default null) returns jsonb
language plpgsql security definer set search_path = elum, public as $$
declare
  v_me uuid := elum.require_me();
  v_id uuid;
begin
  if (select count(*) from elum.devices where account_id = v_me) >= 10 then
    raise exception using errcode = 'PT409', message = 'You have 10 devices already. Remove one in ELUM Account first.';
  end if;
  begin
    insert into elum.devices (account_id, name, platform, public_key, push_provider, push_token)
    values (v_me, trim(p_name), p_platform, p_public_key, p_push_provider, p_push_token) returning id into v_id;
  exception when check_violation then
    raise exception using errcode = 'PT400', message = 'Some device details are missing or not valid.';
  end;
  perform elum.audit(v_me, 'security.device_added', 'elum', jsonb_build_object('device', trim(p_name)));
  return jsonb_build_object('id', v_id);
end $$;

-- A new push token (they change after reinstalls and OS updates).
create function public.elum_update_device(p_device uuid, p_name text default null,
                                          p_push_provider text default null, p_push_token text default null) returns void
language plpgsql security definer set search_path = elum, public as $$
begin
  update elum.devices set name = coalesce(nullif(trim(p_name), ''), name),
    push_provider = coalesce(p_push_provider, push_provider), push_token = coalesce(p_push_token, push_token)
  where id = p_device and account_id = elum.require_me();
  if not found then
    raise exception using errcode = 'PT404', message = 'That device is not in your account.';
  end if;
end $$;

create function public.elum_my_devices() returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'name', name, 'platform', platform,
    'createdAt', created_at, 'lastUsedAt', last_used_at) order by created_at), '[]')
  from elum.devices where account_id = elum.require_me()
$$;

create function public.elum_remove_device(p_device uuid) returns void
language plpgsql security definer set search_path = elum, public as $$
declare
  v_me uuid := elum.require_me();
begin
  delete from elum.devices where id = p_device and account_id = v_me;
  if not found then
    raise exception using errcode = 'PT404', message = 'That device is not in your account.';
  end if;
  perform elum.audit(v_me, 'security.device_removed');
end $$;

-- Waiting sign-ins, now with the challenge the app signs.
create or replace function public.elum_sign_in_requests() returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', s.session_id, 'device', elum.device_name(s.user_agent), 'ip', s.ip, 'at', s.created_at, 'expiresAt', s.expires_at,
      'challenge', s.challenge,
      'numbers', (select jsonb_agg(n order by n) from unnest(array[s.code] || s.decoys) n))
    order by s.created_at desc), '[]')
  from elum.sign_ins s
  where s.account_id = elum.require_me() and s.status = 'pending' and s.expires_at > now()
    and s.session_id is distinct from elum.current_session()
$$;

revoke execute on function public.elum_register_device(text, text, text, text, text), public.elum_update_device(uuid, text, text, text),
  public.elum_my_devices(), public.elum_remove_device(uuid) from public;
grant execute on function public.elum_register_device(text, text, text, text, text), public.elum_update_device(uuid, text, text, text),
  public.elum_my_devices(), public.elum_remove_device(uuid), public.elum_sign_in_requests() to authenticated;

-- ------------------------------------------- for the elum-approve and elum-push functions only

-- The device's key and the waiting sign-in, if both belong to this account.
create function public.elum_device_sign_in(p_account uuid, p_device uuid, p_sign_in uuid) returns jsonb
language sql stable security definer set search_path = elum, public as $$
  select jsonb_build_object('publicKey', d.public_key, 'status',
      case when s.status = 'pending' and s.expires_at <= now() then 'expired' else s.status end, 'challenge', s.challenge)
  from elum.devices d join elum.sign_ins s on s.account_id = d.account_id and s.session_id = p_sign_in
  where d.id = p_device and d.account_id = p_account
$$;

-- Record the app's (already verified) answer. A deny, or an approve too late, signs that device out.
create function public.elum_device_decide(p_account uuid, p_device uuid, p_sign_in uuid, p_approve boolean) returns text
language plpgsql security definer set search_path = elum, public, auth as $$
declare
  v_row elum.sign_ins;
begin
  select * into v_row from elum.sign_ins where session_id = p_sign_in and account_id = p_account for update;
  if v_row.session_id is null or v_row.status <> 'pending' then
    return 'gone';
  end if;
  update elum.devices set last_used_at = now() where id = p_device;
  if p_approve and v_row.expires_at > now() then
    update elum.sign_ins set status = 'approved', decided_at = now(), decided_by_device = p_device where session_id = p_sign_in;
    perform elum.audit(p_account, 'security.sign_in_approved', 'elum', jsonb_build_object('device', elum.device_name(v_row.user_agent), 'by', 'elum_app'));
    return 'approved';
  end if;
  update elum.sign_ins set status = 'denied', decided_at = now(), decided_by_device = p_device where session_id = p_sign_in;
  delete from auth.sessions where id = p_sign_in and user_id = p_account;
  perform elum.audit(p_account, 'security.sign_in_denied', 'elum', jsonb_build_object('device', elum.device_name(v_row.user_agent), 'ip', v_row.ip, 'by', 'elum_app'));
  return case when p_approve then 'expired' else 'denied' end;
end $$;

-- Where to send the "Is this you?" push for a waiting sign-in. Once per sign-in.
create function public.elum_push_targets(p_sign_in uuid) returns jsonb
language plpgsql security definer set search_path = elum, public as $$
declare
  v_row elum.sign_ins;
begin
  update elum.sign_ins set pushed_at = now()
  where session_id = p_sign_in and status = 'pending' and pushed_at is null and expires_at > now()
  returning * into v_row;
  if v_row.session_id is null then
    return null;
  end if;
  return jsonb_build_object('signInId', v_row.session_id, 'device', elum.device_name(v_row.user_agent),
    'targets', coalesce((select jsonb_agg(jsonb_build_object('provider', push_provider, 'token', push_token))
                         from elum.devices where account_id = v_row.account_id and push_token is not null), '[]'));
end $$;

revoke execute on function public.elum_device_sign_in(uuid, uuid, uuid), public.elum_device_decide(uuid, uuid, uuid, boolean),
  public.elum_push_targets(uuid) from public, anon, authenticated;
grant execute on function public.elum_device_sign_in(uuid, uuid, uuid), public.elum_device_decide(uuid, uuid, uuid, boolean),
  public.elum_push_targets(uuid) to service_role;
