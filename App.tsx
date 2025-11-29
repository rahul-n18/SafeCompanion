import React, { useState, useEffect, useRef } from 'react';
import { GoogleGenAI } from "@google/genai";
import LiveAssistant from './components/LiveAssistant';
import ChatInterface from './components/ChatInterface';
import VisualAidPanel from './components/VisualAidPanel';
import MedicationPanel from './components/MedicationPanel';
import { generateVisualAidImage } from './services/imageGen';
import { LogEntry, UserMode, GeneratedImage, Obstacle, GestureType, EmotionalState, Medication, VocalMetrics } from './types';

// --- ICONS ---
const MicIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);
const MicOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M9 9v3a3 3 0 0 0 5.12 2.12"/><path d="M15 9.34V4a3 3 0 0 0-5.94-.6"/><path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
);
const HomeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
);
const PillIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>
);
const ImageIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);
const UsersIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
);
const AlertIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
);
const VideoIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
);
const VideoOffIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 16v1a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h2m5.66 0H14a2 2 0 0 1 2 2v3.34l1 1L23 7v10"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
);

// --- TAB SYSTEM ---
type ActiveTab = 'home' | 'meds' | 'visual' | 'family';

const App: React.FC = () => {
  const [apiKey, setApiKey] = useState<string>(process.env.API_KEY || '');
  const [userMode, setUserMode] = useState<UserMode>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('home');
  const [isMuted, setIsMuted] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [visualAid, setVisualAid] = useState<GeneratedImage | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  
  // New State for Visual Assistant Mode
  const [activeObstacles, setActiveObstacles] = useState<Obstacle[]>([]);
  const [detectedGesture, setDetectedGesture] = useState<GestureType>('none');
  const [activeLanguage, setActiveLanguage] = useState<string>('English');

  // New State for Companion Mode
  const [emotionalState, setEmotionalState] = useState<EmotionalState | null>(null);
  const [vocalMetrics, setVocalMetrics] = useState<VocalMetrics>({ energy: 0, stability: 0, isTremorDetected: false });
  const [familySummary, setFamilySummary] = useState<string>('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  
  // Medication State
  const [medications, setMedications] = useState<Medication[]>([
      { id: '1', name: 'Lisinopril', dosage: '10mg', frequency: 'Daily', timeOfDay: 'Morning', status: 'pending' },
      { id: '2', name: 'Metformin', dosage: '500mg', frequency: 'Daily', timeOfDay: 'Evening', status: 'pending' },
      { id: '3', name: 'Atorvastatin', dosage: '20mg', frequency: 'Daily', timeOfDay: 'Evening', status: 'taken', lastTaken: new Date() }
  ]);

  const micButtonRef = useRef<HTMLButtonElement>(null);
  const pendingMedCheckRef = useRef<string | null>(null);

  // Auto-clear active action notification
  useEffect(() => {
    if (activeAction) {
      const timer = setTimeout(() => setActiveAction(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [activeAction]);

  // Clear gesture after delay
  useEffect(() => {
    if (detectedGesture !== 'none') {
        const timer = setTimeout(() => setDetectedGesture('none'), 3000);
        return () => clearTimeout(timer);
    }
  }, [detectedGesture]);

  // Clear stale obstacles after 8 seconds
  useEffect(() => {
    if (activeObstacles.length > 0) {
        const timer = setTimeout(() => setActiveObstacles([]), 8000);
        return () => clearTimeout(timer);
    }
  }, [activeObstacles]);

  useEffect(() => {
      if ('Notification' in window) {
          Notification.requestPermission();
      }
  }, []);

  const handleLog = (entry: LogEntry) => {
    setLogs(prev => [...prev, entry]);
  };

  const handleAction = (actionName: string) => {
    setActiveAction(actionName);
  };

  const handleMedicationVerified = (medName: string) => {
      setMedications(prev => prev.map(m => {
          if (medName.toLowerCase().includes(m.name.toLowerCase())) {
              return { ...m, status: 'taken', lastTaken: new Date() };
          }
          return m;
      }));
  };

  // Triggered from MedicationPanel button
  const handleTriggerMedCheck = (medName: string) => {
     setActiveAction(`Please show ${medName} to camera`);
     pendingMedCheckRef.current = medName;
     setActiveTab('home'); // Go back to camera view to show pill
     setVideoEnabled(true); // Ensure camera is on for med check
  };

  const handleGenerateVisualAid = async (description: string, reasoning: string) => {
      setIsGeneratingImage(true);
      setActiveTab('visual'); // Switch to visual tab
      try {
          const imageUrl = await generateVisualAidImage(apiKey, description);
          setVisualAid({ url: imageUrl, prompt: description, reasoning });
      } catch (err) {
          handleLog({ timestamp: new Date(), sender: 'system', message: 'Failed to generate visual aid', type: 'alert'});
      } finally {
          setIsGeneratingImage(false);
      }
  };

  const handleEmergency = () => {
    handleLog({
        timestamp: new Date(),
        sender: 'user',
        message: 'EMERGENCY BUTTON PRESSED',
        type: 'alert'
    });
    alert("📢 EMERGENCY CONTACTS NOTIFIED\n\nCalling Family...\nAlerting Medical Services...");
  };

  const generateFamilySummary = async () => {
    if (!apiKey || logs.length === 0) return;
    setIsGeneratingSummary(true);
    try {
        const ai = new GoogleGenAI({ apiKey });
        const logText = logs.map(l => `[${l.sender}]: ${l.message}`).join('\n');
        const prompt = `Analyze these logs from an elderly user's AI companion. 
        Create a reassuring summary for the family. 
        Include: 
        1. Overall Mood (mention if loneliness detected)
        2. Medication & Pain Management Summary
        3. Key topics discussed
        4. Any health concerns (if none, say "All clear")
        
        Logs:
        ${logText}`;
        
        const resp = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt
        });
        setFamilySummary(resp.text || "No summary available.");
    } catch (e) {
        console.error("Summary failed", e);
        setFamilySummary("Could not generate summary.");
    } finally {
        setIsGeneratingSummary(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'family' && !familySummary) {
        generateFamilySummary();
    }
  }, [activeTab]);


  // --- START SCREEN ---
  if (!userMode) {
     return (
        <div className="h-full w-full bg-slate-50 flex flex-col p-6 font-sans justify-center">
             <header className="mb-12 text-center">
                 <div className="w-20 h-20 bg-gradient-to-tr from-blue-500 to-teal-400 rounded-3xl mx-auto mb-6 flex items-center justify-center text-white shadow-lg">
                    <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                 </div>
                 <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">SafeCompanion</h1>
                 <p className="text-xl text-slate-500 font-medium">Select your mode</p>
             </header>

             <div className="flex flex-col gap-6 w-full max-w-md mx-auto">
                 {/* ELDERLY MODE BUTTON */}
                 <button 
                    onClick={() => setUserMode('elderly')}
                    className="bg-white border-2 border-slate-200 rounded-3xl p-6 shadow-xl flex items-center gap-6 active:scale-95 transition-transform"
                 >
                    <div className="bg-blue-100 w-16 h-16 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <UsersIcon />
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-bold text-slate-900">Companion</h2>
                        <p className="text-slate-500 text-sm">Health & Memory Support</p>
                    </div>
                 </button>

                 {/* VISUALLY IMPAIRED MODE BUTTON */}
                 <button 
                    onClick={() => {
                        setUserMode('visually_impaired');
                        setVideoEnabled(true);
                    }}
                    className="bg-slate-900 border-2 border-slate-700 rounded-3xl p-6 shadow-xl flex items-center gap-6 active:scale-95 transition-transform text-white"
                 >
                    <div className="bg-yellow-400 w-16 h-16 rounded-2xl flex items-center justify-center text-black shrink-0">
                         <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/><circle cx="12" cy="12" r="3"/></svg>
                    </div>
                    <div className="text-left">
                        <h2 className="text-2xl font-bold">Visual Guide</h2>
                        <p className="text-slate-400 text-sm">Navigation & Object Detection</p>
                    </div>
                 </button>
             </div>
        </div>
     );
  }

  // --- VISUAL ASSISTANT MODE (Full Screen Video) ---
  if (userMode === 'visually_impaired') {
    return (
      <main className="h-full w-full bg-black flex flex-col relative font-mono overflow-hidden">
          {/* Video Layer */}
          <div className="absolute inset-0 z-0">
              <LiveAssistant 
                  apiKey={apiKey} 
                  onLog={handleLog}
                  onAction={handleAction}
                  onObstaclesDetected={setActiveObstacles}
                  onGestureDetected={setDetectedGesture}
                  onLanguageChanged={setActiveLanguage}
                  videoEnabled={true} 
                  isMuted={isMuted}
                  mode={userMode}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/60 pointer-events-none"></div>
          </div>

          {/* Top Bar Status */}
          <div className="relative z-10 w-full p-4 flex justify-between items-start safe-top">
              <div className="bg-black/50 backdrop-blur-md px-3 py-1 rounded-full border border-white/20 text-white text-xs font-bold uppercase tracking-wider">
                  {detectedGesture !== 'none' ? `Gesture: ${detectedGesture.replace('_', ' ')}` : activeLanguage}
              </div>
              
              {isMuted && (
                  <div className="bg-red-600 px-3 py-1 rounded-full text-white text-xs font-bold animate-pulse">
                      MUTED
                  </div>
              )}
          </div>

          {/* Threat List */}
          <section className="relative z-10 px-4 mt-4 space-y-2 pointer-events-none">
              {activeObstacles.map((obs, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border-l-4 backdrop-blur-md shadow-lg ${obs.priority === 'critical' ? 'bg-red-900/80 border-red-500' : 'bg-slate-800/60 border-blue-400'}`}>
                      <div className="flex justify-between items-center text-white">
                          <span className="font-bold text-lg">{obs.object}</span>
                          <span className="text-xs uppercase opacity-70">{obs.direction}</span>
                      </div>
                  </div>
              ))}
          </section>

          {/* Action Notification */}
          {activeAction && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[90%] bg-blue-600 border-4 border-white text-white p-6 rounded-3xl z-50 text-center shadow-2xl animate-bounce">
                  <span className="text-4xl block mb-2">⚡</span>
                  <span className="text-xl font-bold">{activeAction}</span>
              </div>
          )}

          {/* Bottom Controls */}
          <div className="mt-auto relative z-20 w-full p-6 pb-8 safe-bottom flex flex-col items-center gap-6">
               <button 
                  ref={micButtonRef}
                  onClick={() => setIsMuted(!isMuted)}
                  className={`w-20 h-20 rounded-full flex items-center justify-center shadow-xl border-4 transition-all active:scale-95 ${isMuted ? 'bg-slate-800 border-slate-600 text-slate-400' : 'bg-white border-yellow-400 text-slate-900'}`}
                  aria-label={isMuted ? "Unmute" : "Mute"}
               >
                  {isMuted ? <MicOffIcon /> : <MicIcon />}
               </button>

               <button
                  onClick={handleEmergency}
                  className="w-full bg-red-600 text-white font-black text-xl py-4 rounded-2xl shadow-lg border-b-4 border-red-800 active:border-b-0 active:translate-y-1"
               >
                  EMERGENCY SOS
               </button>
          </div>
      </main>
    );
  }

  // --- COMPANION MODE (Mobile App Layout) ---
  return (
    <div className="h-full w-full bg-slate-100 flex flex-col overflow-hidden relative text-slate-900">
      
      {/* 1. Header (Fixed) */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center shrink-0 safe-top z-40 relative shadow-sm h-[60px]">
         <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
             </div>
             <h1 className="text-xl font-extrabold text-slate-900 tracking-tight">SafeCompanion</h1>
         </div>
         
         <div className="flex items-center gap-3">
             {/* Camera Toggle */}
             <button 
                onClick={() => setVideoEnabled(!videoEnabled)}
                className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${videoEnabled ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-slate-100 text-slate-400 border border-slate-200'}`}
                aria-label={videoEnabled ? "Disable Camera" : "Enable Camera"}
             >
                {videoEnabled ? <VideoIcon /> : <VideoOffIcon />}
             </button>

             {/* Divider */}
             <div className="h-6 w-px bg-slate-200"></div>

             {/* Simple Status Badge */}
             <div className="flex items-center gap-3">
                 {vocalMetrics.energy > 0.01 && (
                     <div className="flex gap-0.5 items-end h-4">
                         {[1,2,3].map(i => (
                             <div key={i} className="w-1 bg-green-500 rounded-full animate-pulse" style={{ height: `${Math.random() * 100}%` }}></div>
                         ))}
                     </div>
                 )}
                 <div className={`w-3 h-3 rounded-full ${isMuted ? 'bg-red-500' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></div>
             </div>
         </div>
      </header>

      {/* 2. Main Content Area (Stack) */}
      <div className="flex-1 relative overflow-hidden bg-black">
          
          {/* LAYER 0: The Camera/Assistant (Always Mounted, Hidden via CSS if needed, but we keep it visible for 'home' tab) */}
          <div className={`absolute inset-0 z-0`}>
               <LiveAssistant 
                  apiKey={apiKey} 
                  onLog={handleLog}
                  onAction={handleAction}
                  onGenerateVisualAid={handleGenerateVisualAid}
                  onEmotionalStateUpdate={setEmotionalState}
                  onVocalMetricsUpdate={setVocalMetrics}
                  onMedicationVerified={handleMedicationVerified}
                  videoEnabled={videoEnabled}
                  isMuted={isMuted}
                  mode={userMode}
                  medications={medications}
               />
               
               {/* Chat Overlay for Home Tab */}
               {activeTab === 'home' && (
                  <div className="absolute bottom-0 left-0 right-0 h-3/5 bg-gradient-to-t from-black via-black/60 to-transparent flex flex-col justify-end p-4 pb-4 pointer-events-none">
                     <div className="pointer-events-auto">
                        <ChatInterface logs={logs} />
                     </div>
                  </div>
               )}

               {/* Emergency Button Floating - Only on Home */}
               {activeTab === 'home' && (
                 <button 
                    onClick={handleEmergency}
                    className="absolute top-4 right-4 w-12 h-12 bg-red-600 text-white rounded-full shadow-lg flex items-center justify-center z-20 active:scale-90 transition-transform"
                 >
                    <AlertIcon />
                 </button>
               )}
          </div>

          {/* LAYER 1: Medications Tab Overlay */}
          {activeTab === 'meds' && (
              <div className="absolute inset-0 z-10 bg-slate-50 overflow-y-auto animate-fade-in-up">
                  <MedicationPanel medications={medications} onTriggerCheck={handleTriggerMedCheck} />
              </div>
          )}

          {/* LAYER 2: Visual Aid Overlay */}
          {activeTab === 'visual' && (
              <div className="absolute inset-0 z-10 bg-slate-50 overflow-y-auto animate-fade-in-up">
                  <VisualAidPanel image={visualAid} isGenerating={isGeneratingImage} />
              </div>
          )}

          {/* LAYER 3: Family Overlay */}
          {activeTab === 'family' && (
              <div className="absolute inset-0 z-10 bg-slate-50 overflow-y-auto p-4 animate-fade-in-up">
                  <h2 className="text-2xl font-bold mb-4 text-indigo-900 mt-2">Family Updates</h2>
                  <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 mb-6">
                       {isGeneratingSummary ? (
                           <div className="flex items-center gap-3 text-indigo-600 font-medium">
                               <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                               Updating summary...
                           </div>
                       ) : (
                           <p className="text-slate-700 leading-relaxed whitespace-pre-line text-lg">{familySummary || "No updates yet today."}</p>
                       )}
                  </div>
                  <button className="w-full bg-indigo-600 text-white font-bold py-5 rounded-2xl text-xl mb-4 shadow-lg active:scale-95 transition-transform flex items-center justify-center gap-2">
                       <span className="text-2xl">📞</span> Call Sarah
                  </button>
              </div>
          )}

          {/* Action Toast (Global) */}
          {activeAction && (
              <div className="absolute top-6 left-4 right-4 bg-blue-600 text-white px-6 py-4 rounded-2xl shadow-2xl border-2 border-blue-400 z-50 text-center animate-bounce">
                  <p className="font-bold text-lg">{activeAction}</p>
              </div>
          )}
      </div>

      {/* 3. Bottom Navigation Bar */}
      <nav className="bg-white border-t border-slate-200 safe-bottom z-50 shrink-0">
          <div className="flex justify-around items-center h-[70px] pb-safe">
              <NavButton 
                  active={activeTab === 'home'} 
                  onClick={() => setActiveTab('home')} 
                  icon={HomeIcon} 
                  label="Live" 
              />
              <NavButton 
                  active={activeTab === 'meds'} 
                  onClick={() => setActiveTab('meds')} 
                  icon={PillIcon} 
                  label="Meds" 
              />
              <div className="-mt-8 relative z-10">
                  <button 
                      onClick={() => setIsMuted(!isMuted)}
                      className={`w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform active:scale-95 ${isMuted ? 'bg-slate-800 text-white border-4 border-slate-100' : 'bg-blue-600 text-white border-4 border-white'}`}
                  >
                      {isMuted ? <MicOffIcon /> : <MicIcon />}
                  </button>
              </div>
              <NavButton 
                  active={activeTab === 'visual'} 
                  onClick={() => setActiveTab('visual')} 
                  icon={ImageIcon} 
                  label="Draw" 
              />
              <NavButton 
                  active={activeTab === 'family'} 
                  onClick={() => setActiveTab('family')} 
                  icon={UsersIcon} 
                  label="Family" 
              />
          </div>
      </nav>
    </div>
  );
};

// Sub-component for Nav
const NavButton: React.FC<{active: boolean, onClick: () => void, icon: any, label: string}> = ({ active, onClick, icon: Icon, label }) => (
    <button onClick={onClick} className={`flex flex-col items-center justify-center w-16 h-full ${active ? 'text-blue-600' : 'text-slate-400'}`}>
        <div className={`transition-transform duration-200 mb-1 ${active ? '-translate-y-1' : ''}`}>
             <Icon />
        </div>
        <span className="text-[11px] font-bold">{label}</span>
    </button>
);

export default App;