const http = require("http");
const fs = require("fs");
const path = require("path");
const os = require("os");
const url = require("url");

const HOST = "0.0.0.0";
const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const PUBLIC_DIR = path.join(__dirname, "public");
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "db.json");

const MACHINE_OPTIONS = ["正常", "不正常"];
const DEFAULT_SEMESTER = "2025-2026第一学期";
const DEFAULT_CLASS_OPTIONS = [
  "三年级一班",
  "三年级二班",
  "四年级一班",
  "四年级二班",
  "五年级一班",
  "五年级二班",
];
const DEFAULT_TEACHERS = ["王老师", "李老师"];
const DEFAULT_CONTENTS = [
  "第1周：机房规则与计算机基础认知",
  "第2周：正确开关机与鼠标基础练习",
  "第3周：键盘指法与英文输入练习",
  "第4周：中文输入法使用与短句录入",
  "第5周：文件与文件夹的创建、重命名",
  "第6周：复制、粘贴、删除与回收站",
  "第7周：画图工具入门：线条与颜色",
  "第8周：画图工具进阶：图形组合",
  "第9周：Word基础：输入与保存文档",
  "第10周：Word排版：字体、段落与对齐",
  "第11周：Word插入图片与简单表格",
  "第12周：PPT基础：新建与版式",
  "第13周：PPT编辑：插入图片与文本框",
  "第14周：PPT动画与页面切换",
  "第15周：浏览器基础与安全上网常识",
  "第16周：搜索引擎使用与信息筛选",
  "第17周：Scratch入门：角色与舞台",
  "第18周：Scratch脚本积木基础",
  "第19周：Scratch动画小作品制作",
  "第20周：Scratch互动小游戏制作",
  "第21周：算法思维：顺序与循环",
  "第22周：算法思维：条件判断",
  "第23周：数据与变量初步",
  "第24周：信息技术道德与网络文明",
  "第25周：综合实践：电子贺卡设计",
  "第26周：综合实践：班级展示PPT制作",
  "第27周：综合实践：信息检索与整理",
  "第28周：项目完善与同伴互评",
  "第29周：作品展示与口头讲解",
  "第30周：学期复习与技能测评",
];

function ensureDir(targetDir) {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
}

function uniqueTrimmedList(list) {
  const items = Array.isArray(list) ? list : [];
  const seen = Object.create(null);
  const result = [];
  for (let i = 0; i < items.length; i += 1) {
    const value = String(items[i] || "").trim();
    if (!value || seen[value]) {
      continue;
    }
    seen[value] = true;
    result.push(value);
  }
  return result;
}

function buildWeekOptions() {
  const weeks = [];
  for (let i = 1; i <= 30; i += 1) {
    weeks.push(i);
  }
  return weeks;
}

function ensureSemester(semester) {
  const normalized = String(semester || "").trim();
  if (!normalized) {
    return;
  }
  if (db.semesters.indexOf(normalized) === -1) {
    db.semesters.push(normalized);
  }
}

function ensureClass(className) {
  const normalized = String(className || "").trim();
  if (!normalized) {
    return;
  }
  if (db.classOptions.indexOf(normalized) === -1) {
    db.classOptions.push(normalized);
  }
}

function ensureTeacher(teacher) {
  const normalized = String(teacher || "").trim();
  if (!normalized) {
    return;
  }
  if (db.teachers.indexOf(normalized) === -1) {
    db.teachers.push(normalized);
  }
}

function ensureContent(semester, content) {
  const semesterName = String(semester || "").trim();
  const contentName = String(content || "").trim();
  if (!semesterName || !contentName) {
    return;
  }
  if (!db.contentsBySemester[semesterName]) {
    db.contentsBySemester[semesterName] = [];
  }
  if (db.contentsBySemester[semesterName].indexOf(contentName) === -1) {
    db.contentsBySemester[semesterName].push(contentName);
  }
}

function generateRecordId(seed) {
  const random = Math.floor(Math.random() * 100000);
  return "rec_" + Date.now() + "_" + seed + "_" + random;
}

