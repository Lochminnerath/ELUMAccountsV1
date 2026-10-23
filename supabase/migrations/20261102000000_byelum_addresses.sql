-- Every ELUM app moves to <name>byelum.netlify.app (accountsbyelum, writebyelum, ...).
-- elum.services keeps each app's address; the apps, Store and notifications link there.
-- Safe to run more than once.
update elum.services set url = 'https://writebyelum.netlify.app' where id = 'write';
update elum.services set url = 'https://typebyelum.netlify.app' where id = 'type';
update elum.services set url = 'https://makebyelum.netlify.app' where id = 'make';
update elum.services set url = 'https://storebyelum.netlify.app' where id = 'store';
update elum.services set url = 'https://browsebyelum.netlify.app' where id = 'browse';
update elum.services set url = 'https://inquirebyelum.netlify.app' where id = 'inquire';
update elum.services set url = 'https://accountsbyelum.netlify.app' where id = 'account';
