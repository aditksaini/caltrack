"use client";

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { History, X, Calendar, ChevronRight, Activity, Flame, Trash2 } from 'lucide-react';

interface FoodEntry {
  id: string;
  name: string;
  quantity_description: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  nutritional_breakdown: any;
}

interface DailyLog {
  id: string;
  date: string;
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  foods: FoodEntry[];
}

interface HistorySidebarProps {
  userId: string;
}

export default function HistorySidebar({ userId }: HistorySidebarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchHistory = async () => {
    if (!userId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/logs?userId=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setLogs(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchHistory();
    }
  }, [isOpen, userId]);

  const toggleExpand = (id: string) => {
    setExpandedLogId(expandedLogId === id ? null : id);
  };

  const removeHistoryFood = async (e: React.MouseEvent, foodId: string) => {
    e.stopPropagation(); // Don't trigger the accordion
    if (!window.confirm("Delete this food entry from your history?")) return;

    try {
      const res = await fetch(`/api/logs?id=${foodId}&userId=${userId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Refresh history to show updated totals and missing food
        fetchHistory();
      }
    } catch (err) {
      console.error("Failed to delete historical food", err);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-24 left-4 z-50 bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md p-3 rounded-full text-white/80 transition-all hover:scale-105 shadow-xl"
        title="View Past Nutrition Logs"
      >
        <History className="w-5 h-5" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex"
          >
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="w-full max-w-sm bg-gray-900 border-r border-white/10 h-full p-6 overflow-y-auto flex flex-col relative shadow-2xl"
            >
              <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none"></div>

              <div className="flex justify-between items-center mb-8 relative z-10">
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-indigo-400" />
                  Your History
                </h2>
                <button
                  onClick={() => setIsOpen(false)}
                  className="text-white/50 hover:text-white bg-white/5 hover:bg-white/10 p-2 rounded-full transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {isLoading ? (
                <div className="flex flex-col gap-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-24 bg-white/5 animate-pulse rounded-2xl border border-white/10" />
                  ))}
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center text-white/40 mt-10">
                  <History className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p>No logged days yet.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-4 relative z-10">
                  {logs.map((log) => (
                    <div
                      key={log.id}
                      className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden transition-all hover:border-white/20"
                    >
                      <button
                        onClick={() => toggleExpand(log.id)}
                        className="w-full p-4 flex items-center justify-between text-left"
                      >
                        <div>
                          <p className="font-semibold text-white/90">{new Date(log.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-white/50">
                            <span className="flex items-center gap-1">
                              <Flame className="w-3.5 h-3.5 text-orange-400" />
                              {log.totalCalories} kcal
                            </span>
                            <span className="flex items-center gap-1">
                              <Activity className="w-3.5 h-3.5 text-blue-400" />
                              {log.totalProtein}g P
                            </span>
                          </div>
                        </div>
                        <motion.div
                          animate={{ rotate: expandedLogId === log.id ? 90 : 0 }}
                          className="text-white/40"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </motion.div>
                      </button>

                      <AnimatePresence>
                        {expandedLogId === log.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="bg-black/30 border-t border-white/5"
                          >
                            <div className="p-4 flex flex-col gap-3">
                              {log.foods.length > 0 ? (
                                log.foods.map((food, idx) => (
                                  <div key={idx} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0 group">
                                    <div className="flex-1 pr-2 overflow-hidden">
                                      <p className="text-white/80 font-medium truncate">{food.name}</p>
                                      <p className="text-white/40 text-[10px] mt-0.5 truncate">{food.quantity_description}</p>
                                    </div>
                                    <div className="text-right flex items-center gap-3 shrink-0">
                                      <span className="text-white/90 font-bold">{food.calories} kcal</span>
                                      {/* Only show trash icon if it's NOT today's date (today's are managed via the main tracker) */}
                                      {log.date !== new Date().toLocaleDateString('en-CA') && (
                                        <button
                                          onClick={(e) => removeHistoryFood(e, food.id)}
                                          className="text-white/20 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100 p-1"
                                          title="Delete from History"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-white/40 text-xs italic">No foods recorded.</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
            
            {/* Click outside to close */}
            <div className="flex-1 h-full" onClick={() => setIsOpen(false)} />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