function normalizeDateString(value) {
  const raw = String(value || "").trim();
  if (!raw) {
    return "";
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  const time = new Date(raw).getTime();
  if (Number.isNaN(time)) {
    return "";
  }
  return new Date(time).toISOString().slice(0, 10);
}

function normalizeStoredRecord(input, index) {
  const now = new Date().toISOString();
  const semester = String(input && input.semester ? input.semester : DEFAULT_SEMESTER).trim();
  const week = Number(input && input.week);
  const className = String(input && input.className ? input.className : "").trim();
  const studentName = String(input && input.studentName ? input.studentName : "").trim();
  const content = String(input && input.content ? input.content : "").trim();
  const machineStatus = String(input && input.machineStatus ? input.machineStatus : MACHINE_OPTIONS[0]).trim();
  const teacher = String(input && input.teacher ? input.teacher : "").trim();
  const createdAt = String(input && input.createdAt ? input.createdAt : now).trim();
  const updatedAt = String(input && input.updatedAt ? input.updatedAt : createdAt).trim();
  return {
    id: String(input && input.id ? input.id : generateRecordId(index)).trim(),
    semester: semester || DEFAULT_SEMESTER,
    week: Number.isNaN(week) || week < 1 || week > 30 ? 1 : week,
    className: className || DEFAULT_CLASS_OPTIONS[0],
    studentName: studentName,
    content: content || DEFAULT_CONTENTS[0],
    machineStatus: MACHINE_OPTIONS.indexOf(machineStatus) === -1 ? MACHINE_OPTIONS[0] : machineStatus,
    teacher: teacher || DEFAULT_TEACHERS[0],
    createdAt: createdAt || now,
    updatedAt: updatedAt || createdAt || now,
  };
}

function getDefaultDB() {
  return {
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 2,
    },
    semesters: [DEFAULT_SEMESTER],
    classOptions: DEFAULT_CLASS_OPTIONS.slice(),
    teachers: DEFAULT_TEACHERS.slice(),
    contentsBySemester: {
      [DEFAULT_SEMESTER]: DEFAULT_CONTENTS.slice(),
    },
    records: [],
  };
}

function normalizeDB(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const semesters = uniqueTrimmedList(source.semesters);
  const classOptions = uniqueTrimmedList(source.classOptions || DEFAULT_CLASS_OPTIONS);
  const teachers = uniqueTrimmedList(source.teachers || DEFAULT_TEACHERS);
  const rawContents =
    source.contentsBySemester && typeof source.contentsBySemester === "object"
      ? source.contentsBySemester
      : {};
  const recordsInput = Array.isArray(source.records) ? source.records : [];
  const contentsBySemester = {};

  const contentKeys = Object.keys(rawContents);
  for (let i = 0; i < contentKeys.length; i += 1) {
    const key = String(contentKeys[i] || "").trim();
    if (!key) {
      continue;
    }
    contentsBySemester[key] = uniqueTrimmedList(rawContents[key]);
  }

  if (semesters.indexOf(DEFAULT_SEMESTER) === -1) {
    semesters.unshift(DEFAULT_SEMESTER);
  }
  if (!contentsBySemester[DEFAULT_SEMESTER] || !contentsBySemester[DEFAULT_SEMESTER].length) {
    contentsBySemester[DEFAULT_SEMESTER] = DEFAULT_CONTENTS.slice();
  }

  const recordList = [];
  for (let j = 0; j < recordsInput.length; j += 1) {
    const item = normalizeStoredRecord(recordsInput[j], j);
    recordList.push(item);
    if (semesters.indexOf(item.semester) === -1) {
      semesters.push(item.semester);
    }
    if (classOptions.indexOf(item.className) === -1) {
      classOptions.push(item.className);
    }
    if (teachers.indexOf(item.teacher) === -1) {
      teachers.push(item.teacher);
    }
    if (!contentsBySemester[item.semester]) {
      contentsBySemester[item.semester] = [];
    }
    if (contentsBySemester[item.semester].indexOf(item.content) === -1) {
      contentsBySemester[item.semester].push(item.content);
    }
  }

  const createdAt =
    source.metadata && source.metadata.createdAt
      ? String(source.metadata.createdAt)
      : new Date().toISOString();

  return {
    metadata: {
      createdAt: createdAt,
      updatedAt: new Date().toISOString(),
      version: 2,
    },
    semesters: uniqueTrimmedList(semesters),
    classOptions: uniqueTrimmedList(classOptions),
    teachers: uniqueTrimmedList(teachers),
    contentsBySemester: contentsBySemester,
    records: recordList,
  };
}

