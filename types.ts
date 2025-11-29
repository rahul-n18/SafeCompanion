
export interface LogEntry {
  timestamp: Date;
  sender: 'user' | 'agent' | 'system';
  message: string;
  type?: 'text' | 'action' | 'alert';
}

export interface SmartDevice {
  id: string;
  name: string;
  type: 'thermostat' | 'light' | 'lock';
  status: string | number;
}

export interface Reminder {
  id: string;
  task: string;
  time: string;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioStreamConfig {
  sampleRate: number;
}

export type UserMode = 'elderly' | 'visually_impaired' | null;

export interface GeneratedImage {
  url: string;
  prompt: string;
  reasoning?: string;
}

export interface Obstacle {
  id: string;
  object: string;
  priority: 'critical' | 'medium' | 'low';
  direction: string; // 'left', 'center', 'right'
}

export type GestureType = 'thumbs_up' | 'thumbs_down' | 'open_palm' | 'none';

export interface EmotionalState {
  emotion: string;
  confidence: number;
  adaptation: string;
  timestamp: Date;
}

export interface Memory {
  id: string;
  category: string;
  fact: string;
  timestamp: number;
}

export interface Medication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  timeOfDay: string; // 'Morning', 'Afternoon', 'Evening'
  status: 'taken' | 'pending' | 'missed';
  lastTaken?: Date;
}

export interface VocalMetrics {
  energy: number; // RMS
  stability: number; // Variance
  isTremorDetected: boolean;
}
