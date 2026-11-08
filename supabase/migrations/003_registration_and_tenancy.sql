-- =====================================================================
-- 003: Self-registration, approval workflow and multi-school isolation
--
--  * Headteacher registers -> a NEW school is created and they become its
--    administrator once their email is verified.
--  * Teacher registers -> "pending" until an administrator of that school
--    approves. Parent registers -> "pending" until verified by an administrator.
--  * Every account has a status. Only status = 'active' accounts receive any
--    permission at all (see app_role() / my_school_id()).
--  * Every data table carries school_id and a RESTRICTIVE policy, so one school
--    can never read or change another school's rows.
--
-- Run AFTER 001_schema.sql and 002_teacher_scoped_access.sql.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. SCHOOLS
-- ---------------------------------------------------------------------
create table public.schools (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  email      text,
  phone      text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.schools enable row level security;

-- ---------------------------------------------------------------------
-- 2. PROFILES: status, school, phone, parent role
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('administrator','teacher','student','parent'));

alter table public.profiles add column school_id uuid references public.schools(id) on delete cascade;
alter table public.profiles add column phone text;
-- Existing accounts stay usable ('active'); new sign-ups start 'unverified'.
alter table public.profiles add column status text not null default 'active'
  check (status in ('unverified','pending','active','rejected'));
alter table public.profiles alter column status set default 'unverified';
create index on public.profiles (school_id, role, status);

-- Only an ACTIVE account has a role / school as far as permissions are concerned.
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid() and status = 'active'
$$;

create or replace function public.my_school_id()
returns uuid language sql stable security definer set search_path = public as $$
  select school_id from public.profiles where id = auth.uid() and status = 'active'
$$;

-- ---------------------------------------------------------------------
-- 3. BACKFILL: existing data belongs to one default school
-- ---------------------------------------------------------------------
do $$
declare
  sid uuid;
  t text;
  tenant_tables text[] := array[
    'classes','subjects','students','parent_students','timetable_slots','teacher_classes',
    'applicants','applicant_documents','attendance','grades','exams','marking_tasks',
    'fee_invoices','fee_payments','books','book_loans','notices','messages',
    'notifications','activity_log','enrollment_snapshots'];
begin
  if exists (select 1 from public.profiles) or exists (select 1 from public.classes)
     or exists (select 1 from public.books) then
    insert into public.schools (name) values ('My School') returning id into sid;  -- rename it later
    update public.profiles set school_id = sid where school_id is null;
  end if;

  foreach t in array tenant_tables loop
    execute format('alter table public.%I add column school_id uuid references public.schools(id) on delete cascade', t);
    if sid is not null then
      execute format('update public.%I set school_id = $1 where school_id is null', t) using sid;
    end if;
    execute format('alter table public.%I alter column school_id set default public.my_school_id()', t);
    execute format('alter table public.%I alter column school_id set not null', t);
    execute format('create index on public.%I (school_id)', t);
    -- RESTRICTIVE = ANDed with every other policy: the hard wall between schools.
    execute format($f$create policy "tenant isolation" on public.%I as restrictive for all to authenticated
                      using (school_id = public.my_school_id()) with check (school_id = public.my_school_id())$f$, t);
  end loop;
end $$;

-- Uniqueness must now be per school, not global.
alter table public.classes  drop constraint if exists classes_label_key;
alter table public.classes  add constraint classes_school_label_key unique (school_id, label);
alter table public.subjects drop constraint if exists subjects_name_key;
alter table public.subjects add constraint subjects_school_name_key unique (school_id, name);
alter table public.students drop constraint if exists students_admission_no_key;
alter table public.students add constraint students_school_admission_key unique (school_id, admission_no);
alter table public.enrollment_snapshots drop constraint if exists enrollment_snapshots_pkey;
alter table public.enrollment_snapshots add primary key (school_id, month_start);

-- Bell schedule (periods) is shared and read-only; nobody may rewrite it per school.
drop policy if exists "periods admin write" on public.periods;