function writeDB(payload) {
  ensureDir(DATA_DIR);
  const text = JSON.stringify(payload, null, 2);
  const tempPath = DB_PATH + ".tmp";
  fs.writeFileSync(tempPath, text, "utf8");
  fs.renameSync(tempPath, DB_PATH);
}

function loadDB() {
  ensureDir(DATA_DIR);
  if (!fs.existsSync(DB_PATH)) {
    const initial = getDefaultDB();
    writeDB(initial);
    return initial;
  }
  const raw = fs.readFileSync(DB_PATH, "utf8");
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    parsed = getDefaultDB();
  }
  const normalized = normalizeDB(parsed);
  writeDB(normalized);
  return normalized;
}

const db = loadDB();

function saveDB() {
  db.metadata.updatedAt = new Date().toISOString();
  writeDB(db);
}

function sendJSON(res, statusCode, data) {
  const payload = JSON.stringify(data);
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(payload),
    "Cache-Control": "no-store",
  });
  res.end(payload);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, {
    "Content-Type": "text/plain; charset=utf-8",
    "Cache-Control": "no-store",
  });
  res.end(text);
}

function sendBuffer(res, statusCode, data, headers) {
  const extraHeaders = headers || {};
  const merged = {
    "Content-Length": data.length,
    "Cache-Control": "no-store",
  };
  const keys = Object.keys(extraHeaders);
  for (let i = 0; i < keys.length; i += 1) {
    merged[keys[i]] = extraHeaders[keys[i]];
  }
  res.writeHead(statusCode, merged);
  res.end(data);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".html") return "text/html; charset=utf-8";
  if (ext === ".css") return "text/css; charset=utf-8";
  if (ext === ".js") return "application/javascript; charset=utf-8";
  if (ext === ".json") return "application/json; charset=utf-8";
  if (ext === ".png") return "image/png";
  if (ext === ".jpg" || ext === ".jpeg") return "image/jpeg";
  if (ext === ".svg") return "image/svg+xml";
  return "application/octet-stream";
}

function serveStatic(res, pathname) {
  const routeMap = {
    "/": "index.html",
    "/admin": "admin.html",
  };
  let filePath = routeMap[pathname] || String(pathname || "").replace(/^\/+/, "");
  filePath = path.normalize(filePath);
  if (!filePath || filePath === "." || filePath.indexOf("..") === 0 || path.isAbsolute(filePath)) {
    sendText(res, 403, "Forbidden");
    return;
  }

  const absolutePath = path.join(PUBLIC_DIR, filePath);
  fs.readFile(absolutePath, function onRead(error, content) {
    if (error) {
      sendText(res, 404, "Not Found");
      return;
    }
    res.writeHead(200, {
      "Content-Type": getMimeType(absolutePath),
      "Cache-Control": "no-cache",
    });
    res.end(content);
  });
}

function readBody(req) {
  return new Promise(function executor(resolve, reject) {
    const chunks = [];
    let totalSize = 0;
    req.on("data", function onData(chunk) {
      chunks.push(chunk);
      totalSize += chunk.length;
      if (totalSize > 2 * 1024 * 1024) {
        req.destroy();
        reject(new Error("请求体过大"));
      }
    });
    req.on("end", function onEnd() {
      const raw = Buffer.concat(chunks).toString("utf8");
      if (!raw) {
        resolve({});
        return;
      }
      try {
        resolve(JSON.parse(raw));
      } catch (error) {
        reject(new Error("请求体不是合法JSON"));
      }
    });
    req.on("error", function onError(error) {
      reject(error);
    });
  });
}

