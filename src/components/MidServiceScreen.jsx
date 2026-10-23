import React, { useState, useEffect } from 'react';
import { 
  Timer, 
  Flame, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw, 
  ChefHat, 
  TrendingDown, 
  TrendingUp, 
  Zap,
  Clock
} from 'lucide-react';
import { api } from '../api';

export default function MidServiceScreen({ currentDate, currentSlot }) {
  const [minutesRemaining, setMinutesRemaining] = useState(45);
  const [items, setItems] = useState([]);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);

  useEffect(() => {
    loadItems();
  }, [currentDate, currentSlot]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const recs = await api.getRecommendations(currentDate, currentSlot);
      // Initialize items with prepared qty from recommendations/overrides
      const formatted = recs.map((r) => {
        const prep = r.manager_override_qty !== null && r.manager_override_qty !== undefined ? r.manager_override_qty : r.recommended_qty;
        // Estimate initial sold count around 50-60% for a mid-shift check
        const initialSold = Math.floor(prep * 0.55);
        return {
          item_id: r.item_id,
          item_name: r.item_name,
          category: r.category,
          batch_size: r.batch_size,
          prepared_qty: prep,
          sold_so_far: initialSold,
        };
      });
      setItems(formatted);
      runMidServiceForecast(formatted, minutesRemaining);
    } catch (err) {
      console.error('Failed to load mid-service items:', err);
    } finally {
      setLoading(false);
    }
  };

  const runMidServiceForecast = async (itemsToRun, minutes) => {
    setCalculating(true);
    try {
      const payload = {
        date: currentDate,
        meal_slot: currentSlot,
        minutes_remaining: minutes,
        items: itemsToRun.map((i) => ({
          item_id: i.item_id,
          sold_so_far: parseInt(i.sold_so_far) || 0,
          prepared_qty: parseInt(i.prepared_qty) || 0,
        })),
      };
      const res = await api.midServiceForecast(payload);
      setResults(res.recommendations);
    } catch (err) {
      console.error('Mid service forecast error:', err);
    } finally {
      setCalculating(false);
    }
  };

  const handleSoldCountChange = (itemId, val) => {
    const updated = items.map((it) => {
      if (it.item_id === itemId) {
        return { ...it, sold_so_far: Math.max(0, parseInt(val) || 0) };
      }
      return it;
    });
    setItems(updated);
    runMidServiceForecast(updated, minutesRemaining);
  };

  const handlePrepCountChange = (itemId, val) => {
    const updated = items.map((it) => {
      if (it.item_id === itemId) {
        return { ...it, prepared_qty: Math.max(0, parseInt(val) || 0) };
      }
      return it;
    });
    setItems(updated);
    runMidServiceForecast(updated, minutesRemaining);
  };

  const handleMinutesChange = (newMinutes) => {
    setMinutesRemaining(newMinutes);
    runMidServiceForecast(items, newMinutes);
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
              <Timer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-stone-900">Mid-Service Dynamic Demand Tracker</h2>
              <p className="text-xs text-stone-500">
                Log live sales counts during shift to calculate rush run-rate and trigger cooking batches or stop signals.
              </p>
            </div>
          </div>
        </div>

        {/* Minutes Remaining Slider */}
        <div className="flex items-center space-x-4 bg-stone-50 px-4 py-2.5 rounded-xl border border-stone-200 w-full md:w-auto">
          <Clock className="w-4 h-4 text-stone-500" />
          <div className="flex flex-col">
            <span className="text-[11px] font-semibold text-stone-500 uppercase">Service Time Remaining</span>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min="10"
                max="120"
                step="5"
                value={minutesRemaining}
                onChange={(e) => handleMinutesChange(parseInt(e.target.value))}
                className="w-32 accent-emerald-600 cursor-pointer"
              />
              <span className="text-sm font-bold text-stone-900 w-16">{minutesRemaining} mins</span>
            </div>
          </div>
          <button
            onClick={() => runMidServiceForecast(items, minutesRemaining)}
            disabled={calculating}
            className="p-1.5 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg shadow-xs"
            title="Recalculate now"
          >
            <RefreshCw className={`w-4 h-4 ${calculating ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Items */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item) => {
          const res = results?.find((r) => r.item_id === item.item_id);
          const remainingStock = Math.max(0, item.prepared_qty - item.sold_so_far);
          const isExtraBatch = res && res.suggested_additional_batches > 0;
          const isStopCooking = res && res.action.includes('Stop cooking');

          return (
            <div
              key={item.item_id}
              className={`p-5 rounded-2xl border transition-all ${
                isExtraBatch
                  ? 'bg-rose-50/50 border-rose-200 ring-1 ring-rose-200'
                  : isStopCooking
                  ? 'bg-amber-50/50 border-amber-200 ring-1 ring-amber-200'
                  : 'bg-white border-stone-200 shadow-xs'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-stone-900 text-base">{item.item_name}</h3>
                  <span className="text-[11px] text-stone-400 capitalize">{item.category} • Batch: {item.batch_size}</span>
                </div>
                {res && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    res.urgency === 'High'
                      ? 'bg-rose-600 text-white'
                      : res.urgency === 'Normal' && isStopCooking
                      ? 'bg-amber-600 text-white'
                      : 'bg-stone-200 text-stone-700'
                  }`}>
                    {res.urgency} Urgency
                  </span>
                )}
              </div>

              {/* Progress and Numbers */}
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="bg-stone-100 p-2 rounded-xl">
                    <span className="block text-stone-400 text-[10px] uppercase font-semibold">Prepared</span>
                    <input
                      type="number"
                      value={item.prepared_qty}
                      onChange={(e) => handlePrepCountChange(item.item_id, e.target.value)}
                      className="w-full text-center font-bold text-stone-800 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 p-2 rounded-xl">
                    <span className="block text-emerald-700 text-[10px] uppercase font-semibold">Sold So Far</span>
                    <input
                      type="number"
                      value={item.sold_so_far}
                      onChange={(e) => handleSoldCountChange(item.item_id, e.target.value)}
                      className="w-full text-center font-bold text-emerald-900 bg-transparent focus:outline-none"
                    />
                  </div>
                  <div className="bg-stone-100 p-2 rounded-xl">
                    <span className="block text-stone-400 text-[10px] uppercase font-semibold">Remaining</span>
                    <span className="font-bold text-stone-800 text-sm">{remainingStock}</span>
                  </div>
                </div>

                {/* Action Alert Banner */}
                {res && (
                  <div className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
                    isExtraBatch
                      ? 'bg-rose-600 text-white shadow-xs'
                      : isStopCooking
                      ? 'bg-amber-100 text-amber-900 border border-amber-300'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                  }`}>
                    {isExtraBatch && <Flame className="w-4 h-4 text-white shrink-0 animate-pulse" />}
                    {isStopCooking && <AlertCircle className="w-4 h-4 text-amber-700 shrink-0" />}
                    {!isExtraBatch && !isStopCooking && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />}
                    <div className="leading-tight">
                      <div>{res.action}</div>
                      <div className="text-[10px] font-normal opacity-90 mt-0.5">
                        Projected remaining demand: ~{res.projected_remaining_demand} portions
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
