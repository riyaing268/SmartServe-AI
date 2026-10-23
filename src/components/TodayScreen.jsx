import React, { useState, useEffect } from 'react';
import { 
  Users, 
  CloudRain, 
  Sun, 
  Wind, 
  BookOpen, 
  CalendarOff, 
  AlertTriangle, 
  CheckCircle, 
  HelpCircle, 
  Edit2, 
  Save, 
  RotateCcw, 
  Sparkles, 
  ChefHat, 
  SlidersHorizontal,
  ChevronRight,
  TrendingUp,
  Package,
  Layers
} from 'lucide-react';
import { api } from '../api';

export default function TodayScreen({ currentDate, currentSlot, onNavigateToTab }) {
  const [context, setContext] = useState({
    expected_attendance: 1200,
    weather: 'cool',
    is_exam_day: false,
    is_holiday: false,
    event_note: ''
  });
  const [serviceLevel, setServiceLevel] = useState('Balanced');
  const [recommendations, setRecommendations] = useState([]);
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [overrideValue, setOverrideValue] = useState('');
  const [selectedWhy, setSelectedWhy] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate, currentSlot, serviceLevel]);

  const loadData = async () => {
    setLoading(true);
    try {
      // 1. Load context
      const ctx = await api.getContext(currentDate, currentSlot);
      setContext({
        expected_attendance: ctx.expected_attendance,
        weather: ctx.weather,
        is_exam_day: ctx.is_exam_day,
        is_holiday: ctx.is_holiday,
        event_note: ctx.event_note || ''
      });

      // 2. Load recommendations
      const recs = await api.getRecommendations(currentDate, currentSlot, serviceLevel);
      setRecommendations(recs);

      // 3. Load daily briefing
      const brief = await api.getBriefing(currentDate, currentSlot);
      setBriefing(brief);
    } catch (err) {
      console.error('Error loading today data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateContext = async (updatedFields) => {
    const updated = { ...context, ...updatedFields };
    setContext(updated);
    try {
      await api.setContext({
        date: currentDate,
        meal_slot: currentSlot,
        expected_attendance: parseInt(updated.expected_attendance) || 1000,
        weekday: new Date(currentDate).toLocaleDateString('en-US', { weekday: 'long' }),
        weather: updated.weather,
        is_exam_day: updated.is_exam_day,
        is_holiday: updated.is_holiday,
        event_note: updated.event_note
      });
      // Re-fetch recommendations
      const recs = await api.getRecommendations(currentDate, currentSlot, serviceLevel);
      setRecommendations(recs);
      const brief = await api.getBriefing(currentDate, currentSlot);
      setBriefing(brief);
    } catch (err) {
      console.error('Failed to update context:', err);
    }
  };

  const handleSaveOverride = async (recId) => {
    if (!overrideValue || isNaN(overrideValue)) return;
    try {
      await api.overrideRecommendation(recId, parseInt(overrideValue));
      setEditingId(null);
      setOverrideValue('');
      // Reload recommendations to reflect override
      const recs = await api.getRecommendations(currentDate, currentSlot, serviceLevel);
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to save override:', err);
    }
  };

  const handleAcceptAll = () => {
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  return (
    <div className="space-y-6">
      {/* Top Controls: Attendance, Weather, Flags & Service Level */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
          {/* Expected Attendance */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-emerald-600" /> Expected Diners
            </label>
            <div className="relative">
              <input
                type="number"
                value={context.expected_attendance}
                onChange={(e) => handleUpdateContext({ expected_attendance: e.target.value })}
                className="w-full bg-stone-50 border border-stone-300 rounded-xl px-3 py-2 text-base font-bold text-stone-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                step="50"
                min="50"
              />
              <span className="absolute right-3 top-2.5 text-xs text-stone-400 font-medium">students</span>
            </div>
          </div>

          {/* Weather Selector */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Today's Weather
            </label>
            <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => handleUpdateContext({ weather: 'cool' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  context.weather === 'cool' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Wind className="w-3.5 h-3.5 text-teal-600" /> Cool
              </button>
              <button
                type="button"
                onClick={() => handleUpdateContext({ weather: 'rainy' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  context.weather === 'rainy' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <CloudRain className="w-3.5 h-3.5 text-blue-600" /> Rainy
              </button>
              <button
                type="button"
                onClick={() => handleUpdateContext({ weather: 'hot' })}
                className={`py-1.5 px-2 rounded-lg text-xs font-semibold flex items-center justify-center gap-1 transition-all ${
                  context.weather === 'hot' ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" /> Hot
              </button>
            </div>
          </div>

          {/* Academic & Holiday Flags */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2">
              Context Modifiers
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleUpdateContext({ is_exam_day: !context.is_exam_day })}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  context.is_exam_day
                    ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-xs font-semibold'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-600" /> Exam Week (-25%)
              </button>
              <button
                type="button"
                onClick={() => handleUpdateContext({ is_holiday: !context.is_holiday })}
                className={`flex-1 py-2 px-2.5 rounded-xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all ${
                  context.is_holiday
                    ? 'bg-rose-50 border-rose-300 text-rose-900 shadow-xs font-semibold'
                    : 'bg-stone-50 border-stone-200 text-stone-600 hover:bg-stone-100'
                }`}
              >
                <CalendarOff className="w-3.5 h-3.5 text-rose-600" /> Holiday
              </button>
            </div>
          </div>

          {/* Service-Level Setting */}
          <div>
            <label className="block text-xs font-semibold text-stone-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <SlidersHorizontal className="w-3.5 h-3.5 text-emerald-600" /> Preparation Buffer
            </label>
            <div className="grid grid-cols-3 gap-1 bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                type="button"
                onClick={() => setServiceLevel('Lean')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  serviceLevel === 'Lean' ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="P50: Prioritizes minimum food waste"
              >
                Lean
              </button>
              <button
                type="button"
                onClick={() => setServiceLevel('Balanced')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  serviceLevel === 'Balanced' ? 'bg-emerald-600 text-white font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="P70: Optimal balance of availability and waste"
              >
                Balanced
              </button>
              <button
                type="button"
                onClick={() => setServiceLevel('Conservative')}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium transition-all ${
                  serviceLevel === 'Conservative' ? 'bg-white text-stone-900 font-semibold shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
                title="P90: Prioritizes zero stock-outs"
              >
                Safe
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Daily Briefing Card */}
      {briefing && (
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-5 rounded-2xl shadow-sm">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Sparkles className="w-5 h-5 text-emerald-300" />
              </div>
              <div>
                <h3 className="font-bold text-base text-emerald-100">SmartServe Morning Briefing</h3>
                <p className="text-xs text-emerald-200/80">{briefing.weather_impact}</p>
              </div>
            </div>
            <span className="text-xs font-medium bg-emerald-800/80 text-emerald-200 px-3 py-1 rounded-full border border-emerald-700">
              {currentSlot.toUpperCase()} PLAN
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
            {briefing.top_risks.map((risk, idx) => (
              <div key={idx} className="bg-white/10 backdrop-blur-xs p-3 rounded-xl border border-white/10 text-xs">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-white text-sm">{risk.item_name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    risk.risk_label === 'Stock-out risk'
                      ? 'bg-rose-500/80 text-white'
                      : risk.risk_label === 'Waste risk'
                      ? 'bg-amber-500/80 text-white'
                      : 'bg-emerald-500/80 text-white'
                  }`}>
                    {risk.risk_label}
                  </span>
                </div>
                <div className="text-emerald-200 mb-1.5 font-medium">
                  Recommended: <span className="font-bold text-white text-sm">{risk.recommended_qty} portions</span>
                </div>
                <p className="text-emerald-100/90 leading-relaxed text-[11px]">{risk.action_suggestion}</p>
              </div>
            ))}
          </div>

          {/* Repurposing callouts if present */}
          {briefing.repurpose_opportunities && briefing.repurpose_opportunities.length > 0 && (
            <div className="mt-3 pt-3 border-t border-emerald-800/50 flex items-center gap-2 text-xs text-emerald-200">
              <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong className="text-white">Carryover Stock Action:</strong> {briefing.repurpose_opportunities[0]}
              </span>
            </div>
          )}
        </div>
      )}

      {/* Recommended Preparation Table */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-stone-200 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-stone-900">Recommended Preparation Quantities</h2>
            <p className="text-xs text-stone-500">
              AI recommendations grounded on {context.expected_attendance?.toLocaleString()} attendance, attach rates, and usable leftover stock.
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleAcceptAll}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
            >
              <CheckCircle className="w-4 h-4" />
              {saveSuccess ? 'Plan Confirmed!' : 'Accept All Recommendations'}
            </button>
            <button
              onClick={() => onNavigateToTab('prepsheet')}
              className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
            >
              <ChefHat className="w-4 h-4 text-stone-500" /> View Prep Sheet
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Menu Item</th>
                <th className="py-3 px-3">Forecast Range</th>
                <th className="py-3 px-3">Leftover Deducted</th>
                <th className="py-3 px-4">Recommended Prep</th>
                <th className="py-3 px-3">Kitchen Batches</th>
                <th className="py-3 px-3">Risk Status</th>
                <th className="py-3 px-3">Reasoning</th>
                <th className="py-3 px-4 text-right">Manager Override</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {recommendations.map((rec) => {
                const isOverridden = rec.manager_override_qty !== null && rec.manager_override_qty !== undefined;
                const effectiveQty = isOverridden ? rec.manager_override_qty : rec.recommended_qty;
                const batches = Math.ceil(effectiveQty / rec.batch_size);

                return (
                  <tr key={rec.id} className="hover:bg-stone-50/80 transition-colors">
                    {/* Item Name */}
                    <td className="py-3.5 px-4 font-semibold text-stone-900">
                      <div>{rec.item_name}</div>
                      <span className="text-[11px] font-normal text-stone-400 capitalize">{rec.category}</span>
                    </td>

                    {/* Range */}
                    <td className="py-3.5 px-3">
                      <div className="text-xs text-stone-700 font-medium">
                        P50: <span className="font-bold text-stone-900">{Math.round(rec.p50)}</span>
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {Math.round(rec.p10)} – {Math.round(rec.p90)}
                      </div>
                    </td>

                    {/* Leftover deducted */}
                    <td className="py-3.5 px-3">
                      {rec.usable_leftover > 0 ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                          -{rec.usable_leftover} portions
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">0</span>
                      )}
                    </td>

                    {/* Recommended Prep */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-baseline gap-1.5">
                        <span className={`text-lg font-extrabold ${isOverridden ? 'text-amber-600 line-through' : 'text-emerald-700'}`}>
                          {rec.recommended_qty}
                        </span>
                        {isOverridden && (
                          <span className="text-lg font-extrabold text-stone-900">
                            {rec.manager_override_qty}
                          </span>
                        )}
                        <span className="text-xs text-stone-400 font-medium">portions</span>
                      </div>
                    </td>

                    {/* Batches */}
                    <td className="py-3.5 px-3">
                      <span className="text-xs font-semibold text-stone-700 bg-stone-100 px-2.5 py-1 rounded-lg">
                        {batches} × {rec.batch_size}
                      </span>
                    </td>

                    {/* Risk Badge */}
                    <td className="py-3.5 px-3">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                        rec.risk_label === 'Stock-out risk'
                          ? 'bg-rose-100 text-rose-800'
                          : rec.risk_label === 'Waste risk'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}>
                        {rec.risk_label === 'Stock-out risk' && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                        {rec.risk_label === 'Waste risk' && <TrendingUp className="w-3 h-3 text-amber-600" />}
                        {rec.risk_label === 'Balanced' && <CheckCircle className="w-3 h-3 text-emerald-600" />}
                        {rec.risk_label}
                      </span>
                    </td>

                    {/* Why? Button */}
                    <td className="py-3.5 px-3">
                      <button
                        onClick={() => setSelectedWhy(rec)}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg transition-colors"
                      >
                        <HelpCircle className="w-3.5 h-3.5" /> Why?
                      </button>
                    </td>

                    {/* Manager Override */}
                    <td className="py-3.5 px-4 text-right">
                      {editingId === rec.id ? (
                        <div className="flex items-center justify-end space-x-1.5">
                          <input
                            type="number"
                            value={overrideValue}
                            onChange={(e) => setOverrideValue(e.target.value)}
                            placeholder={rec.recommended_qty.toString()}
                            className="w-20 px-2 py-1 text-xs border border-emerald-500 rounded-lg text-right font-bold focus:outline-none"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveOverride(rec.id)}
                            className="p-1 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
                            title="Save override"
                          >
                            <Save className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 bg-stone-200 text-stone-600 rounded-lg hover:bg-stone-300"
                            title="Cancel"
                          >
                            <RotateCcw className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => {
                            setEditingId(rec.id);
                            setOverrideValue(effectiveQty.toString());
                          }}
                          className="inline-flex items-center gap-1 text-xs font-medium text-stone-500 hover:text-stone-900 bg-stone-100 hover:bg-stone-200 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          <Edit2 className="w-3 h-3" />
                          {isOverridden ? 'Edit Override' : 'Override'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* "Why?" Explanation Modal/Drawer */}
      {selectedWhy && (
        <div className="fixed inset-0 bg-stone-900/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 animate-in fade-in zoom-in duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div className="flex items-center space-x-2">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <HelpCircle className="w-5 h-5 text-emerald-700" />
                </div>
                <div>
                  <h3 className="font-bold text-stone-900 text-base">Recommendation Reasoning</h3>
                  <p className="text-xs text-stone-500">{selectedWhy.item_name} ({currentSlot.toUpperCase()})</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedWhy(null)}
                className="text-stone-400 hover:text-stone-700 font-bold p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="py-4 space-y-3">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-stone-800 text-sm leading-relaxed">
                {selectedWhy.explanation}
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                <div className="bg-stone-100 p-2.5 rounded-xl">
                  <span className="block text-stone-500 text-[10px] uppercase font-semibold">Low (P10)</span>
                  <span className="font-bold text-stone-800 text-sm">{Math.round(selectedWhy.p10)}</span>
                </div>
                <div className="bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">
                  <span className="block text-emerald-700 text-[10px] uppercase font-semibold">Likely (P50)</span>
                  <span className="font-bold text-emerald-900 text-sm">{Math.round(selectedWhy.p50)}</span>
                </div>
                <div className="bg-stone-100 p-2.5 rounded-xl">
                  <span className="block text-stone-500 text-[10px] uppercase font-semibold">High (P90)</span>
                  <span className="font-bold text-stone-800 text-sm">{Math.round(selectedWhy.p90)}</span>
                </div>
              </div>

              {selectedWhy.usable_leftover > 0 && (
                <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <Package className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    <strong>{selectedWhy.usable_leftover} portions</strong> carried over from earlier shift, safely reducing today's kitchen cook volume.
                  </span>
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-100 flex justify-end">
              <button
                onClick={() => setSelectedWhy(null)}
                className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