function sanitizeRecord(payload) {
  const semester = String(payload.semester || "").trim();
  const week = Number(payload.week);
  const className = String(payload.className || "").trim();
  const studentName = String(payload.studentName || "").trim();
  const content = String(payload.content || "").trim();
  const machineStatus = String(payload.machineStatus || "").trim();
  const teacher = String(payload.teacher || "").trim();

  if (!semester) return "学期不能为空";
  if (Number.isNaN(week) || week < 1 || week > 30) return "周次必须在 1-30";
  if (!className || db.classOptions.indexOf(className) === -1) return "班级不在可选范围";
  if (!studentName) return "学生姓名不能为空";
  if (studentName.length > 30) return "学生姓名不能超过 30 个字符";
  if (!content) return "学习内容不能为空";
  if (MACHINE_OPTIONS.indexOf(machineStatus) === -1) return "机器情况不在可选范围";
  if (!teacher) return "授课教师不能为空";

  return {
    semester: semester,
    week: week,
    className: className,
    studentName: studentName,
    content: content,
    machineStatus: machineStatus,
    teacher: teacher,
  };
}

function applyRecordSideEffects(record) {
  ensureSemester(record.semester);
  ensureClass(record.className);
  ensureTeacher(record.teacher);
  ensureContent(record.semester, record.content);
}

function toRecordView(item) {
  return {
    id: item.id,
    semester: item.semester,
    week: item.week,
    className: item.className,
    studentName: item.studentName,
    content: item.content,
    machineStatus: item.machineStatus,
    teacher: item.teacher,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
    dateOnly: String(item.createdAt || "").slice(0, 10),
  };
}

function sortRecordsByCreatedDesc(records) {
  records.sort(function sortByTime(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
}

function filterRecords(query) {
  const semester = String(query.semester || "").trim();
  const week = String(query.week || "").trim();
  const className = String(query.className || "").trim();
  const studentName = String(query.studentName || "").trim();
  const teacher = String(query.teacher || "").trim();
  const machineStatus = String(query.machineStatus || "").trim();
  const startDate = normalizeDateString(query.startDate);
  const endDate = normalizeDateString(query.endDate);

  return db.records.filter(function match(item) {
    if (semester && item.semester !== semester) return false;
    if (week && String(item.week) !== week) return false;
    if (className && item.className !== className) return false;
    if (studentName && item.studentName.indexOf(studentName) === -1) return false;
    if (teacher && item.teacher.indexOf(teacher) === -1) return false;
    if (machineStatus && item.machineStatus !== machineStatus) return false;
    const dateOnly = String(item.createdAt || "").slice(0, 10);
    if (startDate && dateOnly < startDate) return false;
    if (endDate && dateOnly > endDate) return false;
    return true;
  });
}

function listRecords(query, maxCount) {
  const limited = typeof maxCount === "number" ? maxCount : 300;
  const filtered = filterRecords(query || {}).map(toRecordView);
  sortRecordsByCreatedDesc(filtered);
  return filtered.slice(0, limited);
}

function parseCsvLine(line) {
  const values = [];
  let current = "";
  let inQuotes = false;
  let i = 0;
  while (i < line.length) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
      i += 1;
      continue;
    }
    if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
      i += 1;
      continue;
    }
    current += char;
    i += 1;
  }
  values.push(current.trim());
  return values;
}

