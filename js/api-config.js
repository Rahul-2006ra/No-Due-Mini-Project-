// Automatically use local API port 3000 when running on localhost/127.0.0.1
const isLocalHost = ['localhost', '127.0.0.1'].includes(location.hostname);
export const API_BASE_URL =
  globalThis.DIGITAL_NO_DUE_CONFIG?.API_BASE_URL ||
  (isLocalHost && new URLSearchParams(location.search).get('remoteApi') !== '1'
    ? 'http://127.0.0.1:3000'
    : 'https://digital-no-due-form.onrender.com');