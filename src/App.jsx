import React, { useState } from 'react';
import Header from './components/Header';
import TodayScreen from './components/TodayScreen';
import MidServiceScreen from './components/MidServiceScreen';
import CloseDayScreen from './components/CloseDayScreen';
import PrepSheetScreen from './components/PrepSheetScreen';
import DashboardScreen from './components/DashboardScreen';
import ChatScreen from './components/ChatScreen';
import DataMenuScreen from './components/DataMenuScreen';
import SettingsScreen from './components/SettingsScreen';
import { api } from './api';

export default function App() {
  const getTodayStr = () => {
    const d = new Date();
    return d.toISOString().split('T')[0];
  };

  const [currentDate, setCurrentDate] = useState(getTodayStr());
  const [currentSlot, setCurrentSlot] = useState('lunch');
  const [activeTab, setActiveTab] = useState('today');
  const [role, setRole] = useState('manager');
  const [isSeeding, setIsSeeding] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleSeedDemo = async () => {
    setIsSeeding(true);
    try {
      const res = await api.seedDemo(90);
      showToast('Successfully seeded 90 days of realistic synthetic canteen data!');
      // Trigger refresh by updating date slightly or reloading tab
      window.location.reload();
    } catch (err) {
      alert('Failed to seed demo data: ' + err.message);
    } finally {
      setIsSeeding(false);
    }
  };

  const handleNavigateToTab = (tabId) => {
    setActiveTab(tabId);
  };

  return (
    <div className="min-h-screen bg-stone-50 flex flex-col text-stone-800">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-stone-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-stone-800 text-xs font-semibold flex items-center gap-2 animate-in slide-in-from-bottom duration-200">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
          {toastMessage}
        </div>
      )}

      {/* Navigation Header */}
      <Header
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        currentSlot={currentSlot}
        setCurrentSlot={setCurrentSlot}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        role={role}
        setRole={setRole}
        onSeedDemo={handleSeedDemo}
        isSeeding={isSeeding}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === 'today' && (
          <TodayScreen
            currentDate={currentDate}
            currentSlot={currentSlot}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === 'midservice' && (
          <MidServiceScreen
            currentDate={currentDate}
            currentSlot={currentSlot}
          />
        )}

        {activeTab === 'closeday' && (
          <CloseDayScreen
            currentDate={currentDate}
            currentSlot={currentSlot}
            onNavigateToTab={handleNavigateToTab}
          />
        )}

        {activeTab === 'prepsheet' && (
          <PrepSheetScreen
            currentDate={currentDate}
            currentSlot={currentSlot}
          />
        )}

        {activeTab === 'dashboard' && (
          <DashboardScreen />
        )}

        {activeTab === 'chat' && (
          <ChatScreen />
        )}

        {activeTab === 'datamenu' && (
          <DataMenuScreen
            onSeedDemo={handleSeedDemo}
            isSeeding={isSeeding}
          />
        )}

        {activeTab === 'settings' && (
          <SettingsScreen />
        )}
      </main>

      {/* Clean Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 text-center text-xs text-stone-500 no-print">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span className="font-semibold text-stone-700">SmartServe AI</span>
            <span>— Intelligent Canteen Waste Reduction Agent</span>
          </div>
          <div>
            Built for Sustainable Dining Halls • Target: 25–40% Food Waste Reduction
          </div>
        </div>
      </footer>
    </div>
  );
}
