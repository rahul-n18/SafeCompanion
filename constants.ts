
import { FunctionDeclaration, Schema, Type } from "@google/genai";

export const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const IMAGE_MODEL_NAME = 'gemini-2.5-flash-image';

export const SYSTEM_INSTRUCTION = `You are SafeCompanion, a multimodal AI guardian.

**CRITICAL STYLE RULE: BE CONCISE**
- **Keep responses SHORT (1-2 sentences maximum)**.
- Do not ramble. Do not be overly polite. Get straight to the point.
- Only provide long explanations if the user specifically asks for "details" or "help".

**CORE PROTOCOL: DEEP THINK ANALYSIS**
Before every response, analyze the user's audio (tone, hesitation, background noise) and video (posture, environment, objects).

**1. ACOUSTIC HEALTH MONITORING & LONELINESS DETECTION**
- **Vocal Biomarkers**: Monitor for "Tremor" or "Low Energy".
  - If [SYSTEM] provides "Vocal Energy: LOW" alerts: **Log it silently** using \`logHealthMetric\`.
  - **DO NOT** ask "Are you okay?" immediately. Only ask if you receive 3 consecutive alerts.
- **Loneliness Index**:
  - If isolation detected (High "I/Me" usage): **Wait**. Do not interrupt. If pattern persists, suggest a specific memory using \`recallMemory\`.

**2. MEDICATION MANAGEMENT (STRICT)**
- **Visual Verification**: If user takes meds, DEMAND to see the bottle. "Please hold the label to the camera."
- **Check**: Compare visual label text against known meds.
- **Interaction**: If a NEW pill is seen, cross-reference against existing meds for interactions. Use \`reportDrugInteraction\` immediately if risky.
- **Compliance**: If user refuses or forgets, use \`notifyFamily\` (simulating SMS/FCM alert).

**3. ADVANCED NAVIGATION (Maps & Vision)**
- **Outdoor**: Use \`googleMaps\` to find locations.
- **Indoor (Visual)**: Scan specifically for "Exit Signs", "Doorways", and "Bathrooms".
- **Obstacles**: When reporting obstacles via \`reportObstacles\`, be precise with direction ('left', 'right', 'center') to trigger spatial audio cues.

**MODE SPECIFIC PROTOCOLS**:

--- IF VISUAL ASSISTANT MODE (Blind User) ---
- **Traffic/Signage**: Read aloud any textual signage immediately.
- **Spatial Guidance**: Use clock-face directions (e.g., "Doorway at 2 o'clock").

--- IF COMPANION MODE (Elderly User) ---
- **Pain Context**: Correlate weather/time with pain reports.
- **Proactive Check-ins**: If silent for too long, initiate a conversation topic based on \`recallMemory\`.

**GLOBAL RULES**:
- **Tools over Talk**: If a tool exists for an event (like a gesture or obstacle), USE IT.
- **Zero Tolerance Fall Detection**: If a fall is suspected visually, trigger \`reportFall\` immediately.
`;

// --- EXISTING TOOLS ---

const emergencyAlertTool: FunctionDeclaration = {
  name: 'triggerEmergency',
  description: 'Triggers an emergency alert to family and medical services. Use this AFTER verifying a fall or receiving a direct help request.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      reason: { type: Type.STRING },
      severity: { type: Type.STRING, enum: ['low', 'medium', 'high', 'critical'] },
    },
    required: ['reason', 'severity'],
  },
};

const manageDeviceTool: FunctionDeclaration = {
  name: 'manageDevice',
  description: 'Explicit control of specific devices (on/off/set value).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      deviceType: { type: Type.STRING, enum: ['thermostat', 'light', 'door_lock'] },
      action: { type: Type.STRING, enum: ['turn_on', 'turn_off', 'set_temperature', 'lock', 'unlock'] },
      value: { type: Type.STRING },
    },
    required: ['deviceType', 'action'],
  },
};

const setReminderTool: FunctionDeclaration = {
  name: 'setReminder',
  description: 'Sets a reminder for the user.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      task: { type: Type.STRING },
      time: { type: Type.STRING },
    },
    required: ['task', 'time'],
  },
};

