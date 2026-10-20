-- ELUM Store and ELUM Browse are open: people can get them in Store, and signing in to either
-- records it (elum_join_service only takes services in beta or active). Each row also says where
-- its app lives.

update elum.services set status = 'beta', url = 'https://elumstore.netlify.app' where id = 'store';
update elum.services set status = 'beta', url = 'https://elumbrowse.netlify.app' where id = 'browse';
update elum.services set url = 'https://elumwrite.netlify.app' where id = 'write' and url is null;
update elum.services set url = 'https://elumtype.netlify.app' where id = 'type' and url is null;
