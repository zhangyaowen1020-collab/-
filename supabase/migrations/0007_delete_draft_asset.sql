create or replace function delete_draft_asset(
  p_job_date date,
  p_expected_version bigint,
  p_group_id text,
  p_role text,
  p_asset_id uuid
)
returns table (version bigint, object_key text)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  target_group groups%rowtype;
  target_asset assets%rowtype;
begin
  if p_role not in ('model', 'top', 'bottom', 'full_look') then raise exception 'INVALID_ASSET_ROLE'; end if;

  select * into locked_job from jobs where jobs.job_date = p_job_date for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if locked_job.version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;

  select * into target_group from groups
  where groups.job_id = locked_job.id and groups.group_id = p_group_id
  for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  if target_group.status <> 'DRAFT' then raise exception 'GROUP_NOT_DRAFT'; end if;

  select * into target_asset from assets
  where assets.id = p_asset_id and assets.group_id = target_group.id and assets.role = p_role
  for update;
  if not found then raise exception 'ASSET_NOT_FOUND'; end if;

  delete from assets where assets.id = target_asset.id;
  update jobs set version = locked_job.version + 1, updated_at = now()
  where id = locked_job.id returning * into locked_job;

  insert into job_events (job_id, event_type, payload)
  values (locked_job.id, 'asset_deleted', jsonb_build_object(
    'group_id', p_group_id, 'role', p_role, 'asset_id', target_asset.id
  ));

  return query select locked_job.version, target_asset.object_key;
end;
$$;

revoke all on function delete_draft_asset(date, bigint, text, text, uuid) from public;
grant execute on function delete_draft_asset(date, bigint, text, text, uuid) to service_role;
