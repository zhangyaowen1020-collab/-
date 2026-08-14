create or replace function add_asset(
  p_job_date date,
  p_expected_version bigint,
  p_group_id text,
  p_role text,
  p_original_name text,
  p_sha256 text,
  p_width integer,
  p_height integer,
  p_object_key text
)
returns table (version bigint, asset_id uuid)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  target_group groups%rowtype;
  created_asset assets%rowtype;
begin
  if p_role not in ('model', 'top', 'bottom') then
    raise exception 'INVALID_ASSET_ROLE';
  end if;
  if p_width <= 0 or p_height <= 0 then
    raise exception 'INVALID_IMAGE_DIMENSIONS';
  end if;
  if p_object_key !~ '^jobs/[0-9a-f-]+/groups/[0-9a-f-]+/(model|top|bottom)/[0-9a-f-]+\.(jpg|png|webp)$' then
    raise exception 'INVALID_OBJECT_KEY';
  end if;

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

  insert into assets (group_id, role, original_name, sha256, width, height, object_key)
  values (target_group.id, p_role, p_original_name, p_sha256, p_width, p_height, p_object_key)
  returning * into created_asset;

  update jobs
  set version = locked_job.version + 1, updated_at = now()
  where id = locked_job.id
  returning * into locked_job;
  insert into job_events (job_id, event_type, payload)
  values (locked_job.id, 'asset_added', jsonb_build_object('group_id', p_group_id, 'role', p_role));

  return query select locked_job.version, created_asset.id;
end;
$$;

revoke all on function add_asset(date, bigint, text, text, text, text, integer, integer, text) from public;
grant execute on function add_asset(date, bigint, text, text, text, text, integer, integer, text) to service_role;
