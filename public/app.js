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

function getFriendlyWeekText(value) {
  const week = Number(value);
  if (Number.isNaN(week)) {
    return String(value);
  }
  return "第 " + week + " 周";
}

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
      getFriendlyWeekText(item.week),
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

  const weekSelect = byId("week");
  const options = weekSelect.options;
  for (let i = 0; i < options.length; i += 1) {
    const item = options[i];
    item.textContent = getFriendlyWeekText(item.value);
  }
  const queryWeekSelect = byId("qWeek");
  const queryOptions = queryWeekSelect.options;
  for (let j = 0; j < queryOptions.length; j += 1) {
    const option = queryOptions[j];
    if (option.value) {
      option.textContent = getFriendlyWeekText(option.value);
    }
  }
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
      setMessage(byId("signMessage"), error.message, true);
    });
  });
  byId("refreshRecordsBtn").addEventListener("click", function onClick() {
    queryRecords().catch(function handleErr(error) {
      setMessage(byId("signMessage"), error.message, true);
    });
  });
}

bootstrap();
