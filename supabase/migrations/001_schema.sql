-- =====================================================================
-- School Management System: Supabase (PostgreSQL) schema
-- Matches the React frontend's mock data (src/data/mockData.ts).
-- Run in the Supabase SQL Editor on a fresh project.
-- Sections: 1 Profiles & auth | 2 Academic structure | 3 Admissions
--           4 Attendance | 5 Grades & exams | 6 Fees | 7 Library
--           8 Messaging | 9 Views & functions | 10 RLS | 11 Seed data
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------
-- 1. PROFILES & AUTH
-- ---------------------------------------------------------------------
-- One row per Supabase auth user. Roles match the frontend:
-- administrator | teacher | student (student covers student/parent accounts).
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  full_name  text not null default '',
  email      text not null default '',
  role       text not null default 'student'
             check (role in ('administrator','teacher','student')),
  avatar     text,
  created_at timestamptz not null default now()
);

-- Every new sign-up becomes a 'student' account. The role is NEVER read from
-- client-supplied metadata (that would let anyone sign up as administrator).
-- Promote users yourself:  update profiles set role='administrator' where email='you@school.com';
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, coalesce(new.email,''), coalesce(new.raw_user_meta_data->>'full_name',''));
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Helper functions used by RLS (security definer => no policy recursion).
create or replace function public.app_role()
returns text language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.is_staff()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() in ('administrator','teacher'), false)
$$;

create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.app_role() = 'administrator', false)
$$;

-- ---------------------------------------------------------------------
-- 2. ACADEMIC STRUCTURE
-- ---------------------------------------------------------------------
create table public.classes (
  id          uuid primary key default gen_random_uuid(),
  label       text not null unique,          -- '9-A'
  grade_level int  not null check (grade_level between 1 and 13),
  section     text not null
);

create table public.subjects (
  id   uuid primary key default gen_random_uuid(),
  name text not null unique
);

create table public.students (
  id           uuid primary key default gen_random_uuid(),
  admission_no text unique,                  -- 'ADM-2401'
  profile_id   uuid unique references public.profiles(id) on delete set null,
  full_name    text not null,
  class_id     uuid references public.classes(id) on delete set null,
  dob          date,
  gender       text check (gender in ('Female','Male','Other')),
  address      text,
  status       text not null default 'active' check (status in ('active','graduated','withdrawn')),
  created_at   timestamptz not null default now()
);
create index on public.students (class_id);

-- Parent/guardian accounts -> children (powers the child switcher).
create table public.parent_students (
  parent_id  uuid not null references public.profiles(id) on delete cascade,
  student_id uuid not null references public.students(id) on delete cascade,
  relation   text,
  primary key (parent_id, student_id)
);

