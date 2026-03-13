"use client";

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Settings, Calculator, CheckCircle2 } from 'lucide-react';

export interface UserProfileData {
  age: number;
  gender: 'male' | 'female';
  weightKg: number;
  heightCm: number;
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
  goal: 'lose' | 'maintain' | 'gain';
  calculatedTargets: {
    calories: number;
    proteinGrams: number;
    carbsGrams: number;
    fatGrams: number;
  } | null;
}

const defaultProfile: UserProfileData = {
  age: 30,
  gender: 'male',
  weightKg: 70,
  heightCm: 175,
  activityLevel: 'moderately_active',
  goal: 'maintain',
  calculatedTargets: null
};

interface UserProfileProps {
  onProfileUpdate: (profile: UserProfileData) => void;
}

export default function UserProfile({ onProfileUpdate }: UserProfileProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<UserProfileData>(defaultProfile);
  const [isSaved, setIsSaved] = useState(false);

  // Load from local storage on mount
  useEffect(() => {
    const savedProfile = localStorage.getItem('userNutritionProfile');
    if (savedProfile) {
      try {
        const parsed = JSON.parse(savedProfile);
        setProfile(parsed);
        onProfileUpdate(parsed);
      } catch (e) {
        console.error("Failed to parse saved profile");
      }
    } else {
      // Run initial calculation to establish baseline
      calculateAndSave(defaultProfile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const calculateTargets = (data: UserProfileData): typeof data.calculatedTargets => {
    // 1. Calculate BMR (Mifflin-St Jeor Equation)
    // Men: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) + 5
    // Women: (10 × weight in kg) + (6.25 × height in cm) - (5 × age in years) - 161
    let bmr = (10 * data.weightKg) + (6.25 * data.heightCm) - (5 * data.age);
    bmr += data.gender === 'male' ? 5 : -161;

    // 2. Adjust for Activity Level (TDEE - Total Daily Energy Expenditure)
    const activityMultipliers = {
      sedentary: 1.2, // Little or no exercise
      lightly_active: 1.375, // Light exercise/sports 1-3 days/week
      moderately_active: 1.55, // Moderate exercise/sports 3-5 days/week
      very_active: 1.725, // Hard exercise/sports 6-7 days a week
      extra_active: 1.9 // Very hard exercise/physical job
    };

    let tdee = bmr * activityMultipliers[data.activityLevel];

    // 3. Adjust for primary goal (Weight Loss, Maintain, Gain)
    let targetCalories = tdee;
    if (data.goal === 'lose') {
      targetCalories -= 500; // Standard ~1lb a week loss
    } else if (data.goal === 'gain') {
      targetCalories += 300; // Moderate surplus for muscle gain
    }

    // Safety floor
    if (data.gender === 'female' && targetCalories < 1200) targetCalories = 1200;
    if (data.gender === 'male' && targetCalories < 1500) targetCalories = 1500;

    targetCalories = Math.round(targetCalories);

    // 4. Calculate rough Macro Splits
    // For standard fitness: ~30% Protein, ~40% Carbs, ~30% Fat
    // 1g Protein = 4 kcal, 1g Carb = 4 kcal, 1g Fat = 9 kcal

    // Base protein on bodyweight for better muscle support (e.g., 2g per KG)
    let proteinGrams = Math.round(data.weightKg * 2);
    // Ensure protein doesn't exceed ~40% of standard diet to be safe
    const maxProteinCals = targetCalories * 0.40;
    if (proteinGrams * 4 > maxProteinCals) proteinGrams = Math.round(maxProteinCals / 4);

    const proteinCals = proteinGrams * 4;

    // Standard fat is roughly 25-30% of total calories
    const fatCals = targetCalories * 0.30;
    const fatGrams = Math.round(fatCals / 9);

    // Remainder is carbs
    const carbCals = targetCalories - proteinCals - fatCals;
    const carbsGrams = Math.round(carbCals / 4);

    return {
      calories: targetCalories,
      proteinGrams,
      carbsGrams,
      fatGrams
    };
  };

  const calculateAndSave = (dataToSave: UserProfileData) => {
    const calculated = calculateTargets(dataToSave);
    const updatedProfile = { ...dataToSave, calculatedTargets: calculated };
    setProfile(updatedProfile);
    localStorage.setItem('userNutritionProfile', JSON.stringify(updatedProfile));
    onProfileUpdate(updatedProfile);
  };

  const handleSave = () => {
    calculateAndSave(profile);
    setIsSaved(true);
    setTimeout(() => {
      setIsSaved(false);
      setIsOpen(false);
    }, 1500);
  };

  return (
    <>
      {/* Settings Toggle Button */}
      <button
        onClick={() => setIsOpen(true)}
        className="fixed top-4 right-4 md:top-8 md:right-8 z-50 p-3 bg-white hover:bg-slate-50 ring-1 ring-slate-200 rounded-full transition-colors group shadow-md"
      >
        <Settings className="w-5 h-5 text-slate-400 group-hover:text-slate-600 group-hover:rotate-45 transition-all duration-300" />
      </button>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 20 }}
              className="bg-[#F2F2F7] ring-1 ring-slate-200 rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[90vh]"
            >
              {/* Header */}
              <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-white">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-50 rounded-xl ring-1 ring-blue-100">
                    <Calculator className="w-5 h-5 text-blue-500" />
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-slate-800 tracking-tight">Your Profile</h2>
                    <p className="text-slate-500 text-xs mt-0.5 font-medium">We use this to calculate your daily goals.</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-2 hover:bg-slate-100 rounded-full transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400 hover:text-slate-600" />
                </button>
              </div>

              {/* Body */}
              <div className="p-6 overflow-y-auto space-y-6">

                <div className="grid grid-cols-2 gap-4">
                  {/* Age */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">Age</label>
                    <input
                      type="number"
                      min="15" max="100"
                      value={profile.age}
                      onChange={(e) => setProfile({ ...profile, age: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm font-medium"
                    />
                  </div>
                  {/* Gender */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">Gender</label>
                    <select
                      value={profile.gender}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value as any })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm font-medium appearance-none"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {/* Weight */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">Weight (kg)</label>
                    <input
                      type="number"
                      min="30" max="300"
                      value={profile.weightKg}
                      onChange={(e) => setProfile({ ...profile, weightKg: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm font-medium"
                    />
                  </div>
                  {/* Height */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">Height (cm)</label>
                    <input
                      type="number"
                      min="100" max="250"
                      value={profile.heightCm}
                      onChange={(e) => setProfile({ ...profile, heightCm: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm font-medium"
                    />
                  </div>
                </div>

                {/* Activity Level */}
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 ml-1">Activity Level</label>
                  <select
                    value={profile.activityLevel}
                    onChange={(e) => setProfile({ ...profile, activityLevel: e.target.value as any })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors shadow-sm font-medium appearance-none"
                  >
                    <option value="sedentary">Sedentary (Little to no exercise)</option>
                    <option value="lightly_active">Lightly Active (1-3 days/week)</option>
                    <option value="moderately_active">Moderately Active (3-5 days/week)</option>
                    <option value="very_active">Very Active (6-7 days/week)</option>
                    <option value="extra_active">Extra Active (Physical job)</option>
                  </select>
                </div>

                {/* Goal Level */}
                <div className="space-y-2 py-2">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-3 ml-1 block">Primary Goal</label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => setProfile({ ...profile, goal: 'lose' })}
                      className={`py-3 rounded-xl ring-1 text-sm font-bold transition-all shadow-sm ${profile.goal === 'lose' ? 'bg-blue-50 ring-blue-200 text-blue-700' : 'bg-white ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                    >
                      Lose Fast
                    </button>
                    <button
                      onClick={() => setProfile({ ...profile, goal: 'maintain' })}
                      className={`py-3 rounded-xl ring-1 text-sm font-bold transition-all shadow-sm ${profile.goal === 'maintain' ? 'bg-blue-50 ring-blue-200 text-blue-700' : 'bg-white ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                    >
                      Maintain
                    </button>
                    <button
                      onClick={() => setProfile({ ...profile, goal: 'gain' })}
                      className={`py-3 rounded-xl ring-1 text-sm font-bold transition-all shadow-sm ${profile.goal === 'gain' ? 'bg-blue-50 ring-blue-200 text-blue-700' : 'bg-white ring-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-700'}`}
                    >
                      Gain Muscle
                    </button>
                  </div>
                </div>

                {/* Display Current Calculation based on inputs instantly */}
                {profile.calculatedTargets && (
                  <div className="bg-slate-100 ring-1 ring-slate-200 rounded-2xl p-4 mt-6">
                    <h4 className="text-slate-500 text-[10px] uppercase font-bold tracking-widest mb-3">Estimated Targets</h4>
                    <div className="flex items-end justify-between mb-4">
                      <div>
                        <span className="text-3xl font-black text-slate-800 tracking-tight">{calculateTargets(profile)?.calories}</span>
                        <span className="text-slate-500 text-sm ml-1 uppercase font-bold">kcal/day</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-sm font-bold">
                      <span className="text-blue-600">{calculateTargets(profile)?.proteinGrams}g <span className="text-slate-500 text-[10px] uppercase">Protein</span></span>
                      <span className="text-indigo-600">{calculateTargets(profile)?.carbsGrams}g <span className="text-slate-500 text-[10px] uppercase">Carbs</span></span>
                      <span className="text-purple-600">{calculateTargets(profile)?.fatGrams}g <span className="text-slate-500 text-[10px] uppercase">Fat</span></span>
                    </div>
                  </div>
                )}

              </div>

              {/* Footer */}
              <div className="p-6 border-t border-slate-200 bg-white">
                <button
                  onClick={handleSave}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                >
                  {isSaved ? (
                    <><CheckCircle2 className="w-5 h-5" /> Saved Successfully</>
                  ) : (
                    "Save Profile & Update Goals"
                  )}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
