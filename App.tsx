
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { 
  Play, Square, Plus, Trash2, Cpu, Music, Save, FolderOpen, 
  Sliders, X, Piano, Zap, Disc, Layout, Layers, Clock, Info, 
  ChevronRight, ChevronDown, Folder, Search, Sparkles, 
  Volume2, Maximize2, Activity, MousePointer2, Pencil, Eraser,
  ChevronUp, ListMusic, MoreVertical, Settings2, BarChart3,
  Waves, Headphones, FileAudio, Keyboard, Download, RotateCcw,
  MessageSquare, Wand2, Power, Loader2, MousePointer, GripHorizontal,
  Scissors, VolumeX, Eye, HelpCircle, Activity as WaveformIcon,
  Mic2, Target, Move, Music2, File
} from 'lucide-react';
import { Track, SynthSettings, InstrumentType, FXSettings, PlaylistClip, PlaybackMode, PatternData, PianoNote, FXSlot } from './types';
import { DRUM_SAMPLES, DEFAULT_BPM, TRACK_COLORS, PIANO_ROLL_NOTES, SAMPLE_PACKS, SYNTH_PRESETS } from './constants';
import { generatePattern, getMusicAdvice } from './services/geminiService';

// --- Improved Utility Functions ---

const durationToSteps = (duration: string): number => {
  const map: Record<string, number> = { '16n': 1, '8n': 2, '4n': 4, '2n': 8, '1n': 16 };
  return map[duration] || 1;
};

const stepsToDuration = (steps: number): string => {
  if (steps <= 1) return '16n';
  if (steps <= 2) return '8n';
  if (steps <= 4) return '4n';
  if (steps <= 8) return '2n';
  return '1n'; 
};

// --- Sub-Components ---

const BrowserItem: React.FC<{ name: string, data: any, type: 'sample' | 'preset', onDoubleClick: () => void }> = ({ name, data, type, onDoubleClick }) => {
  const handleDragStart = (e: React.DragEvent) => {
     e.dataTransfer.setData('application/gemini-daw-item', JSON.stringify({ type, name, data }));
     e.dataTransfer.effectAllowed = 'copy';
  };

  return (
     <div 
        draggable 
        onDragStart={handleDragStart}
        onDoubleClick={onDoubleClick}
        className="group flex items-center gap-2 px-3 py-1.5 text-white/50 hover:text-white hover:bg-white/5 cursor-grab active:cursor-grabbing rounded transition-all select-none"
     >
        {type === 'sample' ? <FileAudio size={11} className="group-hover:text-orange-400" /> : <Zap size={11} className="group-hover:text-blue-400" />}
        <span className="text-[10px] font-medium truncate">{name}</span>
     </div>
  );
};

const BrowserFolder: React.FC<{ name: string, children: React.ReactNode, depth?: number, defaultOpen?: boolean }> = ({ name, children, depth = 0, defaultOpen = false }) => {
   const [isOpen, setIsOpen] = useState(defaultOpen);
   return (
      <div className="select-none">
         <div 
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-2 px-2 py-1.5 hover:bg-white/5 cursor-pointer text-white/60 hover:text-white transition-colors rounded`}
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
         >
            {isOpen ? <ChevronDown size={11} className="text-white/40" /> : <ChevronRight size={11} className="text-white/40" />}
            <Folder size={11} className={`${isOpen ? 'text-orange-500' : 'text-white/30'}`} />
            <span className="text-[10px] font-bold uppercase tracking-wide">{name}</span>
         </div>
         {isOpen && <div className="border-l border-white/5 ml-3">{children}</div>}
      </div>
   );
};

const RecursiveBrowser = ({ data, depth = 0, onItemClick }: { data: any, depth?: number, onItemClick: (type: 'sample'|'preset', name: string, val: any) => void }) => {
   return (
      <div className="flex flex-col">
         {Object.entries(data).map(([key, value]) => {
            if (typeof value === 'string') {
               return <BrowserItem key={key} name={key} data={value} type="sample" onDoubleClick={() => onItemClick('sample', key, value)} />;
            } else if (value && typeof value === 'object' && 'type' in value && 'settings' in value) {
               return <BrowserItem key={key} name={key} data={value} type="preset" onDoubleClick={() => onItemClick('preset', key, value)} />;
            } else {
               return (
                  <BrowserFolder key={key} name={key} depth={depth}>
                     <RecursiveBrowser data={value} depth={depth + 1} onItemClick={onItemClick} />
                  </BrowserFolder>
               );
            }
         })}
      </div>
   );
};

// --- Signature Components ---

const LCD: React.FC<{ label: string, value: string | number, color?: string, width?: string, unit?: string }> = ({ label, value, color = "text-orange-400", width = "min-w-[70px]", unit }) => (
  <div className={`bg-[#0a0a0a] rounded-sm border-t border-white/5 border-b border-black p-1.5 flex flex-col ${width} shadow-[inset_0_2px_12px_rgba(0,0,0,1)] relative overflow-hidden group`}>
    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
    <div className="flex justify-between items-center mb-0.5 px-0.5 relative z-10">
      <span className="text-[6px] font-black uppercase text-white/30 tracking-widest leading-none select-none">{label}</span>
      {unit && <span className="text-[5px] font-mono text-white/10 uppercase">{unit}</span>}
    </div>
    <span className={`text-[14px] font-mono font-bold ${color} leading-none truncate tracking-[0.15em] text-center filter drop-shadow-[0_0_3px_currentColor] relative z-10`}>
      {value}
    </span>
  </div>
);

const FruityKnob: React.FC<{ 
  label?: string, 
  value: number, 
  min: number, 
  max: number, 
  onChange: (val: number) => void,
  onHover?: (msg: string) => void,
  color?: string,
  size?: number,
  unit?: string
}> = ({ label, value, min, max, onChange, onHover, color = '#ff8a00', size = 32, unit = "" }) => {
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const percentage = (value - min) / (max - min);
  const strokeDashoffset = circumference - (percentage * 0.75) * circumference;
  
  const handleMouseDown = (e: React.MouseEvent) => {
    const startY = e.clientY;
    const startVal = value;
    const onMouseMove = (m: MouseEvent) => {
      const delta = (startY - m.clientY) / 200;
      onChange(Math.max(min, Math.min(max, startVal + delta * (max - min))));
    };
    const onMouseUp = () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
  };

  return (
    <div className="flex flex-col items-center group cursor-ns-resize" 
         onMouseEnter={() => label && onHover?.(`${label}: ${value.toFixed(2)}${unit}`)}
         onMouseLeave={() => onHover?.("")}>
      <div className="relative" onMouseDown={handleMouseDown}>
        <div className="absolute inset-0 rounded-full bg-black/40 shadow-inner scale-90" />
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[135deg] drop-shadow-xl relative z-10">
          <circle cx={size/2} cy={size/2} r={radius} fill="#1a1c20" stroke="#000" strokeWidth="1" />
          <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke={color} strokeWidth="2.5" strokeDasharray={circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.05s ease' }} strokeLinecap="round" opacity="0.8" />
          <line x1={size/2} y1={size/2} x2={size/2} y2={size/2 - radius + 3} stroke="#fff" strokeWidth="2" strokeLinecap="round" transform={`rotate(${percentage * 270}, ${size/2}, ${size/2})`} />
        </svg>
      </div>
      {label && <span className="text-[7px] font-black uppercase text-white/30 mt-1.5 group-hover:text-white transition-colors select-none tracking-tighter">{label}</span>}
    </div>
  );
};

const WindowFrame: React.FC<{ 
  title: string, 
  icon: React.ReactNode, 
  children: React.ReactNode, 
  onClose: () => void, 
  initialPos?: { x: number, y: number },
  width?: number,
  active?: boolean,
  onClick?: () => void
}> = ({ title, icon, children, onClose, initialPos = { x: 100, y: 100 }, width = 600, active, onClick }) => {
  const [pos, setPos] = useState(initialPos);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0 });

  const onMouseDown = (e: React.MouseEvent) => {
    onClick?.();
    if ((e.target as HTMLElement).closest('.window-header')) {
      setIsDragging(true);
      dragStart.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    }
  };

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) {
        setPos({ x: e.clientX - dragStart.current.x, y: e.clientY - dragStart.current.y });
      }
    };
    const onMouseUp = () => setIsDragging(false);
    
    if (isDragging) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [isDragging]);

  return (
    <div 
      className={`absolute bg-[#24282e]/95 backdrop-blur-md rounded-md shadow-2xl border border-black/60 overflow-hidden flex flex-col transition-all duration-200 ${active ? 'z-40 ring-1 ring-orange-500/40 shadow-[0_0_30px_rgba(0,0,0,0.5)]' : 'z-30 opacity-95 grayscale-[0.3]'}`}
      style={{ left: pos.x, top: pos.y, width: width }}
      onMouseDown={() => onClick?.()}
    >
      <div 
        className={`window-header h-7 flex items-center justify-between px-3 cursor-move border-b border-black flex-shrink-0 select-none ${active ? 'bg-gradient-to-r from-[#33363d] to-[#2d3238]' : 'bg-[#1c1e22]'}`}
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2.5 pointer-events-none">
          <span className={active ? 'text-orange-500' : 'text-white/20'}>{icon}</span>
          <span className={`text-[10px] font-black uppercase tracking-[0.2em] ${active ? 'text-white/90' : 'text-white/30'}`}>{title}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white/20 hover:text-red-500 transition-colors p-1">
          <X size={12} />
        </button>
      </div>
      <div className="relative flex-1 bg-[#1c1e22]/50">
        {children}
      </div>
    </div>
  );
};

