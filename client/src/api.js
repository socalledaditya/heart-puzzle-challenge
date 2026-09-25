import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  withCredentials: true,
});
export const getToken = () => localStorage.getItem("hp_token");
export const setToken = (t) =>
  t ? localStorage.setItem("hp_token", t) : localStorage.removeItem("hp_token");
export const errMsg = (e) =>
  e?.response?.data?.message || e?.message || "Something went wrong";

api.interceptors.request.use((c) => {
  const t = getToken();
  if (t) c.headers.Authorization = `Bearer ${t}`;
  return c;
});

// Single-flight refresh: many parallel 401s trigger only one refresh call.
let refreshing = null;
export function refreshToken() {
  refreshing ||= axios
    .post("/api/auth/refresh", null, { withCredentials: true })
    .then((r) => {
      setToken(r.data.accessToken);
      return r.data;
    })
    .finally(() => (refreshing = null));
  return refreshing;
}

api.interceptors.response.use(
  (r) => r,
  async (err) => {
    const { config, response } = err;
    if (
      response?.status === 401 &&
      config &&
      !config._retry &&
      !config.url.startsWith("/auth/")
    ) {
      config._retry = true;
      try {
        await refreshToken();
        return api(config);
      } catch {
        setToken(null);
        window.dispatchEvent(new Event("hp:logout"));
      }
    }
    return Promise.reject(err);
  },
);

export async function download(url, filename) {
  const r = await api.get(url, { responseType: "blob" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(r.data);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}

export const fmt = (ms) => {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`;
};
