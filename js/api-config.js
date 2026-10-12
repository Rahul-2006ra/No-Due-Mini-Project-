// Use local API if port 3000 is specifically chosen, or fall back to live Render backend
export const API_BASE_URL =
  globalThis.DIGITAL_NO_DUE_CONFIG?.API_BASE_URL ||
  (new URLSearchParams(location.search).get('localApi') === '1'
    ? 'http://127.0.0.1:3000'
    : 'https://digital-no-due-form.onrender.com');