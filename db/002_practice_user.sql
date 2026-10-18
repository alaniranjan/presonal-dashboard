-- Creates the practice user (the trigger in 001 creates its profile row).
insert into auth.users (id, raw_user_meta_data)
values ('00000000-0000-0000-0000-000000000001', '{"full_name": ""}')
on conflict (id) do nothing;
