"use client";

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Trash2, Utensils, Loader2, BrainCircuit, Activity, Info, ChevronDown, RefreshCw, Download } from 'lucide-react';
import UserProfile, { UserProfileData } from './UserProfile';
import HistorySidebar from './HistorySidebar';
import LoginModal from './LoginModal';

interface FoodItem {
  id: string;
  name: string;
  quantity_description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutritional_breakdown: Record<string, string>;
}

export default function CalorieTracker() {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [foods, setFoods] = useState<FoodItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [lastReasoning, setLastReasoning] = useState<string | null>(null);
  const [expandedFoodId, setExpandedFoodId] = useState<string | null>(null);

  // Auth State
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string | null>(null);

  // Profile State
  const [userProfile, setUserProfile] = useState<UserProfileData | null>(null);

  const fetchTodayLogs = async (uid: string) => {
    try {
      const res = await fetch(`/api/logs?userId=${uid}`);
      if (res.ok) {
        const allLogs = await res.json();
        const todayDate = new Date().toLocaleDateString('en-CA');
        const todayLog = allLogs.find((log: any) => log.date === todayDate);
        if (todayLog && todayLog.foods) {
          setFoods(todayLog.foods.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
        }
      }
    } catch (err) {
      console.error("Failed to fetch today's log", err);
    }
  };

  const handleLogin = (uid: string, name: string) => {
    setUserId(uid);
    setUserName(name);
    fetchTodayLogs(uid);
  };

  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset your daily progress?")) {
      setFoods([]);
      setLastReasoning(null);
      setError(null);
      setExpandedFoodId(null);

      if (userId) {
        fetch(`/api/logs?clearToday=true&userId=${userId}`, { method: 'DELETE' })
          .catch(err => console.error("Failed to clear DB logs", err));
      }
    }
  };

  const handleExport = () => {
    if (foods.length === 0) return;
    
    const headers = ['Name', 'Quantity', 'Calories (kcal)', 'Protein (g)', 'Carbs (g)', 'Fat (g)', 'Vitamin/Mineral Details'];
    
    const csvRows = foods.map(item => {
      const details = Object.entries(item.nutritional_breakdown || {})
        .map(([k, v]) => `${k}: ${v}`)
        .join(' | ');
        
      return [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${item.quantity_description.replace(/"/g, '""')}"`,
        item.calories,
        item.protein,
        item.carbs,
        item.fat,
        `"${details.replace(/"/g, '""')}"`
      ].join(',');
    });

    const csvContent = [headers.join(','), ...csvRows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const dateStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Daily_Nutrition_Log_${dateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dynamic Goals from Profile or Fallback
  const dailyGoal = userProfile?.calculatedTargets?.calories || 2000;
  const proteinGoal = userProfile?.calculatedTargets?.proteinGrams || 150;
  const carbsGoal = userProfile?.calculatedTargets?.carbsGrams || 200;
  const fatGoal = userProfile?.calculatedTargets?.fatGrams || 65;

  const totalCalories = foods.reduce((sum, item) => sum + item.calories, 0);
  const totalProtein = foods.reduce((sum, item) => sum + item.protein, 0);
  const totalCarbs = foods.reduce((sum, item) => sum + item.carbs, 0);
  const totalFat = foods.reduce((sum, item) => sum + item.fat, 0);

  const progress = Math.min((totalCalories / dailyGoal) * 100, 100);

  // Calculate circumference for SVG circle
  const radius = 60;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setLastReasoning(null);
    setExpandedFoodId(null);

    try {
      const response = await fetch('/api/parse-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ input }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to parse food');
      }

      setLastReasoning(data.reasoning || null);

      const newItems: FoodItem[] = (data.items || []).map((item: any) => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
        nutritional_breakdown: item.nutritional_breakdown || {}
      }));

      if (newItems.length === 0) {
        setError("I couldn't understand what food you ate. Could you be more specific?");
      } else {
        setFoods((prev) => [...newItems, ...prev]);
        setInput('');

        // Persist to database
        if (userId) {
          newItems.forEach(item => {
            fetch('/api/logs', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...item, userId }),
            }).catch(err => console.error("Failed to save to DB", err));
          });
        }
      }

    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  // Manual Entry State
  const [isManualMode, setIsManualMode] = useState(false);
  const [manualEntry, setManualEntry] = useState({
     name: '',
     calories: 0,
     protein: 0,
     carbs: 0,
     fat: 0
  });

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualEntry.name || manualEntry.calories <= 0) return;

    const newItem: FoodItem = {
      id: Math.random().toString(36).substr(2, 9),
      name: manualEntry.name,
      quantity_description: 'Custom Entry',
      calories: manualEntry.calories,
      protein: manualEntry.protein,
      carbs: manualEntry.carbs,
      fat: manualEntry.fat,
      nutritional_breakdown: {}
    };

    setFoods((prev) => [newItem, ...prev]);
    setManualEntry({ name: '', calories: 0, protein: 0, carbs: 0, fat: 0 });
    
    // Persist to database
    if (userId) {
      fetch('/api/logs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newItem, userId }),
      }).catch(err => console.error("Failed to save manual entry to DB", err));
    }
  };

  const removeFood = (id: string) => {
    setFoods((prev) => prev.filter((item) => item.id !== id));

    if (userId) {
      fetch(`/api/logs?id=${id}&userId=${userId}`, { method: 'DELETE' })
        .catch(err => console.error("Failed to delete from DB", err));
    }
  };
  
  const toggleExpand = (id: string) => {
    setExpandedFoodId(expandedFoodId === id ? null : id);
  };

  return (
    <div className="w-[92%] sm:w-full max-w-md mx-auto relative z-10">
      
      {!userId && <LoginModal onLogin={handleLogin} />}

      {userId && <HistorySidebar userId={userId} />}

      {/* User Profile Modal Component */}
      <UserProfile onProfileUpdate={setUserProfile} />

      {/* Daily Total Ring */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-[24px] p-8 shadow-sm ring-1 ring-slate-100 mb-8 flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div className="w-full flex items-center justify-between mb-6 z-10 px-2">
          <h2 className="text-slate-500 text-xs font-semibold tracking-wide uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-500" /> Daily Macros
          </h2>
          {foods.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="text-slate-500 hover:text-blue-600 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 hover:bg-blue-50 px-2.5 py-1.5 rounded-md"
                title="Export Log as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-50 hover:bg-red-50 px-2.5 py-1.5 rounded-md"
                title="Reset Daily Log"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                Reset
              </button>
            </div>
          )}
        </div>

        <div className="relative w-40 h-40 flex items-center justify-center mb-6 z-10">
          <svg className="transform -rotate-90 w-40 h-40">
            {/* Background Circle */}
            <circle
              cx="80"
              cy="80"
              r={radius}
              stroke="currentColor"
              strokeWidth="12"
              fill="transparent"
              className="text-slate-100"
            />
            {/* Progress Circle */}
            <motion.circle
              cx="80"
              cy="80"
              r={radius}
              stroke="url(#gradient)"
              strokeWidth="12"
              fill="transparent"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset }}
              transition={{ duration: 1, ease: "easeOut" }}
              strokeLinecap="round"
            />
            {/* Gradient Definition */}
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#3B82F6" /> {/* Blue 500 */}
                <stop offset="100%" stopColor="#6366F1" /> {/* Indigo 500 */}
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-extrabold text-slate-800 tracking-tight">
              {totalCalories}
            </span>
            <span className="text-xs text-slate-400 mt-0.5 font-medium">/ {dailyGoal} kcal</span>
          </div>
        </div>

        {/* Macro Summary with Goals */}
        <div className="grid grid-cols-3 gap-4 w-full text-center z-10 mt-2">
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Protein</span>
            <span className="text-slate-700 font-bold text-[17px] leading-none">{totalProtein}g</span>
            <span className="text-slate-400 text-[10px] mt-1 font-medium">/ {proteinGoal}g</span>
          </div>
          <div className="flex flex-col border-x border-slate-100">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Carbs</span>
            <span className="text-slate-700 font-bold text-[17px] leading-none">{totalCarbs}g</span>
            <span className="text-slate-400 text-[10px] mt-1 font-medium">/ {carbsGoal}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-1">Fat</span>
            <span className="text-slate-700 font-bold text-[17px] leading-none">{totalFat}g</span>
            <span className="text-slate-400 text-[10px] mt-1 font-medium">/ {fatGoal}g</span>
          </div>
        </div>

      </motion.div>

      {/* Input Form Toggle */}
      <div className="flex bg-slate-200/50 backdrop-blur-sm rounded-xl p-1 mb-4 w-64 mx-auto relative z-10">
         <button
            onClick={() => setIsManualMode(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-[10px] transition-all ${!isManualMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
            AI Assistant
         </button>
         <button
            onClick={() => setIsManualMode(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-[10px] transition-all ${isManualMode ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
         >
            Manual Entry
         </button>
      </div>

      {/* Input Form */}
      <motion.form
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        onSubmit={isManualMode ? handleManualSubmit : handleSubmit}
        className="relative mb-8"
      >
        <div className="relative flex flex-col bg-white rounded-2xl ring-1 ring-slate-200 overflow-hidden shadow-sm p-1">
          
          {!isManualMode ? (
            <div className="flex items-center w-full">
              <div className="pl-4 text-slate-400">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-blue-500" /> : <Utensils className="w-5 h-5" />}
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder='e.g., "2 Samosas and 1 Chai"'
                className="w-full bg-transparent px-4 py-4 text-slate-900 placeholder-slate-400 outline-none disabled:opacity-50 font-medium"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-4 bg-slate-50 hover:bg-slate-100 text-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2 border-l border-slate-200 font-bold"
              >
                Add
              </button>
            </div>
          ) : (
            <div className="p-4 flex flex-col gap-3">
               <input
                type="text"
                required
                value={manualEntry.name}
                onChange={(e) => setManualEntry({...manualEntry, name: e.target.value})}
                placeholder="Food Name (e.g., Protein Shake)"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 transition-colors font-medium"
               />
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                     <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold uppercase">kcal</span>
                     <input
                        type="number" required min="0" placeholder="0"
                        value={manualEntry.calories || ''}
                        onChange={(e) => setManualEntry({...manualEntry, calories: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-blue-400 transition-colors font-medium pr-10"
                     />
                     <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1 mt-1 block">Calories</label>
                  </div>
                  <div className="relative">
                     <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold uppercase">g</span>
                     <input
                        type="number" min="0" placeholder="0"
                        value={manualEntry.protein || ''}
                        onChange={(e) => setManualEntry({...manualEntry, protein: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-blue-400 transition-colors font-medium pr-8"
                     />
                     <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1 mt-1 block">Protein</label>
                  </div>
                  <div className="relative">
                     <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold uppercase">g</span>
                     <input
                        type="number" min="0" placeholder="0"
                        value={manualEntry.carbs || ''}
                        onChange={(e) => setManualEntry({...manualEntry, carbs: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-blue-400 transition-colors font-medium pr-8"
                     />
                     <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1 mt-1 block">Carbs</label>
                  </div>
                  <div className="relative">
                     <span className="absolute right-3 top-3 text-slate-400 text-xs font-bold uppercase">g</span>
                     <input
                        type="number" min="0" placeholder="0"
                        value={manualEntry.fat || ''}
                        onChange={(e) => setManualEntry({...manualEntry, fat: parseInt(e.target.value) || 0})}
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 outline-none focus:border-blue-400 transition-colors font-medium pr-8"
                     />
                     <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider ml-1 mt-1 block">Fat</label>
                  </div>
               </div>
               <button
                  type="submit"
                  disabled={!manualEntry.name || manualEntry.calories <= 0}
                  className="w-full mt-2 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
               >
                  Add Custom Food
               </button>
            </div>
          )}
        </div>
        {error && (
          <motion.p
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-red-400 text-sm mt-3 px-2 flex items-center gap-2"
          >
            {error}
          </motion.p>
        )}
      </motion.form>

      {/* AI Reasoning Display */}
      <AnimatePresence>
        {lastReasoning && !isLoading && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: 'auto', y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            className="mb-8"
          >
            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <BrainCircuit className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-blue-700 text-xs font-bold uppercase tracking-wider mb-1">AI Thoughts</h4>
                  <p className="text-blue-900/80 text-sm leading-relaxed font-medium">{lastReasoning}</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Food List */}
      <div className="space-y-4">
        <AnimatePresence>
          {foods.map((food, index) => (
            <motion.div
              key={food.id}
              initial={{ opacity: 0, x: -20, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              className="group bg-white ring-1 ring-slate-200 rounded-2xl p-5 hover:shadow-md transition-all relative overflow-hidden"
            >
              <div className="flex items-center justify-between mb-3 w-full">
                <div className="min-w-0 pr-4 flex-1">
                  <h3 className="text-slate-800 font-bold text-lg truncate flex items-center gap-2">
                    {food.name}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium truncate">{food.quantity_description}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-blue-600 font-black tabular-nums text-2xl">
                    {food.calories} <span className="text-blue-400 text-sm font-semibold">kcal</span>
                  </span>
                  <button
                    onClick={() => removeFood(food.id)}
                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 block md:hidden md:group-hover:block"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Macros Breakdown */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-slate-50 px-2.5 py-1rounded-lg ring-1 ring-slate-200 text-slate-500 font-medium">
                  P: <span className="font-bold text-slate-700">{food.protein}g</span>
                </div>
                <div className="bg-slate-50 px-2.5 py-1rounded-lg ring-1 ring-slate-200 text-slate-500 font-medium">
                  C: <span className="font-bold text-slate-700">{food.carbs}g</span>
                </div>
                <div className="bg-slate-50 px-2.5 py-1rounded-lg ring-1 ring-slate-200 text-slate-500 font-medium">
                  F: <span className="font-bold text-slate-700">{food.fat}g</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleExpand(food.id)}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold transition-colors ${expandedFoodId === food.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200 hover:text-slate-700'
                    }`}
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span>Details</span>
                  <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expandedFoodId === food.id ? 'rotate-180' : ''}`} />
                </button>
              </div>

              {/* Expandable Nutrition Details */}
              <AnimatePresence>
                {expandedFoodId === food.id && food.nutritional_breakdown && Object.keys(food.nutritional_breakdown).length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, height: 0, marginTop: 0 }}
                    animate={{ opacity: 1, height: 'auto', marginTop: 16 }}
                    exit={{ opacity: 0, height: 0, marginTop: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="bg-slate-50 rounded-xl p-4 ring-1 ring-slate-200">
                      <h4 className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-4 flex items-center gap-2">
                        Comprehensive Breakdown
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4">
                        {Object.entries(food.nutritional_breakdown).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <span className="text-slate-400 text-[10px] uppercase tracking-wider mb-0.5 font-bold block truncate" title={key}>{key}</span>
                            <span className="text-slate-700 text-sm font-semibold">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}

          {foods.length === 0 && !isLoading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10"
            >
              <p className="text-slate-400 font-medium text-sm">Tell me what you ate today...</p>
            </motion.div>
          )}

          {isLoading && foods.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10 flex flex-col items-center justify-center gap-4"
            >
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
              <p className="text-blue-600 font-semibold text-sm animate-pulse">Analyzing nutritional data...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
