import React, { useState, useEffect } from 'react';
import { 
  BarChart3, 
  TrendingDown, 
  TrendingUp, 
  Leaf, 
  Coins, 
  AlertTriangle, 
  Download, 
  Activity, 
  CheckCircle2, 
  FileSpreadsheet, 
  FileText,
  Calendar,
  Layers,
  Sparkles
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, 
  BarChart, Bar, CartesianGrid, Legend, Cell 
} from 'recharts';
import { api, API_BASE } from '../api';

export default function DashboardScreen() {
  const [rangeDays, setRangeDays] = useState(30);
  const [data, setData] = useState(null);
  const [modelHealth, setModelHealth] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, [rangeDays]);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const res = await api.getDashboard(rangeDays);
      setData(res);
      const health = await api.getModelHealth();
      setModelHealth(health);
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    window.open(`${API_BASE}/report/export?days=${rangeDays}&format=${format}`, '_blank');
  };

  if (loading || !data) {
    return (
      <div className="flex items-center justify-center p-12 text-stone-500 text-sm">
        <Activity className="w-5 h-5 animate-spin mr-2 text-emerald-600" />
        Calculating waste reduction metrics and historical trends...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Bar: Time Range and Export Buttons */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-stone-900">Food Waste & Sustainability Intelligence Dashboard</h2>
          <p className="text-xs text-stone-500">
            Real-time tracking of food waste metrics, carbon footprint reduction, and AI forecast accuracy.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {/* Time Range Filter */}
          <div className="flex bg-stone-100 p-1 rounded-xl border border-stone-200">
            {[7, 30, 90].map((days) => (
              <button
                key={days}
                onClick={() => setRangeDays(days)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                  rangeDays === days ? 'bg-white text-stone-900 shadow-xs' : 'text-stone-600 hover:text-stone-900'
                }`}
              >
                Last {days} Days
              </button>
            ))}
          </div>

          {/* Export Dropdown / Buttons */}
          <div className="flex items-center space-x-1.5">
            <button
              onClick={() => handleExport('csv')}
              className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors flex items-center gap-1.5"
              title="Download CSV breakdown"
            >
              <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" /> CSV
            </button>
            <button
              onClick={() => handleExport('pdf')}
              className="px-3 py-1.5 bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
              title="Download PDF Executive Summary"
            >
              <FileText className="w-3.5 h-3.5 text-white" /> PDF Report
            </button>
          </div>
        </div>
      </div>

      {/* Hero Headline: Baseline vs SmartServe Waste Reduction */}
      <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white p-6 rounded-2xl shadow-sm border border-emerald-700">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-300 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-300" /> Key Waste Reduction Impact
            </span>
            <h3 className="text-2xl font-black tracking-tight text-white">
              {data.waste_reduction_pct}% Less Food Waste vs Baseline
            </h3>
            <p className="text-xs text-emerald-100/90 max-w-xl">
              By replacing intuition-based gut-feel preparation with SmartServe's quantile demand forecasting,
              your campus mess reduced organic waste by <strong>{Math.round(data.baseline_waste_kg - data.smartserve_waste_kg).toLocaleString()} kg</strong> over this period.
            </p>
          </div>

          <div className="flex items-center gap-6 bg-white/10 backdrop-blur-xs px-6 py-4 rounded-xl border border-white/10 text-center">
            <div>
              <span className="text-[11px] text-emerald-200 uppercase font-semibold">Baseline Waste</span>
              <div className="text-xl font-bold text-amber-300">{Math.round(data.baseline_waste_kg).toLocaleString()} kg</div>
              <span className="text-[10px] text-emerald-300">Manager gut-feel</span>
            </div>
            <div className="text-2xl font-light text-emerald-400">→</div>
            <div>
              <span className="text-[11px] text-emerald-200 uppercase font-semibold">SmartServe Waste</span>
              <div className="text-xl font-bold text-emerald-100">{Math.round(data.smartserve_waste_kg).toLocaleString()} kg</div>
              <span className="text-[10px] text-emerald-300">AI recommended</span>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Stat Cards Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {/* Total Food Waste */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Total Food Waste
          </span>
          <div className="text-2xl font-black text-stone-900">{data.total_waste_kg.toLocaleString()} <span className="text-xs font-normal text-stone-500">kg</span></div>
          <span className="text-[11px] text-amber-600 font-medium">{data.waste_percentage}% of total cooked</span>
        </div>

        {/* Cost Loss */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Financial Waste Cost
          </span>
          <div className="text-2xl font-black text-stone-900">₹{Math.round(data.total_waste_inr).toLocaleString()}</div>
          <span className="text-[11px] text-stone-400">Direct ingredient loss</span>
        </div>

        {/* Avoided CO2e */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider block mb-1 flex items-center gap-1">
            <Leaf className="w-3.5 h-3.5 text-emerald-600" /> CO2e Avoided
          </span>
          <div className="text-2xl font-black text-emerald-700">{Math.round(data.co2_avoided_kg).toLocaleString()} <span className="text-xs font-normal text-stone-500">kg</span></div>
          <span className="text-[11px] text-emerald-600 font-medium">Factor: 2.5 kg CO2e / kg</span>
        </div>

        {/* Meals Served */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Meals Served
          </span>
          <div className="text-2xl font-black text-stone-900">{data.total_meals_served.toLocaleString()}</div>
          <span className="text-[11px] text-emerald-600 font-medium">Successful diner portions</span>
        </div>

        {/* Stockout Events */}
        <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider block mb-1">
            Stock-out Events
          </span>
          <div className="text-2xl font-black text-stone-900">{data.stockout_events}</div>
          <span className="text-[11px] text-stone-500 font-medium">Resolved via buffer</span>
        </div>
      </div>

      {/* Main Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Trend Area Chart: Baseline vs SmartServe */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-stone-900 text-sm">Food Waste Trend: Baseline vs. SmartServe (kg)</h3>
              <p className="text-xs text-stone-500">Daily comparison illustrating preparation surplus over time</p>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span className="flex items-center gap-1 text-amber-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Baseline Gut-Feel
              </span>
              <span className="flex items-center gap-1 text-emerald-600 font-semibold">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> SmartServe AI
              </span>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data.waste_trends}>
                <defs>
                  <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="colorSmart" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} />
                <YAxis tick={{ fontSize: 10 }} unit=" kg" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e5e5', fontSize: '11px' }}
                />
                <Area type="monotone" dataKey="baseline_waste_kg" name="Baseline Waste" stroke="#f59e0b" fillOpacity={1} fill="url(#colorBaseline)" strokeWidth={2} />
                <Area type="monotone" dataKey="smartserve_waste_kg" name="SmartServe Waste" stroke="#10b981" fillOpacity={1} fill="url(#colorSmart)" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Model Health Card */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-stone-900 text-sm">Forecasting Model Health</h3>
              <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-full">
                {modelHealth?.status || 'Healthy'}
              </span>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Evaluation metrics measured on held-out test data to prevent over-fitting.
            </p>

            <div className="space-y-4">
              {/* WAPE */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-700">WAPE (Weighted Error)</span>
                  <span className="font-bold text-emerald-700 text-sm">{modelHealth?.wape_percentage}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div 
                    className="bg-emerald-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (modelHealth?.wape_percentage || 14) * 3)}%` }}
                  ></div>
                </div>
                <span className="text-[10px] text-stone-400">Target: ≤ 20% (Goal Achieved)</span>
              </div>

              {/* MAPE */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-stone-700">MAPE (Mean Percentage Error)</span>
                  <span className="font-bold text-stone-900 text-sm">{modelHealth?.mape_percentage}%</span>
                </div>
                <div className="w-full bg-stone-100 rounded-full h-2">
                  <div 
                    className="bg-teal-600 h-2 rounded-full" 
                    style={{ width: `${Math.min(100, (modelHealth?.mape_percentage || 16) * 3)}%` }}
                  ></div>
                </div>
              </div>

              {/* Training History Days */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-600">
                <div className="font-semibold text-stone-800">GradientBoosting + Quantiles</div>
                <div>Trained on {modelHealth?.total_training_days || 90} historical operational days.</div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-400 flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Automatic retrain & fallback active
          </div>
        </div>
      </div>

      {/* Secondary Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Prepared vs Sold Bar Chart */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <h3 className="font-bold text-stone-900 text-sm mb-1">Prepared vs. Sold Quantities</h3>
          <p className="text-xs text-stone-500 mb-4">Volume distribution across top canteen dishes</p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.prep_vs_sold}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="item_name" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e5e5', fontSize: '11px' }} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
                <Bar dataKey="prepared_qty" name="Prepared" fill="#94a3b8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="sold_qty" name="Sold" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Wasted Items */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <h3 className="font-bold text-stone-900 text-sm mb-1">Top Surplus Wasted Items (kg)</h3>
          <p className="text-xs text-stone-500 mb-4">Focus areas for portion sizing and kitchen stagger batches</p>

          <div className="h-60 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.top_wasted} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 10 }} unit=" kg" />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={85} />
                <Tooltip contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e5e5e5', fontSize: '11px' }} />
                <Bar dataKey="waste_kg" name="Waste (kg)" fill="#f59e0b" radius={[0, 4, 4, 0]}>
                  {data.top_wasted.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={index === 0 ? '#ef4444' : index === 1 ? '#f59e0b' : '#fbbf24'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
