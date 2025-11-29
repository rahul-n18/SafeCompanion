import { Memory } from '../types';

const STORAGE_KEY = 'safe_companion_memory';

export const MemoryService = {
  saveMemory: (category: string, fact: string): Memory => {
    const memories = MemoryService.getAllMemories();
    const newMemory: Memory = {
      id: Math.random().toString(36).substring(7),
      category,
      fact,
      timestamp: Date.now(),
    };
    memories.push(newMemory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memories));
    return newMemory;
  },

  getAllMemories: (): Memory[] => {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  searchMemories: (query: string): Memory[] => {
    const memories = MemoryService.getAllMemories();
    const lowerQuery = query.toLowerCase();
    return memories.filter(m => 
      m.fact.toLowerCase().includes(lowerQuery) || 
      m.category.toLowerCase().includes(lowerQuery)
    );
  },
  
  clearMemories: () => {
    localStorage.removeItem(STORAGE_KEY);
  }
};