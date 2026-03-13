import CalorieTracker from "./components/CalorieTracker";

export default function Home() {
  return (
    <main className="min-h-screen bg-[#F2F2F7] text-slate-900 font-sans antialiased overflow-x-hidden relative">

      {/* Subtle top blur for iOS-like atmosphere */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[50%] bg-blue-100/50 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 container mx-auto px-4 py-12 sm:py-20 flex flex-col items-center">

        {/* Header Section */}
        <div className="text-center mb-10 mt-4 sm:mt-10">
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight mb-3 text-slate-800">
            CalorieTracker
          </h1>
          <p className="text-[15px] text-slate-500 max-w-sm mx-auto font-medium">
            Simply type what you ate, and let our intelligence handle the macros.
          </p>
        </div>

        {/* Tracker Component */}
        <CalorieTracker />

      </div>
    </main>
  );
}
