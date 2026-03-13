"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { User, LogIn, Loader2 } from 'lucide-react';

interface LoginModalProps {
  onLogin: (userId: string, userName: string) => void;
}

export default function LoginModal({ onLogin }: LoginModalProps) {
  const [name, setName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Check LocalStorage on mount
  useEffect(() => {
    const savedId = localStorage.getItem('caltrack_userId');
    const savedName = localStorage.getItem('caltrack_userName');
    if (savedId && savedName) {
      onLogin(savedId, savedName);
    }
  }, [onLogin]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      const data = await res.json();

      if (!res.ok) throw new Error(data.error || 'Failed to login');

      // Save to local storage for future visits
      localStorage.setItem('caltrack_userId', data.user.id);
      localStorage.setItem('caltrack_userName', data.user.name);

      onLogin(data.user.id, data.user.name);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-white border border-slate-200 p-8 rounded-[24px] w-full max-w-sm relative overflow-hidden shadow-2xl"
        >

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center shadow-sm">
                <User className="w-8 h-8 text-blue-500" />
              </div>
            </div>

            <h2 className="text-2xl font-extrabold text-center text-slate-800 mb-2 tracking-tight">Welcome to CalTrack</h2>
            <p className="text-center text-slate-500 text-sm mb-8 font-medium">
              Please enter your name to access your personal calorie log and history.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your First Name (e.g., Adit)"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-center text-lg font-bold shadow-sm"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p className="text-red-500 text-sm text-center font-medium">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="w-full bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-md mt-2"
              >
                {isLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-5 h-5" />
                    Enter Track
                  </>
                )}
              </button>
            </form>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
