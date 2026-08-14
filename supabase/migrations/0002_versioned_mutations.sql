create or replace function add_group(
  p_job_date date,
  p_expected_version bigint,
  p_apply_mode text
)
returns table (
  job_id uuid,
  job_date date,
  job_status text,
  next_group_number integer,
  version bigint,
  group_uuid uuid,
  group_id text,
  apply_mode text,
  group_status text
)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  created_group groups%rowtype;
  allocated_group_id text;
begin
  if p_apply_mode not in ('top', 'bottom', 'set') then
    raise exception 'INVALID_APPLY_MODE';
  end if;

  select * into locked_job from jobs where jobs.job_date = p_job_date for update;
  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;
  if locked_job.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;
  if locked_job.next_group_number > 99 then
    raise exception 'GROUP_LIMIT_REACHED';
  end if;

  allocated_group_id := 'G' || lpad(locked_job.next_group_number::text, 2, '0');
  insert into groups (job_id, group_id, apply_mode)
  values (locked_job.id, allocated_group_id, p_apply_mode)
  returning * into created_group;

  update jobs
  set next_group_number = locked_job.next_group_number + 1,
      version = locked_job.version + 1,
      updated_at = now()
  where id = locked_job.id
  returning * into locked_job;

  insert into job_events (job_id, event_type, payload)
  values (locked_job.id, 'group_added', jsonb_build_object('group_id', allocated_group_id));

  return query select locked_job.id, locked_job.job_date, locked_job.status,
    locked_job.next_group_number, locked_job.version, created_group.id,
    created_group.group_id, created_group.apply_mode, created_group.status;
end;
$$;

create or replace function delete_draft_group(
  p_job_date date,
  p_expected_version bigint,
  p_group_id text
)
returns table (version bigint, has_outputs boolean)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  target_group groups%rowtype;
begin
  select * into locked_job from jobs where jobs.job_date = p_job_date for update;
  if not found then
    raise exception 'JOB_NOT_FOUND';
  end if;
  if locked_job.version <> p_expected_version then
    raise exception 'VERSION_CONFLICT';
  end if;

  select * into target_group
  from groups where groups.job_id = locked_job.id and groups.group_id = p_group_id
  for update;
  if not found then
    raise exception 'GROUP_NOT_FOUND';
  end if;
  if target_group.status <> 'DRAFT' then
    raise exception 'GROUP_NOT_DRAFT';
  end if;
  if exists (select 1 from outputs where outputs.group_id = target_group.id) then
    raise exception 'GROUP_HAS_OUTPUTS';
  end if;

  delete from groups where id = target_group.id;
  update jobs
  set version = locked_job.version + 1, updated_at = now()
  where id = locked_job.id
  returning * into locked_job;

  insert into job_events (job_id, event_type, payload)
  values (locked_job.id, 'draft_group_deleted', jsonb_build_object('group_id', p_group_id));

  return query select locked_job.version, false;
end;
$$;

revoke all on function add_group(date, bigint, text) from public;
revoke all on function delete_draft_group(date, bigint, text) from public;
grant execute on function add_group(date, bigint, text) to service_role;
grant execute on function delete_draft_group(date, bigint, text) to service_role;
