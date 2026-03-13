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
        className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4"
      >
        <motion.div
          initial={{ scale: 0.9, y: 20 }}
          animate={{ scale: 1, y: 0 }}
          className="bg-gray-900 border border-white/10 p-8 rounded-3xl w-full max-w-sm relative overflow-hidden shadow-2xl"
        >
          {/* Aesthetic Background Orbs */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/20 rounded-full blur-3xl -ml-16 -mb-16 pointer-events-none"></div>

          <div className="relative z-10">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center shadow-inner">
                <User className="w-8 h-8 text-indigo-400" />
              </div>
            </div>

            <h2 className="text-2xl font-bold text-center text-white mb-2">Welcome to CalTrack</h2>
            <p className="text-center text-white/50 text-sm mb-8">
              Please enter your name to access your personal calorie log and history.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Your First Name (e.g., Adit)"
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all text-center text-lg"
                  autoFocus
                  required
                />
              </div>

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={isLoading || !name.trim()}
                className="w-full bg-white text-black hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg shadow-white/10"
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
