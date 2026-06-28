/*
 * SLATE API client (Phase 1 front-end integration).
 *
 * A tiny fetch wrapper that mirrors the localStorage layer the SLATE component
 * uses today. It sends cookies (credentials:'include') so the signed session
 * cookie flows on every request. See README §"Front-end integration" for how
 * to wire this into SLATE.dc.html with minimal, reversible changes.
 *
 * Usage (browser global): window.SlateAPI
 */
(function (global) {
  // The API origin. When the front end is served from a different port than the
  // API (5173 vs 8787), set window.SLATE_API_BASE before this script loads.
  const BASE = global.SLATE_API_BASE || 'http://localhost:8787';

  async function req(method, path, body) {
    const res = await fetch(BASE + path, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    if (res.status === 204) return null;
    const text = await res.text();
    const data = text ? JSON.parse(text) : null;
    if (!res.ok) {
      const err = new Error((data && data.error) || res.statusText);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  const SlateAPI = {
    // --- auth ---
    me: () => req('GET', '/api/auth/me'),
    login: (email, password) => req('POST', '/api/auth/login', { email, password }),
    signup: (email, password) => req('POST', '/api/auth/signup', { email, password }),
    logout: () => req('POST', '/api/auth/logout'),

    // --- bootstrap ---
    state: () => req('GET', '/api/state'),
    putState: (snapshot) => req('PUT', '/api/state', snapshot),

    // --- notes ---
    listNotes: () => req('GET', '/api/notes'),
    createNote: (data) => req('POST', '/api/notes', data),
    updateNote: (id, data) => req('PATCH', '/api/notes/' + id, data),
    pinNote: (id) => req('POST', '/api/notes/' + id + '/pin'),
    deleteNote: (id) => req('DELETE', '/api/notes/' + id),

    // --- journal ---
    listJournal: () => req('GET', '/api/journal'),
    createJournal: (data) => req('POST', '/api/journal', data),
    deleteJournal: (id) => req('DELETE', '/api/journal/' + id),

    // --- tasks ---
    listTasks: () => req('GET', '/api/tasks'),
    createTask: (data) => req('POST', '/api/tasks', data),
    updateTask: (id, data) => req('PATCH', '/api/tasks/' + id, data),
    deleteTask: (id) => req('DELETE', '/api/tasks/' + id),

    // --- chat ---
    listChat: () => req('GET', '/api/chat'),
    sendChat: (text) => req('POST', '/api/chat', { text }),
    clearChat: () => req('DELETE', '/api/chat'),

    // --- twin ---
    getTwin: () => req('GET', '/api/twin'),
    updateTwin: (data) => req('PATCH', '/api/twin', data),
    addInterest: (label) => req('POST', '/api/twin/interests', { label }),
    removeInterest: (id) => req('DELETE', '/api/twin/interests/' + id),
    addGoal: (t, meta) => req('POST', '/api/twin/goals', { t, meta }),
    updateGoal: (id, data) => req('PATCH', '/api/twin/goals/' + id, data),
    removeGoal: (id) => req('DELETE', '/api/twin/goals/' + id),
    listMemories: () => req('GET', '/api/twin/memories'),
    addMemory: (t, when) => req('POST', '/api/twin/memories', { t, when }),

    // --- life ---
    getLife: () => req('GET', '/api/life'),
    getBoard: (cat) => req('GET', '/api/life/' + cat),
    updateBoard: (cat, data) => req('PATCH', '/api/life/' + cat, data),
    addLifeItem: (cat, side, label) => req('POST', '/api/life/' + cat + '/items', { side, label }),
    removeLifeItem: (id) => req('DELETE', '/api/life/items/' + id),
    setLifeSelected: (category) => req('PUT', '/api/life/selected', { category }),

    // --- settings ---
    getSettings: () => req('GET', '/api/settings'),
    updateSettings: (data) => req('PATCH', '/api/settings', data),

    // --- derived ---
    behavior: () => req('GET', '/api/behavior'),
    calendar: (month) => req('GET', '/api/calendar' + (month ? '?month=' + month : '')),
    catalog: () => req('GET', '/api/catalog'),
  };

  global.SlateAPI = SlateAPI;
})(typeof window !== 'undefined' ? window : this);
