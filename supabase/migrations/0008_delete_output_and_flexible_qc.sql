create or replace function delete_output(
  p_job_date date,
  p_expected_version bigint,
  p_output_file text
)
returns table (version bigint, object_key text)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  target_output outputs%rowtype;
  target_group groups%rowtype;
begin
  select * into locked_job from jobs where jobs.job_date = p_job_date for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if locked_job.version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;

  select groups.* into target_group
  from groups
  join outputs on outputs.group_id = groups.id
  where groups.job_id = locked_job.id and outputs.output_file = p_output_file
  for update of groups;
  if not found then raise exception 'OUTPUT_NOT_FOUND'; end if;

  select * into target_output from outputs
  where outputs.group_id = target_group.id and outputs.output_file = p_output_file
  for update;
  if not found then raise exception 'OUTPUT_NOT_FOUND'; end if;

  delete from outputs where outputs.id = target_output.id;
  update jobs set version = locked_job.version + 1, updated_at = now()
  where id = locked_job.id returning * into locked_job;

  insert into job_events (job_id, event_type, payload)
  values (locked_job.id, 'output_deleted', jsonb_build_object(
    'group_id', target_group.group_id, 'output_file', p_output_file
  ));

  return query select locked_job.version, target_output.object_key;
end;
$$;

revoke all on function delete_output(date, bigint, text) from public;
grant execute on function delete_output(date, bigint, text) to service_role;
