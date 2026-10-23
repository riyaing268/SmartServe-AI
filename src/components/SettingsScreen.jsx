import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Save, 
  CheckCircle2, 
  ShieldCheck, 
  HeartHandshake, 
  Leaf, 
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { api } from '../api';

export default function SettingsScreen() {
  const [settings, setSettings] = useState({
    service_level: 'Balanced',
    ngo_contact: 'Robin Hood Army Mess Contact (+91 98765 43210)',
    ngo_pickup_window: '15:30 - 16:30',
    co2_per_kg_food: 2.5,
    currency: '₹'
  });
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await api.getSettings();
      setSettings(res);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      await api.updateSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      alert('Error updating settings: ' + err.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-800">
            <SettingsIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">System Preferences & Sustainability Parameters</h2>
            <p className="text-xs text-stone-500">Configure global safety margins, NGO collection partners, and carbon calculations.</p>
          </div>
        </div>

        {saved && (
          <span className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Settings Saved!
          </span>
        )}
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Service Level Buffer Policy */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-stone-900 text-sm">Default Canteen Buffer Policy</h3>
          </div>
          <p className="text-xs text-stone-500">
            Controls how aggressively SmartServe minimizes food waste vs. guarding against meal run-outs.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'Lean', title: 'Lean (P50)', desc: 'Prioritizes minimal surplus food waste; tighter prep buffer.' },
              { id: 'Balanced', title: 'Balanced (P70)', desc: 'Recommended baseline; optimal balance between availability and waste.' },
              { id: 'Conservative', title: 'Safe (P90)', desc: 'Guards against stock-outs for critical high-demand exam or fest periods.' }
            ].map((opt) => (
              <label
                key={opt.id}
                onClick={() => setSettings({ ...settings, service_level: opt.id })}
                className={`p-4 rounded-xl border text-xs cursor-pointer transition-all flex flex-col justify-between ${
                  settings.service_level === opt.id
                    ? 'bg-emerald-50/60 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-stone-50 border-stone-200 hover:bg-stone-100'
                }`}
              >
                <div>
                  <div className="font-bold text-stone-900 text-sm mb-1">{opt.title}</div>
                  <p className="text-stone-500 text-[11px] leading-relaxed">{opt.desc}</p>
                </div>
                <input
                  type="radio"
                  name="service_level"
                  value={opt.id}
                  checked={settings.service_level === opt.id}
                  onChange={() => {}}
                  className="hidden"
                />
              </label>
            ))}
          </div>
        </div>

        {/* NGO Food Rescue Integration */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <HeartHandshake className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-stone-900 text-sm">Surplus Food Rescue & NGO Partner</h3>
          </div>
          <p className="text-xs text-stone-500">
            When safe unserved surplus exceeds 10 portions at closing, SmartServe prompts staff with this NGO pickup detail.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Rescue Partner Contact & Phone</label>
              <input
                type="text"
                value={settings.ngo_contact}
                onChange={(e) => setSettings({ ...settings, ngo_contact: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Standard Daily Pickup Window</label>
              <input
                type="text"
                value={settings.ngo_pickup_window}
                onChange={(e) => setSettings({ ...settings, ngo_pickup_window: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* Carbon & Environmental Factors */}
        <div className="bg-white p-6 rounded-2xl border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center space-x-2">
            <Leaf className="w-4 h-4 text-emerald-600" />
            <h3 className="font-bold text-stone-900 text-sm">Environmental & Currency Standards</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">
                CO2e Factor (kg CO2e emitted per kg food waste)
              </label>
              <input
                type="number"
                step="0.1"
                min="0.5"
                value={settings.co2_per_kg_food}
                onChange={(e) => setSettings({ ...settings, co2_per_kg_food: parseFloat(e.target.value) || 2.5 })}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">Standard FAO IPCC food waste benchmark is 2.5 kg CO2e / kg.</span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-600 mb-1">Currency Symbol</label>
              <input
                type="text"
                value={settings.currency}
                onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-sm text-stone-900 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end">
          <button
            type="submit"
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Save className="w-4 h-4" /> Save Configuration
          </button>
        </div>
      </form>
    </div>
  );
}
