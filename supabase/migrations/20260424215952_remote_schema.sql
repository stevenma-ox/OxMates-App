drop extension if exists "pg_net";


  create table "public"."events" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "description" text,
    "date" timestamp with time zone not null,
    "location" text,
    "college" text,
    "attendees" uuid[] default '{}'::uuid[],
    "created_at" timestamp with time zone default now()
      );


alter table "public"."events" enable row level security;


  create table "public"."matches" (
    "id" uuid not null default gen_random_uuid(),
    "user1_id" uuid,
    "user2_id" uuid,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."matches" enable row level security;


  create table "public"."messages" (
    "id" uuid not null default gen_random_uuid(),
    "match_id" uuid,
    "sender_id" uuid,
    "content" text not null,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."messages" enable row level security;


  create table "public"."profiles" (
    "id" uuid not null,
    "full_name" text,
    "college" text,
    "major" text,
    "year" text,
    "bio" text,
    "interests" text[] default '{}'::text[],
    "gender" text,
    "gender_preference" text,
    "avatar_url" text,
    "profile_complete" boolean default false,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."profiles" enable row level security;


  create table "public"."swipes" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid,
    "target_id" uuid,
    "action" text,
    "created_at" timestamp with time zone default now()
      );


alter table "public"."swipes" enable row level security;

CREATE UNIQUE INDEX events_pkey ON public.events USING btree (id);

CREATE UNIQUE INDEX matches_pkey ON public.matches USING btree (id);

CREATE UNIQUE INDEX messages_pkey ON public.messages USING btree (id);

CREATE UNIQUE INDEX profiles_pkey ON public.profiles USING btree (id);

CREATE UNIQUE INDEX swipes_pkey ON public.swipes USING btree (id);

CREATE UNIQUE INDEX swipes_user_id_target_id_key ON public.swipes USING btree (user_id, target_id);

alter table "public"."events" add constraint "events_pkey" PRIMARY KEY using index "events_pkey";

alter table "public"."matches" add constraint "matches_pkey" PRIMARY KEY using index "matches_pkey";

alter table "public"."messages" add constraint "messages_pkey" PRIMARY KEY using index "messages_pkey";

alter table "public"."profiles" add constraint "profiles_pkey" PRIMARY KEY using index "profiles_pkey";

alter table "public"."swipes" add constraint "swipes_pkey" PRIMARY KEY using index "swipes_pkey";

alter table "public"."matches" add constraint "matches_user1_id_fkey" FOREIGN KEY (user1_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."matches" validate constraint "matches_user1_id_fkey";

alter table "public"."matches" add constraint "matches_user2_id_fkey" FOREIGN KEY (user2_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."matches" validate constraint "matches_user2_id_fkey";

alter table "public"."messages" add constraint "messages_match_id_fkey" FOREIGN KEY (match_id) REFERENCES public.matches(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_match_id_fkey";

alter table "public"."messages" add constraint "messages_sender_id_fkey" FOREIGN KEY (sender_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."messages" validate constraint "messages_sender_id_fkey";

alter table "public"."profiles" add constraint "profiles_id_fkey" FOREIGN KEY (id) REFERENCES auth.users(id) not valid;

alter table "public"."profiles" validate constraint "profiles_id_fkey";

alter table "public"."swipes" add constraint "swipes_action_check" CHECK ((action = ANY (ARRAY['like'::text, 'pass'::text]))) not valid;

alter table "public"."swipes" validate constraint "swipes_action_check";

alter table "public"."swipes" add constraint "swipes_target_id_fkey" FOREIGN KEY (target_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."swipes" validate constraint "swipes_target_id_fkey";

alter table "public"."swipes" add constraint "swipes_user_id_fkey" FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE not valid;

alter table "public"."swipes" validate constraint "swipes_user_id_fkey";

alter table "public"."swipes" add constraint "swipes_user_id_target_id_key" UNIQUE using index "swipes_user_id_target_id_key";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION public.check_mutual_like()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
begin
  if NEW.action = 'like' then
    if exists (select 1 from swipes
      where user_id = NEW.target_id and target_id = NEW.user_id and action = 'like') then
      insert into matches (user1_id, user2_id)
      values (NEW.user_id, NEW.target_id) on conflict do nothing;
    end if;
  end if;
  return NEW;
end;
$function$
;

grant delete on table "public"."events" to "anon";

grant insert on table "public"."events" to "anon";

grant references on table "public"."events" to "anon";

grant select on table "public"."events" to "anon";

grant trigger on table "public"."events" to "anon";

grant truncate on table "public"."events" to "anon";

grant update on table "public"."events" to "anon";

grant delete on table "public"."events" to "authenticated";

grant insert on table "public"."events" to "authenticated";

grant references on table "public"."events" to "authenticated";

grant select on table "public"."events" to "authenticated";

grant trigger on table "public"."events" to "authenticated";

grant truncate on table "public"."events" to "authenticated";

grant update on table "public"."events" to "authenticated";

grant delete on table "public"."events" to "service_role";

grant insert on table "public"."events" to "service_role";

grant references on table "public"."events" to "service_role";

grant select on table "public"."events" to "service_role";

grant trigger on table "public"."events" to "service_role";

grant truncate on table "public"."events" to "service_role";

grant update on table "public"."events" to "service_role";

grant delete on table "public"."matches" to "anon";

grant insert on table "public"."matches" to "anon";

grant references on table "public"."matches" to "anon";

grant select on table "public"."matches" to "anon";

grant trigger on table "public"."matches" to "anon";

grant truncate on table "public"."matches" to "anon";

grant update on table "public"."matches" to "anon";

grant delete on table "public"."matches" to "authenticated";

grant insert on table "public"."matches" to "authenticated";

grant references on table "public"."matches" to "authenticated";

grant select on table "public"."matches" to "authenticated";

grant trigger on table "public"."matches" to "authenticated";

grant truncate on table "public"."matches" to "authenticated";

grant update on table "public"."matches" to "authenticated";

grant delete on table "public"."matches" to "service_role";

grant insert on table "public"."matches" to "service_role";

grant references on table "public"."matches" to "service_role";

grant select on table "public"."matches" to "service_role";

grant trigger on table "public"."matches" to "service_role";

grant truncate on table "public"."matches" to "service_role";

grant update on table "public"."matches" to "service_role";

grant delete on table "public"."messages" to "anon";

grant insert on table "public"."messages" to "anon";

grant references on table "public"."messages" to "anon";

grant select on table "public"."messages" to "anon";

grant trigger on table "public"."messages" to "anon";

grant truncate on table "public"."messages" to "anon";

grant update on table "public"."messages" to "anon";

grant delete on table "public"."messages" to "authenticated";

grant insert on table "public"."messages" to "authenticated";

grant references on table "public"."messages" to "authenticated";

grant select on table "public"."messages" to "authenticated";

grant trigger on table "public"."messages" to "authenticated";

grant truncate on table "public"."messages" to "authenticated";

grant update on table "public"."messages" to "authenticated";

grant delete on table "public"."messages" to "service_role";

grant insert on table "public"."messages" to "service_role";

grant references on table "public"."messages" to "service_role";

grant select on table "public"."messages" to "service_role";

grant trigger on table "public"."messages" to "service_role";

grant truncate on table "public"."messages" to "service_role";

grant update on table "public"."messages" to "service_role";

grant delete on table "public"."profiles" to "anon";

grant insert on table "public"."profiles" to "anon";

grant references on table "public"."profiles" to "anon";

grant select on table "public"."profiles" to "anon";

grant trigger on table "public"."profiles" to "anon";

grant truncate on table "public"."profiles" to "anon";

grant update on table "public"."profiles" to "anon";

grant delete on table "public"."profiles" to "authenticated";

grant insert on table "public"."profiles" to "authenticated";

grant references on table "public"."profiles" to "authenticated";

grant select on table "public"."profiles" to "authenticated";

grant trigger on table "public"."profiles" to "authenticated";

grant truncate on table "public"."profiles" to "authenticated";

grant update on table "public"."profiles" to "authenticated";

grant delete on table "public"."profiles" to "service_role";

grant insert on table "public"."profiles" to "service_role";

grant references on table "public"."profiles" to "service_role";

grant select on table "public"."profiles" to "service_role";

grant trigger on table "public"."profiles" to "service_role";

grant truncate on table "public"."profiles" to "service_role";

grant update on table "public"."profiles" to "service_role";

grant delete on table "public"."swipes" to "anon";

grant insert on table "public"."swipes" to "anon";

grant references on table "public"."swipes" to "anon";

grant select on table "public"."swipes" to "anon";

grant trigger on table "public"."swipes" to "anon";

grant truncate on table "public"."swipes" to "anon";

grant update on table "public"."swipes" to "anon";

grant delete on table "public"."swipes" to "authenticated";

grant insert on table "public"."swipes" to "authenticated";

grant references on table "public"."swipes" to "authenticated";

grant select on table "public"."swipes" to "authenticated";

grant trigger on table "public"."swipes" to "authenticated";

grant truncate on table "public"."swipes" to "authenticated";

grant update on table "public"."swipes" to "authenticated";

grant delete on table "public"."swipes" to "service_role";

grant insert on table "public"."swipes" to "service_role";

grant references on table "public"."swipes" to "service_role";

grant select on table "public"."swipes" to "service_role";

grant trigger on table "public"."swipes" to "service_role";

grant truncate on table "public"."swipes" to "service_role";

grant update on table "public"."swipes" to "service_role";


  create policy "events_select"
  on "public"."events"
  as permissive
  for select
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "events_update"
  on "public"."events"
  as permissive
  for update
  to public
using ((auth.role() = 'authenticated'::text));



  create policy "matches: insert"
  on "public"."matches"
  as permissive
  for insert
  to public
with check ((auth.uid() = user1_id));



  create policy "matches: select own"
  on "public"."matches"
  as permissive
  for select
  to public
using (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));



  create policy "matches_insert"
  on "public"."matches"
  as permissive
  for insert
  to public
with check (true);



  create policy "matches_select"
  on "public"."matches"
  as permissive
  for select
  to public
using (((auth.uid() = user1_id) OR (auth.uid() = user2_id)));



  create policy "messages: insert in own matches"
  on "public"."messages"
  as permissive
  for insert
  to public
with check (((auth.uid() = sender_id) AND (EXISTS ( SELECT 1
   FROM public.matches
  WHERE ((matches.id = messages.match_id) AND ((matches.user1_id = auth.uid()) OR (matches.user2_id = auth.uid())))))));



  create policy "messages: select in own matches"
  on "public"."messages"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.matches
  WHERE ((matches.id = messages.match_id) AND ((matches.user1_id = auth.uid()) OR (matches.user2_id = auth.uid()))))));



  create policy "messages_insert"
  on "public"."messages"
  as permissive
  for insert
  to public
with check ((auth.uid() = sender_id));



  create policy "messages_select"
  on "public"."messages"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.matches m
  WHERE ((m.id = messages.match_id) AND ((m.user1_id = auth.uid()) OR (m.user2_id = auth.uid()))))));



  create policy "profiles_insert"
  on "public"."profiles"
  as permissive
  for insert
  to public
with check ((auth.uid() = id));



  create policy "profiles_select"
  on "public"."profiles"
  as permissive
  for select
  to public
using (true);



  create policy "profiles_update"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id));



  create policy "swipes: insert own"
  on "public"."swipes"
  as permissive
  for insert
  to public
with check ((auth.uid() = user_id));



  create policy "swipes: select own or targeted"
  on "public"."swipes"
  as permissive
  for select
  to public
using (((auth.uid() = user_id) OR (auth.uid() = target_id)));



  create policy "swipes_all"
  on "public"."swipes"
  as permissive
  for all
  to public
using ((auth.uid() = user_id));


CREATE TRIGGER on_swipe_insert AFTER INSERT ON public.swipes FOR EACH ROW EXECUTE FUNCTION public.check_mutual_like();