const generateVisualAidTool: FunctionDeclaration = {
  name: 'generateVisualAid',
  description: 'Generates an image to visually explain a concept. ALWAYS explain your reasoning.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      description: { type: Type.STRING, description: "The image prompt to generate." },
      reasoning: { type: Type.STRING, description: "Explain WHY this specific image will help the user understand better." }
    },
    required: ['description', 'reasoning'],
  },
};

const reportFallTool: FunctionDeclaration = {
  name: 'reportFall',
  description: 'CRITICAL: Reporting a detected fall event based on video analysis. Triggers immediate family call.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      confidence: { type: Type.NUMBER, description: 'Confidence level of the fall detection (0-1).' },
      visualDescription: { type: Type.STRING, description: 'What was observed (e.g., "User slumped from chair").' },
    },
    required: ['confidence', 'visualDescription'],
  },
};

const verifyMedicationTool: FunctionDeclaration = {
  name: 'verifyMedication',
  description: 'Logs visual verification of medication adherence. Use video to confirm correct bottle/pill.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      medicationName: { type: Type.STRING },
      visualConfirmation: { type: Type.BOOLEAN, description: 'True if the ingestion was visually confirmed.' },
      notes: { type: Type.STRING, description: 'Details about the visual check (e.g. "Label matches Lisinopril").' }
    },
    required: ['medicationName', 'visualConfirmation'],
  },
};

const logHealthMetricTool: FunctionDeclaration = {
  name: 'logHealthMetric',
  description: 'Logs a health observation based on audio/video analysis (posture, speech, gait).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      metric: { type: Type.STRING, enum: ['posture', 'speech_clarity', 'energy_level', 'mobility', 'vocal_biomarker'] },
      status: { type: Type.STRING, enum: ['normal', 'concern', 'critical'] },
      observation: { type: Type.STRING, description: 'Detailed observation.' },
    },
    required: ['metric', 'status', 'observation'],
  },
};

const setEnvironmentModeTool: FunctionDeclaration = {
  name: 'setEnvironmentMode',
  description: 'Adjusts multiple smart devices at once based on the user\'s context/activity.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      mode: { type: Type.STRING, enum: ['reading', 'watching_tv', 'sleeping', 'active', 'dining'] },
      reason: { type: Type.STRING, description: 'Why this mode was selected based on video input.' },
    },
    required: ['mode', 'reason'],
  },
};

const analyzeDistressTool: FunctionDeclaration = {
  name: 'analyzeDistress',
  description: 'Logs detected emotional distress, loneliness, or confusion.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      detectedPattern: { type: Type.STRING, description: 'Description of the pattern (e.g. "Loneliness markers: excessive use of I").' },
      distressLevel: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    },
    required: ['detectedPattern', 'distressLevel'],
  },
};

const reportObstaclesTool: FunctionDeclaration = {
  name: 'reportObstacles',
  description: 'MANDATORY: Report ALL detected obstacles for the visual threat queue.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      obstacles: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            object: { type: Type.STRING, description: "Name of the obstacle (e.g. 'Chair', 'Stairs')"},
            priority: { type: Type.STRING, enum: ['critical', 'medium', 'low'] },
            direction: { type: Type.STRING, enum: ['left', 'center', 'right'], description: "CRITICAL: Relative direction for spatial audio cues." },
          },
          required: ['object', 'priority', 'direction']
        }
      }
    },
    required: ['obstacles']
  }
};

const reportGestureTool: FunctionDeclaration = {
  name: 'reportGesture',
  description: 'Triggers when user makes a specific hand gesture.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      gesture: { type: Type.STRING, enum: ['thumbs_up', 'thumbs_down', 'open_palm'] },
      meaning: { type: Type.STRING, description: 'The interpreted meaning.' }
    },
    required: ['gesture']
  }
};

const updateLanguageTool: FunctionDeclaration = {
  name: 'updateLanguage',
  description: 'Updates the App UI when the user speaks a different language.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      language: { type: Type.STRING, description: 'The detected language (e.g., Spanish, French, Japanese).' },
    },
    required: ['language']
  }
};

