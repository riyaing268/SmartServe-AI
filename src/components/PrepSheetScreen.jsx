import React, { useState, useEffect } from 'react';
import { 
  Printer, 
  ChefHat, 
  Clock, 
  Layers, 
  AlertCircle, 
  Scale, 
  Calendar,
  CheckSquare
} from 'lucide-react';
import { api } from '../api';

export default function PrepSheetScreen({ currentDate, currentSlot }) {
  const [recommendations, setRecommendations] = useState([]);
  const [context, setContext] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkedItems, setCheckedItems] = useState({});

  useEffect(() => {
    loadData();
  }, [currentDate, currentSlot]);

  const loadData = async () => {
    setLoading(true);
    try {
      const ctx = await api.getContext(currentDate, currentSlot);
      setContext(ctx);
      const recs = await api.getRecommendations(currentDate, currentSlot);
      setRecommendations(recs);
    } catch (err) {
      console.error('Failed to load prep sheet data:', err);
    } finally {
      setLoading(false);
    }
  };

  const toggleCheck = (id) => {
    setCheckedItems((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const calculateTiming = (slot, idx) => {
    // Generate realistic kitchen staging times based on slot
    const slotTimes = {
      breakfast: ['07:00 AM', '07:30 AM', '08:00 AM', '08:30 AM'],
      lunch: ['10:45 AM', '11:15 AM', '11:45 AM', '12:15 PM'],
      snacks: ['15:00 PM', '15:30 PM', '16:00 PM', '16:30 PM'],
      dinner: ['18:15 PM', '18:45 PM', '19:15 PM', '19:45 PM']
    };
    const times = slotTimes[slot] || slotTimes.lunch;
    return times[idx % times.length];
  };

  return (
    <div className="space-y-6">
      {/* Header Banner - hidden during print */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex items-center justify-between no-print">
        <div className="flex items-center space-x-3">
          <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-800">
            <ChefHat className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-stone-900">Kitchen Printable Prep Sheet</h2>
            <p className="text-xs text-stone-500">
              Clear batch schedule for kitchen cooking staff. Formatted for paper printouts or kitchen mobile view.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.print()}
          className="px-5 py-2.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
        >
          <Printer className="w-4 h-4" /> Print Prep Sheet
        </button>
      </div>

      {/* Printable Sheet Container */}
      <div className="bg-white p-8 rounded-2xl border border-stone-200 shadow-xs print:shadow-none print:border-none print:p-0">
        {/* Printable Header */}
        <div className="border-b-2 border-stone-800 pb-4 mb-6">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-2xl font-black text-stone-900 uppercase tracking-tight">SmartServe Kitchen Prep Sheet</h1>
              <div className="flex items-center gap-4 text-xs font-semibold text-stone-600 mt-1">
                <span>DATE: {currentDate}</span>
                <span>•</span>
                <span className="uppercase">MEAL SLOT: {currentSlot}</span>
                <span>•</span>
                <span>EXPECTED DINERS: {context?.expected_attendance || 1200}</span>
                <span>•</span>
                <span className="capitalize">WEATHER: {context?.weather || 'Cool'}</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs font-bold px-3 py-1 bg-stone-100 border border-stone-300 rounded-md uppercase">
                {currentSlot} Service
              </span>
            </div>
          </div>
        </div>

        {/* Prep Tasks Table */}
        <table className="w-full text-left text-sm border-collapse">
          <thead>
            <tr className="border-b-2 border-stone-700 text-xs font-bold uppercase text-stone-800">
              <th className="py-2.5 px-3 w-10">Done</th>
              <th className="py-2.5 px-3">Item Description</th>
              <th className="py-2.5 px-3">Category</th>
              <th className="py-2.5 px-3">Total Target</th>
              <th className="py-2.5 px-3">Batch Plan</th>
              <th className="py-2.5 px-3">Start Cooking</th>
              <th className="py-2.5 px-3">Portion Size</th>
              <th className="py-2.5 px-3">Kitchen Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-200">
            {recommendations.map((rec, idx) => {
              const effectiveQty = rec.manager_override_qty !== null && rec.manager_override_qty !== undefined
                ? rec.manager_override_qty
                : rec.recommended_qty;
              const batches = Math.ceil(effectiveQty / rec.batch_size);
              const isChecked = checkedItems[rec.id];
              const startTime = calculateTiming(currentSlot, idx);

              return (
                <tr 
                  key={rec.id} 
                  className={`hover:bg-stone-50/80 transition-colors ${isChecked ? 'bg-emerald-50/30' : ''}`}
                >
                  {/* Done checkbox */}
                  <td className="py-3 px-3">
                    <input
                      type="checkbox"
                      checked={!!isChecked}
                      onChange={() => toggleCheck(rec.id)}
                      className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </td>

                  {/* Item Description */}
                  <td className="py-3 px-3 font-bold text-stone-900">
                    <div className={isChecked ? 'line-through text-stone-400' : ''}>
                      {rec.item_name}
                    </div>
                  </td>

                  {/* Category */}
                  <td className="py-3 px-3 text-xs capitalize text-stone-600">
                    {rec.category}
                  </td>

                  {/* Total Target */}
                  <td className="py-3 px-3 font-extrabold text-base text-stone-900">
                    {effectiveQty} <span className="text-xs font-normal text-stone-500">portions</span>
                  </td>

                  {/* Batch Plan */}
                  <td className="py-3 px-3">
                    <span className="font-semibold text-stone-800 bg-stone-100 px-2 py-0.5 rounded text-xs">
                      {batches} batches × {rec.batch_size}
                    </span>
                  </td>

                  {/* Scheduled Cooking Time */}
                  <td className="py-3 px-3 font-semibold text-xs text-stone-700">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-stone-400" />
                      {startTime}
                    </div>
                  </td>

                  {/* Portion Size */}
                  <td className="py-3 px-3 text-xs text-stone-600">
                    {rec.item_name === 'Masala Chai' ? '120 ml' : rec.item_name === 'Cold Coffee' ? '220 ml' : '150–350g'}
                  </td>

                  {/* Notes / Stagger Instructions */}
                  <td className="py-3 px-3 text-xs text-stone-600 max-w-xs">
                    {batches > 1 ? (
                      <span className="text-emerald-700 font-medium">
                        Stage in 2 batches (60% at {startTime}, 40% on mid-service demand).
                      </span>
                    ) : (
                      <span>Cook single batch on schedule.</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Printable Footer / Signoff */}
        <div className="mt-8 pt-4 border-t border-stone-300 grid grid-cols-2 gap-8 text-xs text-stone-600">
          <div>
            <span className="font-bold block mb-4">Kitchen Head Sign-Off:</span>
            <div className="border-b border-stone-400 w-48 h-6"></div>
          </div>
          <div className="text-right">
            <span className="font-bold block mb-4">Shift Manager Sign-Off:</span>
            <div className="border-b border-stone-400 w-48 h-6 ml-auto"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
