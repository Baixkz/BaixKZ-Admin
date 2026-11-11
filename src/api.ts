import { auth } from "./firebase";
const base = (import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api/v1").replace(/\/$/, "");
export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json");
  const user = auth.currentUser;
  if (user) headers.set("Authorization", `Bearer ${await user.getIdToken()}`);
  const response = await fetch(`${base}${path}`, { ...init, headers });
  if (response.status === 204) return undefined as T;
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || body.error || "API сұрауы сәтсіз.");
  return body as T;
}
