-- =====================================================================
-- 004: Parents no longer need approval.
-- A parent's account becomes active when the email is verified. The children they
-- list are saved, and each is linked automatically to the existing student with the
-- same name in the same class (exactly one match). Children with no match yet stay
-- saved and are linked the moment a matching student is enrolled. Only teachers are
-- approved by the administrator.
-- Run after 003.
-- =====================================================================

-- ---- 1. link declared children to enrolled students (internal) -----------------
-- Names and class labels are compared ignoring case and extra spaces.
create or replace function public.norm_text(t text)
returns text language sql immutable as $$
  select regexp_replace(lower(trim(coalesce(t, ''))), '\s+', ' ', 'g')
$$;

create or replace function public.link_parent_children(p_parent uuid)
returns void language plpgsql security definer set search_path = public as $$
declare r record; stu uuid; n int;
begin
  for r in select pc.id, pc.school_id, pc.child_name, pc.class_label
           from public.parent_children pc
           where pc.parent_id = p_parent and pc.student_id is null loop
    select count(*), min(st.id::text)::uuid into n, stu
    from public.students st
    join public.classes c on c.id = st.class_id
    where st.school_id = r.school_id and c.school_id = r.school_id
      and public.norm_text(c.label) = public.norm_text(r.class_label)
      and public.norm_text(st.full_name) = public.norm_text(r.child_name)
      and st.status = 'active';
    if n = 1 then                       -- never guess between two students with the same name
      insert into public.parent_students (school_id, parent_id, student_id, relation)
      values (r.school_id, p_parent, stu, 'Parent') on conflict do nothing;
      update public.parent_children set student_id = stu where id = r.id;
    end if;
  end loop;
end $$;

-- A student enrolled later is linked to parents who already declared them.
create or replace function public.link_children_for_student()
returns trigger language plpgsql security definer set search_path = public as $$
declare r record; same int;
begin
  if new.status <> 'active' or new.class_id is null then return new; end if;
  select count(*) into same from public.students st
   where st.school_id = new.school_id and st.class_id = new.class_id and st.status = 'active'
     and public.norm_text(st.full_name) = public.norm_text(new.full_name);
  if same <> 1 then return new; end if;
  for r in select pc.id, pc.parent_id from public.parent_children pc
           join public.classes c on c.id = new.class_id
           where pc.school_id = new.school_id and pc.student_id is null
             and public.norm_text(pc.class_label) = public.norm_text(c.label)
             and public.norm_text(pc.child_name) = public.norm_text(new.full_name) loop
    insert into public.parent_students (school_id, parent_id, student_id, relation)
    values (new.school_id, r.parent_id, new.id, 'Parent') on conflict do nothing;
    update public.parent_children set student_id = new.id where id = r.id;
  end loop;
  return new;
end $$;

drop trigger if exists trg_link_children on public.students;
create trigger trg_link_children after insert or update of full_name, class_id, status on public.students
  for each row execute function public.link_children_for_student();

revoke execute on function public.link_parent_children(uuid)   from public, anon, authenticated;
revoke execute on function public.link_children_for_student()  from public, anon, authenticated;

-- ---- 2. registration: parents are active on verification ----------------------
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
  perform set_config('app.registration', 'on', true);
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

    if kind = 'teacher' then
      -- teachers wait for the administrator
      update public.profiles set role = 'teacher', status = 'pending', school_id = sid where id = p_uid;
      insert into public.teachers (profile_id, school_id, subjects_taught, is_class_teacher, requested_class_label)
      values (p_uid, sid,
              coalesce((select array_agg(left(trim(x), 60)) from (select jsonb_array_elements_text(meta->'subjects') x limit 20) q
                        where length(trim(x)) > 0), '{}'),
              coalesce((meta->>'is_class_teacher')::boolean, false),
              nullif(left(trim(meta->>'class_label'), 40), ''));
    else
      -- parents are active straight away
      update public.profiles set role = 'parent', status = 'active', school_id = sid where id = p_uid;
      insert into public.parents (profile_id, school_id) values (p_uid, sid);
      for child in select * from jsonb_array_elements(coalesce(meta->'children', '[]'::jsonb)) limit 10 loop
        if length(trim(coalesce(child->>'name',''))) > 0 and length(trim(coalesce(child->>'class',''))) > 0 then
          insert into public.parent_children (school_id, parent_id, child_name, class_label)
          values (sid, p_uid, left(trim(child->>'name'), 120), left(trim(child->>'class'), 40));
        end if;
      end loop;
      perform public.link_parent_children(p_uid);
    end if;

  else
    -- Added by hand in the Supabase dashboard with no registration data:
    -- stays without permissions until an administrator provisions it.
    update public.profiles set status = 'pending' where id = p_uid;
  end if;
  perform set_config('app.registration', '', true);
end $$;
revoke execute on function public.complete_registration(uuid) from public, anon, authenticated;

-- ---- 3. parents already waiting from before this change -----------------------
do $$
declare r record;
begin
  perform set_config('app.registration', 'on', true);
  for r in select pr.id from public.profiles pr
           join public.parents pa on pa.profile_id = pr.id
           where pr.role = 'parent' and pr.status = 'pending' loop
    update public.profiles set status = 'active' where id = r.id;
    perform public.link_parent_children(r.id);
  end loop;
  perform set_config('app.registration', '', true);
end $$;

-- ---- 4. parent approval no longer exists ---------------------------------------
drop function if exists public.approve_parent(uuid);
drop function if exists public.reject_parent(uuid);

create or replace function public.get_school_overview()
returns jsonb language sql stable set search_path = public as $$
  select jsonb_build_object(
    'activeTeachers',   (select count(*) from public.profiles where role = 'teacher' and status = 'active'),
    'registeredParents',(select count(*) from public.profiles where role = 'parent' and status = 'active'),
    'totalStudents',    (select count(*) from public.students where status = 'active'),
    'pendingTeachers',  (select count(*) from public.profiles where role = 'teacher' and status = 'pending')
  )
$$;
