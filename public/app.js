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

async function loadConfig() {
  const result = await requestJSON("/api/config");
  state.config = result.data;
  fillSelect(byId("semester"), state.config.semesterOptions, false);
  fillSelect(byId("week"), state.config.weekOptions, false);
  fillSelect(byId("className"), state.config.classOptions, false);
  fillSelect(byId("machineStatus"), state.config.machineOptions, false);
  fillSelect(byId("teacher"), state.config.teacherOptions, false);
  refreshContentOptions();

  const weekSelect = byId("week");
  const options = weekSelect.options;
  for (let i = 0; i < options.length; i += 1) {
    const item = options[i];
    item.textContent = getFriendlyWeekText(item.value);
  }
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
  } catch (error) {
    setMessage(messageEl, error.message, true);
  }
}

async function bootstrap() {
  try {
    await loadConfig();
  } catch (error) {
    setMessage(byId("signMessage"), "初始化失败：" + error.message, true);
  }

  byId("semester").addEventListener("change", refreshContentOptions);
  byId("signForm").addEventListener("submit", handleSignSubmit);
}

bootstrap();
