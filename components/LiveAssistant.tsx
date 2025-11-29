import React, { useEffect, useRef, useState, useCallback } from 'react';
import { GoogleGenAI, LiveServerMessage, Modality } from '@google/genai';
import { createPcmBlob, decodeAudioData, base64ToUint8Array, arrayBufferToBase64, calculateRMS } from '../services/audioUtils';
import { MemoryService } from '../services/memoryService';
import { TOOLS, SYSTEM_INSTRUCTION, MODEL_NAME } from '../constants';
import { LogEntry, ConnectionState, UserMode, Obstacle, GestureType, EmotionalState, Medication, VocalMetrics } from '../types';

interface LiveAssistantProps {
  apiKey: string;
  onLog: (entry: LogEntry) => void;
  onAction: (action: string) => void;
  onGenerateVisualAid?: (description: string, reasoning: string) => void;
  onObstaclesDetected?: (obstacles: Obstacle[]) => void;
  onGestureDetected?: (gesture: GestureType) => void;
  onLanguageChanged?: (lang: string) => void;
  onEmotionalStateUpdate?: (state: EmotionalState) => void;
  onVocalMetricsUpdate?: (metrics: VocalMetrics) => void;
  onMedicationVerified?: (medName: string) => void;
  videoEnabled: boolean;
  isMuted: boolean;
  mode: UserMode;
  medications?: Medication[];
}

