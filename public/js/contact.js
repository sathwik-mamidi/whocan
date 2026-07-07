import { byId, formPayload, setStatus, setText } from "./dom.js";
import { jsonRequestOptions, requestJson } from "./http.js";

const username = window.location.pathname.replace(/^\/+/, "").split("/")[0] || "";
const form = byId("message-form");
const statusEl = byId("status");
const submitButton = byId("submit-message");

async function loadProfile() {
  const data = await requestJson(`/api/profiles/${encodeURIComponent(username)}`);
  setText("username", data.profile.username);
  setText("bio", data.profile.bio);
  setText("rules", data.profile.rules);
}

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitButton.disabled = true;
  setStatus(statusEl, "Sending request...");

  try {
    await requestJson(`/api/profiles/${encodeURIComponent(username)}/messages`, jsonRequestOptions(formPayload(form)));
    form.reset();
    setStatus(statusEl, "Request sent.");
  } catch (error) {
    setStatus(statusEl, error.message || "Could not send request.", "error");
  } finally {
    submitButton.disabled = false;
  }
});

loadProfile().catch((error) => {
  form.hidden = true;
  setStatus(statusEl, error.message || "Could not load profile.", "error");
});
