-- =====================================================================
-- 007: Admissions -> students in one step.
--   * applicants get a generated id (ADM-xxxxxxxx) so the admin can add one by hand
--   * enroll_applicant(): administrator only. Creates the student from the application,
--     marks the application Accepted and remembers which student it became, so an
--     application can never be enrolled twice. Parents who registered with this child's
--     name and class are linked automatically (trigger from 004).
-- Run after 006.
-- =====================================================================
alter table public.applicants alter column id
  set default 'ADM-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));

alter table public.applicants
  add column if not exists enrolled_student_id uuid references public.students(id) on delete set null;

create or replace function public.enroll_applicant(p_applicant text, p_class uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  a public.applicants%rowtype;
  sid uuid;
  adm text;
begin
  if not public.is_admin() then
    raise exception 'Only an administrator can enrol a student.' using errcode = '42501';
  end if;

  select * into a from public.applicants where id = p_applicant for update;
  if not found then raise exception 'Application not found.' using errcode = 'P0002'; end if;
  if a.enrolled_student_id is not null then
    raise exception 'This applicant is already enrolled.' using errcode = '23505';
  end if;
  if a.status = 'Rejected' then
    raise exception 'A rejected application cannot be enrolled. Reopen it first.' using errcode = '22023';
  end if;
  if not exists (select 1 from public.classes c where c.id = p_class and c.school_id = public.my_school_id()) then
    raise exception 'Choose a class from this school.' using errcode = '22023';
  end if;

  adm := a.id;
  if exists (select 1 from public.students s where s.admission_no = adm) then
    adm := adm || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  end if;

  insert into public.students (school_id, full_name, admission_no, class_id, gender, dob, address)
  values (public.my_school_id(), a.name, adm, p_class,
          case when a.gender in ('Female','Male','Other') then a.gender end, a.dob, a.address)
  returning id into sid;

  update public.applicants set status = 'Accepted', enrolled_student_id = sid where id = a.id;
  return sid;
end $$;
revoke execute on function public.enroll_applicant(text, uuid) from public, anon;
grant  execute on function public.enroll_applicant(text, uuid) to authenticated;
