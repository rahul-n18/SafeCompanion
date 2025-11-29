
import React from 'react';
import { Medication } from '../types';

interface MedicationPanelProps {
  medications: Medication[];
  onTriggerCheck: (medName: string) => void;
}

const MedicationPanel: React.FC<MedicationPanelProps> = ({ medications, onTriggerCheck }) => {
  return (
    <div className="h-full w-full bg-slate-50 flex flex-col relative overflow-hidden">
      <div className="p-6 bg-white border-b-4 border-slate-200 shadow-sm shrink-0">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">💊</span> 
          My Medications
        </h2>
        <p className="text-slate-600 text-lg font-medium mt-1">Daily Schedule & Safety Checks</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-100">
        {medications.map((med) => (
          <div 
            key={med.id} 
            className={`bg-white rounded-2xl p-5 border-l-8 shadow-sm hover:shadow-md transition-all ${
              med.status === 'taken' ? 'border-green-500' : 
              med.status === 'missed' ? 'border-red-500' : 'border-blue-400'
            }`}
          >
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h3 className="text-xl font-bold text-slate-900">{med.name}</h3>
                    <p className="text-slate-500 font-semibold">{med.dosage} • {med.timeOfDay}</p>
                </div>
                {med.status === 'taken' ? (
                   <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Taken</span>
                ) : med.status === 'missed' ? (
                   <span className="bg-red-100 text-red-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Missed</span>
                ) : (
                   <span className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1 rounded-full uppercase">Due</span>
                )}
            </div>
            
            {med.status !== 'taken' && (
                <button 
                    onClick={() => onTriggerCheck(med.name)}
                    className="w-full mt-2 bg-blue-600 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-blue-700 active:scale-95 transition-all"
                    aria-label={`Verify ${med.name} with camera`}
                >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>
                    Verify with Camera
                </button>
            )}

            {med.lastTaken && (
                <p className="text-xs text-slate-400 mt-2 font-medium">
                    Verified: {med.lastTaken.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </p>
            )}
          </div>
        ))}

        <div className="bg-yellow-50 p-4 rounded-2xl border-2 border-yellow-200 mt-6 mb-20">
            <h4 className="text-yellow-800 font-bold flex items-center gap-2 mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
                Drug Interaction Check
            </h4>
            <p className="text-sm text-yellow-700 leading-relaxed">
                SafeCompanion automatically checks for interactions when you show new medication bottles.
            </p>
        </div>
      </div>
    </div>
  );
};

export default MedicationPanel;