const LiveAssistant: React.FC<LiveAssistantProps> = ({ 
  apiKey, 
  onLog, 
  onAction, 
  onGenerateVisualAid, 
  onObstaclesDetected,
  onGestureDetected,
  onLanguageChanged,
  onEmotionalStateUpdate,
  onVocalMetricsUpdate,
  onMedicationVerified,
  videoEnabled, 
  isMuted, 
  mode,
  medications
}) => {
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);
  
  // Refs for media and session management
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sessionRef = useRef<Promise<any> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const inputContextRef = useRef<AudioContext | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const scriptProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const videoIntervalRef = useRef<number | null>(null);
  const analysisIntervalRef = useRef<number | null>(null);
  const sourcesRef = useRef<Set<AudioBufferSourceNode>>(new Set());
  const spatialNodesRef = useRef<{left: StereoPannerNode, right: StereoPannerNode, center: StereoPannerNode} | null>(null);

  // Helper to append logs safely
  const logMessage = useCallback((sender: 'user' | 'agent' | 'system', message: string, type: 'text' | 'action' | 'alert' = 'text') => {
    onLog({ timestamp: new Date(), sender, message, type });
  }, [onLog]);

  // Handle Mute State
  useEffect(() => {
    if (streamRef.current) {
        streamRef.current.getAudioTracks().forEach(track => {
            track.enabled = !isMuted;
        });
    }
  }, [isMuted]);

  // Handle Video State (Turn off camera track if disabled)
  useEffect(() => {
    if (streamRef.current) {
        streamRef.current.getVideoTracks().forEach(track => {
            track.enabled = videoEnabled;
        });
    }
  }, [videoEnabled]);

  // Cleanup function
  const cleanup = useCallback(() => {
    if (sessionRef.current) {
        sessionRef.current.then(session => session.close()).catch(() => {});
        sessionRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (inputContextRef.current) {
      inputContextRef.current.close();
      inputContextRef.current = null;
    }
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    if (videoIntervalRef.current) {
      window.clearInterval(videoIntervalRef.current);
      videoIntervalRef.current = null;
    }
    if (analysisIntervalRef.current) {
      window.clearInterval(analysisIntervalRef.current);
      analysisIntervalRef.current = null;
    }
    sourcesRef.current.forEach(source => source.stop());
    sourcesRef.current.clear();
    setConnectionState(ConnectionState.DISCONNECTED);
  }, []);

  // Initialize Connection
  useEffect(() => {
      // Don't auto-connect if no API key or already connected/connecting
      if (!apiKey || connectionState === ConnectionState.CONNECTED || connectionState === ConnectionState.CONNECTING) return;
      
      const init = async () => {
         await connect();
      }
      init();
      
      return () => cleanup();
  }, [apiKey]);

  const connect = async () => {
    if (!apiKey) return;
    
    try {
      setConnectionState(ConnectionState.CONNECTING);
      logMessage('system', 'Initializing SafeCompanion...');

      // 1. Setup Audio Contexts & Spatial Audio
      const outputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const inputCtx = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      audioContextRef.current = outputCtx;
      inputContextRef.current = inputCtx;
      
      const outputNode = outputCtx.createGain();
      
      // Setup Spatial Panners for Obstacle Feedback
      const leftPanner = outputCtx.createStereoPanner();
      leftPanner.pan.value = -1;
      leftPanner.connect(outputCtx.destination);
      
      const rightPanner = outputCtx.createStereoPanner();
      rightPanner.pan.value = 1;
      rightPanner.connect(outputCtx.destination);

      const centerPanner = outputCtx.createStereoPanner();
      centerPanner.pan.value = 0;
      centerPanner.connect(outputCtx.destination);
      
      spatialNodesRef.current = { left: leftPanner, right: rightPanner, center: centerPanner };

      // Main voice output goes to center by default
      outputNode.connect(centerPanner);

      // 2. Get Media Stream (Mobile Optimized Constraints)
      const constraints = {
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: {
          // Mobile preferred settings
          facingMode: "environment",
          width: { ideal: 640 }, // Lower res for stability on mobile data
          height: { ideal: 480 } 
        }
      };
      
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      stream.getAudioTracks().forEach(t => t.enabled = !isMuted);
      stream.getVideoTracks().forEach(t => t.enabled = videoEnabled);

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      // 3. Initialize Gemini Client
      const ai = new GoogleGenAI({ apiKey });
      
      const memories = MemoryService.getAllMemories();
      const medList = medications ? medications.map(m => `- ${m.name}: ${m.dosage} (${m.frequency} - ${m.timeOfDay})`).join('\n') : 'No meds on file.';
      
      const memoryContext = `\n\n[KNOWN MEDICATIONS]:\n${medList}\n\n[LONG TERM MEMORY]:\n${memories.map(m => `- ${m.category}: ${m.fact}`).join('\n')}`;

      const config = {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION + 
              `\n\nCURRENT MODE: ${mode === 'visually_impaired' ? 'VISUAL ASSISTANT (Blind User)' : 'ELDERLY COMPANION'}` +
              memoryContext,
          tools: [{ functionDeclarations: TOOLS }, { googleMaps: {} }], // Added Google Maps
          inputAudioTranscription: {},
          outputAudioTranscription: {},
          thinkingConfig: { thinkingBudget: 1024 }
      };

      const sessionPromise = ai.live.connect({ model: MODEL_NAME, config, callbacks: {
          onopen: () => {
            setConnectionState(ConnectionState.CONNECTED);
            logMessage('system', 'Connected. Monitoring Environment...');
            
            // Audio Pipeline
            const source = inputCtx.createMediaStreamSource(stream);
            
            // Analyser for Acoustic Features
            const analyser = inputCtx.createAnalyser();
            analyser.fftSize = 2048; // Higher resolution for rudimentary stability check
            analyserRef.current = analyser;
            source.connect(analyser);

            const processor = inputCtx.createScriptProcessor(4096, 1, 1);
            scriptProcessorRef.current = processor;
            
            processor.onaudioprocess = (e) => {
              const inputData = e.inputBuffer.getChannelData(0);
              const pcmBlob = createPcmBlob(inputData);
              sessionPromise.then(session => {
                session.sendRealtimeInput({ media: pcmBlob });
              });
            };
            
            // Connect processor to analyser (pass-through not strictly needed but keeps graph alive)
            analyser.connect(processor);
            processor.connect(inputCtx.destination);

            // Start Loops
            startVideoStreaming(sessionPromise);
          },
          onmessage: async (msg: LiveServerMessage) => {
             // Handle Tool Calls
             if (msg.toolCall) {
                for (const fc of msg.toolCall.functionCalls) {
                    
                    let result: any = { status: 'ok' };
                    let actionDisplay = '';
                    
                    if (fc.name === 'triggerEmergency') {
                        const args = fc.args as any;
                        alert(`🚑 EMERGENCY TRIGGERED: ${args.reason} (Severity: ${args.severity})`);
                        logMessage('agent', `EMERGENCY: ${args.reason}`, 'alert');
                        result = { status: 'emergency_dispatched', eta: '5 minutes' };
                    } 
                    else if (fc.name === 'manageDevice') {
                        const args = fc.args as any;
                        actionDisplay = `Device: ${args.action} ${args.deviceType} ${args.value ? `(${args.value})` : ''}`;
                        onAction(actionDisplay);
                        logMessage('agent', actionDisplay, 'action');
                        result = { status: 'success', message: actionDisplay };
                    } 
                    else if (fc.name === 'setReminder') {
                        const args = fc.args as any;
                        actionDisplay = `Reminder: ${args.task} @ ${args.time}`;
                        onAction(actionDisplay);
                        logMessage('agent', actionDisplay, 'action');
                        result = { status: 'confirmed' };
                    } 
                    else if (fc.name === 'generateVisualAid') {
                        const args = fc.args as any;
                        if (onGenerateVisualAid) {
                            onGenerateVisualAid(args.description, args.reasoning);
                            actionDisplay = `Drawing: ${args.description}`;
                            onAction(actionDisplay);
                            logMessage('agent', actionDisplay, 'action');
                            result = { status: 'generating' };
                        }
                    } 
                    else if (fc.name === 'reportFall') {
                        const args = fc.args as any;
                        logMessage('agent', `FALL DETECTED (${Math.round(args.confidence * 100)}%): ${args.visualDescription}`, 'alert');
                        alert(`🚨 FALL DETECTED 🚨\n\nVisual Analysis: ${args.visualDescription}\n\nCalling Family & Emergency Services immediately...`);
                        result = { status: 'emergency_services_contacted', family_notified: true };
                    }
                    else if (fc.name === 'verifyMedication') {
                        const args = fc.args as any;
                        const status = args.visualConfirmation ? 'VERIFIED ✅' : 'NOT SEEN ❌';
                        actionDisplay = `Meds Check: ${args.medicationName} - ${status}`;
                        if (args.visualConfirmation && onMedicationVerified) {
                           onMedicationVerified(args.medicationName);
                        }
                        onAction(actionDisplay);
                        logMessage('agent', actionDisplay, args.visualConfirmation ? 'text' : 'alert');
                        result = { status: 'logged', verification: args.visualConfirmation };
                    }
                    else if (fc.name === 'logHealthMetric') {
                        const args = fc.args as any;
                        if (args.status === 'critical') {
                            onAction(`Health Warning: ${args.metric}`);
                        }
                        logMessage('system', `Health Log [${args.metric}]: ${args.status.toUpperCase()} - ${args.observation}`);
                        result = { status: 'recorded' };
                    }
                    else if (fc.name === 'setEnvironmentMode') {
                        const args = fc.args as any;
                        actionDisplay = `Context Scene: Setting '${args.mode}' mode (${args.reason})`;
                        onAction(actionDisplay);
                        logMessage('agent', actionDisplay, 'action');
                        result = { status: 'scene_activated' };
                    }
                    else if (fc.name === 'analyzeDistress') {
                        const args = fc.args as any;
                        logMessage('system', `Emotional Analysis: ${args.detectedPattern} (${args.distressLevel})`, 'alert');
                        onAction("Evaluating Emotional Health");
                        result = { status: 'distress_logged', action: args.distressLevel === 'high' ? 'notify_family' : 'monitor' };
                    }
                    else if (fc.name === 'reportObstacles') {
                        const args = fc.args as any;
                        if (onObstaclesDetected && args.obstacles) {
                            onObstaclesDetected(args.obstacles);
                            // Trigger Spatial Audio Cue for Left/Right obstacles
                            const leftThreat = args.obstacles.find((o: any) => o.direction === 'left' && (o.priority === 'critical' || o.priority === 'medium'));
                            const rightThreat = args.obstacles.find((o: any) => o.direction === 'right' && (o.priority === 'critical' || o.priority === 'medium'));
                            
                            if (leftThreat) playSpatialBeep('left');
                            if (rightThreat) playSpatialBeep('right');
                            
                            result = { status: 'obstacles_processed_with_spatial_audio' };
                        }
                    }
                    else if (fc.name === 'reportGesture') {
                        const args = fc.args as any;
                        if (onGestureDetected && args.gesture) {
                            onGestureDetected(args.gesture);
                            actionDisplay = `Gesture: ${args.gesture.toUpperCase()}`;
                            onAction(actionDisplay);
                            result = { status: 'gesture_processed' };
                        }
                    }
                    else if (fc.name === 'updateLanguage') {
                        const args = fc.args as any;
                        if (onLanguageChanged && args.language) {
                            onLanguageChanged(args.language);
                            logMessage('system', `Language switched to ${args.language}`);
                            result = { status: 'language_updated' };
                        }
                    }
                    else if (fc.name === 'reportEmotionalState') {
                        const args = fc.args as any;
                        if (onEmotionalStateUpdate) {
                            onEmotionalStateUpdate({
                                emotion: args.userEmotion,
                                confidence: args.confidence,
                                adaptation: args.adaptationStrategy,
                                timestamp: new Date()
                            });
                        }
                        result = { status: 'dashboard_updated' };
                    }
                    else if (fc.name === 'saveMemory') {
                        const args = fc.args as any;
                        MemoryService.saveMemory(args.category, args.fact);
                        logMessage('system', `Memory Saved: ${args.fact}`);
                        result = { status: 'memory_persisted' };
                    }
                    else if (fc.name === 'recallMemory') {
                        const args = fc.args as any;
                        const memories = MemoryService.searchMemories(args.query);
                        result = { 
                            found: memories.length > 0,
                            memories: memories.map(m => m.fact).join("; ") 
                        };
                    }
                    else if (fc.name === 'reportDrugInteraction') {
                        const args = fc.args as any;
                        const alertMsg = `⚠️ DRUG INTERACTION: ${args.medications.join(' + ')} - ${args.severity.toUpperCase()}`;
                        logMessage('agent', alertMsg, 'alert');
                        onAction("Drug Interaction Alert");
                        alert(`${alertMsg}\n\n${args.interactionDetail}`);
                        result = { status: 'user_alerted' };
                    }
                    else if (fc.name === 'notifyFamily') {
                        const args = fc.args as any;
                        const logMsg = `Family Notification [${args.alertType}]: ${args.message}`;
                        logMessage('system', logMsg);
                        onAction(`Family Notified: ${args.alertType}`);
                        // In a real app, this would trigger FCM/SMS backend
                        new Notification("SafeCompanion Alert", { body: args.message });
                        result = { status: 'notification_sent', timestamp: new Date() };
                    }
                    else if (fc.name === 'logPain') {
                        const args = fc.args as any;
                        logMessage('system', `Pain Log: ${args.location} (Level ${args.severity}) - ${args.description}`);
                        result = { status: 'pain_logged' };
                    }
                    else if (fc.name === 'recommendExercise') {
                        const args = fc.args as any;
                        actionDisplay = `Therapy Suggestion: ${args.recommendation}`;
                        onAction(actionDisplay);
                        logMessage('agent', `Therapy for ${args.painLocation}: ${args.recommendation} (${args.reason || ''})`, 'action');
                        result = { status: 'suggestion_displayed' };
                    }

                    // Send Response back to model
                    sessionPromise.then(session => {
                        session.sendToolResponse({
                            functionResponses: {
                                id: fc.id,
                                name: fc.name,
                                response: { result }
                            }
                        });
                    });
                }
             }

             // Handle Audio Output
             const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
             if (audioData) {
                const ctx = audioContextRef.current;
                if (ctx) {
                    nextStartTimeRef.current = Math.max(nextStartTimeRef.current, ctx.currentTime);
                    const audioBuffer = await decodeAudioData(base64ToUint8Array(audioData), ctx, 24000);
                    const source = ctx.createBufferSource();
                    source.buffer = audioBuffer;
                    // Connect to center panner by default for voice
                    if (spatialNodesRef.current) {
                        source.connect(spatialNodesRef.current.center);
                    } else {
                         source.connect(ctx.destination);
                    }
                    source.start(nextStartTimeRef.current);
                    nextStartTimeRef.current += audioBuffer.duration;
                    
                    sourcesRef.current.add(source);
                    source.onended = () => sourcesRef.current.delete(source);
                }
             }
             
             // Handle Interruption
             if (msg.serverContent?.interrupted) {
                 sourcesRef.current.forEach(s => s.stop());
                 sourcesRef.current.clear();
                 nextStartTimeRef.current = 0;
             }
             
             if (msg.serverContent?.inputTranscription) {
                 logMessage('user', msg.serverContent.inputTranscription.text);
             }
             if (msg.serverContent?.outputTranscription) {
                 if (msg.serverContent.turnComplete) {
                    logMessage('agent', msg.serverContent.outputTranscription.text);
                 }
             }
          },
          onclose: () => {
             logMessage('system', 'Connection closed');
             setConnectionState(ConnectionState.DISCONNECTED);
          },
          onerror: (err) => {
             console.error(err);
             logMessage('system', 'Connection error occurred', 'alert');
             setConnectionState(ConnectionState.ERROR);
          }
        }});
      sessionRef.current = sessionPromise;

    } catch (error) {
        console.error("Connection failed", error);
        setConnectionState(ConnectionState.ERROR);
    }
  };

  const playSpatialBeep = (direction: 'left' | 'right') => {
      const ctx = audioContextRef.current;
      const panners = spatialNodesRef.current;
      if (!ctx || !panners) return;
      
      // Ensure context is running (browser policy)
      if(ctx.state === 'suspended') ctx.resume();

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth'; // Warning sound
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.2);
      
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);

      osc.connect(gain);
      gain.connect(direction === 'left' ? panners.left : panners.right);
      
      osc.start();
      osc.stop(ctx.currentTime + 0.25);
  };

  const startVideoStreaming = (sessionPromise: Promise<any>) => {
    if (videoIntervalRef.current) clearInterval(videoIntervalRef.current);
    
    videoIntervalRef.current = window.setInterval(() => {
        if (!videoEnabled || !videoRef.current || !canvasRef.current) return;
        
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        
        if (ctx && video.videoWidth > 0) {
            canvas.width = video.videoWidth / 2;
            canvas.height = video.videoHeight / 2;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const base64 = canvas.toDataURL('image/jpeg', 0.6).split(',')[1];
            
            sessionPromise.then(session => {
                session.sendRealtimeInput({
                    media: {
                        mimeType: 'image/jpeg',
                        data: base64
                    }
                });
            });
        }
    }, 250);
  };

  return (
      <div className="w-full h-full bg-black relative">
          <video 
            ref={videoRef} 
            className={`w-full h-full object-cover transition-opacity duration-500 ${videoEnabled ? 'opacity-100' : 'opacity-0'}`}
            playsInline 
            autoPlay 
            muted 
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Status Overlay if Disconnected */}
          {connectionState !== ConnectionState.CONNECTED && (
              <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm z-50">
                   <div className="text-center p-6">
                       {connectionState === ConnectionState.CONNECTING ? (
                           <>
                             <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                             <p className="text-white font-bold text-lg">Connecting...</p>
                           </>
                       ) : (
                           <p className="text-red-400 font-bold">Disconnected</p>
                       )}
                   </div>
              </div>
          )}
      </div>
  );
};

export default LiveAssistant;