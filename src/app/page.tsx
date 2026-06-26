import { Chat } from "@/components/chat";

export default function Home() {
  return (
    <main 
      className="flex min-h-screen flex-col items-center justify-center p-4 sm:p-12 relative bg-slate-100"
      style={{
        backgroundImage: "url('/bg.png')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      <div className="absolute inset-0 bg-white/75 backdrop-blur-[1px]" />
      
      <div className="absolute top-6 left-6 sm:top-10 sm:left-10 z-10 bg-white px-6 py-3 rounded-2xl shadow-lg border border-slate-200">
        <img 
          src="https://ozarks-cleaning.com/img/icons/header-logo.svg" 
          alt="Crystal LLC" 
          className="h-8 object-contain"
        />
      </div>

      <div className="w-full max-w-2xl bg-white/95 backdrop-blur-xl border border-slate-200 shadow-2xl rounded-3xl overflow-hidden flex flex-col h-[85vh] z-10 relative">
        <div className="bg-white p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center shadow-sm border border-slate-100 overflow-hidden">
              <img src="https://ozarks-cleaning.com/img/icons/header-logo.svg" alt="Crystal" className="h-4 object-contain" />
            </div>
            <div>
              <h1 className="font-semibold text-xl text-slate-800">Crystal Support</h1>
              <p className="text-sm text-blue-600 font-medium flex items-center gap-1.5 mt-0.5">
                <span className="w-2 h-2 rounded-full bg-blue-500 inline-block animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                Online
              </p>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-hidden relative">
          <Chat />
        </div>
      </div>
    </main>
  );
}
