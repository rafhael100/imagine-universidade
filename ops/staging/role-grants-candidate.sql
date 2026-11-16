-- UNI C-66 — CANDIDATE for independent DBA review only.
-- Staging-only isolated database. No CREATE ROLE/password/secrets.
-- Operator must create 'uni_stage_runtime' separately after approval.
BEGIN;
GRANT CONNECT ON DATABASE imagine_uni_stage TO uni_stage_runtime;
GRANT USAGE ON SCHEMA public TO uni_stage_runtime;

GRANT SELECT, INSERT
  ON public.educational_organizations TO uni_stage_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.educational_courses,
     public.educational_course_versions,
     public.educational_lessons TO uni_stage_runtime;
GRANT SELECT, INSERT
  ON public.educational_lesson_progress,
     public.educational_audit_events TO uni_stage_runtime;
-- Replay nonce deletion requires a SEPARATE audited maintenance role.
-- Runtime can only atomically reserve new nonces; it cannot erase evidence.
GRANT INSERT
  ON public.educational_portal_replay_nonces TO uni_stage_runtime;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON public.sessions TO uni_stage_runtime;

GRANT USAGE ON SEQUENCE
  public.educational_organizations_id_seq,
  public.educational_courses_id_seq,
  public.educational_course_versions_id_seq,
  public.educational_lessons_id_seq,
  public.educational_lesson_progress_id_seq,
  public.educational_audit_events_id_seq,
  public.educational_portal_replay_nonces_id_seq
  TO uni_stage_runtime;
COMMIT;
