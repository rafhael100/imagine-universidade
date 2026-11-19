#!/bin/sh
set -eu

# Executed with stdin in the disposable PostgreSQL service ONLY, after
# QA fixtures have been loaded. Never copy backups to a host or cloud.
if [ "${POSTGRES_DB:-}" != "uni_ci" ] ||
   [ "${POSTGRES_USER:-}" != "uni_ci" ] ||
   [ "${POSTGRES_PASSWORD:-}" != "synthetic_ci_only" ]; then
  echo "FAIL: not the approved disposable database context." >&2
  exit 2
fi

# libpq environment variables can silently redirect psql/pg_dump to a remote
# database even when -U/-d are fixed. Reject them BEFORE the first query.
for client_var in PGHOST PGHOSTADDR PGPORT PGSERVICE PGSERVICEFILE PGUSER \
  PGDATABASE PGPASSWORD PGPASSFILE PGOPTIONS PGSSLMODE PGSSLROOTCERT \
  PGCONNECT_TIMEOUT; do
  if printenv "$client_var" >/dev/null 2>&1; then
    echo "FAIL: forbidden libpq override $client_var" >&2
    exit 2
  fi
done
# Bind every psql/pg_dump/pg_restore/create/drop operation to the socket of
# the disposable PG18 container. Never fall back to TCP.
test -S /var/run/postgresql/.s.PGSQL.5432 || {
  echo "FAIL: expected local PostgreSQL socket missing." >&2
  exit 2
}
PGHOST=/var/run/postgresql
PGPORT=5432
export PGHOST PGPORT
local_origin="$(psql -X -q -A -t -v ON_ERROR_STOP=1 -U uni_ci -d uni_ci \
  -c "SELECT CASE WHEN inet_server_addr() IS NULL
    AND current_database()='uni_ci' AND current_user='uni_ci'
    THEN 'local_synthetic' ELSE 'unsafe' END")"
test "$local_origin" = "local_synthetic" || {
  echo "FAIL: PostgreSQL connection is not local synthetic uni_ci." >&2
  exit 2
}

pg_major="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d uni_ci -c 'SHOW server_version_num')"
case "$pg_major" in
  18*) ;;
  *) echo "FAIL: expected disposable PostgreSQL18." >&2; exit 2 ;;
esac

# Only restore into the second fixed synthetic database. Never overwrite.
restore_db="uni_ci_restore"
already="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d postgres -c "SELECT COUNT(*) FROM pg_database WHERE datname='uni_ci_restore'")"
test "$already" = "0" || { echo "FAIL: restore target already exists." >&2; exit 2; }

snapshot="$(mktemp /tmp/uni_synthetic_qa.XXXXXX)"
cleanup() {
  dropdb --if-exists -U uni_ci "$restore_db" >/dev/null 2>&1 || true
  rm -f "$snapshot"
}
trap cleanup EXIT HUP INT TERM

counts_sql="SELECT (SELECT COUNT(*) FROM educational_courses)::text || ',' ||
                   (SELECT COUNT(*) FROM educational_lessons)::text || ',' ||
                   (SELECT COUNT(*) FROM educational_courses WHERE is_published)::text || ',' ||
                   (SELECT COUNT(*) FROM educational_lesson_progress)::text"
fingerprint_sql="SELECT md5(string_agg(slug || ':' || body,'|' ORDER BY id)) FROM educational_lessons"

