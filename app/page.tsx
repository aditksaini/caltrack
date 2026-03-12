import CalorieTracker from "./components/CalorieTracker";

export default function Home() {
  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-pink-500/30 font-sans antialiased overflow-hidden relative">

      {/* Background Elements */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-indigo-600/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-pink-600/20 rounded-full blur-[120px] pointer-events-none" />

      {/* A subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#4f4f4f2e_1px,transparent_1px),linear-gradient(to_bottom,#4f4f4f2e_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-12 sm:py-24 flex flex-col items-center">

        {/* Header Section */}
        <div className="text-center mb-12">
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight mb-4 inline-flex flex-col sm:flex-row gap-2">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400">
              Calorie
            </span>
            <span className="text-white">Tracker</span>
          </h1>
          <p className="text-lg text-slate-400 max-w-lg mx-auto font-light">
            Powered by AI. Just type what you ate, and let Gemini do the math.
          </p>
        </div>

        {/* Tracker Component */}
        <CalorieTracker />

      </div>
    </main>
  );
}
