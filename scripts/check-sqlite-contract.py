#!/usr/bin/env python3
"""Offline synthetic SQLite invariants for Imagine University.

This is NOT an Artisan migration, Laravel/PHPUnit test, or PostgreSQL proof.
Only Python standard library; creates an in-memory database, no I/O.
"""
import sqlite3


def must_reject(conn, sql, values, label):
    try:
        conn.execute(sql, values)
    except sqlite3.IntegrityError:
        print(f"PASS {label}")
        return
    raise AssertionError(f"Invalid duplicate was accepted: {label}")


def main():
    with sqlite3.connect(":memory:") as db:
        db.execute("CREATE TABLE educational_course_versions (id INTEGER PRIMARY KEY, educational_course_id INTEGER NOT NULL, version INTEGER NOT NULL, status TEXT NOT NULL, UNIQUE(educational_course_id, version))")
        db.execute("CREATE UNIQUE INDEX edu_one_published_version_per_course_idx ON educational_course_versions (educational_course_id) WHERE status = 'published'")
        db.execute("CREATE UNIQUE INDEX edu_one_draft_version_per_course_idx ON educational_course_versions (educational_course_id) WHERE status = 'draft'")
        add = "INSERT INTO educational_course_versions (educational_course_id, version, status) VALUES (?, ?, ?)"
        db.execute(add, (1, 1, "draft"))
        must_reject(db, add, (1, 2, "draft"), "one draft per course")
        db.execute(add, (1, 3, "published"))
        must_reject(db, add, (1, 4, "published"), "one published version per course")
        db.execute(add, (1, 5, "archived"))
        db.execute(add, (1, 6, "archived"))
        assert db.execute("SELECT COUNT(*) FROM educational_course_versions WHERE educational_course_id=1 AND status='archived'").fetchone()[0] == 2
        print("PASS archived history is preserved")
        db.execute(add, (2, 1, "draft"))
        db.execute(add, (2, 2, "published"))
        print("PASS independent courses have their own active versions")

        db.execute("CREATE TABLE educational_lesson_progress (id INTEGER PRIMARY KEY, educational_organization_id INTEGER NOT NULL, subject_key TEXT NOT NULL, educational_lesson_id INTEGER NOT NULL, UNIQUE(educational_organization_id, subject_key, educational_lesson_id))")
        progress = "INSERT OR IGNORE INTO educational_lesson_progress (educational_organization_id, subject_key, educational_lesson_id) VALUES (?, ?, ?)"
        assert db.execute(progress, (10, "person-a", 101)).rowcount == 1
        assert db.execute(progress, (10, "person-a", 101)).rowcount == 0
        assert db.execute("SELECT COUNT(*) FROM educational_lesson_progress WHERE educational_organization_id=10 AND subject_key='person-a' AND educational_lesson_id=101").fetchone()[0] == 1
        print("PASS repeated completion remains idempotent")
        db.execute("CREATE UNIQUE INDEX edu_test_secondary_conflict ON educational_lesson_progress(subject_key)")
        ignored = db.execute(progress, (10, "person-a", 102)).rowcount
        exists = db.execute("SELECT EXISTS(SELECT 1 FROM educational_lesson_progress WHERE educational_organization_id=? AND subject_key=? AND educational_lesson_id=?)", (10, "person-a", 102)).fetchone()[0]
        assert ignored == 0 and exists == 0, "unexpected conflict must not claim completion"
        print("PASS unexpected ignored conflict does not create progress")
        assert db.execute(progress, (20, "person-b", 102)).rowcount == 1
        assert db.execute("SELECT EXISTS(SELECT 1 FROM educational_lesson_progress WHERE educational_organization_id=10 AND subject_key='person-b' AND educational_lesson_id=102)").fetchone()[0] == 0
        print("PASS progress scoped to organization and person")
    print("\n7 SQLite contract cases passed; 0 failed (synthetic in-memory).")


if __name__ == "__main__":
    main()
