import React from 'react';
import { GeneratedImage } from '../types';

interface VisualAidPanelProps {
  image: GeneratedImage | null;
  isGenerating: boolean;
}

const VisualAidPanel: React.FC<VisualAidPanelProps> = ({ image, isGenerating }) => {
  return (
    <div className="h-full w-full bg-slate-50 border-l-4 border-slate-200 flex flex-col relative overflow-hidden">
      <div className="p-6 bg-white border-b-4 border-slate-200 shadow-sm">
        <h2 className="text-2xl md:text-3xl font-extrabold text-slate-900 flex items-center gap-3">
          <span className="text-4xl" aria-hidden="true">🖼️</span> 
          Visual Helper
        </h2>
        <p className="text-slate-600 text-lg font-medium mt-1">I can draw things to help explain.</p>
      </div>

      <div className="flex-1 p-6 flex items-center justify-center bg-slate-100 overflow-y-auto">
        {isGenerating ? (
          <div className="text-center space-y-6">
             <div className="w-24 h-24 border-8 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
             <p className="text-blue-800 animate-pulse font-bold text-2xl">Creating Image...</p>
          </div>
        ) : image ? (
          <div className="flex flex-col gap-6 w-full h-full animate-fade-in">
             <div className="relative flex-1 bg-white rounded-3xl overflow-hidden border-4 border-slate-300 shadow-xl min-h-[300px]">
                 <img 
                    src={image.url} 
                    alt={image.prompt} 
                    className="w-full h-full object-contain p-2"
                 />
             </div>
             <div className="bg-white p-6 rounded-3xl border-4 border-slate-200 shadow-lg space-y-4">
                <div>
                  <p className="text-slate-500 text-sm font-black uppercase tracking-wider mb-2">Showing Concept</p>
                  <p className="text-slate-900 text-2xl font-bold capitalize leading-tight">{image.prompt}</p>
                </div>
                {image.reasoning && (
                  <div className="bg-blue-50 p-5 rounded-2xl border-l-8 border-blue-600">
                    <p className="text-blue-800 text-sm font-black uppercase mb-2 flex items-center gap-2">
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                      Why I drew this
                    </p>
                    <p className="text-slate-800 text-lg font-medium italic leading-relaxed">"{image.reasoning}"</p>
                  </div>
                )}
             </div>
          </div>
        ) : (
          <div className="text-center text-slate-400">
             <svg xmlns="http://www.w3.org/2000/svg" width="96" height="96" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mx-auto mb-6 opacity-50"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
             <p className="text-2xl font-bold text-slate-500">Waiting for request...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualAidPanel;