import csv
import io
import os
import sqlite3
from datetime import datetime
from typing import Any
from urllib.parse import urlencode

from flask import Flask, Response, flash, redirect, render_template, request, url_for

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
DATABASE_PATH = os.path.join(DATA_DIR, "admin.db")

app = Flask(__name__)
app.config["SECRET_KEY"] = "computer-classroom-usage-record-admin"


def get_db_connection() -> sqlite3.Connection:
    os.makedirs(DATA_DIR, exist_ok=True)
    connection = sqlite3.connect(DATABASE_PATH)
    connection.row_factory = sqlite3.Row
    connection.execute("PRAGMA foreign_keys = ON")
    return connection


def init_db() -> None:
    with get_db_connection() as connection:
        connection.executescript(
            """
            CREATE TABLE IF NOT EXISTS semesters (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL UNIQUE,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS classes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                semester_id INTEGER NOT NULL,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(name, semester_id),
                FOREIGN KEY (semester_id) REFERENCES semesters(id) ON DELETE CASCADE
            );

            CREATE TABLE IF NOT EXISTS teachers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                employee_id TEXT UNIQUE,
                email TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS learning_contents (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL UNIQUE,
                description TEXT,
                teacher_id INTEGER,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL
            );

            CREATE TABLE IF NOT EXISTS sign_in_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                teacher_id INTEGER,
                class_id INTEGER,
                content_id INTEGER,
                sign_in_date TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'present',
                remark TEXT,
                created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (teacher_id) REFERENCES teachers(id) ON DELETE SET NULL,
                FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL,
                FOREIGN KEY (content_id) REFERENCES learning_contents(id) ON DELETE SET NULL
            );

            CREATE INDEX IF NOT EXISTS idx_sign_in_records_sign_in_date
                ON sign_in_records(sign_in_date);
            CREATE INDEX IF NOT EXISTS idx_sign_in_records_teacher_id
                ON sign_in_records(teacher_id);
            CREATE INDEX IF NOT EXISTS idx_sign_in_records_class_id
                ON sign_in_records(class_id);
            CREATE INDEX IF NOT EXISTS idx_classes_semester_id
                ON classes(semester_id);
            """
        )


def parse_filters(query_args: dict[str, Any]) -> dict[str, str]:
    return {
        "teacher_keyword": query_args.get("teacher_keyword", "").strip(),
        "semester_id": query_args.get("semester_id", "").strip(),
        "class_id": query_args.get("class_id", "").strip(),
        "status": query_args.get("status", "").strip(),
        "start_date": query_args.get("start_date", "").strip(),
        "end_date": query_args.get("end_date", "").strip(),
    }


def query_sign_in_records(
    connection: sqlite3.Connection,
    filters: dict[str, str],
) -> list[sqlite3.Row]:
    sql = """
        SELECT
            sr.id,
            sr.sign_in_date,
            sr.status,
            sr.remark,
            sr.created_at,
            t.name AS teacher_name,
            t.employee_id AS teacher_employee_id,
            c.name AS class_name,
            s.name AS semester_name,
            lc.title AS content_title
        FROM sign_in_records sr
        LEFT JOIN teachers t ON sr.teacher_id = t.id
        LEFT JOIN classes c ON sr.class_id = c.id
        LEFT JOIN semesters s ON c.semester_id = s.id
        LEFT JOIN learning_contents lc ON sr.content_id = lc.id
        WHERE 1 = 1
    """

    parameters: list[Any] = []

    if filters["teacher_keyword"]:
        sql += " AND (t.name LIKE ? OR t.employee_id LIKE ?)"
        keyword = f"%{filters['teacher_keyword']}%"
        parameters.extend([keyword, keyword])

    if filters["semester_id"]:
        sql += " AND c.semester_id = ?"
        parameters.append(filters["semester_id"])

    if filters["class_id"]:
        sql += " AND sr.class_id = ?"
        parameters.append(filters["class_id"])

    if filters["status"]:
        sql += " AND sr.status = ?"
        parameters.append(filters["status"])

    if filters["start_date"]:
        sql += " AND sr.sign_in_date >= ?"
        parameters.append(filters["start_date"])

    if filters["end_date"]:
        sql += " AND sr.sign_in_date <= ?"
        parameters.append(filters["end_date"])

    sql += " ORDER BY sr.sign_in_date DESC, sr.id DESC LIMIT 1000"
    return connection.execute(sql, parameters).fetchall()


