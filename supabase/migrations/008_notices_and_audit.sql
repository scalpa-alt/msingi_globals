-- =====================================================================
-- 008: Notices that reach the right audience, and an audit trail.
--   Notices
--     * staff post (policy from 001); a poster edits or deletes their own; admin all.
--     * readers only see notices for 'all' or for their own role.
--   Audit trail
--     * audit_log records who added, changed or deleted the sensitive tables.
--     * written by triggers only; administrators can read it; nobody can edit or delete it.
-- Run after 007.
-- =====================================================================

-- ---- 1. notices ------------------------------------------------------------------
alter table public.notices alter column created_by set default auth.uid();

drop policy if exists "notices read" on public.notices;
create policy "notices read" on public.notices for select to authenticated using (
  public.is_admin()
  or created_by = auth.uid()
  or audience = 'all'
  or audience = case public.app_role()
                  when 'teacher' then 'teachers' when 'student' then 'students' when 'parent' then 'parents'
                end
);

drop policy if exists "notices own write" on public.notices;
create policy "notices own write" on public.notices for update to authenticated
  using (public.is_staff() and created_by = auth.uid())
  with check (public.is_staff() and created_by = auth.uid());
drop policy if exists "notices own delete" on public.notices;
create policy "notices own delete" on public.notices for delete to authenticated
  using (public.is_staff() and created_by = auth.uid());

-- ---- 2. audit trail ----------------------------------------------------------------
create table if not exists public.audit_log (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid references public.schools(id) on delete cascade,
  actor_id   uuid,
  actor_name text not null,
  table_name text not null,
  op         text not null check (op in ('INSERT','UPDATE','DELETE')),
  row_id     text,
  details    jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_log_school_time on public.audit_log (school_id, created_at desc);

alter table public.audit_log enable row level security;
drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read" on public.audit_log for select to authenticated using (public.is_admin());
drop policy if exists "tenant isolation" on public.audit_log;
create policy "tenant isolation" on public.audit_log as restrictive for all to authenticated
  using (school_id = public.my_school_id()) with check (school_id = public.my_school_id());
revoke insert, update, delete on public.audit_log from authenticated, anon;

create or replace function public.audit_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  rec  jsonb := to_jsonb(case when tg_op = 'DELETE' then old else new end);
  prev jsonb := case when tg_op = 'UPDATE' then to_jsonb(old) end;
  d    jsonb;
  who  text;
begin
  if tg_op = 'UPDATE' then
    select coalesce(jsonb_object_agg(n.key, jsonb_build_object('from', prev -> n.key, 'to', n.value)), '{}'::jsonb)
      into d from jsonb_each(rec) n where prev -> n.key is distinct from n.value;
    if d = '{}'::jsonb then return new; end if;   -- nothing really changed
  else
    d := rec;
  end if;

  select full_name into who from public.profiles where id = auth.uid();

  insert into public.audit_log (school_id, actor_id, actor_name, table_name, op, row_id, details)
  values (nullif(rec ->> 'school_id', '')::uuid, auth.uid(), coalesce(nullif(who, ''), case when auth.uid() is null then 'system' else 'Unnamed user' end), tg_table_name, tg_op, rec ->> 'id', d);
  return case when tg_op = 'DELETE' then old else new end;
end $$;
revoke execute on function public.audit_change() from public, anon, authenticated;

do $$
declare t text;
begin
  foreach t in array array['students','fee_invoices','fee_payments','books','teacher_classes','periods','applicants','notices'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after insert or update or delete on public.%I for each row execute function public.audit_change()', t);
  end loop;
  -- very frequent tables: record deletions only
  foreach t in array array['grades','attendance','book_loans'] loop
    execute format('drop trigger if exists trg_audit on public.%I', t);
    execute format('create trigger trg_audit after delete on public.%I for each row execute function public.audit_change()', t);
  end loop;
end $$;
