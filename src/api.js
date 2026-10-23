// API client for SmartServe AI backend
const rawBase = import.meta.env.VITE_API_URL || '';
// If VITE_API_URL has a trailing slash, strip it; if not provided, default to '/api'
export const API_BASE = rawBase ? (rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`) : '/api';


export const api = {
  // Data & Seeding
  seedDemo: async (days = 90) => {
    const res = await fetch(`${API_BASE}/data/seed-demo?days=${days}`, { method: 'POST' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  uploadSalesCsv: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/data/upload-sales`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Menu Items
  getMenuItems: async (category = '') => {
    const url = category ? `${API_BASE}/menu-items?category=${category}` : `${API_BASE}/menu-items`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  createMenuItem: async (item) => {
    const res = await fetch(`${API_BASE}/menu-items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateMenuItem: async (id, item) => {
    const res = await fetch(`${API_BASE}/menu-items/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  deleteMenuItem: async (id) => {
    const res = await fetch(`${API_BASE}/menu-items/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Context & Daily Menu
  getContext: async (date, slot) => {
    const res = await fetch(`${API_BASE}/context?date=${date}&slot=${slot}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  setContext: async (context) => {
    const res = await fetch(`${API_BASE}/context`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(context),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getDailyMenu: async (date, slot) => {
    const res = await fetch(`${API_BASE}/context/menu?date=${date}&slot=${slot}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  setDailyMenu: async (payload) => {
    const res = await fetch(`${API_BASE}/context/menu`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Recommendations
  getRecommendations: async (date, slot, serviceLevel) => {
    let url = `${API_BASE}/recommendations?date=${date}&slot=${slot}`;
    if (serviceLevel) url += `&service_level=${serviceLevel}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  overrideRecommendation: async (id, overrideQty) => {
    const res = await fetch(`${API_BASE}/recommendations/${id}/override`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ override_qty: overrideQty }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getModelHealth: async () => {
    const res = await fetch(`${API_BASE}/model-health`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Logs & Workflow
  closeDay: async (payload) => {
    const res = await fetch(`${API_BASE}/logs/close-day`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  midServiceForecast: async (payload) => {
    const res = await fetch(`${API_BASE}/logs/mid-service`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Briefing & Agent
  getBriefing: async (date, slot) => {
    const res = await fetch(`${API_BASE}/briefing?date=${date}&slot=${slot}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  chatAgent: async (message, sessionId = 'default') => {
    const res = await fetch(`${API_BASE}/agent/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, session_id: sessionId }),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  // Dashboard & Reports
  getDashboard: async (days = 30) => {
    const res = await fetch(`${API_BASE}/dashboard?days=${days}`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  getSettings: async () => {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },

  updateSettings: async (settings) => {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
};
