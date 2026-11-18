-- ELUM: database tidy-up, from what the Supabase advisor and ELUM Console > Health flagged.
--
-- 1. Access rules that asked "who is this?" once per row now ask once per query. The rule itself
--    does not change: auth.uid() becomes (select auth.uid()), which Postgres works out a single
--    time. Rules on storage.objects belong to Supabase Storage and are left alone.
-- 2. Every link between tables (a foreign key) gets an index behind it, so deleting an account,
--    a document or a playlist does not read whole tables to find what points at it.
-- 3. The scheduled-job history (cron.job_run_details) is trimmed to the last 7 days, and a nightly
--    job keeps it that way. It was the table with the most leftover rows.
--
-- Safe to run more than once. Run "15b - vacuum.sql" on its own afterwards to reclaim the space.

do $$
declare
  p record;
  v_using text;
  v_check text;
  n integer := 0;
begin
  for p in
    select schemaname, tablename, policyname, qual, with_check
      from pg_policies
     where schemaname in ('elum', 'public', 'type', 'make', 'tune', 'capture', 'code', 'inquire')
       and (coalesce(qual, '') ~* '(?<!select )auth\.(uid|jwt|role)\(\)'
            or coalesce(with_check, '') ~* '(?<!select )auth\.(uid|jwt|role)\(\)')
  loop
    v_using := regexp_replace(p.qual, '(?<!select )auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'gi');
    v_check := regexp_replace(p.with_check, '(?<!select )auth\.(uid|jwt|role)\(\)', '(select auth.\1())', 'gi');
    execute format('alter policy %I on %I.%I', p.policyname, p.schemaname, p.tablename)
      || case when v_using is not null then format(' using (%s)', v_using) else '' end
      || case when v_check is not null then format(' with check (%s)', v_check) else '' end;
    n := n + 1;
  end loop;
  raise notice 'Access rules updated: %', n;
end $$;

do $$
declare
  f record;
  v_name text;
  n integer := 0;
begin
  for f in
    select ns.nspname, t.relname, c.conkey,
           (select string_agg(quote_ident(a.attname), ', ' order by k.ord)
              from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as cols,
           (select string_agg(a.attname, '_' order by k.ord)
              from unnest(c.conkey) with ordinality k(attnum, ord)
              join pg_attribute a on a.attrelid = c.conrelid and a.attnum = k.attnum) as col_names
      from pg_constraint c
      join pg_class t on t.oid = c.conrelid
      join pg_namespace ns on ns.oid = t.relnamespace
     where c.contype = 'f'
       and ns.nspname in ('elum', 'public', 'type', 'make', 'tune', 'capture', 'code', 'inquire')
       and not exists (select 1 from pg_index i
                        where i.indrelid = c.conrelid
                          and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey)
  loop
    v_name := left(f.relname || '_' || f.col_names, 53) || '_fk_idx';
    execute format('create index if not exists %I on %I.%I (%s)', v_name, f.nspname, f.relname, f.cols);
    n := n + 1;
  end loop;
  raise notice 'Indexes added: %', n;
end $$;

do $$ begin
  if to_regclass('cron.job_run_details') is not null then
    delete from cron.job_run_details where end_time < now() - interval '7 days';
    perform cron.schedule('elum-trim-job-history', '23 3 * * *',
      $job$delete from cron.job_run_details where end_time < now() - interval '7 days'$job$);
  end if;
end $$;

-- Check: both numbers should be 0.
select
  (select count(*) from pg_policies
    where schemaname in ('elum', 'public', 'type', 'make', 'tune', 'capture', 'code', 'inquire')
      and (coalesce(qual, '') ~* '(?<!select )auth\.(uid|jwt|role)\(\)' or coalesce(with_check, '') ~* '(?<!select )auth\.(uid|jwt|role)\(\)')) as rules_left,
  (select count(*) from pg_constraint c join pg_namespace ns on ns.oid = c.connamespace
    where c.contype = 'f' and ns.nspname in ('elum', 'public', 'type', 'make', 'tune', 'capture', 'code', 'inquire')
      and not exists (select 1 from pg_index i where i.indrelid = c.conrelid
                       and (i.indkey::int2[])[0:array_length(c.conkey, 1) - 1] = c.conkey)) as links_left;
