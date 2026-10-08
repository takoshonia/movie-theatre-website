const BASE_URL = "https://api.kinoxii.redberryinternship.ge/api"; // base URL for the API
const TOKEN_KEY = "token";

const sessionExpiredListeners = new Set();

export function getToken() {
  return localStorage.getItem(TOKEN_KEY); // get the token from localStorage
}

export function setToken(token) {
  if (token) {
    localStorage.setItem(TOKEN_KEY, token); // set the token in localStorage
  } else {
    localStorage.removeItem(TOKEN_KEY); // remove the token from localStorage
  }
}

export function onSessionExpired(listener) {
  sessionExpiredListeners.add(listener); // add the listener to the set
  return () => sessionExpiredListeners.delete(listener);
}

function notifySessionExpired() {
  sessionExpiredListeners.forEach((listener) => listener());
}

async function request(path, { method = "GET", body, isLogin = false, skipSessionExpired = false } = {}) {
  const headers = { Accept: "application/json" }; // set the accept header to application/json
  const isFormData = body instanceof FormData;

  if (body && !isFormData) { // if body is present and not a FormData, set the content type to application/json
    headers["Content-Type"] = "application/json";
  }

  const token = getToken();
  if (token) { // if token is present, add it to the headers
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? (isFormData ? body : JSON.stringify(body)) : undefined,
  });

  if (response.status === 204) { // 204 No Content - no content returned
    return null;
  }

  const payload = await response.json().catch(() => ({})); // parse the response body as JSON

  if (response.ok) { // 200 OK - return the data
    return payload.data;
  }

  const error = new Error(payload.message || "Request failed"); // 500 Internal Server Error - carries message from server
  error.status = response.status;

  if (response.status === 401 && !isLogin) { // 401 Unauthorized - set token to null and notify session expired
    setToken(null);
    if (!skipSessionExpired) {
      notifySessionExpired();
    }
  }

  if (response.status === 422) { // 422 Unprocessable Entity -  carries errors (field map) or message (booking rule)
    error.errors = payload.errors;
  }

  if (response.status === 409) { // 409 Conflict - resource already exists throw an error that carries contested
    error.contested = payload.contested;
  }

  throw error;
}

export function get(path, options = {}) {
  return request(path, options);
}

export function post(path, body, options = {}) {
  return request(path, { method: "POST", body, ...options });
}

export function put(path, body) {
  return request(path, { method: "PUT", body });
}

export function del(path) {
  return request(path, { method: "DELETE" });
}
