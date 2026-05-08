function byId(id) {
  return document.getElementById(id);
}

function fillSelect(select, items, includeEmpty) {
  const currentValue = select.value;
  select.innerHTML = "";
  if (includeEmpty) {
    const empty = document.createElement("option");
    empty.value = "";
    empty.textContent = "全部";
    select.appendChild(empty);
  }
  const list = Array.isArray(items) ? items : [];
  for (let i = 0; i < list.length; i += 1) {
    const option = document.createElement("option");
    option.value = String(list[i]);
    option.textContent = String(list[i]);
    select.appendChild(option);
  }
  const canRestore = Array.prototype.some.call(select.options, function has(option) {
    return option.value === currentValue;
  });
  if (canRestore) {
    select.value = currentValue;
  }
}

function setMessage(target, text, isError) {
  target.textContent = text || "";
  target.style.color = isError ? "#b91c1c" : "#166534";
}

function readLines(text) {
  return String(text || "")
    .split(/\r?\n/)
    .map(function trim(line) {
      return line.trim();
    })
    .filter(Boolean);
}

async function requestJSON(url, options) {
  const response = await fetch(url, options);
  const data = await response.json();
  if (response.status === 401) {
    window.location.href = "/admin/login";
    throw new Error((data && data.message) || "请先登录后台管理");
  }
  if (!response.ok || !data.ok) {
    throw new Error((data && data.message) || "请求失败");
  }
  return data;
}

function getFriendlyWeekText(value) {
  const week = Number(value);
  if (Number.isNaN(week)) {
    return String(value);
  }
  return "第 " + week + " 周";
}

function queryFromAdminForm() {
  return {
    semester: byId("aSemester").value,
    week: byId("aWeek").value,
    className: byId("aClassName").value,
    studentName: byId("aStudentName").value.trim(),
    teacher: byId("aTeacher").value.trim(),
    machineStatus: byId("aMachineStatus").value,
    startDate: byId("aStartDate").value,
    endDate: byId("aEndDate").value,
  };
}

function buildQueryString(params) {
  const query = new URLSearchParams();
  const keys = Object.keys(params);
  for (let i = 0; i < keys.length; i += 1) {
    const key = keys[i];
    if (params[key]) {
      query.set(key, params[key]);
    }
  }
  return query.toString();
}

const state = {
  config: null,
  records: [],
};

function switchTab(tabName) {
  const tabs = document.querySelectorAll(".admin-tab");
  const panels = document.querySelectorAll(".admin-tab-panel");
  for (let i = 0; i < tabs.length; i += 1) {
    const tab = tabs[i];
    const isActive = tab.dataset.tab === tabName;
    tab.classList.toggle("is-active", isActive);
  }
  for (let j = 0; j < panels.length; j += 1) {
    const panel = panels[j];
    const isActive = panel.dataset.panel === tabName;
    panel.classList.toggle("is-active", isActive);
  }
}

function renderSummary(summary) {
  const container = byId("summaryCards");
  container.innerHTML = "";
  const items = [
    ["签到记录", summary.recordCount],
    ["学期", summary.semesterCount],
    ["班级", summary.classCount],
    ["教师", summary.teacherCount],
  ];
  for (let i = 0; i < items.length; i += 1) {
    const card = document.createElement("article");
    card.className = "summary-card";
    const title = document.createElement("h3");
    title.textContent = items[i][0];
    const value = document.createElement("p");
    value.textContent = String(items[i][1]);
    card.appendChild(title);
    card.appendChild(value);
    container.appendChild(card);
  }
}

function renderSimpleList(target, values, emptyText) {
  target.innerHTML = "";
  if (!values.length) {
    const empty = document.createElement("li");
    empty.className = "item-empty";
    empty.textContent = emptyText || "暂无数据";
    target.appendChild(empty);
    return;
  }
  for (let i = 0; i < values.length; i += 1) {
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = values[i];
    item.appendChild(text);
    target.appendChild(item);
  }
}

function renderMetaList(target, values, deleteHandler) {
  target.innerHTML = "";
  if (!values.length) {
    const empty = document.createElement("li");
    empty.className = "item-empty";
    empty.textContent = "暂无数据";
    target.appendChild(empty);
    return;
  }
  for (let i = 0; i < values.length; i += 1) {
    const value = values[i];
    const item = document.createElement("li");
    const text = document.createElement("span");
    text.textContent = value;
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "btn-danger";
    btn.textContent = "删除";
    btn.addEventListener("click", function onDelete() {
      deleteHandler(value);
    });
    item.appendChild(text);
    item.appendChild(btn);
    target.appendChild(item);
  }
}

