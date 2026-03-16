/**
 * In-memory token store.
 *
 * The access token is kept ONLY in memory (never in localStorage/sessionStorage).
 * This prevents XSS from reading it, and means each browser tab has its own
 * independent token — enabling multiple simultaneous sessions.
 *
 * The refresh token lives in sessionStorage (per-tab, cleared on tab close).
 */

let _accessToken: string | null = null;

export const tokenStore = {
  // ── Access token (memory only) ──────────────────────────────────────────
  getAccess: (): string | null => _accessToken,
  setAccess: (token: string): void => { _accessToken = token; },

  // ── Refresh token (sessionStorage — per tab) ────────────────────────────
  getRefresh: (): string | null => sessionStorage.getItem('refresh_token'),
  setRefresh: (token: string): void => { sessionStorage.setItem('refresh_token', token); },

  // ── User snapshot (sessionStorage — to survive F5) ─────────────────────
  getUser: (): string | null => sessionStorage.getItem('user'),
  setUser: (userJson: string): void => { sessionStorage.setItem('user', userJson); },

  // ── Clear everything for this tab ──────────────────────────────────────
  clear: (): void => {
    _accessToken = null;
    sessionStorage.removeItem('refresh_token');
    sessionStorage.removeItem('user');
  },
};
