create or replace function add_output(
  p_job_date date,
  p_expected_version bigint,
  p_group_id text,
  p_phase text,
  p_attempt integer,
  p_output_file text,
  p_object_key text,
  p_technical_status text
)
returns table (version bigint, output_id uuid)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  target_group groups%rowtype;
  created_output outputs%rowtype;
begin
  if p_phase not in ('baseline', 'final') or p_attempt <= 0 or p_technical_status not in ('PASS', 'FAIL') then
    raise exception 'INVALID_OUTPUT';
  end if;
  select * into locked_job from jobs where jobs.job_date = p_job_date for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if locked_job.version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;
  select * into target_group from groups
  where groups.job_id = locked_job.id and groups.group_id = p_group_id for update;
  if not found then raise exception 'GROUP_NOT_FOUND'; end if;
  insert into outputs (group_id, phase, attempt, output_file, object_key, technical_status)
  values (target_group.id, p_phase, p_attempt, p_output_file, p_object_key, p_technical_status)
  returning * into created_output;
  update jobs set version = locked_job.version + 1, updated_at = now()
  where id = locked_job.id returning * into locked_job;
  return query select locked_job.version, created_output.id;
end;
$$;

create or replace function save_review(
  p_job_date date,
  p_expected_version bigint,
  p_output_id uuid,
  p_identity text,
  p_body_pose text,
  p_background text,
  p_garment_structure text,
  p_color_material text,
  p_logo_print text,
  p_occlusion text,
  p_group_consistency text,
  p_final_status text
)
returns table (version bigint)
language plpgsql
as $$
declare
  locked_job jobs%rowtype;
  target_output outputs%rowtype;
  fields text[];
  computed_final text;
begin
  select * into locked_job from jobs where jobs.job_date = p_job_date for update;
  if not found then raise exception 'JOB_NOT_FOUND'; end if;
  if locked_job.version <> p_expected_version then raise exception 'VERSION_CONFLICT'; end if;
  select outputs.* into target_output from outputs
  join groups on groups.id = outputs.group_id
  where groups.job_id = locked_job.id and outputs.id = p_output_id for update;
  if not found then raise exception 'OUTPUT_NOT_FOUND'; end if;
  fields := array[p_identity, p_body_pose, p_background, p_garment_structure, p_color_material, p_logo_print, p_occlusion, p_group_consistency];
  if exists (select 1 from unnest(fields) value where value not in ('PASS', 'FAIL', 'N/A')) then
    raise exception 'INVALID_REVIEW';
  end if;
  computed_final := case when 'FAIL' = any(fields) then 'FAIL' else 'PASS' end;
  if p_final_status <> computed_final then raise exception 'INVALID_FINAL_STATUS'; end if;
  if target_output.technical_status <> 'PASS' and p_final_status = 'PASS' then
    raise exception 'TECHNICAL_CHECK_FAILED';
  end if;
  insert into reviews (output_id, identity, body_pose, background, garment_structure, color_material, logo_print, occlusion, group_consistency, final_status, saved_at)
  values (p_output_id, p_identity, p_body_pose, p_background, p_garment_structure, p_color_material, p_logo_print, p_occlusion, p_group_consistency, p_final_status, now())
  on conflict (output_id) do update set
    identity = excluded.identity, body_pose = excluded.body_pose, background = excluded.background,
    garment_structure = excluded.garment_structure, color_material = excluded.color_material,
    logo_print = excluded.logo_print, occlusion = excluded.occlusion,
    group_consistency = excluded.group_consistency, final_status = excluded.final_status, saved_at = now();
  update jobs set version = locked_job.version + 1, updated_at = now()
  where id = locked_job.id returning * into locked_job;
  return query select locked_job.version;
end;
$$;

revoke all on function add_output(date, bigint, text, text, integer, text, text, text) from public;
revoke all on function save_review(date, bigint, uuid, text, text, text, text, text, text, text, text, text) from public;
grant execute on function add_output(date, bigint, text, text, integer, text, text, text) to service_role;
grant execute on function save_review(date, bigint, uuid, text, text, text, text, text, text, text, text, text) to service_role;
