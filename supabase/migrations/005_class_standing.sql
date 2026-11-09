-- =====================================================================
-- 005: Class standing for the Results page.
-- A parent or student may only read their own child's grades, so the class average
-- and rank must be computed on the server. This returns only four numbers and
-- nothing about other students. Run after 004.
-- =====================================================================
create or replace function public.class_standing(p_student uuid, p_term text)
returns table (student_avg numeric, class_avg numeric, class_rank int, class_size int)
language plpgsql stable security definer set search_path = public as $$
declare cid uuid; sid uuid;
begin
  if not public.can_see_student(p_student) then return; end if;
  select s.class_id, s.school_id into cid, sid
    from public.students s where s.id = p_student and s.school_id = public.my_school_id();
  if cid is null then return; end if;

  return query
  with avgs as (
    select g.student_id, avg(g.score) as a
      from public.grades g
      join public.students s on s.id = g.student_id
     where s.class_id = cid and s.school_id = sid and s.status = 'active' and g.term = p_term
     group by g.student_id
  )
  select round(me.a, 1),
         round((select avg(a) from avgs), 1),
         (1 + (select count(*) from avgs where a > me.a))::int,
         (select count(*) from avgs)::int
    from avgs me
   where me.student_id = p_student;
end $$;

grant execute on function public.class_standing(uuid, text) to authenticated;
revoke execute on function public.class_standing(uuid, text) from public, anon;

-- =====================================================================
-- Bell notifications: tell the administrators when a teacher registers, and tell the
-- teacher when they are approved.
-- =====================================================================
create or replace function public.notify_teacher_events()
returns trigger language plpgsql security definer set search_path = public as $$
declare who text;
begin
  if tg_op = 'INSERT' then
    select full_name into who from public.profiles where id = new.profile_id;
    insert into public.notifications (school_id, user_id, title, detail, type)
    select new.school_id, p.id, 'Teacher awaiting approval',
           coalesce(nullif(who, ''), 'A teacher') || ' registered and needs your approval.', 'approval'
      from public.profiles p
     where p.school_id = new.school_id and p.role = 'administrator' and p.status = 'active';
  elsif tg_op = 'UPDATE' and old.approved_at is null and new.approved_at is not null then
    insert into public.notifications (school_id, user_id, title, detail, type)
    values (new.school_id, new.profile_id, 'Your account was approved', 'You can now use your teacher dashboard.', 'approval');
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_teacher on public.teachers;
create trigger trg_notify_teacher after insert or update of approved_at on public.teachers
  for each row execute function public.notify_teacher_events();
revoke execute on function public.notify_teacher_events() from public, anon, authenticated;
