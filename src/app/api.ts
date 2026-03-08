// src/app/api.ts
// Backboard API 通过本地 Vite/preview 代理转发，避免浏览器直接跨域并暴露 key。
const isLocalHost =
  typeof window !== "undefined" &&
  (window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost");

export const BACKBOARD_ENABLED = import.meta.env.DEV || isLocalHost;
export const BACKBOARD_BASE_URL = "/api/backboard";
