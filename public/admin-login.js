function byId(id) {
  return document.getElementById(id);
}

function setMessage(message, isError) {
  const target = byId("adminLoginMessage");
  target.textContent = message || "";
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

async function bootstrap() {
  try {
    const session = await requestJSON("/api/admin/session");
    if (session.data && session.data.loggedIn) {
      window.location.replace("/admin");
      return;
    }
  } catch (error) {
    setMessage(error.message, true);
  }

  const form = byId("adminLoginForm");
  form.addEventListener("submit", function onSubmit(event) {
    event.preventDefault();
    const username = byId("adminUsername").value.trim();
    const password = byId("adminPassword").value;
    if (!username || !password) {
      setMessage("请输入账号和密码", true);
      return;
    }
    setMessage("正在登录...", false);
    requestJSON("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: username, password: password }),
    })
      .then(function onSuccess() {
        setMessage("登录成功，正在跳转...", false);
        window.location.replace("/admin");
      })
      .catch(function onError(error) {
        setMessage(error.message, true);
      });
  });
}

bootstrap();
