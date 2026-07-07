import { byId, formPayload, setStatus } from "./dom.js";
import { jsonRequestOptions, requestJson } from "./http.js";

const form = byId("profile-form");
const statusEl = byId("status");
const submitButton = byId("submit-profile");

form.addEventListener("submit", async (event) => {
  event.preventDefault();

  submitButton.disabled = true;
  setStatus(statusEl, "Creating profile...");

  try {
    const data = await requestJson("/api/profiles", jsonRequestOptions(formPayload(form)));
    window.location.assign(data.profile.url);
  } catch (error) {
    setStatus(statusEl, error.message || "Could not create profile.", "error");
  } finally {
    submitButton.disabled = false;
  }
});
