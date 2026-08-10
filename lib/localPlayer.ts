const STORAGE_KEY = "scoregame:playerId";

export function getLocalPlayerId(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(STORAGE_KEY);
}

export function setLocalPlayerId(playerId: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, playerId);
}

export function clearLocalPlayerId() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}
