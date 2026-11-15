-- =====================================================================
-- 006: Who may change what.
--
--   Teachers (own classes only)
--     * timetable, attendance, grades ......... already scoped in 002 (add, edit, remove)
--     * class student list ..................... NEW: the CLASS TEACHER of a class adds and
--                                                edits its students and "removes" them
--                                                (marks them withdrawn). Permanent deletion
--                                                stays with the administrator because it also
--                                                erases the child's grades and attendance.
--     * library ................................ NEW: add / edit / remove books, issue and
--                                                return or remove loans
--   Administrator (headteacher)
--     * everything in the school, including fees, plus the bell schedule (periods),
--       the activity log and enrolment snapshots which had no admin write access.
--     * Private by design and NOT opened to the admin: other people's messages and
--       notifications.
-- Run after 005.
-- =====================================================================

-- ---- 1. class teachers manage their own class list ----------------------------
create or replace function public.is_class_teacher_of(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_admin()
      or exists (select 1 from public.teacher_classes tc
                 where tc.teacher_id = auth.uid() and tc.class_id = cid and tc.is_class_teacher)
$$;
revoke execute on function public.is_class_teacher_of(uuid) from public, anon;
grant  execute on function public.is_class_teacher_of(uuid) to authenticated;

create policy "students class teacher insert" on public.students
  for insert to authenticated
  with check (public.app_role() = 'teacher' and public.is_class_teacher_of(class_id));

create policy "students class teacher update" on public.students
  for update to authenticated
  using      (public.app_role() = 'teacher' and public.is_class_teacher_of(class_id))
  with check (public.app_role() = 'teacher' and public.is_class_teacher_of(class_id));
-- (no teacher DELETE policy on purpose: use status = 'withdrawn')

-- A teacher must not link a student to a login account: that would grant that account
-- access to the student's records. Only administrators (and the database owner) may.
create or replace function public.guard_student_write()
returns trigger language plpgsql set search_path = public as $$
begin
  if auth.uid() is not null and not public.is_admin() then
    if tg_op = 'INSERT' and new.profile_id is not null then
      raise exception 'Only an administrator can link a student to an account.' using errcode = '42501';
    elsif tg_op = 'UPDATE' and new.profile_id is distinct from old.profile_id then
      raise exception 'Only an administrator can link a student to an account.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;
drop trigger if exists trg_guard_student_write on public.students;
create trigger trg_guard_student_write before insert or update on public.students
  for each row execute function public.guard_student_write();

-- ---- 2. library: staff manage the catalogue and loans ---------------------------
alter table public.books alter column id set default 'BK-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

create policy "books staff write" on public.books
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

create policy "loans staff write" on public.book_loans
  for all to authenticated
  using (public.is_staff())
  with check (public.is_staff() and exists (select 1 from public.students s where s.id = student_id));

-- Keep stock right whatever happens to a loan: issue, return, un-return, or delete it.
create or replace function public.sync_book_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.books set available_copies = available_copies - 1 where id = new.book_id;
  elsif tg_op = 'UPDATE' then
    if old.returned_on is null and new.returned_on is not null then
      update public.books set available_copies = available_copies + 1 where id = new.book_id;
    elsif old.returned_on is not null and new.returned_on is null then
      update public.books set available_copies = available_copies - 1 where id = new.book_id;
    end if;
  elsif tg_op = 'DELETE' then
    if old.returned_on is null then
      update public.books set available_copies = available_copies + 1 where id = old.book_id;
    end if;
    return old;
  end if;
  return new;
end $$;
drop trigger if exists trg_book_stock on public.book_loans;
create trigger trg_book_stock after insert or update or delete on public.book_loans
  for each row execute function public.sync_book_stock();

-- ---- 3. fees: administrator-only writing (unchanged) with generated invoice numbers ----
alter table public.fee_invoices alter column id set default 'FEE-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

-- ---- 4. administrator can manage the remaining school tables ---------------------
create policy "activity admin all" on public.activity_log
  for all to authenticated using (public.is_admin()) with check (public.is_admin());
create policy "snapshots admin all" on public.enrollment_snapshots
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---- 5. bell schedule (periods) becomes per-school so each administrator can edit theirs ----
-- Done in place (no table swap): keep a copy of the rows, add school_id, rebuild the key.
do $$
declare r record;
begin
  -- the old single-column foreign key from timetable_slots (whatever it is called)
  for r in select conname from pg_constraint
           where conrelid = 'public.timetable_slots'::regclass and confrelid = 'public.periods'::regclass loop
    execute format('alter table public.timetable_slots drop constraint %I', r.conname);
  end loop;
end $$;

create temp table _old_periods on commit drop as select id, label, start_time, end_time from public.periods;
delete from public.periods;

alter table public.periods add column if not exists school_id uuid references public.schools(id) on delete cascade;
alter table public.periods alter column school_id set default public.my_school_id();
alter table public.periods alter column school_id set not null;
alter table public.periods drop constraint if exists periods_pkey;
alter table public.periods add constraint periods_pkey primary key (school_id, id);
alter table public.periods drop constraint if exists periods_id_check;
alter table public.periods add constraint periods_id_range check (id between 1 and 20);

-- every existing school keeps the schedule it already had
insert into public.periods (school_id, id, label, start_time, end_time)
select s.id, o.id, o.label, o.start_time, o.end_time from public.schools s cross join _old_periods o;

-- a slot may only use a period of its own school; a period still in use cannot be deleted
alter table public.timetable_slots
  add constraint timetable_slots_period_fkey
  foreign key (school_id, period_id) references public.periods (school_id, id) on delete restrict;

alter table public.periods enable row level security;
drop policy if exists "periods read" on public.periods;
drop policy if exists "periods admin write" on public.periods;
drop policy if exists "tenant isolation" on public.periods;
create policy "periods read" on public.periods for select to authenticated using (true);
create policy "periods admin write" on public.periods for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "tenant isolation" on public.periods as restrictive for all to authenticated
  using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());

-- new schools start with the standard seven periods
create or replace function public.seed_school_defaults(sid uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.subjects (school_id, name)
  select sid, s from unnest(array['Math','English','Science','Physics','Chemistry','Biology',
                                  'History','Geography','Art','P.E.']) s
  on conflict do nothing;

  insert into public.periods (school_id, id, label, start_time, end_time) values
    (sid, 1, 'Period 1', '08:00', '08:50'), (sid, 2, 'Period 2', '08:55', '09:45'),
    (sid, 3, 'Period 3', '09:50', '10:40'), (sid, 4, 'Period 4', '11:00', '11:50'),
    (sid, 5, 'Period 5', '11:55', '12:45'), (sid, 6, 'Period 6', '13:30', '14:20'),
    (sid, 7, 'Period 7', '14:25', '15:15')
  on conflict do nothing;
end $$;
revoke execute on function public.seed_school_defaults(uuid) from public, anon, authenticated;
