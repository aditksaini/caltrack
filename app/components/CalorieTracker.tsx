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

      {/* Top Navigation Bar for Floating Action Buttons */}
      <div className="flex items-center justify-between mb-6 px-1">
        {userId ? <HistorySidebar userId={userId} /> : <div className="w-10"></div>}
        <UserProfile onProfileUpdate={setUserProfile} />
      </div>

      {/* Daily Total Ring */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl p-8 shadow-2xl mb-8 flex flex-col items-center justify-center relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/20 rounded-full blur-3xl -mr-16 -mt-16"></div>
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-500/20 rounded-full blur-3xl -ml-16 -mb-16"></div>

        <div className="w-full flex items-center justify-between mb-6 z-10 px-2">
          <h2 className="text-white/80 text-sm font-medium tracking-wide uppercase flex items-center gap-2">
            <Activity className="w-4 h-4 text-pink-400" /> Daily Macros
          </h2>
          {foods.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleExport}
                className="text-indigo-300 hover:text-indigo-200 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-indigo-500/20 bg-indigo-500/10 hover:bg-indigo-500/20 px-2.5 py-1.5 rounded-md"
                title="Export Log as CSV"
              >
                <Download className="w-3.5 h-3.5" />
                Export
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="text-white/40 hover:text-white/90 transition-colors flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider border border-white/10 bg-black/20 hover:bg-black/40 px-2.5 py-1.5 rounded-md"
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
              className="text-white/10"
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
                <stop offset="0%" stopColor="#4F46E5" /> {/* Indigo-600 */}
                <stop offset="100%" stopColor="#EC4899" /> {/* Pink-500 */}
              </linearGradient>
            </defs>
          </svg>

          <div className="absolute flex flex-col items-center justify-center text-center">
            <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 to-pink-300">
              {totalCalories}
            </span>
            <span className="text-xs text-white/50 mt-1">/ {dailyGoal} kcal</span>
          </div>
        </div>

        {/* Macro Summary with Goals */}
        <div className="grid grid-cols-3 gap-4 w-full text-center z-10">
          <div className="flex flex-col">
            <span className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-1">Protein</span>
            <span className="text-white font-medium text-lg leading-none">{totalProtein}g</span>
            <span className="text-white/30 text-[10px] mt-1">/ {proteinGoal}g</span>
          </div>
          <div className="flex flex-col border-x border-white/10">
            <span className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-1">Carbs</span>
            <span className="text-white font-medium text-lg leading-none">{totalCarbs}g</span>
            <span className="text-white/30 text-[10px] mt-1">/ {carbsGoal}g</span>
          </div>
          <div className="flex flex-col">
            <span className="text-white/50 text-[10px] font-semibold uppercase tracking-wider mb-1">Fat</span>
            <span className="text-white font-medium text-lg leading-none">{totalFat}g</span>
            <span className="text-white/30 text-[10px] mt-1">/ {fatGoal}g</span>
          </div>
        </div>

      </motion.div>

      {/* Input Form Toggle */}
      <div className="flex bg-black/40 backdrop-blur-md rounded-2xl p-1 mb-4 w-64 mx-auto border border-white/10 relative z-10">
         <button
            onClick={() => setIsManualMode(false)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${!isManualMode ? 'bg-indigo-500/20 text-indigo-300 shadow-sm' : 'text-white/50 hover:text-white/80'}`}
         >
            AI Assistant
         </button>
         <button
            onClick={() => setIsManualMode(true)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all ${isManualMode ? 'bg-pink-500/20 text-pink-300 shadow-sm' : 'text-white/50 hover:text-white/80'}`}
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
        className="relative mb-6 group"
      >
        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 to-pink-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-500"></div>
        <div className="relative flex flex-col bg-black/40 backdrop-blur-md rounded-2xl border border-white/10 overflow-hidden shadow-lg p-1">
          
          {!isManualMode ? (
            <div className="flex items-center w-full">
              <div className="pl-4 text-white/50">
                {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-pink-400" /> : <Utensils className="w-5 h-5" />}
              </div>
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                placeholder='e.g., "2 Samosas and 1 Chai"'
                className="w-full bg-transparent px-4 py-4 text-white placeholder-white/40 outline-none disabled:opacity-50 font-light"
              />
              <button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="px-6 py-4 bg-white/10 hover:bg-white/20 text-white transition-colors disabled:opacity-50 flex items-center gap-2 border-l border-white/10 font-medium"
              >
                Add <Sparkles className="w-4 h-4" />
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
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/40 outline-none focus:border-pink-500/50 transition-colors"
               />
               <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="relative">
                     <span className="absolute right-3 top-3 text-white/30 text-xs font-bold uppercase">kcal</span>
                     <input
                        type="number" required min="0" placeholder="0"
                        value={manualEntry.calories || ''}
                        onChange={(e) => setManualEntry({...manualEntry, calories: parseInt(e.target.value) || 0})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 font-medium pr-10"
                     />
                     <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider ml-1 mt-1 block">Calories</label>
                  </div>
                  <div className="relative">
                     <span className="absolute right-3 top-3 text-white/30 text-xs font-bold uppercase">g</span>
                     <input
                        type="number" min="0" placeholder="0"
                        value={manualEntry.protein || ''}
                        onChange={(e) => setManualEntry({...manualEntry, protein: parseInt(e.target.value) || 0})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 font-medium pr-8"
                     />
                     <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider ml-1 mt-1 block">Protein</label>
                  </div>
                  <div className="relative">
                     <span className="absolute right-3 top-3 text-white/30 text-xs font-bold uppercase">g</span>
                     <input
                        type="number" min="0" placeholder="0"
                        value={manualEntry.carbs || ''}
                        onChange={(e) => setManualEntry({...manualEntry, carbs: parseInt(e.target.value) || 0})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 font-medium pr-8"
                     />
                     <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider ml-1 mt-1 block">Carbs</label>
                  </div>
                  <div className="relative">
                     <span className="absolute right-3 top-3 text-white/30 text-xs font-bold uppercase">g</span>
                     <input
                        type="number" min="0" placeholder="0"
                        value={manualEntry.fat || ''}
                        onChange={(e) => setManualEntry({...manualEntry, fat: parseInt(e.target.value) || 0})}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-white outline-none focus:border-indigo-500/50 font-medium pr-8"
                     />
                     <label className="text-[10px] text-white/50 font-semibold uppercase tracking-wider ml-1 mt-1 block">Fat</label>
                  </div>
               </div>
               <button
                  type="submit"
                  disabled={!manualEntry.name || manualEntry.calories <= 0}
                  className="w-full mt-2 py-3 bg-gradient-to-r from-indigo-500/20 to-pink-500/20 hover:from-indigo-500/40 hover:to-pink-500/40 border border-indigo-500/30 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
            <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-2xl p-4 backdrop-blur-sm">
              <div className="flex items-start gap-3">
                <BrainCircuit className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-1">AI Thoughts</h4>
                  <p className="text-indigo-100/80 text-sm leading-relaxed">{lastReasoning}</p>
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
              className="group backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-5 hover:bg-white/10 transition-colors"
            >
              <div className="flex items-center justify-between mb-3 w-full">
                <div className="min-w-0 pr-4 flex-1">
                  <h3 className="text-white font-semibold text-lg truncate flex items-center gap-2">
                    {food.name}
                  </h3>
                  <p className="text-white/50 text-sm truncate">{food.quantity_description}</p>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                  <span className="text-pink-300 font-bold tabular-nums text-xl">
                    {food.calories} <span className="text-pink-300/60 text-sm font-normal">kcal</span>
                  </span>
                  <button
                    onClick={() => removeFood(food.id)}
                    className="p-2 text-white/40 hover:text-red-400 hover:bg-black/20 rounded-full transition-all opacity-0 group-hover:opacity-100 focus:opacity-100 block md:hidden md:group-hover:block"
                    aria-label="Remove item"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Macros Breakdown */}
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/10 text-white/80">
                  P: <span className="font-semibold text-white">{food.protein}g</span>
                </div>
                <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/10 text-white/80">
                  C: <span className="font-semibold text-white">{food.carbs}g</span>
                </div>
                <div className="bg-white/5 px-2.5 py-1 rounded-md border border-white/10 text-white/80">
                  F: <span className="font-semibold text-white">{food.fat}g</span>
                </div>
                <button
                  type="button"
                  onClick={() => toggleExpand(food.id)}
                  className={`ml-auto flex items-center gap-1.5 px-3 py-1.5 rounded-full border transition-colors ${expandedFoodId === food.id
                    ? 'bg-indigo-500/20 border-indigo-500/40 text-indigo-300'
                    : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
                    }`}
                >
                  <Info className="w-3.5 h-3.5 shrink-0" />
                  <span className="font-medium">Details</span>
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
                    <div className="bg-black/20 rounded-xl p-4 border border-white/5 shadow-inner">
                      <h4 className="text-white/40 text-xs font-semibold uppercase tracking-widest mb-4 flex items-center gap-2">
                        <Sparkles className="w-3 h-3" /> Comprehensive Breakdown
                      </h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-y-4 gap-x-4">
                        {Object.entries(food.nutritional_breakdown).map(([key, value]) => (
                          <div key={key} className="flex flex-col">
                            <span className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5 font-semibold block truncate" title={key}>{key}</span>
                            <span className="text-white/90 text-sm font-medium">{String(value)}</span>
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
              <p className="text-white/30 text-sm">Tell me what you ate today...</p>
            </motion.div>
          )}

          {isLoading && foods.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10 flex flex-col items-center justify-center gap-4"
            >
              <Loader2 className="w-8 h-8 animate-spin text-pink-400/50" />
              <p className="text-pink-300/50 text-sm animate-pulse">Analyzing nutritional data...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

    </div>
  );
}