# PG18 structural parity: column definitions, constraints, indexes, RLS,
# trigger/policy definitions, and sequence definitions + current values.
# Owners/ACLs cannot be compared because this dump uses --no-owner --no-acl.
schema_sql="$(cat <<'SQL'
WITH parts(kind, name, def) AS (
 SELECT 'table',n.nspname||'.'||c.relname,
   c.relkind::text||'|'||c.relrowsecurity::text||'|'||c.relforcerowsecurity::text
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 UNION ALL
 SELECT 'column',n.nspname||'.'||c.relname||'.'||a.attname,
   format_type(a.atttypid,a.atttypmod)||'|'||a.attnotnull::text||
   '|'||a.attgenerated::text||'|'||a.attidentity::text||
   '|'||coalesce(pg_get_expr(d.adbin,d.adrelid),'')
 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
 JOIN pg_attribute a ON a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped
 LEFT JOIN pg_attrdef d ON d.adrelid=c.oid AND d.adnum=a.attnum
 WHERE n.nspname='public' AND c.relkind IN ('r','p')
 UNION ALL
 SELECT 'constraint',n.nspname||'.'||c.relname||'.'||k.conname,
   k.contype::text||'|'||pg_get_constraintdef(k.oid,true)
 FROM pg_constraint k JOIN pg_class c ON c.oid=k.conrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'
 UNION ALL
 SELECT 'index',n.nspname||'.'||i.relname,pg_get_indexdef(i.oid)
 FROM pg_index ix JOIN pg_class i ON i.oid=ix.indexrelid
 JOIN pg_class t ON t.oid=ix.indrelid JOIN pg_namespace n ON n.oid=t.relnamespace
 WHERE n.nspname='public'
 UNION ALL
 SELECT 'trigger',n.nspname||'.'||c.relname||'.'||t.tgname,pg_get_triggerdef(t.oid,true)
 FROM pg_trigger t JOIN pg_class c ON c.oid=t.tgrelid
 JOIN pg_namespace n ON n.oid=c.relnamespace
 WHERE n.nspname='public' AND NOT t.tgisinternal
 UNION ALL
 SELECT 'policy',schemaname||'.'||tablename||'.'||policyname,
   permissive||'|'||cmd||'|'||array_to_string(roles,',')||'|'||
   coalesce(qual,'')||'|'||coalesce(with_check,'')
 FROM pg_policies WHERE schemaname='public'
 UNION ALL
 SELECT 'sequence',schemaname||'.'||sequencename,
   concat_ws('|',data_type::text,start_value::text,min_value::text,
      max_value::text,increment_by::text,cycle::text,cache_size::text,
      coalesce(last_value::text,'NULL'))
 FROM pg_sequences WHERE schemaname='public'
)
SELECT md5(coalesce(string_agg(kind||':'||name||':'||def,chr(10) ORDER BY kind,name),''))
FROM parts;
SQL
)"
# Canonical data fingerprint of EVERY public table, not only 35 lesson bodies.
# A temporary table is created only in the current psql session.
data_sql="$(cat <<'SQL'
CREATE TEMP TABLE qa_pg_table_hashes(name text PRIMARY KEY, digest text);
DO $qa$
DECLARE r record; h text;
BEGIN
 FOR r IN SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename LOOP
   EXECUTE format($q$SELECT md5(coalesce(string_agg(to_jsonb(t)::text,
     chr(10) ORDER BY to_jsonb(t)::text),'')) FROM public.%I AS t$q$,
     r.tablename) INTO h;
   INSERT INTO qa_pg_table_hashes VALUES(r.tablename,h);
 END LOOP;
END $qa$;
SELECT md5(string_agg(name||':'||digest,chr(10) ORDER BY name)) FROM qa_pg_table_hashes;
SQL
)"
schema_hash() { psql -X -q -A -t -v ON_ERROR_STOP=1 -U uni_ci -d "$1" -c "$schema_sql"; }
data_hash() { psql -X -q -A -t -v ON_ERROR_STOP=1 -U uni_ci -d "$1" -c "$data_sql"; }
before_schema="$(schema_hash uni_ci)"
before_data="$(data_hash uni_ci)"
test -n "$before_schema" && test -n "$before_data" || {
  echo "FAIL: missing source PostgreSQL schema or data checksum." >&2
  exit 2
}