function refreshContentList() {
  if (!state.config) {
    renderSimpleList(byId("contentList"), [], "暂无内容");
    return;
  }
  const semester = byId("contentSemester").value;
  const list = state.config.contentsBySemester[semester] || [];
  renderSimpleList(byId("contentList"), list, "当前学期暂无内容");
}

function renderRecords(records) {
  const tbody = byId("adminRecordsTable").querySelector("tbody");
  tbody.innerHTML = "";
  if (!records.length) {
    const tr = document.createElement("tr");
    const td = document.createElement("td");
    td.colSpan = 9;
    td.textContent = "暂无记录";
    td.style.textAlign = "center";
    tr.appendChild(td);
    tbody.appendChild(tr);
    return;
  }

  for (let i = 0; i < records.length; i += 1) {
    const row = records[i];
    const tr = document.createElement("tr");
    const cells = [
      row.semester,
      getFriendlyWeekText(row.week),
      row.className,
      row.studentName,
      row.content,
      row.machineStatus,
      row.teacher,
      row.createdAt ? new Date(row.createdAt).toLocaleString() : "",
    ];
    for (let j = 0; j < cells.length; j += 1) {
      const td = document.createElement("td");
      td.textContent = String(cells[j] == null ? "" : cells[j]);
      tr.appendChild(td);
    }
    const actionTd = document.createElement("td");
    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "btn-danger";
    delBtn.textContent = "删除";
    delBtn.addEventListener("click", function onDelete() {
      handleDeleteRecord(row.id);
    });
    actionTd.appendChild(delBtn);
    tr.appendChild(actionTd);
    tbody.appendChild(tr);
  }
}

async function loadAdminConfig() {
  const result = await requestJSON("/api/admin/config");
  state.config = result.data;
  fillSelect(byId("aSemester"), state.config.semesterOptions, true);
  fillSelect(byId("aWeek"), state.config.weekOptions, true);
  fillSelect(byId("aClassName"), state.config.classOptions, true);
  fillSelect(byId("aMachineStatus"), state.config.machineOptions, true);
  fillSelect(byId("contentSemester"), state.config.semesterOptions, false);

  const weekSelect = byId("aWeek");
  const weekOptions = weekSelect.options;
  for (let i = 0; i < weekOptions.length; i += 1) {
    const option = weekOptions[i];
    if (option.value) {
      option.textContent = getFriendlyWeekText(option.value);
    }
  }

  renderSummary(state.config.summary);
  renderSimpleList(byId("teacherList"), state.config.teacherOptions, "暂无教师");
  renderMetaList(byId("semesterList"), state.config.semesterOptions, handleDeleteSemester);
  renderMetaList(byId("classList"), state.config.classOptions, handleDeleteClass);
  refreshContentList();
}

async function loadRecords() {
  const query = buildQueryString(queryFromAdminForm());
  const result = await requestJSON("/api/admin/records?" + query);
  state.records = result.data;
  renderRecords(result.data);
  setMessage(byId("adminRecordsMessage"), "当前展示 " + result.data.length + " 条记录", false);
}

async function handleDeleteRecord(id) {
  if (!window.confirm("确认删除这条记录吗？")) {
    return;
  }
  try {
    await requestJSON("/api/admin/records/" + encodeURIComponent(id), {
      method: "DELETE",
    });
    await loadAdminConfig();
    await loadRecords();
  } catch (error) {
    setMessage(byId("adminRecordsMessage"), error.message, true);
  }
}

async function handleDeleteSemester(name) {
  if (!window.confirm("确认删除学期 “" + name + "” 吗？")) {
    return;
  }
  try {
    await requestJSON("/api/admin/semesters", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name }),
    });
    setMessage(byId("adminMetaMessage"), "学期已删除", false);
    await loadAdminConfig();
    await loadRecords();
  } catch (error) {
    setMessage(byId("adminMetaMessage"), error.message, true);
  }
}

async function handleDeleteClass(name) {
  if (!window.confirm("确认删除班级 “" + name + "” 吗？")) {
    return;
  }
  try {
    await requestJSON("/api/admin/classes", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name }),
    });
    setMessage(byId("adminMetaMessage"), "班级已删除", false);
    await loadAdminConfig();
    await loadRecords();
  } catch (error) {
    setMessage(byId("adminMetaMessage"), error.message, true);
  }
}

