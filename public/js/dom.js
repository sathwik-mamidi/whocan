export function byId(id) {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element: #${id}`);
  return element;
}

export function setText(id, value) {
  byId(id).textContent = value || "";
}

export function setStatus(element, message, tone = "neutral") {
  element.className = tone === "error" ? "status error" : "status";
  element.textContent = message;
}

export function formPayload(form) {
  return Object.fromEntries(new FormData(form).entries());
}