-- Can the signed-in user see this student's private data?
create or replace function public.can_see_student(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_staff()
      or exists (select 1 from public.students s where s.id = sid and s.profile_id = auth.uid())
      or exists (select 1 from public.parent_students p where p.student_id = sid and p.parent_id = auth.uid())
$$;

create table public.periods (
  id         smallint primary key,           -- 1..7
  label      text not null,                  -- 'Period 1'
  start_time time not null,
  end_time   time not null
);

create table public.timetable_slots (
  id         uuid primary key default gen_random_uuid(),
  class_id   uuid not null references public.classes(id) on delete cascade,
  weekday    smallint not null check (weekday between 1 and 5),  -- 1 = Monday
  period_id  smallint not null references public.periods(id),
  subject_id uuid not null references public.subjects(id),
  teacher_id uuid references public.profiles(id) on delete set null,
  room       text,
  unique (class_id, weekday, period_id)
);
create index on public.timetable_slots (teacher_id);

create table public.enrollment_snapshots (   -- feeds the admin enrolment trend chart
  month_start date primary key,
  students    int not null
);

-- ---------------------------------------------------------------------
-- 3. ADMISSIONS
-- ---------------------------------------------------------------------
create table public.applicants (
  id                  text primary key,        -- 'ADM-2401'
  name                text not null,
  email               text,
  phone               text,
  grade               text not null,           -- 'Grade 9'
  applied_on          date not null default current_date,
  status              text not null default 'Pending'
                      check (status in ('Pending','Accepted','Rejected')),
  dob                 date,
  gender              text,
  address             text,
  guardian_name       text,
  guardian_relation   text,
  guardian_phone      text,
  guardian_email      text,
  guardian_occupation text,
  previous_school     text,
  created_at          timestamptz not null default now()
);

create table public.applicant_documents (
  id           uuid primary key default gen_random_uuid(),
  applicant_id text not null references public.applicants(id) on delete cascade,
  name         text not null,                  -- 'Birth Certificate'
  file_type    text,                           -- 'PDF'
  status       text not null default 'Missing' check (status in ('Submitted','Missing','Verified')),
  storage_path text                            -- optional Supabase Storage path
);
create index on public.applicant_documents (applicant_id);

-- ---------------------------------------------------------------------
-- 4. ATTENDANCE
-- ---------------------------------------------------------------------
create table public.attendance (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  class_id   uuid references public.classes(id) on delete set null,
  date       date not null,
  status     text not null check (status in ('Present','Absent','Late')),
  marked_by  uuid references public.profiles(id) on delete set null,
  unique (student_id, date)
);
create index on public.attendance (date);

-- ---------------------------------------------------------------------
-- 5. GRADES & EXAMS
-- ---------------------------------------------------------------------
create table public.grades (
  id         uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  subject_id uuid not null references public.subjects(id),
  term       text not null default '2026-T3',
  score      numeric(5,2) not null check (score between 0 and 100),
  entered_by uuid references public.profiles(id) on delete set null,
  unique (student_id, subject_id, term)
);

create table public.exams (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                   -- 'Midterm — Mathematics'
  grade_label text not null,                   -- 'Grade 10'
  exam_date   date not null,
  room        text,
  subject_id  uuid references public.subjects(id)
);

-- Papers a teacher still has to mark (teacher dashboard).
create table public.marking_tasks (
  id           uuid primary key default gen_random_uuid(),
  teacher_id   uuid references public.profiles(id) on delete cascade,
  assessment   text not null,
  class_id     uuid references public.classes(id) on delete set null,
  submitted_on date not null,
  ungraded     int not null check (ungraded >= 0)
);

-- ---------------------------------------------------------------------
-- 6. FEES
-- ---------------------------------------------------------------------
create table public.fee_invoices (
  id         text primary key,                 -- 'FEE-1024'
  student_id uuid not null references public.students(id) on delete cascade,
  amount     numeric(12,2) not null check (amount > 0),
  due_date   date not null,
  created_at timestamptz not null default now()
);
create index on public.fee_invoices (student_id);

create table public.fee_payments (
  id          uuid primary key default gen_random_uuid(),
  invoice_id  text not null references public.fee_invoices(id) on delete cascade,
  amount      numeric(12,2) not null check (amount > 0),
  method      text default 'Cash',
  paid_on     date not null default current_date,
  recorded_by uuid references public.profiles(id) on delete set null
);
create index on public.fee_payments (invoice_id);

-- ---------------------------------------------------------------------
-- 7. LIBRARY
-- ---------------------------------------------------------------------
create table public.books (
  id               text primary key,           -- 'BK-001'
  title            text not null,
  author           text not null,
  category         text not null,
  total_copies     int not null check (total_copies >= 0),
  available_copies int not null check (available_copies >= 0),
  check (available_copies <= total_copies)
);

create table public.book_loans (
  id          uuid primary key default gen_random_uuid(),
  book_id     text not null references public.books(id) on delete cascade,
  student_id  uuid not null references public.students(id) on delete cascade,
  borrowed_on date not null default current_date,
  due_on      date not null default current_date + 14,
  returned_on date
);
create index on public.book_loans (student_id);

-- ---------------------------------------------------------------------
-- 8. MESSAGING, NOTICES & ACTIVITY
-- ---------------------------------------------------------------------
create table public.notices (                  -- notice board / announcements
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  detail      text not null,
  audience    text not null default 'all' check (audience in ('all','teachers','students','parents')),
  author_name text,
  created_by  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create table public.messages (                 -- inbox / compose / SMS
  id           uuid primary key default gen_random_uuid(),
  sender_id    uuid not null references public.profiles(id) on delete cascade,
  recipient_id uuid references public.profiles(id) on delete cascade,  -- null = broadcast to `audience`
  audience     text,                           -- e.g. 'Grade 9-A parents'
  channel      text not null default 'message' check (channel in ('message','sms')),
  subject      text not null,
  body         text not null,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index on public.messages (recipient_id, created_at desc);

create table public.notifications (            -- top-bar bell
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  title      text not null,
  detail     text,
  type       text,                             -- admission | fee | attendance | exam
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index on public.notifications (user_id, created_at desc);

create table public.activity_log (             -- admin dashboard feed
  id         uuid primary key default gen_random_uuid(),
  actor      text not null,
  action     text not null,
  type       text,                             -- grade | fee | attendance | exam | admission | library
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------
-- 9. VIEWS & FUNCTIONS (read models the dashboards use)
-- ---------------------------------------------------------------------
-- security_invoker => views obey the caller's RLS policies.

create view public.attendance_summary with (security_invoker = true) as
select s.id as student_id, s.full_name as student, c.label as grade,
       count(*) filter (where a.status = 'Present') as present,
       count(*) filter (where a.status = 'Absent')  as absent,
       count(*) filter (where a.status = 'Late')    as late,
       round(100.0 * count(*) filter (where a.status = 'Present') / nullif(count(a.id),0), 1) as rate
from public.students s
left join public.classes c on c.id = s.class_id
left join public.attendance a on a.student_id = s.id
group by s.id, s.full_name, c.label;

create view public.gradebook_view with (security_invoker = true) as
select s.id as student_id, s.full_name as student, g.term,
       max(g.score) filter (where sub.name = 'Math')    as math,
       max(g.score) filter (where sub.name = 'English') as english,
       max(g.score) filter (where sub.name = 'Science') as science,
       max(g.score) filter (where sub.name = 'History') as history,
       round(avg(g.score), 2) as average
from public.grades g
join public.students s   on s.id = g.student_id
join public.subjects sub on sub.id = g.subject_id
group by s.id, s.full_name, g.term;

-- Invoice list with computed Paid / Pending / Overdue status.
create view public.fee_invoices_view with (security_invoker = true) as
select i.id, i.student_id, s.full_name as student, c.label as grade,
       i.amount, coalesce(p.paid,0) as paid, i.amount - coalesce(p.paid,0) as balance,
       i.due_date as due,
       case when coalesce(p.paid,0) >= i.amount then 'Paid'
            when i.due_date < current_date       then 'Overdue'
            else 'Pending' end as status
from public.fee_invoices i
join public.students s on s.id = i.student_id
left join public.classes c on c.id = s.class_id
left join (select invoice_id, sum(amount) as paid from public.fee_payments group by invoice_id) p
       on p.invoice_id = i.id;

create view public.exams_view with (security_invoker = true) as
select e.*, case when e.exam_date < current_date then 'Completed' else 'Upcoming' end as status
from public.exams e;

create view public.feed_collected_by_month with (security_invoker = true) as
select to_char(date_trunc('month', paid_on), 'Mon') as month,
       date_trunc('month', paid_on) as month_start, sum(amount) as amount
from public.fee_payments
group by 1, 2 order by 2;

-- Weekly attendance for the admin chart (present/absent counts per weekday).
create view public.attendance_trend with (security_invoker = true) as
select date, to_char(date, 'Dy') as day,
       count(*) filter (where status in ('Present','Late')) as present,
       count(*) filter (where status = 'Absent') as absent
from public.attendance
where date >= current_date - 7
group by date order by date;

-- Admin dashboard stat cards in one call: supabase.rpc('get_admin_stats')
create or replace function public.get_admin_stats()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'totalStudents',     (select count(*) from students where status = 'active'),
    'totalStaff',        (select count(*) from profiles where role in ('teacher','administrator')),
    'activeClasses',     (select count(*) from classes),
    'pendingAdmissions', (select count(*) from applicants where status = 'Pending'),
    'attendanceToday',   (select coalesce(round(100.0 * count(*) filter (where status in ('Present','Late'))
                                   / nullif(count(*),0), 1), 0) from attendance where date = current_date),
    'feeCollection',     (select coalesce(round(100.0 * sum(paid) / nullif(sum(amount),0), 1), 0)
                          from fee_invoices_view)
  )
$$;

-- Decrement/increment stock when a book is borrowed or returned.
create or replace function public.sync_book_stock()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update books set available_copies = available_copies - 1 where id = new.book_id;
  elsif tg_op = 'UPDATE' and old.returned_on is null and new.returned_on is not null then
    update books set available_copies = available_copies + 1 where id = new.book_id;
  end if;
  return new;
end $$;

create trigger trg_book_stock
  after insert or update on public.book_loans
  for each row execute function public.sync_book_stock();

-- ---------------------------------------------------------------------
-- 10. ROW LEVEL SECURITY
-- ---------------------------------------------------------------------
do $$
declare t text;
begin
  foreach t in array array[
    'profiles','classes','subjects','students','parent_students','periods','timetable_slots',
    'enrollment_snapshots','applicants','applicant_documents','attendance','grades','exams',
    'marking_tasks','fee_invoices','fee_payments','books','book_loans','notices','messages',
    'notifications','activity_log']
  loop execute format('alter table public.%I enable row level security', t); end loop;
end $$;

-- Reference data: everyone signed in can read; only admins change it.
do $$
declare t text;
begin
  foreach t in array array['classes','subjects','periods','timetable_slots','exams','books','notices']
  loop
    execute format('create policy "%1$s read" on public.%1$I for select to authenticated using (true)', t);
    execute format('create policy "%1$s admin write" on public.%1$I for all to authenticated
                    using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

-- Teachers may also post notices and schedule exams.
create policy "notices staff insert" on public.notices for insert to authenticated
  with check (public.is_staff());
create policy "exams staff write" on public.exams for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

-- profiles
create policy "profiles read own or staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff());
create policy "profiles update own name" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid() and role = public.app_role());  -- cannot change own role
create policy "profiles admin all" on public.profiles for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- students & family links
create policy "students read" on public.students for select to authenticated
  using (public.can_see_student(id));
create policy "students admin write" on public.students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "parent_students read" on public.parent_students for select to authenticated
  using (parent_id = auth.uid() or public.is_staff());
create policy "parent_students admin write" on public.parent_students for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- admissions: administrators only
create policy "applicants admin" on public.applicants for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "applicant_documents admin" on public.applicant_documents for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- attendance & grades: staff write, students/parents read their own
create policy "attendance read" on public.attendance for select to authenticated
  using (public.can_see_student(student_id));
create policy "attendance staff write" on public.attendance for all to authenticated
  using (public.is_staff()) with check (public.is_staff());
create policy "grades read" on public.grades for select to authenticated
  using (public.can_see_student(student_id));
create policy "grades staff write" on public.grades for all to authenticated
  using (public.is_staff()) with check (public.is_staff());

create policy "marking own or admin" on public.marking_tasks for all to authenticated
  using (teacher_id = auth.uid() or public.is_admin())
  with check (teacher_id = auth.uid() or public.is_admin());

-- fees: admins manage, families read their own
create policy "invoices read" on public.fee_invoices for select to authenticated
  using (public.can_see_student(student_id));
create policy "invoices admin write" on public.fee_invoices for all to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "payments read" on public.fee_payments for select to authenticated
  using (exists (select 1 from public.fee_invoices i where i.id = invoice_id and public.can_see_student(i.student_id)));
create policy "payments admin write" on public.fee_payments for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- library loans
create policy "loans read" on public.book_loans for select to authenticated
  using (public.can_see_student(student_id));
create policy "loans admin write" on public.book_loans for all to authenticated
  using (public.is_admin()) with check (public.is_admin());

-- messages: sender or recipient; null recipient = broadcast visible to all
create policy "messages read" on public.messages for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid() or recipient_id is null);
create policy "messages send" on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and (recipient_id is not null or public.is_staff()));
create policy "messages mark read" on public.messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

create policy "notifications own" on public.notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

create policy "activity admin read" on public.activity_log for select to authenticated
  using (public.is_admin());
create policy "activity staff insert" on public.activity_log for insert to authenticated
  with check (public.is_staff());

create policy "snapshots admin read" on public.enrollment_snapshots for select to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- 11. SEED DATA (mirrors the frontend mock data)
-- ---------------------------------------------------------------------
insert into public.periods (id, label, start_time, end_time) values
  (1,'Period 1','08:00','08:50'), (2,'Period 2','08:55','09:45'), (3,'Period 3','09:50','10:40'),
  (4,'Period 4','11:00','11:50'), (5,'Period 5','11:55','12:45'), (6,'Period 6','13:30','14:20'),
  (7,'Period 7','14:25','15:15');

insert into public.subjects (name) values
  ('Math'),('English'),('Science'),('Physics'),('Chemistry'),('Biology'),
  ('History'),('Geography'),('Art'),('P.E.');

insert into public.classes (label, grade_level, section)
select l, split_part(l,'-',1)::int, split_part(l,'-',2)
from unnest(array['6-C','7-B','8-B','9-A','9-B','10-A','11-A','12-A']) as l;

insert into public.students (admission_no, full_name, class_id, gender)
select v.adm, v.name, c.id, v.gender
from (values
  ('STU-001','Aisha Rahman','9-A','Female'), ('STU-002','Liam Carter','7-B','Male'),
  ('STU-003','Sofia Nguyen','10-A','Female'), ('STU-004','Ethan Brooks','6-C','Male'),
  ('STU-005','Maya Patel','11-A','Female'),   ('STU-006','Noah Williams','8-B','Male'),
  ('STU-007','Olivia Hayes','12-A','Female'), ('STU-008','James Okoro','9-B','Male')
) as v(adm, name, lbl, gender)
join public.classes c on c.label = v.lbl;

-- Timetable for class 9-A (rows = periods, columns = Mon..Fri)
insert into public.timetable_slots (class_id, weekday, period_id, subject_id)
select c.id, d.wd, t.p, s.id
from public.classes c
cross join (values
  (1,'Math','English','Physics','Chemistry','Biology'),
  (2,'English','Math','Chemistry','Physics','History'),
  (3,'History','Biology','Math','English','Geography'),
  (4,'Physics','Chemistry','English','Math','Art'),
  (5,'Biology','Geography','History','P.E.','Math'),
  (6,'Art','P.E.','Geography','Biology','Physics'),
  (7,'Geography','History','P.E.','Art','Chemistry')
) as t(p, d1, d2, d3, d4, d5)
cross join lateral (values (1,t.d1),(2,t.d2),(3,t.d3),(4,t.d4),(5,t.d5)) as d(wd, subj)
join public.subjects s on s.name = d.subj
where c.label = '9-A';

-- Last ~3 weeks of attendance (weekdays only, mostly present)
insert into public.attendance (student_id, class_id, date, status)
select s.id, s.class_id, d::date,
       case when r < 0.06 then 'Absent' when r < 0.11 then 'Late' else 'Present' end
from public.students s
cross join generate_series(current_date - 21, current_date - 1, interval '1 day') as d
cross join lateral (select random() as r) rnd
where extract(isodow from d) < 6;

-- Grades (term 2026-T3)
insert into public.grades (student_id, subject_id, score)
select s.id, sub.id, v.score
from (values
  ('Aisha Rahman','Math',88),('Aisha Rahman','English',92),('Aisha Rahman','Science',85),('Aisha Rahman','History',79),
  ('Liam Carter','Math',74),('Liam Carter','English',81),('Liam Carter','Science',78),('Liam Carter','History',83),
  ('Sofia Nguyen','Math',95),('Sofia Nguyen','English',89),('Sofia Nguyen','Science',91),('Sofia Nguyen','History',87),
  ('Ethan Brooks','Math',67),('Ethan Brooks','English',72),('Ethan Brooks','Science',70),('Ethan Brooks','History',75),
  ('Maya Patel','Math',91),('Maya Patel','English',94),('Maya Patel','Science',88),('Maya Patel','History',90),
  ('Noah Williams','Math',78),('Noah Williams','English',76),('Noah Williams','Science',82),('Noah Williams','History',71)
) as v(student, subject, score)
join public.students s   on s.full_name = v.student
join public.subjects sub on sub.name = v.subject;

insert into public.exams (name, grade_label, exam_date, room) values
  ('Midterm — Mathematics','Grade 10', current_date + 5,  'Hall A'),
  ('Midterm — English',    'Grade 10', current_date + 7,  'Hall A'),
  ('Quiz — Physics',       'Grade 9',  current_date + 1,  'Room 204'),
  ('Final — Biology',      'Grade 12', current_date - 10, 'Hall B'),
  ('Final — History',      'Grade 11', current_date - 8,  'Hall B');

-- Fees: invoices + payments (Paid / Pending / Overdue come from the view)
insert into public.fee_invoices (id, student_id, amount, due_date)
select v.id, s.id, v.amount, v.due
from (values
  ('FEE-1024','Aisha Rahman',4200,current_date - 30), ('FEE-1025','Liam Carter',3800,current_date + 4),
  ('FEE-1026','Sofia Nguyen',4500,current_date - 30), ('FEE-1027','Ethan Brooks',3500,current_date - 47),
  ('FEE-1028','Maya Patel',4800,current_date + 9),    ('FEE-1029','Noah Williams',4000,current_date - 30)
) as v(id, student, amount, due)
join public.students s on s.full_name = v.student;

insert into public.fee_payments (invoice_id, amount, paid_on, method) values
  ('FEE-1024',4200,current_date - 32,'Bank transfer'),
  ('FEE-1026',4500,current_date - 31,'Card'),
  ('FEE-1029',4000,current_date - 29,'Cash');

insert into public.books (id, title, author, category, total_copies, available_copies) values
  ('BK-001','To Kill a Mockingbird','Harper Lee','Fiction',10,6),
  ('BK-002','A Brief History of Time','Stephen Hawking','Science',4,0),
  ('BK-003','The Great Gatsby','F. Scott Fitzgerald','Fiction',8,3),
  ('BK-004','Calculus','James Stewart','Mathematics',6,2),
  ('BK-005','Chemistry: The Central Science','Brown, LeMay','Science',7,5),
  ('BK-006','1984','George Orwell','Fiction',9,4);

insert into public.notices (title, detail, audience, author_name) values
  ('Staff meeting moved to Thursday','The weekly staff meeting is now Thursday at 3:30 PM in the conference room.','teachers','Principal Office'),
  ('Midterm grade submission deadline','All midterm grades must be submitted by Friday, November 14.','teachers','Academic Office'),
  ('Parent-teacher meeting','Friday, November 14 from 4:00 PM in the main hall.','parents','Principal Office'),
  ('Holiday notice','The school will remain closed on Nov 18.','all','Principal Office');

insert into public.enrollment_snapshots (month_start, students) values
  ('2026-06-01',1180),('2026-07-01',1205),('2026-08-01',1198),
  ('2026-09-01',1222),('2026-10-01',1238),('2026-11-01',1248);

insert into public.applicants (id, name, email, phone, grade, applied_on, status, dob, gender, address,
  guardian_name, guardian_relation, guardian_phone, guardian_email, guardian_occupation, previous_school) values
  ('ADM-2401','Aisha Rahman','aisha.r@email.com','+1 555-0142','Grade 9','2026-11-04','Accepted','2011-03-15','Female',
   '142 Maple Avenue, Springfield','Karim Rahman','Father','+1 555-0140','k.rahman@email.com','Engineer','Greenwood Middle School'),
  ('ADM-2402','Liam Carter','liam.c@email.com','+1 555-0188','Grade 7','2026-11-03','Pending','2013-07-22','Male',
   '88 Oak Street, Riverton','Sarah Carter','Mother','+1 555-0186','s.carter@email.com','Teacher','Riverton Elementary');

insert into public.applicant_documents (applicant_id, name, file_type, status) values
  ('ADM-2401','Birth Certificate','PDF','Verified'), ('ADM-2401','Previous Report Card','PDF','Verified'),
  ('ADM-2401','Passport Photo','JPG','Submitted'),   ('ADM-2401','Immunization Record','PDF','Verified'),
  ('ADM-2402','Birth Certificate','PDF','Submitted'), ('ADM-2402','Previous Report Card','PDF','Missing');

insert into public.activity_log (actor, action, type) values
  ('Ms. Thompson','submitted midterm grades for Grade 10-A','grade'),
  ('Accounts Office','recorded a $4,200 fee payment from Aisha Rahman','fee'),
  ('System','flagged Grade 8-B attendance below 80% this week','attendance'),
  ('Mr. Davis','scheduled a Physics quiz for Grade 9','exam'),
  ('Admissions','approved application ADM-2401 — Aisha Rahman, Grade 9','admission'),
  ('Library','added 12 new titles to the catalogue','library');

-- =====================================================================
-- AFTER RUNNING:
-- 1. Sign up your first user in the app (or Auth > Users), then make them admin:
--      update public.profiles set role = 'administrator' where email = 'you@school.com';
-- 2. Link a parent to children (powers the child switcher):
--      insert into public.parent_students (parent_id, student_id, relation)
--      select p.id, s.id, 'Parent' from public.profiles p, public.students s
--      where p.email = 'parent@email.com' and s.full_name in ('Aisha Rahman');
-- =====================================================================
