# Computer-Classroom-Usage-Record

一个基于 Flask + SQLite 的机房使用记录管理后台示例，支持：

- 查看、筛选、删除签到记录
- 导入教师名单和学习内容（CSV）
- 导出签到记录为 CSV（UTF-8 BOM，Excel 可直接打开）
- 增加/删除学期、班级

## 1. 启动方式

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python app.py
```

启动后访问：`http://127.0.0.1:5000/admin`

## 2. 数据存储

- 默认使用 SQLite，数据库文件：`data/admin.db`
- 首次运行会自动建表

## 3. CSV 导入格式

### 3.1 教师名单导入

上传 CSV 表头：

```text
name,employee_id,email
```

说明：
- `name` 必填
- `employee_id` 可选；如存在相同工号会执行更新
- `email` 可选

### 3.2 学习内容导入

上传 CSV 表头：

```text
title,description,teacher_employee_id,teacher_name
```

说明：
- `title` 必填
- `description` 可选
- 可通过 `teacher_employee_id` 或 `teacher_name` 关联教师（两者都可空）

## 4. 签到记录导出

- 在管理后台可按当前筛选条件导出
- 导出文件使用 `utf-8-sig` 编码，确保 Excel 打开中文不乱码
