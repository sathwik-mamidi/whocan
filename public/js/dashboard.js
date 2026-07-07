import { byId, setStatus, setText } from "./dom.js";
import { requestJson } from "./http.js";

const list = byId("messages");
const statusEl = byId("status");

function renderMessage(message) {
  const item = document.createElement("li");
  item.className = "message";

  const meta = document.createElement("div");
  meta.className = "meta";
  meta.textContent = `${message.from} - ${new Date(message.createdAt).toLocaleString()}`;

  const body = document.createElement("p");
  body.textContent = message.message;

  item.append(meta, body);
  return item;
}

async function loadDashboard() {
  const { profile } = await requestJson("/api/me");
  setText("username", profile.username);
  setText("bio", profile.bio);
  setText("rules", profile.rules);

  const publicUrl = byId("public-url");
  publicUrl.href = profile.url;
  publicUrl.textContent = `${window.location.origin}${profile.url}`;

  const { messages } = await requestJson("/api/me/messages");
  list.replaceChildren(...messages.map(renderMessage));
  setStatus(statusEl, messages.length ? "" : "No contact requests yet.");
}

loadDashboard().catch((error) => {
  if (error.status === 401) {
    window.location.assign("/");
    return;
  }

  setStatus(statusEl, error.message || "Could not load dashboard.", "error");
});