-- Schools: members read their own school; administrators may edit it.
create policy "schools read own" on public.schools for select to authenticated
  using (id = public.my_school_id());
create policy "schools admin update" on public.schools for update to authenticated
  using (id = public.my_school_id() and public.is_admin())
  with check (id = public.my_school_id() and public.is_admin());

-- ---------------------------------------------------------------------
-- 4. NEW TABLES: teachers, parents, parent_children, curriculum_resources
-- ---------------------------------------------------------------------
create table public.teachers (
  profile_id           uuid primary key references public.profiles(id) on delete cascade,
  school_id            uuid not null references public.schools(id) on delete cascade,
  subjects_taught      text[] not null default '{}',
  is_class_teacher     boolean not null default false,
  requested_class_label text,                  -- class the teacher asked to be class teacher of
  approved_by          uuid references public.profiles(id) on delete set null,
  approved_at          timestamptz,
  rejection_reason     text,
  created_at           timestamptz not null default now()
);

create table public.parents (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  school_id  uuid not null references public.schools(id) on delete cascade,
  created_at timestamptz not null default now()
);

-- Children a parent declared at registration. student_id is filled in when an
-- administrator verifies and links the request to a real student record.
create table public.parent_children (
  id          uuid primary key default gen_random_uuid(),
  school_id   uuid not null references public.schools(id) on delete cascade,
  parent_id   uuid not null references public.parents(profile_id) on delete cascade,
  child_name  text not null check (length(trim(child_name)) > 0),
  class_label text not null check (length(trim(class_label)) > 0),
  student_id  uuid references public.students(id) on delete set null,
  created_at  timestamptz not null default now()
);
create index on public.parent_children (parent_id);
create index on public.parent_children (school_id);

create table public.curriculum_resources (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null default public.my_school_id() references public.schools(id) on delete cascade,
  subject_id uuid not null references public.subjects(id) on delete cascade,
  class_id   uuid references public.classes(id) on delete cascade,
  title      text not null check (length(trim(title)) > 0),
  url        text not null check (url ~* '^https?://'),
  created_by uuid not null default auth.uid() references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);
create index on public.curriculum_resources (school_id, subject_id);