function parseRecordsFromCSV(csvText) {
  const lines = String(csvText || "")
    .split(/\r?\n/)
    .map(function trimLine(line) {
      return line.trim();
    })
    .filter(Boolean);

  if (!lines.length) {
    return [];
  }

  const headers = parseCsvLine(lines[0]);
  const indexMap = {
    semester: headers.indexOf("学期"),
    week: headers.indexOf("周次"),
    className: headers.indexOf("班级"),
    studentName: headers.indexOf("学生姓名"),
    content: headers.indexOf("学习内容"),
    machineStatus: headers.indexOf("机器情况"),
    teacher: headers.indexOf("授课教师"),
  };

  const requiredKeys = Object.keys(indexMap);
  for (let i = 0; i < requiredKeys.length; i += 1) {
    const key = requiredKeys[i];
    if (indexMap[key] === -1) {
      throw new Error("CSV 表头缺少字段：" + key);
    }
  }

  const records = [];
  for (let row = 1; row < lines.length; row += 1) {
    const columns = parseCsvLine(lines[row]);
    records.push({
      semester: columns[indexMap.semester],
      week: columns[indexMap.week],
      className: columns[indexMap.className],
      studentName: columns[indexMap.studentName],
      content: columns[indexMap.content],
      machineStatus: columns[indexMap.machineStatus],
      teacher: columns[indexMap.teacher],
    });
  }
  return records;
}

function importRecords(recordsInput, mode) {
  const imported = Array.isArray(recordsInput) ? recordsInput : [];
  if (mode === "replace") {
    db.records = [];
  }

  let insertedCount = 0;
  for (let i = 0; i < imported.length; i += 1) {
    const sanitized = sanitizeRecord(imported[i]);
    if (typeof sanitized === "string") {
      continue;
    }
    applyRecordSideEffects(sanitized);
    const now = new Date().toISOString();
    db.records.push({
      id: generateRecordId(i),
      semester: sanitized.semester,
      week: sanitized.week,
      className: sanitized.className,
      studentName: sanitized.studentName,
      content: sanitized.content,
      machineStatus: sanitized.machineStatus,
      teacher: sanitized.teacher,
      createdAt: now,
      updatedAt: now,
    });
    insertedCount += 1;
  }
  return insertedCount;
}

function buildConfig() {
  return {
    semesterOptions: db.semesters,
    weekOptions: buildWeekOptions(),
    classOptions: db.classOptions,
    machineOptions: MACHINE_OPTIONS,
    teacherOptions: db.teachers,
    contentsBySemester: db.contentsBySemester,
  };
}

function buildAdminConfig() {
  return {
    semesterOptions: db.semesters,
    weekOptions: buildWeekOptions(),
    classOptions: db.classOptions,
    machineOptions: MACHINE_OPTIONS,
    teacherOptions: db.teachers,
    contentsBySemester: db.contentsBySemester,
    summary: {
      recordCount: db.records.length,
      semesterCount: db.semesters.length,
      classCount: db.classOptions.length,
      teacherCount: db.teachers.length,
    },
  };
}