async function handleAddSemester() {
  const input = byId("newSemester");
  const name = input.value.trim();
  if (!name) {
    setMessage(byId("adminMetaMessage"), "请先输入学期名称", true);
    return;
  }
  try {
    await requestJSON("/api/admin/semesters", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name }),
    });
    input.value = "";
    setMessage(byId("adminMetaMessage"), "学期新增成功", false);
    await loadAdminConfig();
  } catch (error) {
    setMessage(byId("adminMetaMessage"), error.message, true);
  }
}

async function handleAddClass() {
  const input = byId("newClassName");
  const name = input.value.trim();
  if (!name) {
    setMessage(byId("adminMetaMessage"), "请先输入班级名称", true);
    return;
  }
  try {
    await requestJSON("/api/admin/classes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name }),
    });
    input.value = "";
    setMessage(byId("adminMetaMessage"), "班级新增成功", false);
    await loadAdminConfig();
  } catch (error) {
    setMessage(byId("adminMetaMessage"), error.message, true);
  }
}

async function handleImportTeachers() {
  const messageEl = byId("adminTeacherMessage");
  setMessage(messageEl, "正在导入教师...", false);
  try {
    const names = readLines(byId("teacherImport").value);
    const result = await requestJSON("/api/import/teachers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ names: names }),
    });
    byId("teacherImport").value = "";
    setMessage(messageEl, "导入成功，共 " + result.count + " 位教师", false);
    await loadAdminConfig();
  } catch (error) {
    setMessage(messageEl, error.message, true);
  }
}

async function handleImportContents() {
  const messageEl = byId("adminContentMessage");
  setMessage(messageEl, "正在导入教学内容...", false);
  try {
    const semester = byId("contentSemester").value.trim();
    if (!semester) {
      throw new Error("请先选择目标学期");
    }
    const contents = readLines(byId("contentImport").value);
    const result = await requestJSON("/api/import/contents", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ semester: semester, contents: contents }),
    });
    setMessage(
      messageEl,
      "导入成功：" + result.semester + "，共 " + result.count + " 条内容",
      false
    );
    await loadAdminConfig();
    byId("contentSemester").value = result.semester;
    refreshContentList();
  } catch (error) {
    setMessage(messageEl, error.message, true);
  }
}

function clearFilters() {
  byId("aSemester").value = "";
  byId("aWeek").value = "";
  byId("aClassName").value = "";
  byId("aStudentName").value = "";
  byId("aTeacher").value = "";
  byId("aMachineStatus").value = "";
  byId("aStartDate").value = "";
  byId("aEndDate").value = "";
}

function exportCsv() {
  const query = buildQueryString(queryFromAdminForm());
  window.location.href = "/api/admin/export/records.csv" + (query ? "?" + query : "");
}

async function handleLogout() {
  try {
    await requestJSON("/api/admin/logout", { method: "POST" });
  } catch (error) {
    // Whether or not API call fails, always redirect to login page.
  }
  window.location.href = "/admin/login";
}

async function bootstrap() {
  try {
    await loadAdminConfig();
    await loadRecords();
  } catch (error) {
    setMessage(byId("adminRecordsMessage"), "初始化失败：" + error.message, true);
  }

  byId("adminTabs").addEventListener("click", function onTabClick(event) {
    const target = event.target;
    if (!target || target.tagName !== "BUTTON") {
      return;
    }
    const tab = target.dataset.tab;
    if (tab) {
      switchTab(tab);
    }
  });

  byId("adminFilterForm").addEventListener("submit", function onSubmit(event) {
    event.preventDefault();
    loadRecords().catch(function onError(error) {
      setMessage(byId("adminRecordsMessage"), error.message, true);
    });
  });
  byId("clearAdminFilterBtn").addEventListener("click", function onClear() {
    clearFilters();
    loadRecords().catch(function onError(error) {
      setMessage(byId("adminRecordsMessage"), error.message, true);
    });
  });
  byId("exportCsvBtn").addEventListener("click", exportCsv);
  byId("logoutBtn").addEventListener("click", function onLogout() {
    handleLogout();
  });
  byId("addSemesterBtn").addEventListener("click", function onAddSemester() {
    handleAddSemester();
  });
  byId("addClassBtn").addEventListener("click", function onAddClass() {
    handleAddClass();
  });
  byId("importTeachersBtn").addEventListener("click", function onImportTeachers() {
    handleImportTeachers();
  });
  byId("importContentsBtn").addEventListener("click", function onImportContents() {
    handleImportContents();
  });
  byId("contentSemester").addEventListener("change", function onChangeContentSemester() {
    refreshContentList();
  });
}

bootstrap();
