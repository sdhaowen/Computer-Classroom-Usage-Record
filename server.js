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

const CLASS_OPTIONS = [
  "三年级一班",
  "三年级二班",
  "四年级一班",
  "四年级二班",
  "五年级一班",
  "五年级二班",
];

const MACHINE_OPTIONS = ["正常", "不正常"];

const DEFAULT_SEMESTER = "2025-2026第一学期";
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
  const seen = Object.create(null);
  const result = [];
  for (let i = 0; i < list.length; i += 1) {
    const value = String(list[i] || "").trim();
    if (!value || seen[value]) {
      continue;
    }
    seen[value] = true;
    result.push(value);
  }
  return result;
}

function getDefaultDB() {
  return {
    metadata: {
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    },
    semesters: [DEFAULT_SEMESTER],
    teachers: DEFAULT_TEACHERS.slice(),
    contentsBySemester: {
      [DEFAULT_SEMESTER]: DEFAULT_CONTENTS.slice(),
    },
    records: [],
  };
}

function normalizeDB(raw) {
  const db = raw && typeof raw === "object" ? raw : {};
  const semesters = Array.isArray(db.semesters) ? db.semesters : [DEFAULT_SEMESTER];
  const teachers = Array.isArray(db.teachers) ? db.teachers : DEFAULT_TEACHERS.slice();
  const contentsBySemester =
    db.contentsBySemester && typeof db.contentsBySemester === "object"
      ? db.contentsBySemester
      : {};
  const records = Array.isArray(db.records) ? db.records : [];

  if (!contentsBySemester[DEFAULT_SEMESTER]) {
    contentsBySemester[DEFAULT_SEMESTER] = DEFAULT_CONTENTS.slice();
  }

  return {
    metadata: {
      createdAt:
        db.metadata && db.metadata.createdAt
          ? String(db.metadata.createdAt)
          : new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    },
    semesters: uniqueTrimmedList(semesters.concat(Object.keys(contentsBySemester))),
    teachers: uniqueTrimmedList(teachers),
    contentsBySemester: contentsBySemester,
    records: records,
  };
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

function writeDB(db) {
  ensureDir(DATA_DIR);
  const payload = JSON.stringify(db, null, 2);
  const tempPath = DB_PATH + ".tmp";
  fs.writeFileSync(tempPath, payload, "utf8");
  fs.renameSync(tempPath, DB_PATH);
}

const db = loadDB();

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
  });
  res.end(text);
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