def read_csv_rows(uploaded_file) -> list[dict[str, str]]:
    if uploaded_file is None or not uploaded_file.filename:
        raise ValueError("请先选择 CSV 文件。")

    raw_bytes = uploaded_file.read()
    if not raw_bytes:
        raise ValueError("CSV 文件为空。")

    try:
        csv_text = raw_bytes.decode("utf-8-sig")
    except UnicodeDecodeError as error:
        raise ValueError("CSV 文件编码不是 UTF-8。") from error

    reader = csv.DictReader(io.StringIO(csv_text))
    if not reader.fieldnames:
        raise ValueError("CSV 缺少表头。")

    rows = [{(key or "").strip(): (value or "").strip() for key, value in row.items()} for row in reader]
    return rows


def fetch_semesters(connection: sqlite3.Connection) -> list[sqlite3.Row]:
    return connection.execute("SELECT id, name FROM semesters ORDER BY id DESC").fetchall()


def fetch_classes(connection: sqlite3.Connection) -> list[sqlite3.Row]:
    return connection.execute(
        """
        SELECT c.id, c.name, c.semester_id, s.name AS semester_name
        FROM classes c
        JOIN semesters s ON c.semester_id = s.id
        ORDER BY c.id DESC
        """
    ).fetchall()


@app.route("/")
def home() -> Response:
    return redirect(url_for("admin_dashboard"))


@app.route("/admin", methods=["GET"])
def admin_dashboard() -> str:
    filters = parse_filters(request.args)
    with get_db_connection() as connection:
        sign_in_records = query_sign_in_records(connection, filters)
        semesters = fetch_semesters(connection)
        classes = fetch_classes(connection)

    export_query = urlencode({key: value for key, value in filters.items() if value})
    return render_template(
        "admin.html",
        filters=filters,
        sign_in_records=sign_in_records,
        semesters=semesters,
        classes=classes,
        export_query=export_query,
    )


@app.post("/admin/sign-ins/<int:record_id>/delete")
def delete_sign_in_record(record_id: int) -> Response:
    with get_db_connection() as connection:
        deleted_count = connection.execute(
            "DELETE FROM sign_in_records WHERE id = ?",
            (record_id,),
        ).rowcount
        connection.commit()

    if deleted_count:
        flash("签到记录已删除。", "success")
    else:
        flash("未找到对应签到记录。", "warning")
    return redirect(url_for("admin_dashboard"))


@app.post("/admin/semesters")
def create_semester() -> Response:
    semester_name = request.form.get("semester_name", "").strip()
    if not semester_name:
        flash("学期名称不能为空。", "error")
        return redirect(url_for("admin_dashboard"))

    try:
        with get_db_connection() as connection:
            connection.execute("INSERT INTO semesters (name) VALUES (?)", (semester_name,))
            connection.commit()
        flash(f"学期“{semester_name}”已添加。", "success")
    except sqlite3.IntegrityError:
        flash("学期名称已存在。", "warning")

    return redirect(url_for("admin_dashboard"))


@app.post("/admin/semesters/<int:semester_id>/delete")
def delete_semester(semester_id: int) -> Response:
    with get_db_connection() as connection:
        deleted_count = connection.execute("DELETE FROM semesters WHERE id = ?", (semester_id,)).rowcount
        connection.commit()

    if deleted_count:
        flash("学期已删除（关联班级会一并删除）。", "success")
    else:
        flash("未找到该学期。", "warning")

    return redirect(url_for("admin_dashboard"))


@app.post("/admin/classes")
def create_class() -> Response:
    class_name = request.form.get("class_name", "").strip()
    semester_id = request.form.get("semester_id", "").strip()

    if not class_name or not semester_id:
        flash("班级名称和学期不能为空。", "error")
        return redirect(url_for("admin_dashboard"))

    try:
        with get_db_connection() as connection:
            connection.execute(
                "INSERT INTO classes (name, semester_id) VALUES (?, ?)",
                (class_name, semester_id),
            )
            connection.commit()
        flash(f"班级“{class_name}”已添加。", "success")
    except sqlite3.IntegrityError:
        flash("班级已存在，或学期无效。", "warning")

    return redirect(url_for("admin_dashboard"))


@app.post("/admin/classes/<int:class_id>/delete")
def delete_class(class_id: int) -> Response:
    with get_db_connection() as connection:
        deleted_count = connection.execute("DELETE FROM classes WHERE id = ?", (class_id,)).rowcount
        connection.commit()

    if deleted_count:
        flash("班级已删除。", "success")
    else:
        flash("未找到该班级。", "warning")
    return redirect(url_for("admin_dashboard"))


