// src/app/api.ts
// Backboard API configuration — values come from .env.local

export const BACKBOARD_API_KEY =
  (import.meta.env.VITE_BACKBOARD_API_KEY as string) ?? "";

export const BACKBOARD_BASE_URL =
  (import.meta.env.VITE_BACKBOARD_BASE_URL as string) ??
  "https://app.backboard.io/api";
