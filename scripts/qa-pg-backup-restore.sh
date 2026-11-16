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
pg_restore -U uni_ci --no-owner --no-acl -d "$restore_db" "$snapshot"

after_counts="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" -c "$counts_sql")"
after_hash="$(psql -X -A -t -v ON_ERROR_STOP=1 -U uni_ci -d "$restore_db" -c "$fingerprint_sql")"
test "$after_counts" = "$before_counts" || { echo "FAIL: restored counts differ." >&2; exit 2; }
test "$after_hash" = "$before_hash" || { echo "FAIL: restored lesson content differs." >&2; exit 2; }

echo "PASS: PostgreSQL18 snapshot restored into synthetic isolated database; 10 courses, 35 lessons, no client progress; content fingerprint matches."
echo "The temp backup and clone DB are removed before exit; production/VPS backup is NOT proven."
