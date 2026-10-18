-- ELUM Accounts: profile, pictures, circles, privacy, addresses, devices, activity and deletion.
\set ON_ERROR_STOP on
\set QUIET on

\set ada '00000000-0000-0000-0000-0000000000a1'
\set bo '00000000-0000-0000-0000-0000000000a2'
\set cy '00000000-0000-0000-0000-0000000000a3'
\set dee '00000000-0000-0000-0000-0000000000a4'

insert into auth.users (id, email, email_confirmed_at, raw_user_meta_data) values
  (:'ada', 'ada@example.org', now(), '{"name": "Ada Okafor"}'),
  (:'bo', 'bo@example.org', now(), '{"name": "Bo Lin"}'),
  (:'cy', 'cy@example.org', now(), '{"name": "Cy Park"}'),
  (:'dee', 'dee@example.org', now(), '{"name": "Dee Stranger"}');
insert into auth.sessions (id, user_id, user_agent, ip) values
  ('10000000-0000-0000-0000-000000000001', :'ada', 'Firefox on Linux', '203.0.113.1'),
  ('10000000-0000-0000-0000-000000000002', :'ada', 'Safari on iPhone', '203.0.113.2'),
  ('10000000-0000-0000-0000-000000000003', :'bo', 'Chrome on Windows', '203.0.113.3');

