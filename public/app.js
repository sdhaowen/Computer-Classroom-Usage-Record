function byId(id) {
  return document.getElementById(id);
}

function fillSelect(select, items, includeEmpty) {
  const currentValue = select.value;
  select.innerHTML = "";
  if (includeEmpty) {
    const emptyOption = document.createElement("option");
    emptyOption.value = "";
    emptyOption.textContent = "全部";
    select.appendChild(emptyOption);
  }
  items.forEach(function append(item) {
    const option = document.createElement("option");
    option.value = String(item);
    option.textContent = String(item);
    select.appendChild(option);
  });
  const canRestore = Array.prototype.some.call(select.options, function has(opt) {
    return opt.value === currentValue;
  });
  if (canRestore) {
    select.value = currentValue;
  }
}

function readLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(function trim(v) {
      return v.trim();
    })
    .filter(Boolean);
}

function setMessage(target, text, isError) {
  target.textContent = text || "";
  target.style.color = isError ? "#b91c1c" : "#166534";
}

async function requestJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error((data && data.message) || "请求失败");
  }
  return data;
}

const state = {
  config: null,
};

function refreshContentOptions() {
  const semester = byId("semester").value;
  const list = (state.config.contentsBySemester && state.config.contentsBySemester[semester]) || [];
  fillSelect(byId("content"), list, false);
}

function refreshQueryOptions() {
  const cfg = state.config;
  fillSelect(byId("qSemester"), cfg.semesterOptions, true);
  fillSelect(byId("qWeek"), cfg.weekOptions, true);
  fillSelect(byId("qClassName"), cfg.classOptions, true);
}

function renderRecords(records) {
  const tbody = byId("recordsTable").querySelector("tbody");
  tbody.innerHTML = "";
  if (!records.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 8;
    td.textContent = "暂无记录";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }
  records.forEach(function each(item) {
    const tr = document.createElement("tr");
    [
      item.semester,
      item.week,
      item.className,
      item.studentName,
      item.content,
      item.machineStatus,
      item.teacher,
      item.createdAt ? new Date(item.createdAt).toLocaleString() : "",
    ].forEach(function eachCol(value) {
      const td = document.createElement("td");
      td.textContent = value == null ? "" : String(value);
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
}

async function loadConfig() {
  const result = await requestJSON("/api/config");
  state.config = result.data;
  fillSelect(byId("semester"), state.config.semesterOptions, false);
  fillSelect(byId("week"), state.config.weekOptions, false);
  fillSelect(byId("className"), state.config.classOptions, false);
  fillSelect(byId("machineStatus"), state.config.machineOptions, false);
  fillSelect(byId("teacher"), state.config.teacherOptions, false);
  refreshContentOptions();
  refreshQueryOptions();
}

async function queryRecords() {
  const params = new URLSearchParams({
    semester: byId("qSemester").value,
    week: byId("qWeek").value,
    className: byId("qClassName").value,
    studentName: byId("qStudentName").value.trim(),
  });
  const result = await requestJSON("/api/records?" + params.toString());
  renderRecords(result.data);
}

async function handleSignSubmit(event) {
  event.preventDefault();
  const messageEl = byId("signMessage");
  setMessage(messageEl, "提交中...", false);
  try {
    await requestJSON("/api/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        semester: byId("semester").value,
        week: byId("week").value,
        className: byId("className").value,
        studentName: byId("studentName").value.trim(),
        content: byId("content").value,
        machineStatus: byId("machineStatus").value,
        teacher: byId("teacher").value,
      }),
    });
    setMessage(messageEl, "签到成功", false);
    byId("studentName").value = "";
    await loadConfig();
    await queryRecords();
  } catch (error) {
    setMessage(messageEl, error.message, true);
  }
}

async function handleImportTeachers() {
  const messageEl = byId("importMessage");
  setMessage(messageEl, "正在导入教师...", false);
  try {
    const names = readLines(byId("teacherImport").value);
    const result = await requestJSON("/api/import/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: names }),
    });
    setMessage(messageEl, "教师导入成功，共 " + result.count + " 位", false);
    await loadConfig();
  } catch (error) {
    setMessage(messageEl, error.message, true);
  }
}

async function handleImportContents() {
  const messageEl = byId("importMessage");
  setMessage(messageEl, "正在导入教学内容...", false);
  try {
    const semester = byId("contentSemester").value.trim();
    const contents = readLines(byId("contentImport").value);
    const result = await requestJSON("/api/import/contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semester: semester, contents: contents }),
    });
    setMessage(
      messageEl,
      result.semester + " 导入成功，共 " + result.count + " 条教学内容",
      false
    );
    await loadConfig();
    byId("semester").value = semester;
    refreshContentOptions();
  } catch (error) {
    setMessage(messageEl, error.message, true);
  }
}

async function handleImportRecords() {
  const messageEl = byId("importMessage");
  setMessage(messageEl, "正在导入签到记录...", false);
  try {
    const csvText = byId("recordsCsv").value;
    const mode = byId("importMode").value;
    const result = await requestJSON("/api/import/records", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csvText: csvText, mode: mode }),
    });
    setMessage(
      messageEl,
      "记录导入完成，成功导入 " + result.insertedCount + " 条（模式：" + (mode === "replace" ? "覆盖" : "追加") + "）",
      false
    );
    await queryRecords();
  } catch (error) {
    setMessage(messageEl, error.message, true);
  }
}

async function bootstrap() {
  try {
    await loadConfig();
    await queryRecords();
  } catch (error) {
    setMessage(byId("signMessage"), "初始化失败：" + error.message, true);
  }

  byId("semester").addEventListener("change", refreshContentOptions);
  byId("signForm").addEventListener("submit", handleSignSubmit);
  byId("queryForm").addEventListener("submit", function onQuery(event) {
    event.preventDefault();
    queryRecords().catch(function handleErr(error) {
      setMessage(byId("importMessage"), error.message, true);
    });
  });
  byId("importTeachersBtn").addEventListener("click", function onClick() {
    handleImportTeachers();
  });
  byId("importContentsBtn").addEventListener("click", function onClick() {
    handleImportContents();
  });
  byId("importRecordsBtn").addEventListener("click", function onClick() {
    handleImportRecords();
  });
}

bootstrap();
