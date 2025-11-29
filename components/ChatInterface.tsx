import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface ChatInterfaceProps {
  logs: LogEntry[];
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({ logs }) => {
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  // Only show the last 3 messages for mobile overlay cleanliness
  const recentLogs = logs.slice(-3);

  return (
    <div className="w-full space-y-3" aria-live="polite">
      {recentLogs.map((log, idx) => (
        <div 
            key={idx} 
            className={`flex flex-col ${
                log.sender === 'user' ? 'items-end' : 'items-start'
            } animate-fade-in-up`}
        >
           {/* Message Bubble */}
          <div 
            className={`max-w-[85%] px-4 py-3 rounded-2xl text-base font-medium shadow-md backdrop-blur-md border ${
                log.sender === 'user' 
                    ? 'bg-blue-600/90 text-white border-blue-500 rounded-br-sm' 
                    : log.sender === 'agent'
                    ? 'bg-white/90 text-slate-900 border-white/50 rounded-bl-sm'
                    : 'bg-slate-800/90 text-yellow-300 border-yellow-500/50 text-sm py-2 px-4 rounded-full mx-auto'
            } ${log.type === 'alert' ? '!bg-red-600/95 !text-white !border-red-500' : ''}`}
          >
            {log.type === 'action' && <span className="mr-2" aria-hidden="true">⚡</span>}
            {log.message}
          </div>
        </div>
      ))}
      <div ref={bottomRef} />
    </div>
  );
};

export default ChatInterface;