-- =====================================================================
-- 002: Teacher-scoped access
--   * Teachers see and edit ONLY their own timetable slots, and the
--     attendance + grades of classes they are assigned to.
--   * Administrators (head teacher) can read and edit everything.
-- Run AFTER 001_schema.sql, in the Supabase SQL Editor.
-- =====================================================================

-- Which classes (and optionally which subject) a teacher is responsible for.
--   subject_id NULL  -> teacher handles every subject in that class
--   is_class_teacher -> may grade all subjects for the class
create table public.teacher_classes (
  id               uuid primary key default gen_random_uuid(),
  teacher_id       uuid not null references public.profiles(id) on delete cascade,
  class_id         uuid not null references public.classes(id) on delete cascade,
  subject_id       uuid references public.subjects(id) on delete cascade,
  is_class_teacher boolean not null default false,
  unique nulls not distinct (teacher_id, class_id, subject_id)
);
create index on public.teacher_classes (teacher_id);
create index on public.teacher_classes (class_id);
alter table public.teacher_classes enable row level security;

create policy "teacher_classes read own or admin" on public.teacher_classes
  for select to authenticated using (teacher_id = auth.uid() or public.is_admin());
create policy "teacher_classes admin write" on public.teacher_classes
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------------------------------------------------------------------
-- Permission helpers (security definer => no RLS recursion)
-- ---------------------------------------------------------------------
-- Is the signed-in teacher assigned to this class? (admins: always)
create or replace function public.teaches_class(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.teacher_classes tc
                 where tc.teacher_id = auth.uid() and tc.class_id = cid)
$$;

-- May the signed-in user mark attendance for this student?
create or replace function public.can_mark_attendance(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.students s
                 join public.teacher_classes tc on tc.class_id = s.class_id
                 where s.id = sid and tc.teacher_id = auth.uid())
$$;

-- May the signed-in user enter/edit this student's grade in this subject?
create or replace function public.can_grade(sid uuid, subj uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.students s
                 join public.teacher_classes tc on tc.class_id = s.class_id
                 where s.id = sid and tc.teacher_id = auth.uid()
                   and (tc.is_class_teacher or tc.subject_id is null or tc.subject_id = subj))
$$;

-- Student visibility: admins see all; teachers see only their classes' students;
-- students/parents see themselves / their children.
create or replace function public.can_see_student(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or public.can_mark_attendance(sid)
      or exists (select 1 from public.students s where s.id = sid and s.profile_id = auth.uid())
      or exists (select 1 from public.parent_students p where p.student_id = sid and p.parent_id = auth.uid())
$$;

-- ---------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------
-- Attendance: replace "any staff can write" with class-scoped writing.
drop policy if exists "attendance staff write" on public.attendance;
create policy "attendance scoped write" on public.attendance
  for all to authenticated
  using (public.can_mark_attendance(student_id))
  with check (public.can_mark_attendance(student_id));
alter table public.attendance alter column marked_by set default auth.uid();

-- Grades: subject-aware, class-scoped writing.
drop policy if exists "grades staff write" on public.grades;
create policy "grades scoped write" on public.grades
  for all to authenticated
  using (public.can_grade(student_id, subject_id))
  with check (public.can_grade(student_id, subject_id));
alter table public.grades alter column entered_by set default auth.uid();

-- Timetable: everyone signed in can read; a teacher can only change slots that
-- are theirs, and only for classes they are assigned to. Admin policy from 001 stays.
create policy "timetable teacher own write" on public.timetable_slots
  for all to authenticated
  using (teacher_id = auth.uid() and public.app_role() = 'teacher')
  with check (
    teacher_id = auth.uid() and public.app_role() = 'teacher'
    and public.teaches_class(class_id)
  );

-- Parent/child links are private to the parent and admins.
drop policy if exists "parent_students read" on public.parent_students;
create policy "parent_students read" on public.parent_students
  for select to authenticated using (parent_id = auth.uid() or public.is_admin());

-- =====================================================================
-- HOW TO ONBOARD A TEACHER
-- 1. Authentication > Users > Add user (email + password).
-- 2. Make them a teacher and assign their classes:
--
--   update public.profiles set role = 'teacher', full_name = 'Ms. Thompson'
--   where email = 'thompson@school.com';
--
--   insert into public.teacher_classes (teacher_id, class_id, subject_id, is_class_teacher)
--   select p.id, c.id, s.id, true
--   from public.profiles p, public.classes c, public.subjects s
--   where p.email = 'thompson@school.com' and c.label = '9-A' and s.name = 'Math';
--
-- 3. Give them timetable slots (or let them add their own in the app):
--
--   update public.timetable_slots set teacher_id = (select id from public.profiles where email='thompson@school.com')
--   where class_id = (select id from public.classes where label='9-A')
--     and subject_id = (select id from public.subjects where name='Math');
-- =====================================================================