@app.post("/admin/import/teachers")
def import_teachers() -> Response:
    uploaded_file = request.files.get("teachers_file")

    try:
        rows = read_csv_rows(uploaded_file)
    except ValueError as error:
        flash(str(error), "error")
        return redirect(url_for("admin_dashboard"))

    created_count = 0
    updated_count = 0

    with get_db_connection() as connection:
        for row in rows:
            name = row.get("name", "").strip()
            employee_id = row.get("employee_id", "").strip()
            email = row.get("email", "").strip()

            if not name:
                continue

            if employee_id:
                existing = connection.execute(
                    "SELECT id FROM teachers WHERE employee_id = ?",
                    (employee_id,),
                ).fetchone()
                if existing:
                    connection.execute(
                        "UPDATE teachers SET name = ?, email = ? WHERE id = ?",
                        (name, email or None, existing["id"]),
                    )
                    updated_count += 1
                else:
                    connection.execute(
                        "INSERT INTO teachers (name, employee_id, email) VALUES (?, ?, ?)",
                        (name, employee_id, email or None),
                    )
                    created_count += 1
            else:
                connection.execute(
                    "INSERT INTO teachers (name, employee_id, email) VALUES (?, NULL, ?)",
                    (name, email or None),
                )
                created_count += 1

        connection.commit()

    flash(
        f"教师名单导入完成：新增 {created_count} 条，更新 {updated_count} 条。",
        "success",
    )
    return redirect(url_for("admin_dashboard"))


@app.post("/admin/import/contents")
def import_learning_contents() -> Response:
    uploaded_file = request.files.get("contents_file")

    try:
        rows = read_csv_rows(uploaded_file)
    except ValueError as error:
        flash(str(error), "error")
        return redirect(url_for("admin_dashboard"))

    imported_count = 0
    updated_count = 0
    skipped_count = 0

    with get_db_connection() as connection:
        for row in rows:
            title = row.get("title", "").strip()
            description = row.get("description", "").strip()
            teacher_employee_id = row.get("teacher_employee_id", "").strip()
            teacher_name = row.get("teacher_name", "").strip()

            if not title:
                skipped_count += 1
                continue

            teacher_id = None
            if teacher_employee_id:
                teacher = connection.execute(
                    "SELECT id FROM teachers WHERE employee_id = ?",
                    (teacher_employee_id,),
                ).fetchone()
                teacher_id = teacher["id"] if teacher else None
            elif teacher_name:
                teacher = connection.execute(
                    "SELECT id FROM teachers WHERE name = ? ORDER BY id DESC LIMIT 1",
                    (teacher_name,),
                ).fetchone()
                teacher_id = teacher["id"] if teacher else None

            existing = connection.execute(
                "SELECT id FROM learning_contents WHERE title = ?",
                (title,),
            ).fetchone()
            if existing:
                connection.execute(
                    """
                    UPDATE learning_contents
                    SET description = ?, teacher_id = ?
                    WHERE id = ?
                    """,
                    (description or None, teacher_id, existing["id"]),
                )
                updated_count += 1
            else:
                connection.execute(
                    """
                    INSERT INTO learning_contents (title, description, teacher_id)
                    VALUES (?, ?, ?)
                    """,
                    (title, description or None, teacher_id),
                )
                imported_count += 1

        connection.commit()

    flash(
        f"学习内容导入完成：新增 {imported_count} 条，更新 {updated_count} 条，跳过 {skipped_count} 条。",
        "success",
    )
    return redirect(url_for("admin_dashboard"))


@app.get("/admin/export/sign-ins.csv")
def export_sign_in_records() -> Response:
    filters = parse_filters(request.args)
    with get_db_connection() as connection:
        rows = query_sign_in_records(connection, filters)

    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        [
            "签到日期",
            "教师姓名",
            "教师工号",
            "学期",
            "班级",
            "学习内容",
            "状态",
            "备注",
            "创建时间",
        ]
    )

    for row in rows:
        writer.writerow(
            [
                row["sign_in_date"] or "",
                row["teacher_name"] or "",
                row["teacher_employee_id"] or "",
                row["semester_name"] or "",
                row["class_name"] or "",
                row["content_title"] or "",
                row["status"] or "",
                row["remark"] or "",
                row["created_at"] or "",
            ]
        )

    csv_bytes = output.getvalue().encode("utf-8-sig")
    filename = f"sign_in_records_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"

    return Response(
        csv_bytes,
        content_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


if __name__ == "__main__":
    init_db()
    app.run(host="0.0.0.0", port=5000, debug=True)
