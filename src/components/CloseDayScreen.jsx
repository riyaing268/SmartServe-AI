import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Trash2, 
  Coins, 
  Leaf, 
  Clock, 
  Save, 
  AlertCircle, 
  Layers, 
  RotateCcw,
  Sparkles
} from 'lucide-react';
import { api } from '../api';

export default function CloseDayScreen({ currentDate, currentSlot, onNavigateToTab }) {
  const [actualAttendance, setActualAttendance] = useState(1200);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadData();
  }, [currentDate, currentSlot]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ctx = await api.getContext(currentDate, currentSlot);
      setActualAttendance(ctx.actual_attendance || ctx.expected_attendance || 1200);

      const recs = await api.getRecommendations(currentDate, currentSlot);
      const rows = recs.map((r) => {
        const prep = r.manager_override_qty !== null && r.manager_override_qty !== undefined ? r.manager_override_qty : r.recommended_qty;
        const sold = Math.max(0, Math.floor(prep * 0.90));
        const left = Math.max(0, prep - sold);
        return {
          item_id: r.item_id,
          name: r.item_name,
          category: r.category,
          cost_per_portion_inr: r.cost_per_portion_inr,
          prepared_qty: prep,
          sold_qty: sold,
          leftover_qty: left,
          stockout_time: '',
          is_reusable: r.usable_leftover > 0 || ['Pav Bhaji', 'Veg Biryani', 'Chapati Meal', 'Gulab Jamun', 'Rajma Chawal'].includes(r.item_name)
        };
      });
      setItems(rows);
    } catch (err) {
      console.error('Failed to load close day data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (itemId, field, value) => {
    const updated = items.map((it) => {
      if (it.item_id === itemId) {
        const copy = { ...it, [field]: value };
        if (field === 'prepared_qty' || field === 'sold_qty') {
          const prep = parseInt(field === 'prepared_qty' ? value : copy.prepared_qty) || 0;
          const sold = parseInt(field === 'sold_qty' ? value : copy.sold_qty) || 0;
          copy.leftover_qty = Math.max(0, prep - sold);
        }
        return copy;
      }
      return it;
    });
    setItems(updated);
  };

  const handleCloseDay = async () => {
    setSaving(true);
    try {
      const payload = {
        date: currentDate,
        meal_slot: currentSlot,
        actual_attendance: parseInt(actualAttendance) || 1000,
        items: items.map((i) => ({
          item_id: i.item_id,
          prepared_qty: parseInt(i.prepared_qty) || 0,
          sold_qty: parseInt(i.sold_qty) || 0,
          leftover_qty: parseInt(i.leftover_qty) || 0,
          stockout_time: i.stockout_time ? i.stockout_time : null,
        })),
      };
      const res = await api.closeDay(payload);
      setSummary(res);
    } catch (err) {
      console.error('Failed to close day:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Title Card */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Close the Shift & Log Leftover Food</h2>
          <p className="text-xs text-stone-500">
            Log final prepared, sold, and unserved portions. Reusable leftovers will automatically carry over to tomorrow's stock.
          </p>
        </div>

        {/* Actual Attendance Input */}
        <div className="flex items-center space-x-3 bg-stone-50 px-4 py-2 rounded-xl border border-stone-200">
          <span className="text-xs font-semibold text-stone-600">Actual Diners Served:</span>
          <input
            type="number"
            value={actualAttendance}
            onChange={(e) => setActualAttendance(e.target.value)}
            className="w-24 bg-white border border-stone-300 rounded-lg px-2.5 py-1 text-sm font-bold text-stone-900 focus:outline-none"
          />
        </div>
      </div>

      {/* Waste Summary Card after Saving */}
      {summary && (
        <div className="bg-gradient-to-r from-emerald-900 to-teal-900 text-white p-6 rounded-2xl shadow-md border border-emerald-800 animate-in fade-in duration-200">
          <div className="flex items-center space-x-2 mb-4">
            <CheckCircle2 className="w-5 h-5 text-emerald-300" />
            <h3 className="text-base font-bold text-emerald-100">Service Shift Successfully Closed!</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-[11px] text-emerald-200 uppercase font-semibold">Total Prepared</span>
              <div className="text-2xl font-black text-white">{summary.total_prepared.toLocaleString()}</div>
              <span className="text-[10px] text-emerald-300">{summary.total_sold} sold</span>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-[11px] text-emerald-200 uppercase font-semibold">Surplus Food Leftover</span>
              <div className="text-2xl font-black text-amber-300">{summary.waste_kg} kg</div>
              <span className="text-[10px] text-emerald-300">{summary.total_leftover} portions ({summary.waste_percentage}%)</span>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-[11px] text-emerald-200 uppercase font-semibold">Financial Waste Cost</span>
              <div className="text-2xl font-black text-white">₹{summary.waste_inr.toLocaleString()}</div>
              <span className="text-[10px] text-emerald-300">Portion ingredient cost</span>
            </div>

            <div className="bg-white/10 p-3 rounded-xl border border-white/10">
              <span className="text-[11px] text-emerald-200 uppercase font-semibold">CO2e Emissions</span>
              <div className="text-2xl font-black text-emerald-200">{summary.co2e_kg} kg</div>
              <span className="text-[10px] text-emerald-300">Food life cycle footprint</span>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-emerald-800/60 flex items-center justify-between text-xs text-emerald-200">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Usable leftovers stored in inventory. Tomorrow's recommendations will automatically deduct them.</span>
            </div>
            <button
              onClick={() => onNavigateToTab('dashboard')}
              className="px-3 py-1.5 bg-white text-emerald-900 font-bold rounded-lg hover:bg-emerald-50 transition-colors"
            >
              View Analytics Dashboard →
            </button>
          </div>
        </div>
      )}

      {/* Closing Entry Grid */}
      <div className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 border-b border-stone-200 text-xs font-semibold text-stone-600 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Menu Item</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-4">Prepared Qty</th>
                <th className="py-3 px-4">Sold Qty</th>
                <th className="py-3 px-4">Leftover Qty</th>
                <th className="py-3 px-4">Stock-out Time (if any)</th>
                <th className="py-3 px-4 text-right">Reuse Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => (
                <tr key={item.item_id} className="hover:bg-stone-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-stone-900">{item.name}</td>
                  <td className="py-3.5 px-3 capitalize text-xs text-stone-500">{item.category}</td>
                  
                  {/* Prepared */}
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      value={item.prepared_qty}
                      onChange={(e) => handleFieldChange(item.item_id, 'prepared_qty', e.target.value)}
                      className="w-20 px-2.5 py-1 text-sm font-bold border border-stone-300 rounded-lg text-center focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </td>

                  {/* Sold */}
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      value={item.sold_qty}
                      onChange={(e) => handleFieldChange(item.item_id, 'sold_qty', e.target.value)}
                      className="w-20 px-2.5 py-1 text-sm font-bold border border-emerald-300 bg-emerald-50/50 rounded-lg text-center text-emerald-900 focus:ring-1 focus:ring-emerald-500 focus:outline-none"
                    />
                  </td>

                  {/* Leftover */}
                  <td className="py-3.5 px-4">
                    <input
                      type="number"
                      value={item.leftover_qty}
                      onChange={(e) => handleFieldChange(item.item_id, 'leftover_qty', e.target.value)}
                      className={`w-20 px-2.5 py-1 text-sm font-bold border rounded-lg text-center focus:outline-none ${
                        item.leftover_qty > 0 ? 'border-amber-300 bg-amber-50 text-amber-900 font-extrabold' : 'border-stone-200 text-stone-500'
                      }`}
                    />
                  </td>

                  {/* Stockout Time */}
                  <td className="py-3.5 px-4">
                    <input
                      type="text"
                      placeholder="e.g. 13:45"
                      value={item.stockout_time}
                      onChange={(e) => handleFieldChange(item.item_id, 'stockout_time', e.target.value)}
                      className="w-28 px-2.5 py-1 text-xs border border-stone-300 rounded-lg focus:outline-none placeholder:text-stone-300"
                    />
                  </td>

                  {/* Reuse status */}
                  <td className="py-3.5 px-4 text-right">
                    {item.is_reusable ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                        <Layers className="w-3 h-3 text-emerald-600" /> Safe to Carry Over
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium text-stone-400 bg-stone-100">
                        Non-reusable
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-50 border-t border-stone-200 flex items-center justify-between">
          <span className="text-xs text-stone-500">
            End of service log feeds the machine learning model to reduce future over-preparation.
          </span>
          <button
            onClick={handleCloseDay}
            disabled={saving}
            className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Closing Shift & Saving...' : 'Confirm & Close Shift'}
          </button>
        </div>
      </div>
    </div>
  );
}
