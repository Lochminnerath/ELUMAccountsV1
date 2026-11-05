-- ELUM Account: approve a new sign-in from your email.
--
-- With "Approve new sign-ins" on, a new password sign-in waits for approval (see
-- 20261026000000_sign_in_approvals.sql). Until now that meant answering "Is this you signing in?"
-- on a device that is already signed in. Now ELUM also emails a link to every confirmed address on
-- the account. The link opens a secure page in ELUM Account that asks you to pick the number shown
-- on the device that is signing in, out of three. The right number approves it, as usual. A wrong
-- number or "No, it is not me" stops that sign-in and signs that device out.
--
-- The link carries a long random token. Only its SHA-256 hash is stored, it works only while the
-- sign-in waits (ten minutes), and it is sent once per sign-in. The elum-push function, which the
-- waiting device already calls, sends the email.
--
-- Safe to run more than once.

alter table elum.sign_ins add column if not exists link_hash text;
alter table elum.sign_ins add column if not exists link_sent_at timestamptz;
create unique index if not exists sign_ins_link_hash_idx on elum.sign_ins (link_hash) where link_hash is not null;

-- For the elum-push function (service role only): stores the link's hash for a waiting sign-in,
-- once, and says who to email. Null when there is nothing to send.
create or replace function public.elum_sign_in_email_start(p_sign_in uuid, p_account uuid, p_link_hash text) returns jsonb
language plpgsql security definer set search_path = elum, public as $$
declare
  v_row elum.sign_ins;
begin
  if p_link_hash is null or p_link_hash !~ '^[0-9a-f]{64}$' then
    return null;
  end if;
  update elum.sign_ins set link_hash = p_link_hash, link_sent_at = now()
  where session_id = p_sign_in and account_id = p_account and status = 'pending' and link_sent_at is null and expires_at > now()
  returning * into v_row;
  if v_row.session_id is null then
    return null;
  end if;
  return jsonb_build_object(
    'device', elum.device_name(v_row.user_agent),
    'ip', v_row.ip,
    'at', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'name', (select p.name from public.profiles p where p.id = v_row.account_id),
    'addresses', coalesce((select jsonb_agg(distinct a.address) from elum.addresses a
                           where a.account_id = v_row.account_id and a.verified_at is not null), '[]'));
end $$;

-- The sign-in a link belongs to, for the approval page. Anyone holding the link may ask; nothing
-- else about the account is shown.
create or replace function public.elum_link_sign_in(p_token text) returns jsonb
language plpgsql stable security definer set search_path = elum, public as $$
declare
  v_row elum.sign_ins;
begin
  if p_token is null or length(p_token) < 32 then
    return jsonb_build_object('status', 'missing');
  end if;
  select * into v_row from elum.sign_ins where link_hash = encode(extensions.digest(p_token, 'sha256'), 'hex');
  if v_row.session_id is null then
    return jsonb_build_object('status', 'missing');
  end if;
  return jsonb_build_object(
    'status', case when v_row.status = 'pending' and v_row.expires_at <= now() then 'expired' else v_row.status end,
    'device', elum.device_name(v_row.user_agent),
    'ip', v_row.ip,
    'at', v_row.created_at,
    'expiresAt', v_row.expires_at,
    'numbers', case when v_row.status = 'pending' and v_row.expires_at > now()
      then (select jsonb_agg(n order by n) from unnest(array[v_row.code] || v_row.decoys) n) end);
end $$;

-- Answer from the approval page: the number shown on the new device approves it. Any other number,
-- or null ("No, it is not me"), stops it and signs that device out.
create or replace function public.elum_answer_link_sign_in(p_token text, p_number integer) returns text
language plpgsql security definer set search_path = elum, public, auth as $$
declare
  v_hash text;
  v_row elum.sign_ins;
begin
  if p_token is null or length(p_token) < 32 then
    raise exception using errcode = 'PT404', message = 'This link does not work. Use the newest email.';
  end if;
  v_hash := encode(extensions.digest(p_token, 'sha256'), 'hex');
  if not elum.take_rate_limit('sign_in_link:' || v_hash, 10, 3600) then
    raise exception using errcode = 'PT429', message = 'Too many tries. Sign in again on the other device.';
  end if;
  select * into v_row from elum.sign_ins where link_hash = v_hash for update;
  if v_row.session_id is null then
    raise exception using errcode = 'PT404', message = 'This link does not work. Use the newest email.';
  end if;
  if v_row.status <> 'pending' then
    raise exception using errcode = 'PT409', message = 'This sign-in was already answered.';
  end if;
  if v_row.expires_at <= now() then
    raise exception using errcode = 'PT410', message = 'This sign-in waited too long. Sign in again on the other device.';
  end if;
  if p_number is not null and p_number = v_row.code then
    update elum.sign_ins set status = 'approved', decided_at = now() where session_id = v_row.session_id;
    perform elum.audit(v_row.account_id, 'security.sign_in_approved', 'elum',
      jsonb_build_object('device', elum.device_name(v_row.user_agent), 'by', 'email'));
    return 'approved';
  end if;
  update elum.sign_ins set status = 'denied', decided_at = now() where session_id = v_row.session_id;
  delete from auth.sessions where id = v_row.session_id and user_id = v_row.account_id;
  perform elum.audit(v_row.account_id, 'security.sign_in_denied', 'elum',
    jsonb_build_object('device', elum.device_name(v_row.user_agent), 'ip', v_row.ip, 'by', 'email'));
  return 'denied';
end $$;

revoke execute on function public.elum_sign_in_email_start(uuid, uuid, text) from public, anon, authenticated;
revoke execute on function public.elum_link_sign_in(text), public.elum_answer_link_sign_in(text, integer) from public;
-- elum_pending too: the link may be opened in a browser whose own sign-in is waiting.
grant execute on function public.elum_link_sign_in(text), public.elum_answer_link_sign_in(text, integer) to anon, authenticated, elum_pending;
do $$ begin
  if exists (select 1 from pg_roles where rolname = 'service_role') then
    grant execute on function public.elum_sign_in_email_start(uuid, uuid, text) to service_role;
  end if;
end $$;

-- Check: three rows.
select proname from pg_proc where proname in ('elum_sign_in_email_start', 'elum_link_sign_in', 'elum_answer_link_sign_in') order by proname;