function serveStatic(req, res, pathname) {
  let filePath = pathname === "/" ? "index.html" : String(pathname || "").replace(/^\/+/, "");
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
  const record = {
    semester: String(payload.semester || "").trim(),
    week: Number(payload.week),
    className: String(payload.className || "").trim(),
    studentName: String(payload.studentName || "").trim(),
    content: String(payload.content || "").trim(),
    machineStatus: String(payload.machineStatus || "").trim(),
    teacher: String(payload.teacher || "").trim(),
  };

  if (!record.semester) return "学期不能为空";
  if (record.week < 1 || record.week > 30 || Number.isNaN(record.week)) return "周次必须在1-30";
  if (CLASS_OPTIONS.indexOf(record.className) === -1) return "班级不在可选范围";
  if (!record.studentName) return "学生姓名不能为空";
  if (record.studentName.length > 30) return "学生姓名过长";
  if (!record.content) return "学习内容不能为空";
  if (MACHINE_OPTIONS.indexOf(record.machineStatus) === -1) return "机器情况不在可选范围";
  if (!record.teacher) return "授课教师不能为空";
  return record;
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
  if (!lines.length) return [];

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
    if (indexMap[requiredKeys[i]] === -1) {
      throw new Error("CSV表头缺少字段: " + requiredKeys[i]);
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

function buildConfig() {
  const weekOptions = [];
  for (let i = 1; i <= 30; i += 1) {
    weekOptions.push(i);
  }

  return {
    semesterOptions: db.semesters,
    weekOptions: weekOptions,
    classOptions: CLASS_OPTIONS,
    machineOptions: MACHINE_OPTIONS,
    teacherOptions: db.teachers,
    contentsBySemester: db.contentsBySemester,
  };
}

function saveDB() {
  db.metadata.updatedAt = new Date().toISOString();
  writeDB(db);
}

function listRecords(query) {
  const semester = String(query.semester || "").trim();
  const week = String(query.week || "").trim();
  const className = String(query.className || "").trim();
  const studentName = String(query.studentName || "").trim();

  const filtered = db.records.filter(function filterRecord(item) {
    if (semester && item.semester !== semester) return false;
    if (week && String(item.week) !== week) return false;
    if (className && item.className !== className) return false;
    if (studentName && item.studentName.indexOf(studentName) === -1) return false;
    return true;
  });

  filtered.sort(function sortByDate(a, b) {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });
  return filtered.slice(0, 300);
}

function normalizeAndInsertRecords(recordsInput) {
  const imported = Array.isArray(recordsInput) ? recordsInput : [];
  const inserted = [];
  for (let i = 0; i < imported.length; i += 1) {
    const sanitized = sanitizeRecord(imported[i]);
    if (typeof sanitized === "string") {
      continue;
    }
    const now = new Date().toISOString();
    const record = {
      id: "rec_" + Date.now() + "_" + i + "_" + Math.floor(Math.random() * 10000),
      semester: sanitized.semester,
      week: sanitized.week,
      className: sanitized.className,
      studentName: sanitized.studentName,
      content: sanitized.content,
      machineStatus: sanitized.machineStatus,
      teacher: sanitized.teacher,
      createdAt: now,
      updatedAt: now,
    };
    addSemesterIfMissing(sanitized.semester);
    if (db.teachers.indexOf(sanitized.teacher) === -1) {
      db.teachers.push(sanitized.teacher);
    }
    if (!db.contentsBySemester[sanitized.semester]) {
      db.contentsBySemester[sanitized.semester] = [];
    }
    if (db.contentsBySemester[sanitized.semester].indexOf(sanitized.content) === -1) {
      db.contentsBySemester[sanitized.semester].push(sanitized.content);
    }
    inserted.push(record);
  }

  db.records = db.records.concat(inserted);
  return inserted.length;
}

function addSemesterIfMissing(semester) {
  if (db.semesters.indexOf(semester) === -1) {
    db.semesters.push(semester);
  }
}

async function handleAPI(req, res, pathname, query) {
  if (req.method === "GET" && pathname === "/api/config") {
    sendJSON(res, 200, {
      ok: true,
      data: buildConfig(),
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/records") {
    sendJSON(res, 200, {
      ok: true,
      data: listRecords(query),
    });
    return;
  }

  if (req.method === "GET" && pathname === "/api/export") {
    sendJSON(res, 200, {
      ok: true,
      data: db,
    });
    return;
  }

  if (req.method === "POST" && pathname === "/api/records") {
    const payload = await readBody(req);
    const sanitized = sanitizeRecord(payload);
    if (typeof sanitized === "string") {
      sendJSON(res, 400, { ok: false, message: sanitized });
      return;
    }
    addSemesterIfMissing(sanitized.semester);
    if (!db.contentsBySemester[sanitized.semester]) {
      db.contentsBySemester[sanitized.semester] = [sanitized.content];
    }
    if (db.contentsBySemester[sanitized.semester].indexOf(sanitized.content) === -1) {
      db.contentsBySemester[sanitized.semester].push(sanitized.content);
    }
    if (db.teachers.indexOf(sanitized.teacher) === -1) {
      db.teachers.push(sanitized.teacher);
    }
    const now = new Date().toISOString();
    db.records.push({
      id: "rec_" + Date.now() + "_" + Math.floor(Math.random() * 100000),
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
    sendJSON(res, 200, { ok: true, message: "教师名单导入成功", count: names.length });
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
    addSemesterIfMissing(semester);
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

    if (mode === "replace") {
      db.records = [];
    }
    const insertedCount = normalizeAndInsertRecords(records);
    saveDB();
    sendJSON(res, 200, {
      ok: true,
      message: "签到记录导入完成",
      insertedCount: insertedCount,
      mode: mode,
    });
    return;
  }

  sendJSON(res, 404, { ok: false, message: "接口不存在" });
}

function getLocalIPv4List() {
  const networkInterfaces = os.networkInterfaces();
  const ips = [];
  Object.keys(networkInterfaces).forEach(function eachInterface(name) {
    const infos = networkInterfaces[name];
    if (!Array.isArray(infos)) return;
    infos.forEach(function eachInfo(info) {
      if (info && info.family === "IPv4" && !info.internal) {
        ips.push(info.address);
      }
    });
  });
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
    serveStatic(req, res, pathname);
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
  console.log("马桥镇陈庄小学计算机教室学生签到系统 已启动");
  console.log("本机访问: http://127.0.0.1:" + PORT);
  for (let i = 0; i < ips.length; i += 1) {
    console.log("局域网访问: http://" + ips[i] + ":" + PORT);
  }
  console.log("数据文件: " + DB_PATH);
  console.log("======================================");
});