-- ------------------------------------------------------------------ profile
select set_config('request.jwt.claims', json_build_object('sub', :'ada', 'session_id', '10000000-0000-0000-0000-000000000001')::text, false);
set role authenticated;
select expect((elum_account() ->> 'name') = 'Ada Okafor', 'the account in one call');
select expect((elum_account() #>> '{privacy,picture}') = 'everyone', 'privacy starts open, as ELUM was before');
select expect((elum_update_profile('Ada O.', '#3FC4A0', 'fr-FR', 'Europe/Paris') ->> 'name') = 'Ada O.', 'name, colour, language, time zone');
select expect((elum_account() ->> 'locale') = 'fr-FR' and (elum_account() ->> 'timeZone') = 'Europe/Paris', 'language and time zone saved');
select expect((select color from profiles where id = auth.uid()) = '#3fc4a0', 'colour saved');
select expect_error($$select elum_update_profile(null, '#123456')$$, 'PT400', 'only ELUM colours');
select expect_error($$select elum_update_profile(null, null, null, 'Mars/Olympus')$$, 'PT400', 'real time zones only');
select expect_error($$select elum_update_profile('   ')$$, 'PT400', 'names cannot be empty');
select expect_error($$select * from elum.privacy$$, '42501', 'privacy tables are server only');

-- ----------------------------------------------------------------- pictures
insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000a1/face.webp');
select expect_error($$insert into storage.objects (bucket_id, name) values ('avatars', '00000000-0000-0000-0000-0000000000a2/face.webp')$$,
                    '42501', 'nobody uploads into someone else''s folder');
select expect(elum_set_picture('00000000-0000-0000-0000-0000000000a1/face.webp') is null, 'the first picture has nothing to replace');
select expect_error($$select elum_set_picture('00000000-0000-0000-0000-0000000000a2/face.webp')$$, 'PT400', 'only your own folder');
select expect((elum_account() ->> 'picture') = '00000000-0000-0000-0000-0000000000a1/face.webp', 'your picture');

-- ------------------------------------------------------------------ circles
select elum_set_circle(:'bo', 'family');
select elum_set_circle(:'cy', 'friends');
select expect((elum_account() #>> '{circles,family}')::int = 1 and (elum_account() #>> '{circles,friends}')::int = 1, 'circle counts');
select expect((elum_people('family') -> 0 ->> 'name') = 'Bo Lin', 'people by circle');
select expect((elum_people() -> 0 ->> 'circle') is not null, 'each person shows their circle');
select expect_error($$select elum_set_circle(auth.uid(), 'friends')$$, 'PT400', 'you cannot circle yourself');
select expect_error($$select elum_set_circle('00000000-0000-0000-0000-0000000000a2', 'enemies')$$, 'PT400', 'only known circles');
select elum_set_circle(:'cy', 'work');
select expect((elum_people('work') -> 0 ->> 'name') = 'Cy Park', 'moving someone to another circle');

-- Ada shows her picture only to family, and only friends and family may message her.
select elum_set_privacy('family', null, 'close');
reset role;

select expect(elum.allows(:'ada', :'bo', 'picture'), 'family sees the picture');
select expect(not elum.allows(:'ada', :'cy', 'picture'), 'work does not');
select expect(not elum.allows(:'ada', :'dee', 'picture'), 'unknown people do not');
select expect(elum.allows(:'ada', :'bo', 'message') and not elum.allows(:'ada', :'cy', 'message') and not elum.allows(:'ada', :'dee', 'message'),
              'messages from friends and family only');
select expect(elum.allows(:'ada', :'dee', 'find'), 'still findable by everyone');
select expect(elum.allows(:'ada', :'ada', 'picture'), 'you always see yourself');

select set_config('request.jwt.claims', json_build_object('sub', :'bo')::text, false);
set role authenticated;
select expect((select count(*) from elum_pictures(array['00000000-0000-0000-0000-0000000000a1'::uuid])) = 1, 'family gets the picture');
select expect((select count(*) from storage.objects where name = '00000000-0000-0000-0000-0000000000a1/face.webp') = 1, 'and can load the file');
select expect((elum_find_people('ada') -> 0 ->> 'picture') is not null, 'search shows it to family');
reset role;

select set_config('request.jwt.claims', json_build_object('sub', :'dee')::text, false);
set role authenticated;
select expect((select count(*) from elum_pictures(array['00000000-0000-0000-0000-0000000000a1'::uuid])) = 0, 'strangers get no picture');
select expect((select count(*) from storage.objects where name = '00000000-0000-0000-0000-0000000000a1/face.webp') = 0, 'and cannot load the file');
select expect((elum_find_people('ada') -> 0 ->> 'picture') is null and (elum_find_people('ada') -> 0 ->> 'name') = 'Ada O.', 'they find Ada, without the picture');
select expect(jsonb_array_length(elum_find_people('a')) = 0, 'searches need two letters');
reset role;

-- Hiding from search, and blocking.
select set_config('request.jwt.claims', json_build_object('sub', :'ada')::text, false);
set role authenticated;
select elum_set_privacy(null, 'known', null);
select elum_set_circle(:'dee', 'blocked');
reset role;
select expect(not elum.allows(:'ada', :'dee', 'find') and not elum.allows(:'ada', :'dee', 'message'), 'blocked people can do nothing');
select set_config('request.jwt.claims', json_build_object('sub', :'dee')::text, false);
set role authenticated;
select expect(jsonb_array_length(elum_find_people('ada')) = 0, 'people Ada does not know cannot find her');
select expect((select count(*) from search_users('ada')) = 0, 'not even when sharing in Write');
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'cy')::text, false);
set role authenticated;
select expect(jsonb_array_length(elum_find_people('ada')) = 1, 'people she knows still can');
select expect((select count(*) from search_users('ada')) = 1, 'in Write too');
select expect(jsonb_array_length(elum_people()) = 0, 'circles are private to their owner');
reset role;

-- ---------------------------------------------------------------- addresses
set role service_role;
select elum_address_code_start(:'ada', 'Ada@Personal.example', '424242');
select expect_error($$select elum_address_code_start('00000000-0000-0000-0000-0000000000a1', 'bo@example.org', '1')$$, 'PT409', 'another account''s address');
reset role;
select set_config('request.jwt.claims', json_build_object('sub', :'ada', 'session_id', '10000000-0000-0000-0000-000000000001')::text, false);
set role authenticated;
select expect((elum_account() -> 'pendingAddresses') = '["ada@personal.example"]', 'the address waiting for its code');
select expect_error($$select elum_confirm_address('ada@personal.example', '000000')$$, 'PT400', 'a wrong code');
select expect(elum_confirm_address('ada@personal.example', '424242') = 'ada@personal.example', 'the right code');
select expect((select count(*) from jsonb_array_elements(elum_account() -> 'addresses') a where a ->> 'address' = 'ada@personal.example' and (a ->> 'verified')::boolean) = 1,
              'the address is on the account, verified');
select expect_error($$select elum_remove_address('ada@example.org')$$, 'PT400', 'the sign-in address stays');
select elum_remove_address('ada@personal.example');
select expect((select count(*) from jsonb_array_elements(elum_account() -> 'addresses')) = 1, 'added addresses can be removed');

-- ------------------------------------------------ devices, activity, notices
select expect(jsonb_array_length(elum_devices()) = 2, 'your signed-in devices');
select expect((select count(*) from jsonb_array_elements(elum_devices()) d where (d ->> 'current')::boolean and d ->> 'userAgent' = 'Firefox on Linux') = 1,
              'this device is marked');
select expect((select count(*) from jsonb_array_elements(elum_activity()) a where a ->> 'action' = 'privacy.changed') = 2, 'recent activity');
select expect(jsonb_array_length(elum_notification_settings()) >= 3, 'every notification type');
select elum_set_notification_setting('write.comment.created', true, false);
select expect((select (n ->> 'outside')::boolean from jsonb_array_elements(elum_notification_settings()) n where n ->> 'type' = 'write.comment.created') = false,
              'choices show up');
reset role;

-- ----------------------------------------------------------------- deletion
update elum.consumers set active = true where id = 'type-inbox';
set role service_role;
select elum_mark_deleted(:'cy');
select expect((select count(*) from elum_deletions_done()) = 0, 'not removed until every service cleaned up');
select elum_finish_delivery('type-inbox', (select id from elum.events where type = 'elum.account.deleted' and recipient_id = '00000000-0000-0000-0000-0000000000a3'), 'done');
select expect((select count(*) from elum_deletions_done()) = 1, 'then it can go');
reset role;
select expect((select status from profiles where id = :'cy') = 'deleted', 'the account is marked deleted');
select set_config('request.jwt.claims', json_build_object('sub', :'ada')::text, false);
set role authenticated;
select expect(jsonb_array_length(elum_people('work')) = 0, 'deleted people leave your circles');
reset role;

\echo 'Accounts checks passed.'