before_counts="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d uni_ci -c "$counts_sql")"
before_hash="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d uni_ci -c "$fingerprint_sql")"
test "$before_counts" = "10,35,0,0" || {
  echo "FAIL: source must be exactly ten draft courses, thirty-five lessons and no learner progress." >&2
  exit 2
}
test "${#before_hash}" -eq 32 || { echo "FAIL: invalid source fingerprint." >&2; exit 2; }

pg_dump -U uni_ci -Fc --no-owner --no-acl -f "$snapshot" uni_ci
test -s "$snapshot" || { echo "FAIL: empty database snapshot." >&2; exit 2; }
createdb -U uni_ci -T template0 "$restore_db"
pg_restore -U uni_ci --exit-on-error --single-transaction --no-owner --no-acl -d "$restore_db" "$snapshot"

after_counts="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" -c "$counts_sql")"
after_hash="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" -c "$fingerprint_sql")"
test "$after_counts" = "$before_counts" || { echo "FAIL: restored counts differ." >&2; exit 2; }
test "$after_hash" = "$before_hash" || { echo "FAIL: restored lesson content differs." >&2; exit 2; }

test "$(schema_hash "$restore_db")" = "$before_schema" || {
  echo "FAIL: restored indexes, constraints, RLS or sequence state differs." >&2
  exit 2
}
test "$(data_hash "$restore_db")" = "$before_data" || {
  echo "FAIL: one or more restored table contents differ." >&2
  exit 2
}
# Negative proof: tampering with one lesson in the RESTORED COPY must be seen.
psql -X -q -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" -c \
  "UPDATE educational_lessons SET body=body||' QA-only tamper'
   WHERE id=(SELECT min(id) FROM educational_lessons)" >/dev/null
test "$(data_hash "$restore_db")" != "$before_data" || {
  echo "FAIL: tampered restored lesson escaped the data fingerprint." >&2
  exit 2
}
test "$(data_hash uni_ci)" = "$before_data" || {
  echo "FAIL: the original disposable source was unexpectedly modified." >&2
  exit 2
}
echo "PASS: PG18 restored all public data and relational structure; clone-only tamper detected."
# Negative schema controls run only against the expendable clone. Ensure the
# fingerprint detects a changed row-security flag AND a dropped auxiliary index.
rls="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" -c \
  "SELECT relrowsecurity FROM pg_class
   WHERE oid='public.educational_portal_replay_nonces'::regclass")"
case "$rls" in
  f) changed_rls="ENABLE"; original_rls="DISABLE" ;;
  t) changed_rls="DISABLE"; original_rls="ENABLE" ;;
  *) echo "FAIL: unknown clone RLS state." >&2; exit 2 ;;
esac
psql -X -q -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" \
  -c "ALTER TABLE public.educational_portal_replay_nonces $changed_rls ROW LEVEL SECURITY" >/dev/null
test "$(schema_hash "$restore_db")" != "$before_schema" || {
  echo "FAIL: changed clone RLS flag escaped the schema fingerprint." >&2
  exit 2
}
psql -X -q -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" \
  -c "ALTER TABLE public.educational_portal_replay_nonces $original_rls ROW LEVEL SECURITY" >/dev/null
test "$(schema_hash "$restore_db")" = "$before_schema" || {
  echo "FAIL: reestablishing clone RLS did not restore structure." >&2
  exit 2
}
psql -X -q -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" \
  -c "DROP INDEX public.edu_portal_nonce_expiry_idx" >/dev/null
test "$(schema_hash "$restore_db")" != "$before_schema" || {
  echo "FAIL: dropped clone nonce-expiration index escaped fingerprint." >&2
  exit 2
}
test "$(schema_hash uni_ci)" = "$before_schema" || {
  echo "FAIL: source schema unexpectedly changed during clone-only tests." >&2
  exit 2
}
echo "PASS: RLS toggle and dropped expiry index are detected in restored copy; original schema unchanged."



echo "PASS: PostgreSQL18 snapshot restored into synthetic isolated database; 10 courses, 35 lessons, no client progress; content fingerprint matches."
echo "The temp backup and clone DB are removed before exit; production/VPS backup is NOT proven."