function toCsvCell(value) {
  const text = String(value == null ? "" : value);
  if (/[,"\n]/.test(text)) {
    return '"' + text.replace(/"/g, '""') + '"';
  }
  return text;
}

function encodeRecordsToCsv(records) {
  const headers = ["学期", "周次", "班级", "学生姓名", "学习内容", "机器情况", "授课教师", "签到时间"];
  const lines = [headers.join(",")];
  for (let i = 0; i < records.length; i += 1) {
    const row = records[i];
    lines.push(
      [
        row.semester,
        row.week,
        row.className,
        row.studentName,
        row.content,
        row.machineStatus,
        row.teacher,
        row.createdAt,
      ]
        .map(toCsvCell)
        .join(",")
    );
  }
  const csvText = "\ufeff" + lines.join("\n");
  return Buffer.from(csvText, "utf8");
}

function getLastPathSegment(pathname) {
  const parts = String(pathname || "")
    .split("/")
    .filter(Boolean);
  if (!parts.length) {
    return "";
  }
  return decodeURIComponent(parts[parts.length - 1]);
}

async function handleAPI(req, res, pathname, query) {
  if (req.method === "GET" && pathname === "/api/config") {
    sendJSON(res, 200, { ok: true, data: buildConfig() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/records") {
    sendJSON(res, 200, { ok: true, data: listRecords(query, 300) });
    return;
  }

  if (req.method === "POST" && pathname === "/api/records") {
    const payload = await readBody(req);
    const sanitized = sanitizeRecord(payload);
    if (typeof sanitized === "string") {
      sendJSON(res, 400, { ok: false, message: sanitized });
      return;
    }
    applyRecordSideEffects(sanitized);
    const now = new Date().toISOString();
    db.records.push({
      id: generateRecordId(0),
      semester: sanitized.semester,
      week: sanitized.week,
      className: sanitized.className,
      studentName: sanitized.studentName,
      content: sanitized.content,
      machineStatus: sanitized.machineStatus,
      teacher: sanitized.teacher,
      createdAt: now,
      updatedAt: now,
    });
    saveDB();
    sendJSON(res, 200, { ok: true, message: "签到成功" });
    return;
  }

  if (req.method === "POST" && pathname === "/api/import/teachers") {
    const payload = await readBody(req);
    const names = uniqueTrimmedList(Array.isArray(payload.names) ? payload.names : []);
    if (!names.length) {
      sendJSON(res, 400, { ok: false, message: "教师名单不能为空" });
      return;
    }
    db.teachers = names;
    saveDB();
    sendJSON(res, 200, {
      ok: true,
      message: "教师名单导入成功",
      count: names.length,
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/import/contents") {
    const payload = await readBody(req);
    const semester = String(payload.semester || "").trim();
    const contents = uniqueTrimmedList(Array.isArray(payload.contents) ? payload.contents : []);
    if (!semester) {
      sendJSON(res, 400, { ok: false, message: "学期不能为空" });
      return;
    }
    if (!contents.length) {
      sendJSON(res, 400, { ok: false, message: "学习内容不能为空" });
      return;
    }
    ensureSemester(semester);
    db.contentsBySemester[semester] = contents;
    saveDB();
    sendJSON(res, 200, {
      ok: true,
      message: "教学内容导入成功",
      semester: semester,
      count: contents.length,
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/import/records") {
    const payload = await readBody(req);
    const mode = payload.mode === "replace" ? "replace" : "append";
    let records = [];
    if (Array.isArray(payload.records)) {
      records = payload.records;
    } else if (payload.csvText) {
      records = parseRecordsFromCSV(payload.csvText);
    } else {
      sendJSON(res, 400, { ok: false, message: "请提供 records 数组或 csvText" });
      return;
    }
    const insertedCount = importRecords(records, mode);
    saveDB();
    sendJSON(res, 200, {
      ok: true,
      message: "签到记录导入完成",
      insertedCount: insertedCount,
      mode: mode,
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/export") {
    sendJSON(res, 200, { ok: true, data: db });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/config") {
    sendJSON(res, 200, { ok: true, data: buildAdminConfig() });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/records") {
    sendJSON(res, 200, { ok: true, data: listRecords(query, 1000) });
    return;
  }

  if (req.method === "GET" && pathname === "/api/admin/export/records.csv") {
    const records = listRecords(query, 10000);
    const csvBuffer = encodeRecordsToCsv(records);
    sendBuffer(res, 200, csvBuffer, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition":
        'attachment; filename="sign_in_records_' +
        new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-") +
        '.csv"',
    });
    return;
  }

  if (req.method === "DELETE" && pathname.indexOf("/api/admin/records/") === 0) {
    const recordId = getLastPathSegment(pathname);
    const before = db.records.length;
    db.records = db.records.filter(function keep(item) {
      return item.id !== recordId;
    });
    if (db.records.length === before) {
      sendJSON(res, 404, { ok: false, message: "未找到记录" });
      return;
    }
    saveDB();
    sendJSON(res, 200, { ok: true, message: "记录已删除" });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/semesters") {
    const payload = await readBody(req);
    const semester = String(payload.name || "").trim();
    if (!semester) {
      sendJSON(res, 400, { ok: false, message: "学期名称不能为空" });
      return;
    }
    if (db.semesters.indexOf(semester) !== -1) {
      sendJSON(res, 400, { ok: false, message: "学期已存在" });
      return;
    }
    db.semesters.push(semester);
    db.contentsBySemester[semester] = db.contentsBySemester[semester] || [];
    saveDB();
    sendJSON(res, 200, { ok: true, message: "学期已新增" });
    return;
  }

  if (req.method === "DELETE" && pathname === "/api/admin/semesters") {
    const payload = await readBody(req);
    const semester = String(payload.name || "").trim();
    if (!semester) {
      sendJSON(res, 400, { ok: false, message: "学期名称不能为空" });
      return;
    }
    if (semester === DEFAULT_SEMESTER) {
      sendJSON(res, 400, { ok: false, message: "默认学期不能删除" });
      return;
    }
    const before = db.semesters.length;
    db.semesters = db.semesters.filter(function keep(item) {
      return item !== semester;
    });
    if (db.semesters.length === before) {
      sendJSON(res, 404, { ok: false, message: "学期不存在" });
      return;
    }
    delete db.contentsBySemester[semester];
    saveDB();
    sendJSON(res, 200, { ok: true, message: "学期已删除" });
    return;
  }

  if (req.method === "POST" && pathname === "/api/admin/classes") {
    const payload = await readBody(req);
    const className = String(payload.name || "").trim();
    if (!className) {
      sendJSON(res, 400, { ok: false, message: "班级名称不能为空" });
      return;
    }
    if (db.classOptions.indexOf(className) !== -1) {
      sendJSON(res, 400, { ok: false, message: "班级已存在" });
      return;
    }
    db.classOptions.push(className);
    saveDB();
    sendJSON(res, 200, { ok: true, message: "班级已新增" });
    return;
  }

  if (req.method === "DELETE" && pathname === "/api/admin/classes") {
    const payload = await readBody(req);
    const className = String(payload.name || "").trim();
    if (!className) {
      sendJSON(res, 400, { ok: false, message: "班级名称不能为空" });
      return;
    }
    if (db.classOptions.length <= 1) {
      sendJSON(res, 400, { ok: false, message: "至少保留一个班级" });
      return;
    }
    const before = db.classOptions.length;
    db.classOptions = db.classOptions.filter(function keep(item) {
      return item !== className;
    });
    if (db.classOptions.length === before) {
      sendJSON(res, 404, { ok: false, message: "班级不存在" });
      return;
    }
    saveDB();
    sendJSON(res, 200, { ok: true, message: "班级已删除" });
    return;
  }

  sendJSON(res, 404, { ok: false, message: "接口不存在" });
}

function getLocalIPv4List() {
  const interfaces = os.networkInterfaces();
  const ips = [];
  const names = Object.keys(interfaces);
  for (let i = 0; i < names.length; i += 1) {
    const details = interfaces[names[i]];
    if (!Array.isArray(details)) {
      continue;
    }
    for (let j = 0; j < details.length; j += 1) {
      const info = details[j];
      if (info && info.family === "IPv4" && !info.internal) {
        ips.push(info.address);
      }
    }
  }
  return ips;
}

const server = http.createServer(async function onRequest(req, res) {
  try {
    const parsed = url.parse(req.url, true);
    const pathname = parsed.pathname || "/";
    if (pathname.indexOf("/api/") === 0) {
      await handleAPI(req, res, pathname, parsed.query || {});
      return;
    }
    serveStatic(res, pathname);
  } catch (error) {
    sendJSON(res, 500, {
      ok: false,
      message: error && error.message ? error.message : "服务器异常",
    });
  }
});

server.listen(PORT, HOST, function onReady() {
  const ips = getLocalIPv4List();
  console.log("======================================");
  console.log("计算机教室签到与后台管理系统 已启动");
  console.log("学生签到页面: http://127.0.0.1:" + PORT);
  console.log("后台管理页面: http://127.0.0.1:" + PORT + "/admin");
  for (let i = 0; i < ips.length; i += 1) {
    console.log("局域网访问: http://" + ips[i] + ":" + PORT);
  }
  console.log("数据文件: " + DB_PATH);
  console.log("======================================");
});
