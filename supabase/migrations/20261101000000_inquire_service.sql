-- ELUM Inquire (the form designer) is an ELUM service: people can get it in Store, and signing in
-- to it records it (elum_join_service only takes services in beta or active). Safe to run again.

insert into elum.services (id, name, kind, color_token, url, status, sort)
values ('inquire', 'Inquire', 'product', 'inquire', 'https://inquire.elum.services', 'beta', 60)
on conflict (id) do update
  set name = excluded.name,
      color_token = excluded.color_token,
      url = excluded.url,
      status = case when elum.services.status = 'planned' then 'beta' else elum.services.status end;
