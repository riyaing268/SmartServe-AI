import React from 'react';
import { 
  Utensils, 
  Calendar, 
  Clock, 
  ShieldCheck, 
  Sparkles, 
  BarChart3, 
  FileText, 
  MessageSquare, 
  Database, 
  Settings, 
  CheckCircle2,
  Timer
} from 'lucide-react';

export default function Header({ 
  currentDate, 
  setCurrentDate, 
  currentSlot, 
  setCurrentSlot, 
  activeTab, 
  setActiveTab, 
  role, 
  setRole,
  onSeedDemo,
  isSeeding
}) {
  const mealSlots = [
    { id: 'breakfast', label: 'Breakfast', time: '08:00 - 10:30' },
    { id: 'lunch', label: 'Lunch', time: '12:00 - 14:30' },
    { id: 'snacks', label: 'Snacks & Tea', time: '16:00 - 18:30' },
    { id: 'dinner', label: 'Dinner', time: '19:30 - 21:30' },
  ];

  const tabs = [
    { id: 'today', label: 'Today (Prep Plan)', icon: Calendar, roles: ['manager', 'kitchen', 'admin'] },
    { id: 'midservice', label: 'Mid-Service', icon: Timer, roles: ['manager', 'kitchen'] },
    { id: 'closeday', label: 'Close the Day', icon: CheckCircle2, roles: ['manager'] },
    { id: 'prepsheet', label: 'Kitchen Prep Sheet', icon: FileText, roles: ['manager', 'kitchen', 'admin'] },
    { id: 'dashboard', label: 'Dashboard & Impact', icon: BarChart3, roles: ['manager', 'admin'] },
    { id: 'chat', label: 'Ask SmartServe', icon: MessageSquare, roles: ['manager', 'admin'] },
    { id: 'datamenu', label: 'Data & Menu', icon: Database, roles: ['manager', 'admin'] },
    { id: 'settings', label: 'Settings', icon: Settings, roles: ['manager', 'admin'] },
  ];

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs no-print">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
              <Utensils className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-xl tracking-tight text-stone-900">SmartServe</span>
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-emerald-600" /> AI Agent
                </span>
              </div>
              <p className="text-xs text-stone-500 font-medium">Campus Food Waste Reduction & Kitchen Intelligence</p>
            </div>
          </div>

          {/* Quick Context Selectors */}
          <div className="flex items-center space-x-3">
            {/* Date Picker */}
            <div className="flex items-center bg-stone-100 px-3 py-1.5 rounded-lg border border-stone-200">
              <Calendar className="w-4 h-4 text-stone-500 mr-2" />
              <input 
                type="date"
                value={currentDate}
                onChange={(e) => setCurrentDate(e.target.value)}
                className="bg-transparent text-sm font-medium text-stone-800 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Meal Slot Selector */}
            <div className="flex bg-stone-100 p-1 rounded-lg border border-stone-200">
              {mealSlots.map((slot) => (
                <button
                  key={slot.id}
                  onClick={() => setCurrentSlot(slot.id)}
                  className={`px-3 py-1 text-xs font-medium rounded-md transition-all ${
                    currentSlot === slot.id
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {slot.label}
                </button>
              ))}
            </div>

            {/* Role Switcher */}
            <div className="flex items-center space-x-1 pl-2 border-l border-stone-200">
              <ShieldCheck className="w-4 h-4 text-stone-400" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="bg-stone-50 border border-stone-200 text-xs font-medium text-stone-700 py-1.5 px-2 rounded-lg focus:ring-1 focus:ring-emerald-500"
              >
                <option value="manager">Role: Canteen Manager</option>
                <option value="kitchen">Role: Kitchen Staff</option>
                <option value="admin">Role: Sustainability Admin</option>
              </select>
            </div>

            {/* Quick Demo Seed */}
            <button
              onClick={onSeedDemo}
              disabled={isSeeding}
              className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Database className="w-3.5 h-3.5 text-emerald-600" />
              {isSeeding ? 'Seeding...' : 'Load Demo (90d)'}
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 border-t border-stone-100 overflow-x-auto scrollbar-none py-1">
          {tabs
            .filter((t) => t.roles.includes(role))
            .map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-stone-600 hover:bg-stone-100 hover:text-stone-900'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
        </div>
      </div>
    </header>
  );
}