// --- Main Engine ---

export default function App() {
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('pat');
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [swing, setSwing] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentBar, setCurrentBar] = useState(0);
  const [currentPatternId, setCurrentPatternId] = useState(1);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>('1');
  const [focusedWindow, setFocusedWindow] = useState<string>('rack');
  const [ui, setUi] = useState({ rack: true, mixer: true, browser: true, playlist: true, piano: false, producer: false });
  const [playlistClips, setPlaylistClips] = useState<PlaylistClip[]>([]);
  const [hint, setHint] = useState("Gemini Engine initialized. Ready for brutal production.");
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [producerAdvice, setProducerAdvice] = useState<string>("Mastering is the bridge between a good track and a hit. Check your gain stages.");
  const [brushLength, setBrushLength] = useState(1);
  const [selectedNoteId, setSelectedNoteId] = useState<string | null>(null);
  const [showGraphEditor, setShowGraphEditor] = useState(false);
  const [isMetronomeOn, setIsMetronomeOn] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [hoveredNoteIndex, setHoveredNoteIndex] = useState<number | null>(null);
  const [dragOverTrackId, setDragOverTrackId] = useState<string | null>(null);

  // Interaction State
  const isPaintingRef = useRef(false);
  const paintValueRef = useRef(true);
  const dragRef = useRef<{ 
    type: 'move' | 'resize'; 
    noteId: string; 
    trackId: string; 
    startX: number; 
    startY: number; 
    initialStep: number; 
    initialNoteIndex: number; 
    initialLengthSteps: number; 
  } | null>(null);

  const [tracks, setTracks] = useState<Track[]>(() => [
    { id: '1', name: 'Kick Core', type: 'sampler', sampleUrl: DRUM_SAMPLES.kick, patterns: { 1: { id: 1, name: 'Pattern 1', steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], velocities: Array(16).fill(0.8), notes: [], color: TRACK_COLORS[0] } }, fx: { reverb: { enabled: false, roomSize: 0.5, dampening: 3000 }, delay: { enabled: false, delayTime: '8n', feedback: 0.3 } }, fxSlots: [], volume: 1.0, pan: 0, muted: false, solo: false, color: TRACK_COLORS[0], mixerTrack: 1 },
    { id: '2', name: 'Acid 303', type: 'acid', patterns: { 1: { id: 1, name: 'Acid Line', steps: Array(16).fill(false), velocities: Array(16).fill(0.8), notes: [{ id: 'n1', note: 'C2', step: 0, length: '16n', velocity: 1 }, { id: 'n2', note: 'C3', step: 4, length: '16n', velocity: 1 }], color: TRACK_COLORS[6] } }, synthSettings: { oscillator: 'sawtooth', envelope: { attack: 0.01, decay: 0.2, sustain: 0.1, release: 0.1 }, filter: { frequency: 1200, resonance: 15, type: 'lowpass' } }, fx: { reverb: { enabled: false, roomSize: 0.5, dampening: 3000 }, delay: { enabled: true, delayTime: '8n', feedback: 0.3 } }, fxSlots: [], volume: 0.7, pan: 0, muted: false, solo: false, color: TRACK_COLORS[6], mixerTrack: 2 },
  ]);

  const selectedTrack = useMemo(() => tracks.find(t => t.id === selectedTrackId), [tracks, selectedTrackId]);

  const samplersRef = useRef<{ [key: string]: any }>({});
  const fxNodesRef = useRef<{ [key: string]: any }>({});
  const masterRef = useRef<{ analyzer: Tone.Analyser, meter: Tone.Meter, limiter: Tone.Limiter } | null>(null);
  const metronomeRef = useRef<Tone.MetalSynth | null>(null);
  const transportIdRef = useRef<number | null>(null);
  
  const pianoKeysRef = useRef<HTMLDivElement>(null);
  const pianoGridRef = useRef<HTMLDivElement>(null);

  const [meters, setMeters] = useState<{ [key: string]: number }>({});
  const [masterWaveform, setMasterWaveform] = useState<Float32Array>(new Float32Array(0));
  const tracksRef = useRef(tracks);
  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  // --- Global Listeners ---
  useEffect(() => {
     const onMouseUp = () => { 
        isPaintingRef.current = false; 
        dragRef.current = null;
     };
     const onMouseMove = (e: MouseEvent) => {
        if (!dragRef.current || !selectedTrackId || !pianoGridRef.current) return;
        
        const { type, noteId, startX, startY, initialStep, initialNoteIndex, initialLengthSteps } = dragRef.current;
        const rect = pianoGridRef.current.getBoundingClientRect();
        const stepWidth = rect.width / 16;
        const rowHeight = 28;

        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;

        const stepDelta = Math.round(deltaX / stepWidth);
        const noteIndexDelta = Math.round(deltaY / rowHeight);

        setTracks(prev => prev.map(t => {
           if (t.id !== selectedTrackId) return t;
           const pat = t.patterns[currentPatternId];
           if (!pat) return t;
           
           const updatedNotes = pat.notes.map(n => {
              if (n.id !== noteId) return n;
              
              if (type === 'move') {
                 let newStep = Math.max(0, Math.min(15, initialStep + stepDelta));
                 let newIndex = Math.max(0, Math.min(PIANO_ROLL_NOTES.length - 1, initialNoteIndex + noteIndexDelta));
                 return { ...n, step: newStep, note: PIANO_ROLL_NOTES[newIndex] };
              } else if (type === 'resize') {
                 let newLenSteps = Math.max(1, Math.min(16 - n.step, initialLengthSteps + stepDelta));
                 return { ...n, length: stepsToDuration(newLenSteps) };
              }
              return n;
           });
           
           return { ...t, patterns: { ...t.patterns, [currentPatternId]: { ...pat, notes: updatedNotes } } };
        }));
     };

     window.addEventListener('mouseup', onMouseUp);
     window.addEventListener('mousemove', onMouseMove);
     return () => {
        window.removeEventListener('mouseup', onMouseUp);
        window.removeEventListener('mousemove', onMouseMove);
     };
  }, [selectedTrackId, currentPatternId]);

  // --- Audio Engine Sync ---
  useEffect(() => {
    Tone.Transport.bpm.value = bpm;
  }, [bpm]);

  useEffect(() => {
    Tone.Transport.swing = swing;
  }, [swing]);

  // --- Global Shortcuts ---
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        startPlayback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying]);

  // --- Audio Setup ---
  useEffect(() => {
    if (!masterRef.current) {
      const limiter = new Tone.Limiter(-1).toDestination();
      const analyzer = new Tone.Analyser("waveform", 256);
      const meter = new Tone.Meter();
      analyzer.connect(meter);
      meter.connect(limiter);
      masterRef.current = { analyzer, meter, limiter };

      const metroSynth = new Tone.MetalSynth({
         envelope: { attack: 0.001, decay: 0.1, release: 0.01 },
         harmonicity: 5.1,
         modulationIndex: 32,
         resonance: 4000,
         octaves: 1.5
      }).toDestination();
      metroSynth.volume.value = -12;
      metronomeRef.current = metroSynth;
    }
  }, []);

  useEffect(() => {
    const initTracks = async () => {
      if (!masterRef.current) return;

      const promises = tracks.map(async track => {
        if (!fxNodesRef.current[track.id]) {
          const meter = new Tone.Meter();
          const revMeter = new Tone.Meter();
          const delMeter = new Tone.Meter();
          const reverb = new Tone.Reverb({ decay: 2.5, wet: 0 }).connect(masterRef.current!.analyzer);
          const revProxy = new Tone.Gain(1).connect(reverb).connect(revMeter);
          const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.4, wet: 0 }).connect(revProxy);
          const delProxy = new Tone.Gain(1).connect(delay).connect(delMeter);
          const filter = new Tone.Filter(2000, "lowpass").connect(delProxy);
          const panner = new Tone.Panner(0).connect(filter);
          const gain = new Tone.Gain(1).connect(panner).connect(meter);
          gain.connect(masterRef.current!.analyzer);
          fxNodesRef.current[track.id] = { gain, panner, reverb, delay, filter, meter, revMeter, delMeter };
        }
        
        const fx = fxNodesRef.current[track.id];
        const anySolo = tracksRef.current.some(t => t.solo);
        const shouldMute = track.muted || (anySolo && !track.solo);

        fx.gain.gain.rampTo(shouldMute ? 0 : track.volume, 0.05);
        fx.panner.pan.rampTo(track.pan, 0.05);
        fx.reverb.wet.rampTo(track.fx.reverb.enabled ? 0.35 : 0, 0.1);
        fx.delay.wet.rampTo(track.fx.delay.enabled ? 0.25 : 0, 0.1);
        
        if (track.synthSettings) {
          fx.filter.frequency.rampTo(track.synthSettings.filter.frequency, 0.1);
          fx.filter.Q.rampTo(track.synthSettings.filter.resonance, 0.1);
        }

        if (!samplersRef.current[track.id]) {
          if (track.type === 'sampler' && track.sampleUrl) {
            samplersRef.current[track.id] = new Tone.Sampler({
              urls: { C3: track.sampleUrl },
              onload: () => {},
            }).connect(fx.gain);
          } else if (track.type === 'acid') {
             samplersRef.current[track.id] = new Tone.MonoSynth({
               oscillator: { type: 'sawtooth' },
               envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.1 },
               filterEnvelope: { attack: 0.01, decay: 0.2, sustain: 0.2, baseFrequency: 200, octaves: 4 }
             }).connect(fx.gain);
          } else {
            const settings = track.synthSettings || { oscillator: 'sine', envelope: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.1 }, filter: { frequency: 2000, resonance: 1, type: 'lowpass' } };
            const synth = new Tone.PolySynth(Tone.Synth, { oscillator: { type: settings.oscillator as any }, envelope: settings.envelope }).connect(fx.gain);
            samplersRef.current[track.id] = synth;
          }
        }
      });

      await Promise.all(promises);
      setIsAssetsLoading(true);
      await Tone.loaded();
      setIsAssetsLoading(false);
    };

    initTracks();
  }, [tracks]);

  // --- Visualization Loop ---
  useEffect(() => {
    let animFrame: number;
    const loop = () => {
      const newMeters: { [key: string]: number } = {};
      Object.entries(fxNodesRef.current).forEach(([id, nodes]: [string, any]) => {
        const val = nodes.meter.getValue();
        const normalized = Array.isArray(val) ? val[0] : val;
        newMeters[id] = Math.max(0, (normalized + 60) / 60);
      });
      setMeters(newMeters);

      if (masterRef.current) {
        setMasterWaveform(masterRef.current.analyzer.getValue() as Float32Array);
      }
      animFrame = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(animFrame);
  }, []);

  const triggerPreview = (note: string) => {
    if (!selectedTrackId || !samplersRef.current[selectedTrackId]) return;
    const instr = samplersRef.current[selectedTrackId];
    if (instr instanceof Tone.Sampler && !instr.loaded) return;
    if (instr.triggerAttackRelease) instr.triggerAttackRelease(note, '16n');
  };

  const startPlayback = useCallback(async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    setIsAssetsLoading(true);
    try { await Tone.loaded(); } catch (e) {}
    setIsAssetsLoading(false);

    if (isPlaying) {
      Tone.Transport.stop();
      Tone.Transport.cancel(0);
      transportIdRef.current = null;
      setIsPlaying(false);
      setCurrentStep(0);
    } else {
      Tone.Transport.stop();
      Tone.Transport.cancel(0);
      let stepCount = 0;
      Tone.Transport.bpm.value = bpm;
      Tone.Transport.swing = swing;

      transportIdRef.current = Tone.Transport.scheduleRepeat((time) => {
        const localStep = stepCount % 16;
        const barIndex = Math.floor(stepCount / 16);
        Tone.Draw.schedule(() => {
          setCurrentStep(localStep);
          setCurrentBar(barIndex);
        }, time);

        if (isMetronomeOn && metronomeRef.current && (localStep % 4 === 0)) {
           metronomeRef.current.triggerAttackRelease(localStep === 0 ? "C6" : "C5", "32n", time);
        }

        tracksRef.current.forEach(track => {
          if (track.muted) return;
           const anySolo = tracksRef.current.some(t => t.solo);
           if (anySolo && !track.solo) return;

          const instr = samplersRef.current[track.id];
          if (!instr) return;
          if (instr instanceof Tone.Sampler && !instr.loaded) return;

          let pattern: PatternData | undefined;
          if (playbackMode === 'song') {
            const clip = playlistClips.find(c => c.trackIndex === tracksRef.current.indexOf(track) && c.startBar === barIndex);
            if (clip) pattern = track.patterns[clip.patternId];
          } else {
            pattern = track.patterns[currentPatternId];
          }

          if (pattern) {
            if (pattern.steps[localStep]) {
              const velocity = pattern.velocities?.[localStep] ?? 0.8;
              instr.triggerAttackRelease("C3", "16n", time, velocity);
            }
            pattern.notes.filter(n => n.step === localStep).forEach(n => {
              instr.triggerAttackRelease(n.note, n.length, time, n.velocity);
            });
          }
        });
        stepCount++;
      }, "16n");
      Tone.Transport.start();
      setIsPlaying(true);
    }
  }, [isPlaying, playbackMode, playlistClips, currentPatternId, bpm, swing, isMetronomeOn]);

  const addTrack = (type: InstrumentType, name: string, url?: string, settings?: any) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newTrack: Track = {
      id, name, type, sampleUrl: url,
      patterns: { 
        [currentPatternId]: { 
          id: currentPatternId, 
          name: 'Pattern 1', 
          steps: Array(16).fill(false), 
          velocities: Array(16).fill(0.8),
          notes: [], 
          color: TRACK_COLORS[tracks.length % TRACK_COLORS.length] 
        } 
      },
      fx: { reverb: { enabled: false, roomSize: 0.5, dampening: 3000 }, delay: { enabled: false, delayTime: '8n', feedback: 0.3 } },
      synthSettings: settings || (type !== 'sampler' ? { oscillator: 'sawtooth', envelope: { attack: 0.01, decay: 0.3, sustain: 0.1, release: 0.1 }, filter: { frequency: 1500, resonance: 5, type: 'lowpass' } } : undefined),
      fxSlots: [], volume: 0.8, pan: 0, muted: false, solo: false, color: TRACK_COLORS[tracks.length % TRACK_COLORS.length], mixerTrack: tracks.length + 1
    };
    setTracks(p => [...p, newTrack]);
    setSelectedTrackId(id);
    setHint(`${name} initialized on Channel ${newTrack.mixerTrack}. Ready to destroy.`);
  };

  const updateSynthParam = (trackId: string, param: string, value: any) => {
    setTracks(p => p.map(t => {
      if (t.id !== trackId || !t.synthSettings) return t;
      const newSettings = { ...t.synthSettings };
      if (param === 'cutoff') newSettings.filter.frequency = value;
      if (param === 'resonance') newSettings.filter.resonance = value;
      return { ...t, synthSettings: newSettings };
    }));
  };

  const updateVelocity = (trackId: string, stepIndex: number, velocity: number) => {
    setTracks(p => p.map(t => {
      if (t.id !== trackId) return t;
      const pat = t.patterns[currentPatternId];
      const velocities = [...(pat.velocities || Array(16).fill(0.8))];
      velocities[stepIndex] = velocity;
      return { ...t, patterns: { ...t.patterns, [currentPatternId]: { ...pat, velocities } } };
    }));
  };

  const handleMasteringReview = async (query?: string) => {
    setHint("Gemini is analyzing...");
    const baseContext = `Project Context: 
      Tracks: ${tracks.map(t => `${t.name} (Type: ${t.type}, Vol: ${t.volume.toFixed(2)})`).join(', ')}.
      Current BPM: ${bpm}.`;
    
    const prompt = query ? `${baseContext} User Question: ${query}` : `${baseContext} Advice focus: Synth character and mix depth. Give brutal producer advice.`;
    
    const advice = await getMusicAdvice(prompt);
    setProducerAdvice(advice);
    setHint("AI Producers advice received.");
  };

  const toggleStep = (trackId: string, stepIndex: number, forceValue?: boolean) => {
    setTracks(p => p.map(t => {
      if (t.id !== trackId) return t;
      const pat = t.patterns[currentPatternId];
      const steps = [...pat.steps];
      steps[stepIndex] = forceValue !== undefined ? forceValue : !steps[stepIndex];
      return { ...t, patterns: { ...t.patterns, [currentPatternId]: { ...pat, steps } } };
    }));
  };

  const scrubTimeline = (bar: number) => {
      const time = Tone.Time(`${bar}:0:0`).toSeconds();
      Tone.Transport.seconds = time;
      setCurrentBar(bar);
      setCurrentStep(0);
  };

  const initPianoDrag = (e: React.MouseEvent, type: 'move' | 'resize', note: PianoNote) => {
     e.stopPropagation();
     setSelectedNoteId(note.id);
     triggerPreview(note.note);
     if (selectedTrackId) {
        dragRef.current = {
           type,
           noteId: note.id,
           trackId: selectedTrackId,
           startX: e.clientX,
           startY: e.clientY,
           initialStep: note.step,
           initialNoteIndex: PIANO_ROLL_NOTES.indexOf(note.note),
           initialLengthSteps: durationToSteps(note.length)
        };
     }
  };

  const handleDrop = async (e: React.DragEvent, trackId?: string) => {
    e.preventDefault();
    setDragOverTrackId(null);
    const dataStr = e.dataTransfer.getData('application/gemini-daw-item');
    if (!dataStr) return;
    
    try {
      const { type, name, data } = JSON.parse(dataStr);
      
      if (trackId) {
        // Replace existing track content
        setTracks(prev => prev.map(t => {
          if (t.id !== trackId) return t;
          
          // Clear current tone instrument instance to force reload
          if (samplersRef.current[t.id]) {
            samplersRef.current[t.id].dispose();
            delete samplersRef.current[t.id];
          }

          if (type === 'sample') {
            return {
              ...t,
              name: name,
              type: 'sampler',
              sampleUrl: data,
              synthSettings: undefined
            };
          } else if (type === 'preset') {
             return {
               ...t,
               name: name,
               type: data.type,
               synthSettings: data.settings,
               sampleUrl: undefined
             };
          }
          return t;
        }));
        setHint(`Replaced Channel ${trackId} with ${name}`);
      } else {
        // Add new track
        if (type === 'sample') {
           addTrack('sampler', name, data);
        } else if (type === 'preset') {
           addTrack(data.type, name, undefined, data.settings);
        }
      }
    } catch (e) {
      console.error("Drop failed", e);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#141619] text-[#e0e0e0] font-sans select-none overflow-hidden text-[11px] antialiased">
      
      {/* --- Top Control Center --- */}
      <header className="h-14 flex items-center justify-between px-3 bg-[#2d3238] border-b border-black shadow-xl z-50">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center">
             <div className="w-9 h-9 bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg flex items-center justify-center font-black italic text-black shadow-lg border-t border-white/30">FL</div>
             <span className="text-[6px] font-black uppercase text-white/20 mt-1 tracking-tighter">Gemini v2</span>
          </div>
          
          <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-sm border border-white/5 h-10 shadow-inner">
            <button onClick={() => setPlaybackMode('pat')} className={`px-4 h-full rounded-sm font-black text-[10px] transition-all flex items-center gap-2 ${playbackMode === 'pat' ? 'bg-orange-500 text-black shadow-md' : 'text-white/30 hover:text-white/50'}`}>
              <Layout size={12} /> PAT
            </button>
            <button onClick={() => setPlaybackMode('song')} className={`px-4 h-full rounded-sm font-black text-[10px] transition-all flex items-center gap-2 ${playbackMode === 'song' ? 'bg-orange-500 text-black shadow-md' : 'text-white/30 hover:text-white/50'}`}>
              <ListMusic size={12} /> SONG
            </button>
          </div>

          <div className="flex items-center gap-4 px-4 border-l border-white/5 h-9">
            <button disabled={isAssetsLoading} onClick={startPlayback} className={`w-9 h-9 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'bg-white/5 text-white/30 hover:bg-white/10'} ${isAssetsLoading ? 'opacity-30 cursor-wait' : ''}`}>
              {isAssetsLoading ? <Loader2 size={16} className="animate-spin" /> : isPlaying ? <Square size={16} fill="currentColor" /> : <Play size={16} fill="currentColor" className="translate-x-0.5" />}
            </button>

            <button onClick={() => setIsMetronomeOn(!isMetronomeOn)} className={`w-8 h-8 rounded flex items-center justify-center transition-all ${isMetronomeOn ? 'bg-blue-500/20 text-blue-400 border border-blue-500/50' : 'text-white/20 hover:text-white hover:bg-white/5'}`} title="Metronome">
               <Target size={16} />
            </button>
            
            <LCD label="Tempo" value={Math.round(bpm)} unit="BPM" />
            <FruityKnob value={bpm} min={60} max={220} onChange={setBpm} size={26} label="BPM" />
            
            <LCD label="Pattern" value={currentPatternId} unit="PAT" color="text-blue-400" />
            <div className="flex flex-col gap-0.5">
              <button onClick={() => setCurrentPatternId(p => Math.max(1, p-1))} className="p-1 hover:bg-white/5 rounded text-white/40"><ChevronUp size={10}/></button>
              <button onClick={() => setCurrentPatternId(p => p+1)} className="p-1 hover:bg-white/5 rounded text-white/40"><ChevronDown size={10}/></button>
            </div>
          </div>
        </div>

        <div className="flex-1 flex justify-center px-10">
           <div className="w-full max-w-md h-10 bg-black/60 rounded border border-white/5 overflow-hidden shadow-inner relative group">
              <canvas 
                ref={canvas => {
                  if (canvas && masterWaveform.length) {
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                      ctx.clearRect(0, 0, canvas.width, canvas.height);
                      ctx.beginPath();
                      ctx.strokeStyle = '#f97316';
                      ctx.lineWidth = 2;
                      const sliceWidth = canvas.width / masterWaveform.length;
                      let x = 0;
                      for (let i = 0; i < masterWaveform.length; i++) {
                        const v = masterWaveform[i] * 0.5 + 0.5;
                        const y = v * canvas.height;
                        if (i === 0) ctx.moveTo(x, y);
                        else ctx.lineTo(x, y);
                        x += sliceWidth;
                      }
                      ctx.stroke();
                    }
                  }
                }}
                width={400} height={40} className="w-full h-full opacity-60 group-hover:opacity-100 transition-opacity" 
              />
              <div className="absolute top-1 left-2 text-[5px] font-black uppercase text-orange-500/40">Master Waveform</div>
           </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 border-r border-white/5 pr-4">
             <button onClick={() => setUi(u => ({...u, browser: !u.browser}))} className={`p-2 rounded transition-all ${ui.browser ? 'text-orange-500 bg-orange-500/10' : 'text-white/20 hover:text-white/40'}`} title="Browser"><Layout size={18}/></button>
             <button onClick={() => setUi(u => ({...u, playlist: !u.playlist}))} className={`p-2 rounded transition-all ${ui.playlist ? 'text-orange-500 bg-orange-500/10' : 'text-white/20 hover:text-white/40'}`} title="Playlist"><ListMusic size={18}/></button>
             <button onClick={() => setUi(u => ({...u, rack: !u.rack}))} className={`p-2 rounded transition-all ${ui.rack ? 'text-orange-500 bg-orange-500/10' : 'text-white/20 hover:text-white/40'}`} title="Channel Rack"><Layers size={18}/></button>
             <button onClick={() => setUi(u => ({...u, mixer: !u.mixer}))} className={`p-2 rounded transition-all ${ui.mixer ? 'text-orange-500 bg-orange-500/10' : 'text-white/20 hover:text-white/40'}`} title="Mixer"><Sliders size={18}/></button>
             <button onClick={() => setUi(u => ({...u, piano: !u.piano}))} className={`p-2 rounded transition-all ${ui.piano ? 'text-orange-500 bg-orange-500/10' : 'text-white/20 hover:text-white/40'}`} title="Piano Roll"><Keyboard size={18}/></button>
          </div>
          <button onClick={() => setUi(u => ({...u, producer: !u.producer}))} className="flex items-center gap-2 px-3 py-1.5 bg-orange-600/20 border border-orange-500/30 rounded text-orange-400 hover:bg-orange-600/30 transition-all">
             <Wand2 size={14} />
             <span className="text-[9px] font-black uppercase tracking-widest">AI Producer</span>
          </button>
        </div>
      </header>

      {/* --- Main Workspace --- */}
      <main className="flex-1 flex overflow-hidden relative daw-background">
        
        {/* Project Browser */}
        {ui.browser && (
          <aside className="w-60 bg-[#1c1e22] border-r border-black flex flex-col z-50 shadow-2xl animate-in slide-in-from-left duration-200">
            <div className="p-3.5 border-b border-black flex items-center justify-between bg-black/20">
              <span className="font-black text-white/40 uppercase tracking-[0.2em] text-[10px]">Browser</span>
              <Folder size={14} className="text-white/20" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2.5 space-y-4 custom-scrollbar">
               <div className="space-y-1">
                 <BrowserFolder name="Sample Packs" defaultOpen>
                     <RecursiveBrowser data={SAMPLE_PACKS} onItemClick={(t, n, d) => addTrack('sampler', n, d)} />
                 </BrowserFolder>
                 <BrowserFolder name="Synth Presets" defaultOpen>
                     <RecursiveBrowser data={SYNTH_PRESETS} onItemClick={(t, n, d) => addTrack(d.type, n, undefined, d.settings)} />
                 </BrowserFolder>
               </div>
            </div>

            <div className="p-4 bg-black/40 border-t border-black">
               <button onClick={() => handleMasteringReview()} className="w-full py-2 bg-blue-600/10 border border-blue-500/30 rounded text-blue-400 text-[9px] font-black uppercase hover:bg-blue-600/20 transition-all flex items-center justify-center gap-2">
                 <Cpu size={14} /> Analyze Synth Layering
               </button>
            </div>
          </aside>
        )}

        <div className="flex-1 relative overflow-hidden">
          
          {/* Playlist Canvas */}
          {ui.playlist && (
            <WindowFrame 
              title="Playlist - Song Mode" icon={<Activity size={12}/>} initialPos={{ x: 20, y: 20 }} onClose={() => setUi(u => ({...u, playlist: false}))} width={800}
              active={focusedWindow === 'playlist'} onClick={() => setFocusedWindow('playlist')}>
               <div className="flex h-[320px] overflow-hidden bg-[#141619]">
                  <div className="w-36 border-r border-black flex flex-col bg-[#1c1e22]/80 backdrop-blur-sm z-20">
                     <div className="h-7 border-b border-black flex items-center px-3 font-black text-white/20 text-[8px] uppercase tracking-widest bg-black/20">Track List</div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar no-drag">
                        {tracks.map((t, i) => (
                          <div key={t.id} onClick={() => setSelectedTrackId(t.id)} 
                               className={`h-10 border-b border-black/50 flex items-center px-3 cursor-pointer transition-all ${selectedTrackId === t.id ? 'bg-orange-500/10 text-orange-400 border-l-2 border-l-orange-500' : 'text-white/40 hover:bg-white/5'}`}>
                            <span className="font-bold text-[9px] truncate">{i+1}. {t.name}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar relative grid-pattern">
                     <div className="sticky top-0 h-7 bg-[#1c1e22]/90 border-b border-black flex z-30 shadow-md">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} onClick={() => scrubTimeline(i)} className={`flex-1 border-r border-black/50 flex items-center justify-center text-[8px] font-black cursor-pointer hover:bg-white/5 ${isPlaying && currentBar === i ? 'text-orange-500' : 'text-white/10'}`}>{i + 1}</div>
                        ))}
                     </div>
                     <div className="flex flex-col relative z-10">
                        {tracks.map((t, trackIdx) => (
                          <div key={t.id} className="h-10 border-b border-black/30 flex relative">
                             {Array.from({ length: 16 }).map((_, barIdx) => {
                               const clip = playlistClips.find(c => c.trackIndex === trackIdx && c.startBar === barIdx);
                               return (
                                 <div 
                                   key={barIdx} 
                                   onClick={() => {
                                      const existing = playlistClips.find(c => c.trackIndex === trackIdx && c.startBar === barIdx);
                                      if (existing) setPlaylistClips(p => p.filter(c => c.id !== existing.id));
                                      else setPlaylistClips(p => [...p, { id: Math.random().toString(), patternId: currentPatternId, trackIndex: trackIdx, startBar: barIdx }]);
                                   }}
                                   className="flex-1 border-r border-black/20 cursor-crosshair hover:bg-white/5 transition-colors relative"
                                 >
                                   {clip && (
                                     <div 
                                       className="absolute inset-y-1 left-1 right-1 rounded bg-orange-500/80 flex items-center justify-center text-[7px] font-black text-black overflow-hidden shadow-lg border border-white/20"
                                       style={{ backgroundColor: t.color }}
                                     >
                                       PAT {clip.patternId}
                                     </div>
                                   )}
                                 </div>
                               )
                             })}
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </WindowFrame>
          )}

          {/* Mixer Console 2.0 */}
          {ui.mixer && (
            <WindowFrame 
              title="Mixer Console" icon={<Sliders size={12}/>} initialPos={{ x: 280, y: 360 }} onClose={() => setUi(u => ({...u, mixer: false}))} width={700}
              active={focusedWindow === 'mixer'} onClick={() => setFocusedWindow('mixer')}>
               <div className="flex h-[360px] bg-[#0d0f11] overflow-hidden">
                  <div className="flex-1 flex overflow-x-auto custom-scrollbar p-2 gap-[3px] shadow-inner no-drag">
                    {/* Master Strip */}
                    <div className="w-20 flex flex-col items-center py-4 bg-[#24282e] border border-black shadow-2xl rounded relative flex-shrink-0">
                       <div className="absolute top-0 left-0 w-full h-1 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,1)]" />
                       <VUMeter value={isPlaying ? 0.3 + Math.random() * 0.15 : 0} color="#ff8a00" height={160} />
                       <span className="mt-4 font-black text-orange-500 text-[10px] tracking-widest uppercase">Master</span>
                       <div className="mt-auto pb-4"><FruityKnob value={1} min={0} max={1.2} onChange={() => {}} size={30} color="#ff8a00" /></div>
                    </div>

                    {tracks.map(track => (
                      <div key={track.id} onClick={() => setSelectedTrackId(track.id)} className={`w-16 flex flex-col items-center py-4 border border-black transition-all cursor-pointer rounded flex-shrink-0 ${selectedTrackId === track.id ? 'bg-[#3b3f46] shadow-xl' : 'bg-[#1c1e22] hover:bg-white/5'}`}>
                         <VUMeter value={meters[track.id] || 0} color={track.color} height={160} />
                         <div className="flex-1 flex flex-col items-center justify-end py-2 gap-2 relative w-full px-2">
                             <div className="flex gap-1 mb-2">
                               <button onClick={() => setTracks(p => p.map(t => t.id === track.id ? {...t, muted: !t.muted} : t))} className={`w-4 h-4 rounded text-[8px] font-black ${track.muted ? 'bg-red-500 text-black' : 'bg-white/10 text-white/30'}`}>M</button>
                               <button onClick={() => setTracks(p => p.map(t => t.id === track.id ? {...t, solo: !t.solo} : t))} className={`w-4 h-4 rounded text-[8px] font-black ${track.solo ? 'bg-green-500 text-black' : 'bg-white/10 text-white/30'}`}>S</button>
                             </div>
                            <input 
                              type="range" min="0" max="1.5" step="0.01" 
                              value={track.volume} 
                              onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, volume: parseFloat(e.target.value)} : t))}
                              className="w-24 -rotate-90 origin-center cursor-ns-resize opacity-80 hover:opacity-100 transition-opacity absolute bottom-16 fruity-slider" 
                            />
                            <span className={`text-[8px] font-black truncate text-center w-full uppercase mt-auto ${selectedTrackId === track.id ? 'text-orange-400' : 'text-white/20'}`}>{track.name}</span>
                         </div>
                      </div>
                    ))}
                  </div>

                  {/* Effects Rack Sidebar */}
                  <div className="w-52 bg-[#1c1e22] border-l border-black p-4 flex flex-col gap-4 overflow-y-auto no-drag shadow-2xl">
                     <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">{selectedTrack?.type !== 'sampler' ? 'Synth Params' : 'Inserts'}</span>
                        <span className="text-[9px] font-bold text-orange-400">CH {selectedTrack?.mixerTrack || 0}</span>
                     </div>
                     <div className="space-y-3">
                        {/* Synth specific controls */}
                        {selectedTrack?.synthSettings && (
                          <div className="p-3 bg-blue-600/10 border border-blue-500/20 rounded-md flex flex-col gap-3">
                             <div className="flex justify-between items-center gap-2">
                                <FruityKnob label="Cutoff" value={selectedTrack.synthSettings.filter.frequency} min={20} max={8000} onChange={(v) => updateSynthParam(selectedTrack.id, 'cutoff', v)} size={24} color="#3b82f6" />
                                <FruityKnob label="Reso" value={selectedTrack.synthSettings.filter.resonance} min={0.1} max={30} onChange={(v) => updateSynthParam(selectedTrack.id, 'resonance', v)} size={24} color="#3b82f6" />
                             </div>
                             <div className="text-[7px] text-white/20 font-black uppercase text-center tracking-widest border-t border-white/5 pt-1">Filter Block</div>
                          </div>
                        )}

                        <div className={`p-3 rounded border transition-all flex flex-col gap-2 ${selectedTrack?.fx.reverb.enabled ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/20 border-white/5 opacity-50'}`}>
                           <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-white/60">Fruity Reverb</span>
                              <button onClick={() => setTracks(p => p.map(t => t.id === selectedTrackId ? {...t, fx: {...t.fx, reverb: {...t.fx.reverb, enabled: !t.fx.reverb.enabled}}} : t))}>
                                 <Power size={12} className={selectedTrack?.fx.reverb.enabled ? 'text-orange-500' : 'text-white/20'} />
                              </button>
                           </div>
                           <div className="flex items-center gap-4">
                              <FruityKnob value={selectedTrack?.fx.reverb.roomSize || 0.5} min={0} max={1} onChange={(v) => setTracks(p => p.map(t => t.id === selectedTrackId ? {...t, fx: {...t.fx, reverb: {...t.fx.reverb, roomSize: v}}} : t))} size={22} color="#f97316" />
                              <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
                                 <div className="h-full bg-orange-500" style={{ width: `${(selectedTrack?.fx.reverb.roomSize || 0.5) * 100}%` }} />
                              </div>
                           </div>
                        </div>

                        <div className={`p-3 rounded border transition-all flex flex-col gap-2 ${selectedTrack?.fx.delay.enabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/20 border-white/5 opacity-50'}`}>
                           <div className="flex items-center justify-between">
                              <span className="text-[9px] font-black uppercase text-white/60">Fruity Delay</span>
                              <button onClick={() => setTracks(p => p.map(t => t.id === selectedTrackId ? {...t, fx: {...t.fx, delay: {...t.fx.delay, enabled: !t.fx.delay.enabled}}} : t))}>
                                 <Power size={12} className={selectedTrack?.fx.delay.enabled ? 'text-blue-500' : 'text-white/20'} />
                              </button>
                           </div>
                           <div className="flex items-center gap-4">
                              <FruityKnob value={selectedTrack?.fx.delay.feedback || 0.3} min={0} max={1} onChange={(v) => setTracks(p => p.map(t => t.id === selectedTrackId ? {...t, fx: {...t.fx, delay: {...t.fx.delay, feedback: v}}} : t))} size={22} color="#3b82f6" />
                              <div className="flex-1 h-1 bg-black/40 rounded-full overflow-hidden">
                                 <div className="h-full bg-blue-500" style={{ width: `${(selectedTrack?.fx.delay.feedback || 0.3) * 100}%` }} />
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>
               </div>
            </WindowFrame>
          )}

          {/* Channel Rack 2.0 */}
          {ui.rack && (
            <WindowFrame 
              title="Channel Rack" icon={<Layers size={12}/>} initialPos={{ x: 60, y: 400 }} onClose={() => setUi(u => ({...u, rack: false}))} width={640}
              active={focusedWindow === 'rack'} onClick={() => setFocusedWindow('rack')}>
               <div className="p-4 space-y-3 bg-[#2d3238]/50 max-h-[400px] overflow-y-auto custom-scrollbar no-drag">
                  {tracks.map((track) => (
                    <div 
                        key={track.id} 
                        className="flex flex-col gap-1"
                        onDragOver={(e) => { e.preventDefault(); setDragOverTrackId(track.id); }}
                        onDragLeave={() => setDragOverTrackId(null)}
                        onDrop={(e) => handleDrop(e, track.id)}
                    >
                      <div className={`flex items-center gap-4 bg-[#1c1e22] p-2.5 rounded border ${dragOverTrackId === track.id ? 'border-orange-500 bg-orange-500/5' : 'border-black/40'} group hover:border-orange-500/30 transition-all shadow-lg`}>
                         <div className="flex items-center gap-2 w-48">
                            <div className="flex items-center gap-1.5">
                               <FruityKnob label="PAN" value={track.pan} min={-1} max={1} onChange={v => setTracks(p => p.map(t => t.id === track.id ? {...t, pan: v} : t))} size={18} />
                               <FruityKnob label="VOL" value={track.volume} min={0} max={1.5} onChange={v => setTracks(p => p.map(t => t.id === track.id ? {...t, volume: v} : t))} size={18} />
                            </div>
                            <div className="flex flex-col min-w-0 flex-1 ml-2" onClick={() => setSelectedTrackId(track.id)}>
                              <span className={`font-black truncate uppercase text-[10px] transition-colors cursor-pointer ${selectedTrackId === track.id ? 'text-orange-400' : 'text-white/40 group-hover:text-white/70'}`}>{track.name}</span>
                              <div className="flex items-center gap-2">
                                 <button onClick={() => setTracks(p => p.map(t => t.id === track.id ? {...t, muted: !t.muted} : t))} className={`w-3 h-3 rounded-full ${track.muted ? 'bg-white/20' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'}`} />
                                 <span className="text-[6px] text-white/10 tracking-[0.2em] font-mono">INS {track.mixerTrack}</span>
                              </div>
                            </div>
                         </div>
                         <div className="flex-1 grid grid-cols-16 gap-1" onMouseLeave={() => isPaintingRef.current = false}>
                            {track.patterns[currentPatternId]?.steps.map((s, i) => (
                              <button 
                                key={i} 
                                onMouseDown={(e) => {
                                   if (e.button === 0) { // Left click only
                                      isPaintingRef.current = true;
                                      paintValueRef.current = !s;
                                      toggleStep(track.id, i);
                                   }
                                }}
                                onMouseEnter={() => {
                                   if (isPaintingRef.current) {
                                      toggleStep(track.id, i, paintValueRef.current);
                                   }
                                }}
                                className={`h-7 rounded-sm border border-black/80 transition-all shadow-inner relative overflow-hidden ${isPlaying && currentStep === i ? 'brightness-150 scale-105 z-10 border-white/20' : ''}`}
                                style={{ backgroundColor: s ? track.color : (Math.floor(i / 4) % 2 === 0 ? '#444c56' : '#2d333b') }}
                              >
                                {s && <div className="absolute inset-2 bg-white/20 blur-sm rounded-full" />}
                              </button>
                            ))}
                         </div>
                         <button onClick={() => { setSelectedTrackId(track.id); setUi(u => ({...u, piano: true})); }} className="p-2 opacity-0 group-hover:opacity-100 bg-white/5 rounded text-white/30 hover:text-white hover:bg-white/10 transition-all"><Piano size={14}/></button>
                      </div>
                      
                      {/* Velocity Graph Editor - Shown if Graph Editor Toggle is Active */}
                      {showGraphEditor && (
                        <div className="pl-48 pr-12 pb-2 grid grid-cols-16 gap-1 h-12 animate-in slide-in-from-top-1 duration-200">
                          {track.patterns[currentPatternId]?.steps.map((s, i) => {
                             const velocity = track.patterns[currentPatternId].velocities?.[i] ?? 0.8;
                             return (
                              <div key={i} className="relative bg-black/20 rounded-sm overflow-hidden group/vel cursor-ns-resize"
                                   onMouseMove={(e) => {
                                      if (e.buttons === 1) {
                                         const rect = e.currentTarget.getBoundingClientRect();
                                         const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                                         updateVelocity(track.id, i, y);
                                      }
                                   }}
                                   onMouseDown={(e) => {
                                         const rect = e.currentTarget.getBoundingClientRect();
                                         const y = Math.max(0, Math.min(1, 1 - (e.clientY - rect.top) / rect.height));
                                         updateVelocity(track.id, i, y);
                                   }}
                              >
                                <div className={`absolute bottom-0 w-full transition-all ${s ? 'opacity-80' : 'opacity-30'}`} 
                                     style={{ height: `${velocity * 100}%`, backgroundColor: track.color }} />
                              </div>
                             )
                          })}
                        </div>
                      )}
                    </div>
                  ))}
               </div>
               <div 
                  className={`p-3 border-t border-black bg-black/40 flex justify-between items-center px-6 transition-colors ${dragOverTrackId === 'NEW' ? 'bg-orange-500/20' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOverTrackId('NEW'); }}
                  onDragLeave={() => setDragOverTrackId(null)}
                  onDrop={(e) => handleDrop(e)}
               >
                  <div className="flex gap-4">
                     <button onClick={() => addTrack('sampler', 'New Sampler')} className="text-[9px] font-black bg-white/5 px-4 py-2 rounded border border-white/5 hover:bg-white/10 transition-all uppercase tracking-widest">+ Sampler</button>
                     <button onClick={() => addTrack('acid', 'New Acid')} className="text-[9px] font-black bg-blue-600/10 px-4 py-2 rounded border border-blue-500/20 hover:bg-blue-600/20 transition-all uppercase tracking-widest text-blue-400">+ Acid Synth</button>
                  </div>
                  <div className="flex items-center gap-4">
                     <button 
                        onClick={() => setShowGraphEditor(prev => !prev)} 
                        className={`flex items-center gap-2 px-3 py-1.5 rounded transition-all border ${showGraphEditor ? 'bg-orange-500/20 text-orange-400 border-orange-500/50' : 'bg-white/5 text-white/30 border-white/10 hover:text-white'}`}
                     >
                       <BarChart3 size={14} />
                       <span className="text-[9px] font-black uppercase tracking-widest">Graph Editor</span>
                     </button>
                     <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] border-l border-white/10 pl-4">Global Swing</span>
                     <FruityKnob value={swing} min={0} max={1} onChange={setSwing} size={24} color="#fbbf24" label="Swing" />
                  </div>
               </div>
            </WindowFrame>
          )}

          {/* Piano Roll 2.0 */}
          {ui.piano && selectedTrack && (
            <WindowFrame 
              title={`Piano Roll - ${selectedTrack.name}`} icon={<Piano size={12}/>} initialPos={{ x: 150, y: 150 }} onClose={() => setUi(u => ({...u, piano: false}))} width={820}
              active={focusedWindow === 'piano'} onClick={() => setFocusedWindow('piano')}>
               <div className="flex flex-col h-[480px]">
                  <div className="flex h-9 bg-[#2d3238] border-b border-black items-center px-4 gap-6 flex-shrink-0">
                     <div className="flex items-center gap-2">
                        <Pencil size={12} className="text-orange-500" />
                        <span className="text-[9px] font-black uppercase text-white/40">Draw Tool</span>
                     </div>
                     <div className="w-px h-4 bg-white/5" />
                     <div className="flex items-center gap-3">
                        <span className="text-[8px] font-black text-white/20">Length:</span>
                        {[1, 2, 4].map(l => (
                          <button key={l} onClick={() => setBrushLength(l)} className={`w-6 h-5 rounded text-[8px] font-black transition-all ${brushLength === l ? 'bg-orange-500 text-black' : 'text-white/30 hover:text-white'}`}>{l}/16</button>
                        ))}
                     </div>
                  </div>
                  {/* Timeline Ruler */}
                  <div className="h-6 bg-[#1a1c20] border-b border-black flex relative z-40 ml-20 no-drag">
                     {Array.from({ length: 4 }).map((_, bar) => (
                       <div key={bar} className="flex-1 border-r border-white/10 relative">
                          <div className="absolute top-1 left-1 text-[8px] font-black text-white/30">{bar + 1}</div>
                          {Array.from({ length: 3 }).map((_, b) => (
                             <div key={b} className="absolute h-2 w-px bg-white/5 bottom-0" style={{ left: `${(b + 1) * 25}%` }} />
                          ))}
                       </div>
                     ))}
                     <div 
                        className="absolute top-0 bottom-0 w-px bg-orange-500 z-50 pointer-events-none transition-transform duration-75"
                        style={{ transform: `translateX(${currentStep * 6.25}%)`, left: '0' }}
                     />
                  </div>

                  <div className="flex-1 overflow-hidden relative no-drag flex">
                     {/* Keys Column */}
                     <div 
                        ref={pianoKeysRef}
                        className="w-20 bg-[#141619] border-r border-black overflow-hidden flex-shrink-0 z-[60] flex flex-col"
                     >
                        {PIANO_ROLL_NOTES.map((note, idx) => {
                           const isBlack = note.includes('#');
                           const isHovered = hoveredNoteIndex === idx;
                           return (
                              <button 
                                 key={note} 
                                 onMouseDown={() => triggerPreview(note)}
                                 className={`h-7 w-full border-b border-black/30 flex items-center justify-end pr-2 text-[8px] font-black transition-all flex-shrink-0 active:text-orange-500 ${isHovered ? 'bg-orange-500/40 text-white' : (isBlack ? 'bg-black text-white/30 hover:text-white' : 'bg-[#1c1e22] text-white/50 hover:bg-[#2d3238] hover:text-white')}`}
                              >
                                 {note}
                              </button>
                           )
                        })}
                     </div>
                     
                     {/* Note Grid */}
                     <div 
                        ref={pianoGridRef}
                        onScroll={(e) => {
                           if (pianoKeysRef.current) pianoKeysRef.current.scrollTop = e.currentTarget.scrollTop;
                        }}
                        className="flex-1 overflow-auto custom-scrollbar relative grid-pattern z-30"
                     >
                        <div className="absolute top-0 bottom-0 pointer-events-none transition-transform duration-75 z-[70] bg-white/5 border-l border-white/30 w-[6.25%]" 
                             style={{ transform: `translateX(${currentStep * 100}% )`, left: '0px' }} />

                        <div className="absolute inset-0 pointer-events-none z-50">
                           {selectedTrack.patterns[currentPatternId]?.notes.map(note => {
                              const noteIndex = PIANO_ROLL_NOTES.indexOf(note.note);
                              if (noteIndex === -1) return null;
                              return (
                                <div key={note.id} 
                                     className="absolute h-[27px] rounded-[3px] border border-black/20 overflow-hidden pointer-events-auto shadow-md group/note"
                                     style={{ 
                                       top: noteIndex * 28 + 1, 
                                       left: `${(note.step / 16) * 100}%`, 
                                       width: `${(durationToSteps(note.length) / 16) * 100}%`, 
                                       backgroundColor: selectedTrack.color 
                                     }}
                                     onMouseDown={(e) => initPianoDrag(e, 'move', note)}
                                     onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setTracks(p => p.map(t => {
                                          if (t.id !== selectedTrack.id) return t;
                                          const pat = t.patterns[currentPatternId];
                                          return { 
                                            ...t, 
                                            patterns: { 
                                              ...t.patterns, 
                                              [currentPatternId]: { 
                                                ...pat, 
                                                notes: pat.notes.filter(n => n.id !== note.id) 
                                              } 
                                            } 
                                          };
                                        }));
                                     }}
                                >
                                   <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-black/10" />
                                   <div className="absolute inset-0 flex items-center px-1">
                                      <span className="text-[7px] font-black text-black/60 truncate uppercase select-none drop-shadow-sm">{note.note}</span>
                                   </div>
                                   {/* Resize Handle */}
                                   <div 
                                      className="absolute right-0 top-0 bottom-0 w-2 cursor-e-resize hover:bg-white/30 flex items-center justify-center transition-colors"
                                      onMouseDown={(e) => initPianoDrag(e, 'resize', note)}
                                   >
                                      <div className="w-[1px] h-3 bg-black/20" />
                                   </div>
                                </div>
                              );
                           })}
                        </div>

                        {PIANO_ROLL_NOTES.map((note, idx) => (
                          <div key={note} 
                               className="h-7 flex border-b border-white/5 relative group hover:bg-white/[0.02]"
                               onMouseEnter={() => setHoveredNoteIndex(idx)}
                               onMouseLeave={() => setHoveredNoteIndex(null)}
                          >
                             {Array.from({ length: 16 }).map((_, step) => (
                               <div 
                                 key={step} 
                                 onMouseDown={() => {
                                   triggerPreview(note);
                                   const newId = Math.random().toString();
                                   const newNote: PianoNote = { id: newId, note, step, velocity: 0.8, length: stepsToDuration(brushLength) };
                                   setTracks(p => p.map(t => t.id === selectedTrack.id ? { ...t, patterns: { ...t.patterns, [currentPatternId]: { ...t.patterns[currentPatternId], notes: [...t.patterns[currentPatternId].notes, newNote] } } } : t));
                                 }}
                                 className={`flex-1 border-r border-black/10 cursor-crosshair relative z-20 hover:bg-white/10 transition-colors ${step % 4 === 0 ? 'border-l border-l-white/10' : ''}`}
                               >
                                  {step % 4 === 0 && <div className="absolute left-0 top-0 bottom-0 w-px bg-white/5 pointer-events-none" />}
                               </div>
                             ))}
                          </div>
                        ))}
                     </div>
                  </div>
               </div>
            </WindowFrame>
          )}
        </div>

        {/* Gemini Creative Sidebar */}
        {ui.producer && (
          <aside className="w-80 bg-[#1c1e22] border-l border-black flex flex-col z-50 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-200">
             <div className="p-4 border-b border-black flex items-center justify-between bg-black/30">
                <div className="flex items-center gap-2.5">
                   <Wand2 size={16} className="text-orange-500" />
                   <span className="font-black text-white/70 uppercase tracking-[0.2em] text-[11px]">Creative Intel</span>
                </div>
                <button onClick={() => setUi(u => ({...u, producer: false}))} className="text-white/20 hover:text-white"><X size={16} /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-5 custom-scrollbar flex flex-col gap-6">
                <div className="bg-black/50 border border-white/5 p-5 rounded-lg shadow-inner relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-40 transition-opacity"><MessageSquare size={20} /></div>
                   <h3 className="text-[10px] font-black text-orange-500/60 uppercase mb-3 tracking-widest">AI Feedback</h3>
                   <p className="text-[11px] leading-relaxed text-white/80 italic whitespace-pre-wrap font-medium">
                     "{producerAdvice}"
                   </p>
                </div>
                
                <div className="space-y-3">
                   <h4 className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em] mb-2">Smart Actions</h4>
                   <button onClick={async () => {
                      setHint("Gemini is composing...");
                      const pat = await generatePattern('Melodic Techno', tracks.length);
                      if (pat) setTracks(prev => prev.map((t, i) => ({ ...t, patterns: { ...t.patterns, [currentPatternId]: { ...t.patterns[currentPatternId], steps: pat[i.toString()] || Array(16).fill(false) } } })));
                      setHint("AI Patterns generated for all channels.");
                   }} className="w-full p-4 bg-orange-600/10 border border-orange-500/20 rounded flex items-center gap-4 hover:bg-orange-600/20 transition-all group">
                      <Sparkles size={20} className="text-orange-500 group-hover:animate-pulse" />
                      <div className="text-left">
                         <div className="text-[10px] font-black text-white/90 uppercase tracking-widest">Full Project Fill</div>
                         <div className="text-[8px] text-white/30">Generate patterns based on context</div>
                      </div>
                   </button>
                </div>
             </div>

             <div className="p-4 bg-black/20 border-t border-black">
                <div className="flex gap-2">
                   <input 
                      type="text" 
                      placeholder="Ask Gemini..." 
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => {
                         if (e.key === 'Enter') {
                            handleMasteringReview(chatInput);
                            setChatInput("");
                         }
                      }}
                      className="flex-1 bg-black/40 border border-white/5 rounded px-3 py-2.5 text-[11px] text-white focus:outline-none focus:border-orange-500/50 transition-all" 
                   />
                   <button onClick={() => { handleMasteringReview(chatInput); setChatInput(""); }} className="p-3 bg-orange-500 text-black rounded hover:bg-orange-400 transition-all shadow-lg active:scale-95">
                      <ChevronRight size={18} />
                   </button>
                </div>
             </div>
          </aside>
        )}
      </main>

      {/* --- Footer Status Bar --- */}
      <footer className="h-8 bg-[#1c1e22] border-t border-black flex items-center justify-between px-4 gap-4 shadow-2xl flex-shrink-0">
        <div className="flex items-center gap-3 overflow-hidden flex-1">
           <Info size={14} className="text-orange-500 flex-shrink-0" />
           <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.15em] truncate">{hint}</span>
        </div>
        <div className="flex items-center gap-6 text-[9px] font-mono text-white/20 flex-shrink-0">
           <div className="flex items-center gap-2 border-l border-white/5 pl-6">
              <div className={`w-2 h-2 rounded-full ${isAssetsLoading ? 'bg-yellow-500 animate-pulse' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`} />
              <span className="uppercase font-black tracking-widest text-[9px]">{isAssetsLoading ? "Buffer" : "Engine Ready"}</span>
           </div>
           <span className="font-black uppercase tracking-widest text-orange-500/40">FL Gemini Platinum Edition</span>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; height: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #333; border-radius: 10px; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .grid-cols-16 { grid-template-columns: repeat(16, minmax(0, 1fr)); }
        .daw-background { background-color: #0a0b0d; background-image: radial-gradient(rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 32px 32px; }
        .grid-pattern { background-image: linear-gradient(to right, rgba(255,255,255,0.03) 1px, transparent 1px); background-size: 6.25% 100%; }
        
        .fruity-slider { -webkit-appearance: none; background: transparent; }
        .fruity-slider::-webkit-slider-thumb { -webkit-appearance: none; height: 18px; width: 14px; background: #e0e0e0; border: 1px solid #000; cursor: ns-resize; box-shadow: 0 0 5px rgba(0,0,0,0.5); }
        .fruity-slider::-webkit-slider-runnable-track { height: 100px; width: 4px; background: #000; border-radius: 2px; }
      `}</style>
    </div>
  );
}

const VUMeter: React.FC<{ value: number, color: string, height: number }> = ({ value, color, height }) => {
  const segments = 20;
  const activeCount = Math.floor(value * segments);
  return (
    <div className="flex flex-col gap-[1.5px] w-4 bg-black/80 rounded-sm p-[2px] shadow-[inset_0_2px_8px_rgba(0,0,0,0.8)] border border-white/5" style={{ height }}>
      {Array.from({ length: segments }).map((_, i) => {
        const idx = segments - 1 - i;
        const isActive = idx < activeCount;
        let segColor = '#141618';
        if (isActive) {
          if (idx > 17) segColor = '#ef4444';
          else if (idx > 13) segColor = '#fbbf24';
          else segColor = color;
        }
        return <div key={idx} className="flex-1 rounded-[0.5px] transition-all duration-75" style={{ backgroundColor: segColor, boxShadow: isActive ? `0 0 4px ${segColor}66` : 'none' }} />;
      })}
    </div>
  );
};
