// FILE: public/assets/js/auth.js
// SecureTheCloud credential management
// Supports both control-plane and runtime credentials

const ADMIN_SECRET_KEY = "STC_ADMIN_SECRET";
const API_KEY = "STC_API_KEY";

export function getAdminSecret() {
  return localStorage.getItem(ADMIN_SECRET_KEY) || "";
}

export function setAdminSecret(value) {
  if (!value) return;
  localStorage.setItem(ADMIN_SECRET_KEY, value);
}

export function clearAdminSecret() {
  localStorage.removeItem(ADMIN_SECRET_KEY);
}

export function getApiKey() {
  return localStorage.getItem(API_KEY) || "";
}

export function setApiKey(value) {
  if (!value) return;
  localStorage.setItem(API_KEY, value);
}

export function clearApiKey() {
  localStorage.removeItem(API_KEY);
}