const reportEmotionalStateTool: FunctionDeclaration = {
  name: 'reportEmotionalState',
  description: 'Updates the Emotional Intelligence Dashboard. Call this when you detect a mood.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      userEmotion: { type: Type.STRING, description: 'Detected user emotion (e.g. Joy, Loneliness, Anxiety)' },
      confidence: { type: Type.NUMBER, description: 'Confidence 0-1' },
      adaptationStrategy: { type: Type.STRING, description: 'How the AI is adapting (e.g. "Using slower, warmer tone")' }
    },
    required: ['userEmotion', 'adaptationStrategy']
  }
};

const saveMemoryTool: FunctionDeclaration = {
  name: 'saveMemory',
  description: 'Saves important facts about the user for long-term memory.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      category: { type: Type.STRING, enum: ['family', 'health', 'preference', 'history'] },
      fact: { type: Type.STRING, description: 'The fact to remember (e.g. "Granddaughter Sarah loves dinosaurs")' }
    },
    required: ['category', 'fact']
  }
};

const recallMemoryTool: FunctionDeclaration = {
  name: 'recallMemory',
  description: 'Searches long-term memory for details about a topic.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      query: { type: Type.STRING, description: 'Topic to search for' }
    },
    required: ['query']
  }
};

// --- NEW TOOLS ---

const reportDrugInteractionTool: FunctionDeclaration = {
  name: 'reportDrugInteraction',
  description: 'Alerts user of potential drug interactions based on medical knowledge.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      medications: { type: Type.ARRAY, items: { type: Type.STRING } },
      severity: { type: Type.STRING, enum: ['low', 'moderate', 'severe'] },
      interactionDetail: { type: Type.STRING, description: 'Explanation of the interaction.' },
    },
    required: ['medications', 'severity', 'interactionDetail'],
  },
};

const notifyFamilyTool: FunctionDeclaration = {
  name: 'notifyFamily',
  description: 'Sends alerts to family members via SMS/FCM (e.g., missed meds, compliance risks, falls).',
  parameters: {
    type: Type.OBJECT,
    properties: {
      alertType: { type: Type.STRING, enum: ['medication_missed', 'compliance_risk', 'fall', 'pain_alert', 'general'] },
      message: { type: Type.STRING, description: 'Message to family.' },
      priority: { type: Type.STRING, enum: ['low', 'medium', 'high'] },
    },
    required: ['alertType', 'message', 'priority'],
  },
};

const logPainTool: FunctionDeclaration = {
  name: 'logPain',
  description: 'Logs a pain event for PainCompanion tracking.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      location: { type: Type.STRING },
      severity: { type: Type.NUMBER, description: '1-10' },
      description: { type: Type.STRING, description: 'User description e.g. "Sharp throbbing"' },
      duration: { type: Type.STRING, description: 'How long it has lasted' },
    },
    required: ['location', 'severity', 'description'],
  },
};

const recommendExerciseTool: FunctionDeclaration = {
  name: 'recommendExercise',
  description: 'Suggests physical activity or therapy for pain relief.',
  parameters: {
    type: Type.OBJECT,
    properties: {
      painLocation: { type: Type.STRING },
      recommendation: { type: Type.STRING, description: 'The exercise or therapy (e.g. "Heat pad", "Seated marching")' },
      reason: { type: Type.STRING },
    },
    required: ['painLocation', 'recommendation'],
  },
};

export const TOOLS = [
  emergencyAlertTool, 
  manageDeviceTool, 
  setReminderTool, 
  generateVisualAidTool,
  reportFallTool,
  verifyMedicationTool,
  logHealthMetricTool,
  setEnvironmentModeTool,
  analyzeDistressTool,
  reportObstaclesTool,
  reportGestureTool,
  updateLanguageTool,
  reportEmotionalStateTool,
  saveMemoryTool,
  recallMemoryTool,
  reportDrugInteractionTool,
  notifyFamilyTool,
  logPainTool,
  recommendExerciseTool
];