do $$
declare t text;
begin
  foreach t in array array['teachers','parents','parent_children','curriculum_resources'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format($f$create policy "tenant isolation" on public.%I as restrictive for all to authenticated
                      using (school_id = public.my_school_id()) with check (school_id = public.my_school_id())$f$, t);
  end loop;
end $$;

create policy "teachers read own or admin" on public.teachers for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "teachers admin write" on public.teachers for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "parents read own or admin" on public.parents for select to authenticated
  using (profile_id = auth.uid() or public.is_admin());
create policy "parents admin write" on public.parents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "parent_children read own or admin" on public.parent_children for select to authenticated
  using (parent_id = auth.uid() or public.is_admin());
create policy "parent_children admin write" on public.parent_children for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

create policy "resources staff read" on public.curriculum_resources for select to authenticated
  using (public.is_staff());
-- May the signed-in user attach a resource to this subject (and optionally class)?
create or replace function public.can_post_resource(p_subject uuid, p_class uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.teacher_classes tc
                 where tc.teacher_id = auth.uid()
                   and (
                     -- for one class: you teach that class (and that subject, unless class teacher)
                     (p_class is not null and tc.class_id = p_class
                      and (tc.is_class_teacher or tc.subject_id is null or tc.subject_id = p_subject))
                     -- school-wide: only for a subject you are assigned to teach
                     or (p_class is null and tc.subject_id = p_subject)
                   ))
$$;

-- Separate policies per command: a broad FOR ALL "own rows" policy would also
-- match INSERT and bypass the subject check.
create policy "resources add" on public.curriculum_resources for insert to authenticated
  with check (created_by = auth.uid() and public.can_post_resource(subject_id, class_id));
create policy "resources edit own or admin" on public.curriculum_resources for update to authenticated
  using (created_by = auth.uid() or public.is_admin())
  with check ((created_by = auth.uid() and public.can_post_resource(subject_id, class_id)) or public.is_admin());
create policy "resources delete own or admin" on public.curriculum_resources for delete to authenticated
  using (created_by = auth.uid() or public.is_admin());

-- ---------------------------------------------------------------------
-- 5. PROFILE POLICIES (replace the broad "staff can read everyone")
-- ---------------------------------------------------------------------
drop policy if exists "profiles read own or staff" on public.profiles;
create policy "profiles read" on public.profiles for select to authenticated
  using (
    id = auth.uid()
    or public.is_admin()
    -- teachers may see colleagues (names on timetables) but never parents' details
    or (public.app_role() = 'teacher' and role in ('teacher','administrator') and status = 'active')
  );

-- School wall for profiles: your own row, or rows in your (active) school.
create policy "tenant isolation" on public.profiles as restrictive for all to authenticated
  using (id = auth.uid() or school_id = public.my_school_id())
  with check (id = auth.uid() or school_id = public.my_school_id());

-- Nobody can promote themselves or move between schools through a plain UPDATE.
create or replace function public.guard_profile_update()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  -- skip for the service role and for the sign-up trigger path (complete_registration)
  if auth.uid() is not null and coalesce(current_setting('app.registration', true), '') <> 'on' then
    if new.school_id is distinct from old.school_id then
      raise exception 'school_id cannot be changed' using errcode = '42501';
    end if;
    if not public.is_admin() then
      new.role := old.role; new.status := old.status; new.email := old.email;
    end if;
  end if;
  return new;
end $$;
create trigger trg_guard_profile_update before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- 6. REGISTRATION (runs when the email is verified)
-- ---------------------------------------------------------------------
create or replace function public.seed_school_defaults(sid uuid)
returns void language sql security definer set search_path = public as $$
  insert into public.subjects (school_id, name)
  select sid, s from unnest(array['Math','English','Science','Physics','Chemistry','Biology',
                                  'History','Geography','Art','P.E.']) s
  on conflict do nothing
$$;

-- Find or create a class by its label (e.g. '9-A', 'Grade 4'); admin-approved flows only.
create or replace function public.ensure_class(sid uuid, p_label text)
returns uuid language plpgsql security definer set search_path = public as $$
declare lbl text := left(trim(p_label), 40); cid uuid; lvl int;
begin
  select id into cid from public.classes where school_id = sid and lower(label) = lower(lbl);
  if cid is not null then return cid; end if;
  lvl := coalesce(nullif(substring(lbl from '\d+'), '')::int, 1);
  insert into public.classes (school_id, label, grade_level, section)
  values (sid, lbl, least(greatest(lvl, 1), 13), coalesce(nullif(substring(lbl from '([A-Za-z])\s*$'), ''), 'A'))
  returning id into cid;
  return cid;
end $$;

create or replace function public.ensure_subject(sid uuid, p_name text)
returns uuid language plpgsql security definer set search_path = public as $$
declare nm text := left(trim(p_name), 60); subj uuid;
begin
  select id into subj from public.subjects where school_id = sid and lower(name) = lower(nm);
  if subj is null then
    insert into public.subjects (school_id, name) values (sid, nm) returning id into subj;
  end if;
  return subj;
end $$;

create or replace function public.complete_registration(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  u auth.users%rowtype;
  meta jsonb;
  kind text;
  sid uuid;
  child jsonb;
begin
  -- Idempotent: only a still-unverified profile is processed.
  perform set_config('app.registration', 'on', true);   -- lets this function set role/status/school
  if not exists (select 1 from public.profiles where id = p_uid and status = 'unverified') then
    perform set_config('app.registration', '', true);
    return;
  end if;
  select * into u from auth.users where id = p_uid;
  meta := coalesce(u.raw_user_meta_data, '{}'::jsonb);
  kind := meta->>'signup_role';

  if kind = 'administrator' then
    insert into public.schools (name, email, phone, created_by)
    values (coalesce(nullif(left(trim(meta->>'school_name'), 120), ''), 'My School'),
            left(meta->>'school_email', 160), left(meta->>'phone', 40), p_uid)
    returning id into sid;
    update public.profiles set role = 'administrator', status = 'active', school_id = sid where id = p_uid;
    perform public.seed_school_defaults(sid);

  elsif kind in ('teacher','parent') then
    begin sid := (meta->>'school_id')::uuid; exception when others then sid := null; end;
    if sid is null or not exists (select 1 from public.schools where id = sid) then
      update public.profiles set status = 'rejected', role = kind where id = p_uid;
      perform set_config('app.registration', '', true);
      return;
    end if;
    update public.profiles set role = kind, status = 'pending', school_id = sid where id = p_uid;

    if kind = 'teacher' then
      insert into public.teachers (profile_id, school_id, subjects_taught, is_class_teacher, requested_class_label)
      values (p_uid, sid,
              coalesce((select array_agg(left(trim(x), 60)) from (select jsonb_array_elements_text(meta->'subjects') x limit 20) q
                        where length(trim(x)) > 0), '{}'),
              coalesce((meta->>'is_class_teacher')::boolean, false),
              nullif(left(trim(meta->>'class_label'), 40), ''));
    else
      insert into public.parents (profile_id, school_id) values (p_uid, sid);
      for child in select * from jsonb_array_elements(coalesce(meta->'children', '[]'::jsonb)) limit 10 loop
        if length(trim(coalesce(child->>'name',''))) > 0 and length(trim(coalesce(child->>'class',''))) > 0 then
          insert into public.parent_children (school_id, parent_id, child_name, class_label)
          values (sid, p_uid, left(trim(child->>'name'), 120), left(trim(child->>'class'), 40));
        end if;
      end loop;
    end if;

  else
    -- Added by hand in the Supabase dashboard with no registration data:
    -- stays without permissions until an administrator provisions it (see bottom of file).
    update public.profiles set status = 'pending' where id = p_uid;
  end if;
  perform set_config('app.registration', '', true);
end $$;

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare kind text := new.raw_user_meta_data->>'signup_role';
begin
  insert into public.profiles (id, email, full_name, phone, role, status)
  values (new.id, coalesce(new.email, ''),
          left(coalesce(new.raw_user_meta_data->>'full_name', ''), 120),
          left(new.raw_user_meta_data->>'phone', 40),
          case when kind in ('administrator','teacher','parent') then kind else 'parent' end,
          'unverified');
  if new.email_confirmed_at is not null then          -- project has "Confirm email" switched off
    perform public.complete_registration(new.id);
  end if;
  return new;
end $$;

create or replace function public.handle_user_confirmed()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform public.complete_registration(new.id);
  return new;
end $$;

create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row when (old.email_confirmed_at is null and new.email_confirmed_at is not null)
  execute function public.handle_user_confirmed();

-- These must never be callable from the browser (it would let someone skip email
-- verification): only the triggers above may run them.
revoke execute on function public.complete_registration(uuid)   from public, anon, authenticated;
revoke execute on function public.handle_new_user()             from public, anon, authenticated;
revoke execute on function public.handle_user_confirmed()       from public, anon, authenticated;
revoke execute on function public.seed_school_defaults(uuid)    from public, anon, authenticated;
revoke execute on function public.ensure_class(uuid, text)      from public, anon, authenticated;
revoke execute on function public.ensure_subject(uuid, text)    from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 7. PUBLIC SCHOOL PICKER (for the teacher / parent sign-up forms)
-- ---------------------------------------------------------------------
create or replace function public.list_schools()
returns table (id uuid, name text) language sql stable security definer set search_path = public as $$
  select s.id, s.name from public.schools s order by s.name
$$;
grant execute on function public.list_schools() to anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. ADMIN APPROVAL ACTIONS (security definer + explicit admin/school checks)
-- ---------------------------------------------------------------------
create or replace function public.approve_teacher(p_teacher uuid, p_class_ids uuid[] default '{}')
returns void language plpgsql security definer set search_path = public as $$
declare sid uuid := public.my_school_id(); t public.teachers%rowtype; cid uuid; subj text;
begin
  if not public.is_admin() then raise exception 'Only administrators can approve teachers' using errcode = '42501'; end if;
  select * into t from public.teachers where profile_id = p_teacher and school_id = sid;
  if not found then raise exception 'Teacher registration not found' using errcode = 'P0002'; end if;

  update public.profiles set status = 'active' where id = p_teacher and school_id = sid;
  update public.teachers set approved_by = auth.uid(), approved_at = now(), rejection_reason = null where profile_id = p_teacher;

  -- The class they asked to teach as class teacher.
  if t.is_class_teacher and coalesce(trim(t.requested_class_label), '') <> '' then
    insert into public.teacher_classes (school_id, teacher_id, class_id, subject_id, is_class_teacher)
    values (sid, p_teacher, public.ensure_class(sid, t.requested_class_label), null, true)
    on conflict do nothing;
  end if;

  -- Optional extra classes chosen by the administrator, one row per subject taught.
  foreach cid in array coalesce(p_class_ids, '{}') loop
    continue when not exists (select 1 from public.classes where id = cid and school_id = sid);
    foreach subj in array t.subjects_taught loop
      insert into public.teacher_classes (school_id, teacher_id, class_id, subject_id, is_class_teacher)
      values (sid, p_teacher, cid, public.ensure_subject(sid, subj), false)
      on conflict do nothing;
    end loop;
  end loop;
end $$;

create or replace function public.reject_teacher(p_teacher uuid, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare sid uuid := public.my_school_id();
begin
  if not public.is_admin() then raise exception 'Only administrators can reject teachers' using errcode = '42501'; end if;
  update public.profiles set status = 'rejected' where id = p_teacher and school_id = sid and role = 'teacher';
  if not found then raise exception 'Teacher registration not found' using errcode = 'P0002'; end if;
  update public.teachers set rejection_reason = left(p_reason, 300) where profile_id = p_teacher;
end $$;

-- Verifying a parent links each declared child to a student record in the declared
-- class (matching by name, or creating the record) and grants access to that child only.
create or replace function public.approve_parent(p_parent uuid)
returns void language plpgsql security definer set search_path = public as $$
declare sid uuid := public.my_school_id(); r record; cid uuid; stu uuid;
begin
  if not public.is_admin() then raise exception 'Only administrators can approve parents' using errcode = '42501'; end if;
  if not exists (select 1 from public.parents where profile_id = p_parent and school_id = sid) then
    raise exception 'Parent registration not found' using errcode = 'P0002';
  end if;
  update public.profiles set status = 'active' where id = p_parent and school_id = sid;

  for r in select * from public.parent_children where parent_id = p_parent and school_id = sid and student_id is null loop
    cid := public.ensure_class(sid, r.class_label);
    select id into stu from public.students
      where school_id = sid and class_id = cid and lower(full_name) = lower(trim(r.child_name)) and status = 'active'
      limit 1;
    if stu is null then
      insert into public.students (school_id, full_name, class_id) values (sid, trim(r.child_name), cid) returning id into stu;
    end if;
    update public.parent_children set student_id = stu where id = r.id;
    insert into public.parent_students (school_id, parent_id, student_id, relation) values (sid, p_parent, stu, 'Parent')
    on conflict do nothing;
  end loop;
end $$;

create or replace function public.reject_parent(p_parent uuid)
returns void language plpgsql security definer set search_path = public as $$
declare sid uuid := public.my_school_id();
begin
  if not public.is_admin() then raise exception 'Only administrators can reject parents' using errcode = '42501'; end if;
  update public.profiles set status = 'rejected' where id = p_parent and school_id = sid and role = 'parent';
  if not found then raise exception 'Parent registration not found' using errcode = 'P0002'; end if;
end $$;

revoke execute on function public.approve_teacher(uuid, uuid[]) from public, anon;
revoke execute on function public.reject_teacher(uuid, text)    from public, anon;
revoke execute on function public.approve_parent(uuid)          from public, anon;
revoke execute on function public.reject_parent(uuid)           from public, anon;

-- ---------------------------------------------------------------------
-- 9. TEACHER CLASS ROSTER (parent contacts only for the class teacher)
-- ---------------------------------------------------------------------
create or replace function public.my_class_roster(p_class uuid)
returns table (student_id uuid, full_name text, admission_no text, gender text,
               parent_name text, parent_email text, parent_phone text, relation text)
language plpgsql stable security definer set search_path = public as $$
declare sid uuid := public.my_school_id(); admin boolean := public.is_admin(); assigned boolean; contact boolean;
begin
  if sid is null then return; end if;
  assigned := admin or exists (select 1 from public.teacher_classes tc
                               where tc.teacher_id = auth.uid() and tc.class_id = p_class and tc.school_id = sid);
  contact  := admin or exists (select 1 from public.teacher_classes tc
                               where tc.teacher_id = auth.uid() and tc.class_id = p_class and tc.school_id = sid and tc.is_class_teacher);
  if not assigned then return; end if;
  return query
    select s.id, s.full_name, s.admission_no, s.gender,
           case when contact then p.full_name end, case when contact then p.email end,
           case when contact then p.phone end,     case when contact then ps.relation end
    from public.students s
    left join public.parent_students ps on ps.student_id = s.id
    left join public.profiles p on p.id = ps.parent_id and p.status = 'active'
    where s.class_id = p_class and s.school_id = sid and s.status = 'active'
    order by s.full_name, p.full_name;
end $$;
grant execute on function public.my_class_roster(uuid) to authenticated;
revoke execute on function public.my_class_roster(uuid) from public, anon;

-- ---------------------------------------------------------------------
-- 10. ADMIN READ MODELS
-- ---------------------------------------------------------------------
-- One row per child (or one row for a parent with no children yet).
create view public.parent_directory with (security_invoker = true) as
select pa.profile_id as parent_id,
       p.full_name   as parent_name,
       p.email       as parent_email,
       p.phone       as parent_phone,
       p.status      as parent_status,
       pc.id         as child_row_id,
       coalesce(st.full_name, pc.child_name) as child_name,
       coalesce(c.label, pc.class_label)     as class_label,
       pc.student_id,
       p.created_at  as registered_at
from public.parents pa
join public.profiles p on p.id = pa.profile_id
left join public.parent_children pc on pc.parent_id = pa.profile_id
left join public.students st on st.id = pc.student_id
left join public.classes c on c.id = st.class_id;

create or replace function public.get_school_overview()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'activeTeachers',   (select count(*) from public.profiles where role = 'teacher' and status = 'active'),
    'registeredParents',(select count(*) from public.profiles where role = 'parent' and status = 'active'),
    'totalStudents',    (select count(*) from public.students where status = 'active'),
    'pendingTeachers',  (select count(*) from public.profiles where role = 'teacher' and status = 'pending'),
    'pendingParents',   (select count(*) from public.profiles where role = 'parent'  and status = 'pending')
  )
$$;

-- =====================================================================
-- RENAME THE DEFAULT SCHOOL (existing data was placed in it):
--   update public.schools set name = 'Your School Name', email = 'info@yourschool.com';
--
-- PROVISION A USER BY HAND (instead of the registration form):
--   update public.profiles
--      set role = 'teacher', status = 'active', full_name = 'Ms. Thompson',
--          school_id = (select id from public.schools order by created_at limit 1)
--    where email = 'thompson@school.com';
--
-- Inserts made from the SQL editor / service role have no signed-in user, so give
-- school_id explicitly:  insert into public.classes (school_id, label, ...) values (...)
--
-- Known limit: books.id, fee_invoices.id and applicants.id are human-readable text
-- keys that are still unique across ALL schools; switch them to uuids (or prefix them
-- with the school) before onboarding many schools.
-- =====================================================================
