alter table groups drop constraint if exists groups_apply_mode_check;
alter table groups add constraint groups_apply_mode_check
  check (apply_mode in ('top', 'bottom', 'set', 'full_look'));

alter table assets drop constraint if exists assets_role_check;
alter table assets add constraint assets_role_check
  check (role in ('model', 'top', 'bottom', 'full_look'));

create or replace function add_group(
  p_job_date date,
  p_expected_version bigint,
  p_apply_mode text
)
returns table (
  job_id uuid, job_date date, job_status text, next_group_number integer,
  version bigint, group_uuid uuid, group_id text, apply_mode text, group_status text
)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  created_group groups%rowtype;
  allocated_group_id text;
begin
  if p_apply_mode not in ('top', 'bottom', 'set', 'full_look') then raise exception 'INVALID_APPLY_MODE'; end if;
  select * into locked_job from jobs where jobs.job_date = p_job_date for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if locked_job.version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;
  if locked_job.next_group_number > 99 then raise exception 'GROUP_LIMIT_REACHED'; end if;
  allocated_group_id := 'G' || lpad(locked_job.next_group_number::text, 2, '0');
  insert into groups (job_id, group_id, apply_mode) values (locked_job.id, allocated_group_id, p_apply_mode) returning * into created_group;
  update jobs set next_group_number = locked_job.next_group_number + 1, version = locked_job.version + 1, updated_at = now()
  where id = locked_job.id returning * into locked_job;
  insert into job_events (job_id, event_type, payload)
  values (locked_job.id, 'group_added', jsonb_build_object('group_id', allocated_group_id));
  return query select locked_job.id, locked_job.job_date, locked_job.status, locked_job.next_group_number,
    locked_job.version, created_group.id, created_group.group_id, created_group.apply_mode, created_group.status;
end;
$$;

create or replace function add_asset(
  p_job_date date, p_expected_version bigint, p_group_id text, p_role text,
  p_original_name text, p_sha256 text, p_width integer, p_height integer,
  p_object_key text, p_asset_ordinal integer default null
)
returns table (version bigint, asset_id uuid)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  target_group groups%rowtype;
  created_asset assets%rowtype;
  next_ordinal integer;
  model_count integer;
begin
  if p_role not in ('model', 'top', 'bottom', 'full_look') then raise exception 'INVALID_ASSET_ROLE'; end if;
  if p_width <= 0 or p_height <= 0 then raise exception 'INVALID_IMAGE_DIMENSIONS'; end if;
  if p_object_key !~ '^jobs/[0-9a-f-]+/groups/[0-9a-f-]+/(model|top|bottom|full_look)/[0-9a-f-]+\.(jpg|png|webp)$' then raise exception 'INVALID_OBJECT_KEY'; end if;
  select * into locked_job from jobs where jobs.job_date = p_job_date for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if locked_job.version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;
  select * into target_group from groups where groups.job_id = locked_job.id and groups.group_id = p_group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if target_group.status <> 'DRAFT' then raise exception 'GROUP_NOT_DRAFT'; end if;
  if (p_role = 'full_look' and target_group.apply_mode <> 'full_look')
    or (p_role in ('top', 'bottom') and target_group.apply_mode = 'full_look') then raise exception 'INVALID_ASSET_ROLE'; end if;
  if p_role = 'model' then
    select count(*) into model_count from assets where group_id = target_group.id and role = 'model';
    if model_count >= 5 then raise exception 'MODEL_LIMIT_REACHED'; end if;
  end if;
  select coalesce(max(asset_ordinal), 0) + 1 into next_ordinal from assets where group_id = target_group.id and role = p_role;
  if p_asset_ordinal is not null and p_asset_ordinal <> next_ordinal then raise exception 'INVALID_ASSET_ORDINAL'; end if;
  insert into assets (group_id, role, original_name, sha256, width, height, object_key, asset_ordinal)
  values (target_group.id, p_role, p_original_name, p_sha256, p_width, p_height, p_object_key, next_ordinal)
  returning * into created_asset;
  update jobs set version = locked_job.version + 1, updated_at = now() where id = locked_job.id returning * into locked_job;
  insert into job_events (job_id, event_type, payload)
  values (locked_job.id, 'asset_added', jsonb_build_object('group_id', p_group_id, 'role', p_role, 'asset_ordinal', next_ordinal));
  return query select locked_job.version, created_asset.id;
end;
$$;

revoke all on function add_group(date, bigint, text) from public;
revoke all on function add_asset(date, bigint, text, text, text, text, integer, integer, text, integer) from public;
grant execute on function add_group(date, bigint, text) to service_role;
grant execute on function add_asset(date, bigint, text, text, text, text, integer, integer, text, integer) to service_role;
