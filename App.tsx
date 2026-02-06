
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import * as Tone from 'tone';
import { 
  Play, Square, Plus, Trash2, Cpu, Music, Save, FolderOpen, 
  Sliders, X, Piano, Zap, Disc, Layout, Layers, Clock, Info, 
  ChevronRight, ChevronDown, Folder, Search, Sparkles, 
  Volume2, Maximize2, Activity, MousePointer2, Pencil, Eraser,
  ChevronUp, ListMusic, MoreVertical, Settings2, BarChart3,
  Waves, Headphones, FileAudio, Keyboard, Download, RotateCcw,
  MessageSquare, Wand2, Power, Loader2, MousePointer, GripHorizontal
} from 'lucide-react';
import { Track, SynthSettings, InstrumentType, FXSettings, PlaylistClip, PlaybackMode, PatternData, PianoNote, FXSlot } from './types';
import { DRUM_SAMPLES, DEFAULT_BPM, TRACK_COLORS, PIANO_ROLL_NOTES } from './constants';
import { generatePattern, getMusicAdvice } from './services/geminiService';

// --- Utility Functions ---

const durationToSteps = (duration: string): number => {
  if (duration === '16n') return 1;
  if (duration === '8n') return 2;
  if (duration === '4n') return 4;
  if (duration === '2n') return 8;
  if (duration === '1n') return 16;
  return 1;
};

const stepsToDuration = (steps: number): string => {
  if (steps === 1) return '16n';
  if (steps === 2) return '8n';
  if (steps === 4) return '4n';
  if (steps === 8) return '2n';
  if (steps === 16) return '1n';
  return `${steps}*16n`;
};

// --- Improved Preset Data ---

const SYNTH_PRESETS: { name: string; type: InstrumentType; settings: SynthSettings }[] = [
  {
    name: 'Liquid Pad',
    type: 'synth',
    settings: {
      oscillator: 'sine',
      envelope: { attack: 1.2, decay: 2, sustain: 0.8, release: 2.5 },
      filter: { frequency: 400, resonance: 2, type: 'lowpass' }
    }
  },
  {
    name: 'Toxic Lead',
    type: 'synth',
    settings: {
      oscillator: 'sawtooth',
      envelope: { attack: 0.001, decay: 0.2, sustain: 0.4, release: 0.1 },
      filter: { frequency: 3200, resonance: 10, type: 'lowpass' }
    }
  },
  {
    name: '808 Sub',
    type: 'synth',
    settings: {
      oscillator: 'triangle',
      envelope: { attack: 0.01, decay: 0.8, sustain: 0.1, release: 0.5 },
      filter: { frequency: 120, resonance: 1, type: 'lowpass' }
    }
  },
  {
    name: '303 Acid',
    type: 'acid',
    settings: {
      oscillator: 'sawtooth',
      envelope: { attack: 0.005, decay: 0.15, sustain: 0.2, release: 0.1 },
      filter: { frequency: 1500, resonance: 15, type: 'lowpass' },
      distortion: 0.6
    }
  }
];

// --- Specialized Components ---

const LCD: React.FC<{ label: string, value: string | number, color?: string, width?: string, subValue?: string }> = ({ label, value, color = "text-green-500", width = "min-w-[60px]", subValue }) => (
  <div className={`bg-[#050505] rounded border-t border-white/5 border-b border-black p-1 flex flex-col ${width} shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)]`}>
    <div className="flex justify-between items-center mb-0.5 px-0.5">
      <span className="text-[5.5px] font-black uppercase text-white/20 tracking-tighter leading-none select-none">{label}</span>
      {subValue && <span className="text-[5.5px] font-mono text-white/10">{subValue}</span>}
    </div>
    <span className={`text-[13px] font-mono font-bold ${color} leading-none truncate tracking-widest text-center filter drop-shadow-[0_0_2px_currentColor]`}>{value}</span>
  </div>
);

const FruityKnob: React.FC<{ 
  label: string, 
  value: number, 
  min: number, 
  max: number, 
  onChange: (val: number) => void,
  onHover?: (msg: string) => void,
  color?: string,
  size?: number,
  unit?: string
}> = ({ label, value, min, max, onChange, onHover, color = '#ff8a00', size = 30, unit = "" }) => {
  const radius = (size / 2) - 4;
  const circumference = 2 * Math.PI * radius;
  const percentage = (value - min) / (max - min);
  const strokeDashoffset = circumference - (percentage * 0.75) * circumference;
  
  return (
    <div className="flex flex-col items-center group cursor-ns-resize" 
         onMouseEnter={() => onHover?.(`${label}: ${value.toFixed(2)}${unit}`)}
         onMouseLeave={() => onHover?.("")}>
      <div className="relative" onMouseDown={(e) => {
        const startY = e.clientY;
        const startVal = value;
        const onMouseMove = (m: MouseEvent) => {
          const delta = (startY - m.clientY) / 150;
          onChange(Math.max(min, Math.min(max, startVal + delta * (max - min))));
        };
        const onMouseUp = () => {
          window.removeEventListener('mousemove', onMouseMove);
          window.removeEventListener('mouseup', onMouseUp);
        };
        window.addEventListener('mousemove', onMouseMove);
        window.addEventListener('mouseup', onMouseUp);
      }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-[135deg] drop-shadow-lg">
          <circle cx={size/2} cy={size/2} r={radius} fill="#141618" stroke="#000" strokeWidth="1.5" />
          <circle cx={size/2} cy={size/2} r={radius} fill="transparent" stroke={color} strokeWidth="2.5" strokeDasharray={circumference} style={{ strokeDashoffset, transition: 'stroke-dashoffset 0.05s ease' }} strokeLinecap="round" />
          <line x1={size/2} y1={size/2} x2={size/2} y2={size/2 - radius + 2} stroke="#fff" strokeWidth="2" strokeLinecap="round" transform={`rotate(${percentage * 270}, ${size/2}, ${size/2})`} />
        </svg>
      </div>
      <span className="text-[7px] font-black uppercase text-white/30 mt-1 group-hover:text-orange-400 transition-colors select-none">{label}</span>
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
      className={`absolute bg-[#33363d] rounded-lg shadow-2xl border border-black/40 overflow-hidden flex flex-col transition-shadow duration-200 ${active ? 'z-40 ring-1 ring-orange-500/30' : 'z-30'}`}
      style={{ left: pos.x, top: pos.y, width: width }}
      onMouseDown={() => onClick?.()}
    >
      <div 
        className={`window-header h-8 flex items-center justify-between px-3 cursor-move border-b border-black flex-shrink-0 select-none ${active ? 'bg-[#2d3238]' : 'bg-[#24282e]'}`}
        onMouseDown={onMouseDown}
      >
        <div className="flex items-center gap-2 pointer-events-none">
          <span className={active ? 'text-orange-500' : 'text-white/20'}>{icon}</span>
          <span className={`text-[9px] font-black uppercase tracking-widest ${active ? 'text-white/80' : 'text-white/40'}`}>{title}</span>
        </div>
        <button onClick={(e) => { e.stopPropagation(); onClose(); }} className="text-white/20 hover:text-red-500 transition-colors">
          <X size={14} />
        </button>
      </div>
      <div className="relative flex-1">
        {children}
      </div>
    </div>
  );
};

// --- Core Application ---

export default function App() {
  const [playbackMode, setPlaybackMode] = useState<PlaybackMode>('pat');
  const [isPlaying, setIsPlaying] = useState(false);
  const [bpm, setBpm] = useState(DEFAULT_BPM);
  const [swing, setSwing] = useState(0);
  const [masterPitch, setMasterPitch] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [currentBar, setCurrentBar] = useState(0);
  const [currentPatternId, setCurrentPatternId] = useState(1);
  const [selectedTrackId, setSelectedTrackId] = useState<string | null>('1');
  const [focusedWindow, setFocusedWindow] = useState<string>('rack');
  const [ui, setUi] = useState({ rack: true, mixer: true, browser: true, playlist: true, piano: false, producer: false });
  const [playlistClips, setPlaylistClips] = useState<PlaylistClip[]>([]);
  const [hint, setHint] = useState("FL Studio 21 Ultimate Clone. Core engine ready.");
  const [isAssetsLoading, setIsAssetsLoading] = useState(true);
  const [producerInput, setProducerInput] = useState("");
  const [producerAdvice, setProducerAdvice] = useState<string>("Hello producer! Ask me for mixing tips or arrangement ideas.");
  
  const [brushLength, setBrushLength] = useState(1);

  const [tracks, setTracks] = useState<Track[]>(() => [
    { id: '1', name: 'FL Kick', type: 'sampler', sampleUrl: DRUM_SAMPLES.kick, patterns: { 1: { id: 1, name: 'Pattern 1', steps: [true, false, false, false, true, false, false, false, true, false, false, false, true, false, false, false], notes: [], color: '#ff4d4d' } }, fx: { reverb: { enabled: false, roomSize: 0.5, dampening: 3000 }, delay: { enabled: false, delayTime: '8n', feedback: 0.3 } }, fxSlots: [], volume: 1.0, pan: 0, muted: false, color: '#ff4d4d', mixerTrack: 1 },
    { id: '2', name: 'FL Snare', type: 'sampler', sampleUrl: DRUM_SAMPLES.snare, patterns: { 1: { id: 1, name: 'Pattern 1', steps: [false, false, false, false, true, false, false, false, false, false, false, false, true, false, false, false], notes: [], color: '#ffaf40' } }, fx: { reverb: { enabled: false, roomSize: 0.5, dampening: 3000 }, delay: { enabled: false, delayTime: '8n', feedback: 0.3 } }, fxSlots: [], volume: 0.7, pan: 0, muted: false, color: '#ffaf40', mixerTrack: 2 },
    { id: '3', name: 'FL HiHat', type: 'sampler', sampleUrl: DRUM_SAMPLES.hihat, patterns: { 1: { id: 1, name: 'Pattern 1', steps: [true, true, true, true, true, true, true, true, true, true, true, true, true, true, true, true], notes: [], color: '#32ff7e' } }, fx: { reverb: { enabled: false, roomSize: 0.5, dampening: 3000 }, delay: { enabled: false, delayTime: '8n', feedback: 0.3 } }, fxSlots: [], volume: 0.4, pan: 0, muted: false, color: '#32ff7e', mixerTrack: 3 },
  ]);

  const samplersRef = useRef<{ [key: string]: any }>({});
  const fxNodesRef = useRef<{ [key: string]: { gain: Tone.Gain, panner: Tone.Panner, reverb: Tone.Reverb, delay: Tone.FeedbackDelay, meter: Tone.Meter } }>({});
  const transportIdRef = useRef<number | null>(null);
  const [meters, setMeters] = useState<{ [key: string]: number }>({});
  const tracksRef = useRef(tracks);

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);

  useEffect(() => {
    const checkAssets = async () => {
      await Tone.loaded();
      setIsAssetsLoading(false);
    };
    checkAssets();
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        startPlayback();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, playbackMode]);

  useEffect(() => {
    tracks.forEach(track => {
      if (!fxNodesRef.current[track.id]) {
        const meter = new Tone.Meter();
        const reverb = new Tone.Reverb({ decay: 2.5, wet: 0 }).toDestination();
        const delay = new Tone.FeedbackDelay({ delayTime: '8n', feedback: 0.4, wet: 0 }).connect(reverb);
        const panner = new Tone.Panner(0).connect(delay);
        const gain = new Tone.Gain(1).connect(panner).connect(meter);
        fxNodesRef.current[track.id] = { gain, panner, reverb, delay, meter };
      }
      
      const fx = fxNodesRef.current[track.id];
      fx.gain.gain.rampTo(track.muted ? 0 : track.volume, 0.05);
      fx.panner.pan.rampTo(track.pan, 0.05);
      fx.reverb.wet.rampTo(track.fx.reverb.enabled ? 0.35 : 0, 0.1);
      fx.delay.wet.rampTo(track.fx.delay.enabled ? 0.25 : 0, 0.1);

      if (!samplersRef.current[track.id]) {
        if (track.type === 'sampler' && track.sampleUrl) {
          samplersRef.current[track.id] = new Tone.Sampler({
            urls: { C3: track.sampleUrl },
            onload: () => Tone.loaded().then(() => setIsAssetsLoading(false)),
          }).connect(fx.gain);
        } else {
           const settings = track.synthSettings || SYNTH_PRESETS[0].settings;
           let synth;
           if (track.type === 'acid') {
             synth = new Tone.MonoSynth({
               oscillator: { type: settings.oscillator as any },
               envelope: settings.envelope,
               filter: { Q: settings.filter.resonance, type: settings.filter.type as any, frequency: settings.filter.frequency }
             }).connect(fx.gain);
           } else {
             synth = new Tone.PolySynth(Tone.Synth, {
               oscillator: { type: settings.oscillator as any },
               envelope: settings.envelope
             }).connect(fx.gain);
           }
           samplersRef.current[track.id] = { synth, loaded: true };
        }
      }
    });
  }, [tracks]);

  useEffect(() => {
    const interval = setInterval(() => {
      const newMeters: { [key: string]: number } = {};
      Object.entries(fxNodesRef.current).forEach(([id, nodes]) => {
        const level = (nodes as any).meter.getValue();
        const normalized = Array.isArray(level) ? level[0] : level;
        const val = Math.max(0, (normalized + 60) / 60);
        newMeters[id] = val;
      });
      setMeters(newMeters);
    }, 50);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => { Tone.Transport.bpm.value = bpm; }, [bpm]);
  useEffect(() => { Tone.Transport.swing = swing; }, [swing]);

  const startPlayback = async () => {
    if (Tone.getContext().state !== 'running') await Tone.start();
    
    if (isPlaying) {
      Tone.Transport.stop();
      if (transportIdRef.current !== null) Tone.Transport.clear(transportIdRef.current);
      transportIdRef.current = null;
      setIsPlaying(false);
      setCurrentStep(0);
      setCurrentBar(0);
    } else {
      let step = 0;
      Tone.Transport.cancel(0);
      transportIdRef.current = Tone.Transport.scheduleRepeat((time) => {
        const localStep = step % 16;
        const barIndex = Math.floor(step / 16);
        
        Tone.Draw.schedule(() => {
          setCurrentStep(localStep);
          setCurrentBar(barIndex);
        }, time);

        tracksRef.current.forEach(track => {
          if (track.muted) return;
          const audio = samplersRef.current[track.id];
          if (!audio) return;
          
          const instr = audio.synth || audio;
          const isSamplerReady = (instr as Tone.Sampler).loaded;
          const isSynth = !!audio.synth;
          if (!isSynth && !isSamplerReady) return;

          let patternToPlay: PatternData | undefined;
          if (playbackMode === 'song') {
            const clip = playlistClips.find(c => c.trackIndex === tracksRef.current.indexOf(track) && c.startBar === barIndex);
            if (clip) patternToPlay = track.patterns[clip.patternId];
          } else {
            patternToPlay = track.patterns[currentPatternId];
          }

          if (patternToPlay) {
            const stepActive = patternToPlay.steps[localStep];
            const notesAtThisStep = patternToPlay.notes.filter(n => n.step === localStep);

            if (stepActive) {
              instr.triggerAttackRelease("C3", "16n", time);
            }

            notesAtThisStep.forEach(n => {
              instr.triggerAttackRelease(n.note, n.length, time);
            });
          }
        });
        step++;
      }, "16n");
      Tone.Transport.start();
      setIsPlaying(true);
    }
  };

  const addTrack = (type: InstrumentType, name: string, url?: string, settings?: SynthSettings) => {
    const id = Math.random().toString(36).substr(2, 9);
    const newTrack: Track = {
      id,
      name,
      type,
      sampleUrl: url,
      patterns: { [currentPatternId]: { id: currentPatternId, name: `Pattern ${currentPatternId}`, steps: Array(16).fill(false), notes: [], color: TRACK_COLORS[tracks.length % TRACK_COLORS.length] } },
      synthSettings: settings,
      fx: { reverb: { enabled: false, roomSize: 0.5, dampening: 3000 }, delay: { enabled: false, delayTime: '8n', feedback: 0.3 } },
      fxSlots: [],
      volume: 0.8,
      pan: 0,
      muted: false,
      color: TRACK_COLORS[tracks.length % TRACK_COLORS.length],
      mixerTrack: tracks.length + 1
    };
    setTracks(p => [...p, newTrack]);
    setSelectedTrackId(id);
    setHint(`Loaded ${name} into channel ${newTrack.mixerTrack}.`);
  };

  const auditionNote = (note: string) => {
    if (!selectedTrackId) return;
    const audio = samplersRef.current[selectedTrackId];
    if (audio) {
      const instr = audio.synth || audio;
      const isReady = audio.synth ? true : (instr as Tone.Sampler).loaded;
      if (!isReady) return;
      instr.triggerAttackRelease(note, "16n");
    }
  };

  const addPianoNote = (trackId: string, note: string, step: number) => {
    setTracks(p => p.map(t => {
      if (t.id !== trackId) return t;
      const pat = t.patterns[currentPatternId];
      if (!pat) return t;
      
      const exactMatch = pat.notes.find(n => n.note === note && n.step === step);
      if (exactMatch) {
        return { ...t, patterns: { ...t.patterns, [currentPatternId]: { ...pat, notes: pat.notes.filter(n => n.id !== exactMatch.id) } } };
      }

      const filteredNotes = pat.notes.filter(n => !(n.note === note && n.step === step));
      const newNote: PianoNote = { 
        id: Math.random().toString(), 
        note, 
        step, 
        velocity: 0.8, 
        length: stepsToDuration(brushLength) 
      };

      return { ...t, patterns: { ...t.patterns, [currentPatternId]: { ...pat, notes: [...filteredNotes, newNote] } } };
    }));
  };

  const removePianoNoteAt = (trackId: string, note: string, step: number) => {
    setTracks(p => p.map(t => {
      if (t.id !== trackId) return t;
      const pat = t.patterns[currentPatternId];
      if (!pat) return t;
      
      const notes = pat.notes.filter(n => {
        if (n.note !== note) return true;
        const d = durationToSteps(n.length);
        const occupied = Array.from({ length: d }, (_, i) => n.step + i);
        return !occupied.includes(step);
      });

      return { ...t, patterns: { ...t.patterns, [currentPatternId]: { ...pat, notes } } };
    }));
  };

  const handleGeminiProducer = async () => {
    if (!producerInput.trim()) return;
    setHint("Consulting Gemini Producer...");
    const advice = await getMusicAdvice(producerInput);
    setProducerAdvice(advice);
    setProducerInput("");
    setHint("Expert advice loaded.");
  };

  const selectedTrack = tracks.find(t => t.id === selectedTrackId);

  return (
    <div className="flex flex-col h-screen bg-[#1c1e22] text-[#d0d0d0] font-sans select-none overflow-hidden text-[11px] antialiased">
      
      {/* Main Header / Transport Bar */}
      <header className="h-12 flex items-center justify-between px-2 bg-[#33363d] border-b border-black shadow-[0_2px_10px_rgba(0,0,0,0.5)] z-50">
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-center">
             <div className="w-8 h-8 bg-orange-500 rounded-lg flex items-center justify-center font-black italic text-black shadow-lg cursor-pointer hover:rotate-12 transition-transform border-t border-white/40">FL</div>
             <span className="text-[6px] font-black uppercase text-white/20 mt-0.5 tracking-tighter">Gemini</span>
          </div>
          
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-md border border-white/5 shadow-inner h-9">
            <button 
              onClick={() => setPlaybackMode('pat')} 
              className={`px-3 h-full rounded-sm font-black text-[9px] transition-all flex items-center gap-1.5 ${playbackMode === 'pat' ? 'bg-orange-500 text-black shadow-md' : 'text-white/40 hover:text-white/60'}`}
            ><Layout size={10} /> PAT</button>
            <button 
              onClick={() => setPlaybackMode('song')} 
              className={`px-3 h-full rounded-sm font-black text-[9px] transition-all flex items-center gap-1.5 ${playbackMode === 'song' ? 'bg-orange-500 text-black shadow-md' : 'text-white/40 hover:text-white/60'}`}
            ><ListMusic size={10} /> SONG</button>
          </div>

          <div className="flex items-center gap-4 px-3 border-l border-white/10 h-8">
            <div className="flex items-center gap-1.5">
               <button 
                disabled={isAssetsLoading}
                onClick={startPlayback} className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isPlaying ? 'bg-orange-500 text-black shadow-[0_0_15px_rgba(249,115,22,0.6)]' : 'bg-white/5 text-white/40 hover:bg-white/10'} ${isAssetsLoading ? 'opacity-30 cursor-not-allowed' : ''}`}>
                {isPlaying ? <Square size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="translate-x-0.5" />}
              </button>
              <button onClick={() => { Tone.Transport.position = 0; setCurrentStep(0); setCurrentBar(0); }} className="w-8 h-8 rounded-full bg-white/5 text-white/40 hover:bg-white/10 flex items-center justify-center transition-colors"><RotateCcw size={14} /></button>
            </div>
            
            <div className="flex items-center gap-2">
              <LCD label="Tempo" value={bpm} width="w-20" subValue="BPM" />
              <FruityKnob label="BPM" value={bpm} min={60} max={220} onChange={setBpm} size={24} />
            </div>

            <div className="flex items-center gap-2">
              <LCD label="Master Pitch" value={masterPitch >= 0 ? `+${masterPitch}` : masterPitch} color="text-blue-400" width="w-24" subValue="CENT" />
              <FruityKnob label="Pitch" value={masterPitch} min={-1200} max={1200} onChange={setMasterPitch} size={24} color="#60a5fa" />
            </div>

            <div className="flex items-center gap-2">
              <LCD label="Swing" value={`${swing}%`} color="text-yellow-500" width="w-16" />
              <FruityKnob label="Swing" value={swing} min={0} max={100} onChange={setSwing} size={24} color="#fbbf24" unit="%" />
            </div>

            {isAssetsLoading && (
              <div className="flex items-center gap-2 ml-2 bg-yellow-500/10 px-2 py-1 rounded border border-yellow-500/30 animate-pulse">
                <Loader2 size={12} className="text-yellow-500 animate-spin" />
                <span className="text-[8px] font-black uppercase text-yellow-500 tracking-tighter">Buffering engine</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1.5 rounded-full border border-white/5 shadow-inner">
             <div className="flex items-center gap-1">
                <span className="text-[10px] font-black text-white/40">CPU</span>
                <div className="w-16 h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                   <div className={`h-full bg-green-500 ${isPlaying ? 'w-[18%]' : 'w-[4%]'} transition-all duration-1000 animate-pulse shadow-[0_0_5px_rgba(34,197,94,0.5)]`} />
                </div>
             </div>
          </div>
          
          <div className="flex items-center gap-1 border-l border-white/10 pl-3">
            <button onClick={() => setUi(u => ({...u, browser: !u.browser}))} className={`p-1.5 transition-all ${ui.browser ? 'text-orange-500' : 'text-white/20 hover:text-white/40'}`}><Layout size={20}/></button>
            <button onClick={() => setUi(u => ({...u, playlist: !u.playlist}))} className={`p-1.5 transition-all ${ui.playlist ? 'text-orange-500' : 'text-white/20 hover:text-white/40'}`}><ListMusic size={20}/></button>
            <button onClick={() => setUi(u => ({...u, rack: !u.rack}))} className={`p-1.5 transition-all ${ui.rack ? 'text-orange-500' : 'text-white/20 hover:text-white/40'}`}><Layers size={20}/></button>
            <button onClick={() => setUi(u => ({...u, mixer: !u.mixer}))} className={`p-1.5 transition-all ${ui.mixer ? 'text-orange-500' : 'text-white/20 hover:text-white/40'}`}><Sliders size={20}/></button>
            <button onClick={() => setUi(u => ({...u, piano: !u.piano}))} className={`p-1.5 transition-all ${ui.piano ? 'text-orange-500' : 'text-white/20 hover:text-white/40'}`}><Keyboard size={20}/></button>
            <button onClick={() => setUi(u => ({...u, producer: !u.producer}))} className={`p-1.5 transition-all ${ui.producer ? 'text-orange-500' : 'text-white/20 hover:text-white/40'}`}><Wand2 size={20}/></button>
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="flex-1 flex overflow-hidden relative playlist-bg">
        
        {/* Pro Browser */}
        {ui.browser && (
          <aside className="w-64 bg-[#24282e] border-r border-black flex flex-col z-50 shadow-2xl overflow-hidden transition-all duration-300">
            <div className="p-3 border-b border-black flex items-center justify-between bg-black/20">
              <span className="font-black text-white/30 uppercase tracking-[0.2em] text-[10px]">Project Browser</span>
              <FolderOpen size={14} className="text-white/20" />
            </div>
            
            <div className="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
               <div className="space-y-1">
                 <div className="flex items-center gap-2 text-white/50 px-2 py-1 rounded hover:bg-white/5 cursor-pointer">
                    <Folder size={14} className="text-orange-500" />
                    <span className="text-[10px] font-black uppercase tracking-wider">Packs / Core</span>
                 </div>
                 <div className="pl-4 space-y-0.5">
                    {Object.keys(DRUM_SAMPLES).map(s => (
                      <div key={s} onClick={() => addTrack('sampler', `FL ${s.toUpperCase()}`, (DRUM_SAMPLES as any)[s])} 
                           className="text-white/30 hover:text-orange-400 hover:bg-white/5 rounded px-2 py-1 cursor-pointer flex items-center gap-2 text-[10px] transition-colors group">
                        <Disc size={12} className="group-hover:animate-spin-slow" /> {s.toUpperCase()}
                      </div>
                    ))}
                 </div>
               </div>

               <div className="space-y-1">
                 <div className="flex items-center gap-2 text-white/50 px-2 py-1 rounded hover:bg-white/5 cursor-pointer">
                    <Music size={14} className="text-blue-400" />
                    <span className="text-[10px] font-black uppercase tracking-wider">VST Instruments</span>
                 </div>
                 <div className="pl-4 space-y-0.5">
                    {SYNTH_PRESETS.map(preset => (
                       <div key={preset.name} onClick={() => addTrack(preset.type, preset.name, undefined, preset.settings)} 
                            className="text-white/30 hover:text-blue-400 hover:bg-white/5 rounded px-2 py-1 cursor-pointer flex items-center gap-2 text-[10px] transition-colors group">
                        <Piano size={12}/> {preset.name}
                       </div>
                    ))}
                 </div>
               </div>
            </div>

            <div className="p-3 border-t border-black bg-black/30">
               <button onClick={async () => {
                  setHint("Gemini AI is analyzing project context...");
                  const pat = await generatePattern('Melodic Techno', tracks.length);
                  if (pat) {
                    setTracks(prev => prev.map((t, i) => ({
                      ...t, 
                      patterns: { ...t.patterns, [currentPatternId]: { ...t.patterns[currentPatternId], steps: pat[i.toString()] || Array(16).fill(false) } }
                    })));
                    setHint(`AI Sequence injected into Pattern ${currentPatternId}.`);
                  }
               }} className="w-full py-2.5 bg-orange-600/10 border border-orange-500/30 rounded-lg flex items-center justify-center gap-2 hover:bg-orange-500/20 active:scale-95 transition-all group">
                 <Sparkles size={16} className="text-orange-500 group-hover:animate-pulse" />
                 <span className="text-[10px] font-black uppercase text-orange-500 tracking-[0.1em]">Generate Context</span>
               </button>
            </div>
          </aside>
        )}

        {/* Central Workspace Canvas */}
        <div className="flex-1 relative overflow-hidden flex flex-col">
          
          {/* Playlist arrangement */}
          {ui.playlist && (
            <WindowFrame 
              title="Playlist - Song Mode" icon={<Activity size={14}/>} initialPos={{ x: 20, y: 20 }} onClose={() => setUi(u => ({...u, playlist: false}))} width={850}
              active={focusedWindow === 'playlist'} onClick={() => setFocusedWindow('playlist')}>
               <div className="flex h-[350px] overflow-hidden bg-[#1c1e22]">
                  <div className="w-40 border-r border-black flex flex-col bg-[#24282e]/80 backdrop-blur-sm shadow-xl z-20 overflow-hidden">
                     <div className="h-8 border-b border-black flex items-center px-3 font-black text-white/20 text-[9px] uppercase tracking-widest bg-black/20 flex-shrink-0">Track Name</div>
                     <div className="flex-1 overflow-y-auto custom-scrollbar no-drag">
                        {tracks.map((t, i) => (
                          <div key={t.id} onClick={() => setSelectedTrackId(t.id)} 
                               className={`h-11 border-b border-black flex items-center px-3 cursor-pointer transition-all ${selectedTrackId === t.id ? 'bg-orange-500/20 text-orange-400 border-l-4 border-l-orange-500' : 'text-white/40 hover:bg-white/5'}`}>
                            <span className="font-bold text-[10px] truncate">{i+1}. {t.name}</span>
                          </div>
                        ))}
                     </div>
                  </div>
                  <div className="flex-1 overflow-auto custom-scrollbar relative piano-roll-bg">
                     <div className="sticky top-0 h-8 bg-[#2d3238] border-b border-black flex z-30 opacity-90 shadow-lg">
                        {Array.from({ length: 16 }).map((_, i) => (
                          <div key={i} className="flex-1 border-r border-black/50 flex items-center justify-center text-[9px] font-black text-white/20 tracking-tighter">{i + 1}</div>
                        ))}
                     </div>
                     <div className="absolute inset-0 grid grid-cols-16 pointer-events-none opacity-10">
                        {Array.from({ length: 16 }).map((_, i) => <div key={i} className={`border-r border-white ${isPlaying && playbackMode === 'song' && currentBar === i ? 'bg-white/10' : ''}`} />)}
                     </div>
                     <div className="flex flex-col relative z-10 pt-0">
                        {tracks.map((t, trackIdx) => (
                          <div key={t.id} className="h-11 border-b border-black/30 flex relative">
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
                                   className="flex-1 border-r border-black/20 cursor-crosshair hover:bg-orange-500/5 transition-colors relative"
                                 >
                                   {clip && (
                                     <div 
                                       className="absolute inset-y-1.5 left-1 right-1 rounded-md flex flex-col justify-center items-center text-[8px] font-black text-white/90 overflow-hidden shadow-2xl border-t border-white/20"
                                       style={{ backgroundColor: `${t.color}cc` }}
                                     >
                                       <span className="leading-none">PAT {clip.patternId}</span>
                                       <Waves size={10} className="mt-1 opacity-40" />
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

          {/* Mixer Console - Pro Routing */}
          {ui.mixer && (
            <WindowFrame 
              title="Mixer Console" icon={<Sliders size={14}/>} initialPos={{ x: 300, y: 380 }} onClose={() => setUi(u => ({...u, mixer: false}))}
              active={focusedWindow === 'mixer'} onClick={() => setFocusedWindow('mixer')}>
               <div className="flex h-[380px] bg-[#141618] overflow-hidden">
                  <div className="flex-1 flex overflow-x-auto custom-scrollbar p-1.5 gap-px shadow-inner no-drag">
                    {/* Master Channel */}
                    <div className="w-18 flex flex-col items-center py-3 bg-[#2d3238] border border-black shadow-2xl rounded-lg relative overflow-hidden flex-shrink-0">
                       <div className="absolute top-0 left-0 w-full h-1.5 bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.8)]" />
                       <VUMeter value={isPlaying ? 0.4 + Math.random() * 0.2 : 0} color="#ff8a00" height={180} />
                       <span className="mt-4 font-black text-orange-500 text-[10px] tracking-widest">MASTER</span>
                       <div className="mt-auto pb-4"><FruityKnob label="OUT" value={1} min={0} max={1.5} onChange={() => {}} size={28} /></div>
                    </div>
                    {/* Individual Mixer Channels */}
                    {tracks.map(track => (
                      <div key={track.id} onClick={() => setSelectedTrackId(track.id)} className={`w-16 flex flex-col items-center py-3 border border-black transition-all cursor-pointer rounded-lg flex-shrink-0 ${selectedTrackId === track.id ? 'bg-[#3b3f46] shadow-xl translate-y-[-2px]' : 'bg-[#1c1e22] hover:bg-white/5'}`}>
                         <VUMeter value={meters[track.id] || 0} color={track.color} height={180} />
                         <div className="flex-1 flex flex-col items-center justify-end py-2 gap-2 relative w-full px-2">
                            <LCD label="dB" value={track.volume.toFixed(2)} width="w-full" color="text-white/60" />
                            <input 
                              type="range" min="0" max="1.5" step="0.01" 
                              value={track.volume} 
                              onChange={e => setTracks(p => p.map(t => t.id === track.id ? {...t, volume: parseFloat(e.target.value)} : t))}
                              className="w-24 -rotate-90 origin-center cursor-ns-resize opacity-60 hover:opacity-100 transition-opacity absolute bottom-16" 
                            />
                            <span className={`text-[8px] font-black truncate text-center w-full uppercase mt-auto tracking-tighter ${selectedTrackId === track.id ? 'text-orange-400' : 'text-white/30'}`}>{track.name}</span>
                         </div>
                      </div>
                    ))}
                  </div>

                  {/* Effects Slot Sidebar */}
                  <div className="w-56 bg-[#2d3238] border-l border-black p-3 flex flex-col gap-3 overflow-y-auto no-scrollbar shadow-2xl no-drag">
                     <div className="flex items-center justify-between border-b border-white/5 pb-2">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest">Inserts Rack</span>
                        <span className="text-[9px] font-bold text-orange-400">CH {selectedTrack?.mixerTrack || 0}</span>
                     </div>
                     <div className="space-y-2">
                        <div className={`p-2.5 rounded-lg border transition-all flex items-center gap-3 ${selectedTrack?.fx.reverb.enabled ? 'bg-orange-500/10 border-orange-500/30' : 'bg-black/20 border-white/5 opacity-50'}`}>
                           <button 
                            onClick={() => setTracks(p => p.map(t => t.id === selectedTrackId ? {...t, fx: {...t.fx, reverb: {...t.fx.reverb, enabled: !t.fx.reverb.enabled}}} : t))}
                            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${selectedTrack?.fx.reverb.enabled ? 'bg-orange-500 text-black shadow-lg' : 'bg-white/5 text-white/20'}`}>
                             <RotateCcw size={16} />
                           </button>
                           <div className="flex flex-col flex-1">
                              <span className="text-[9px] font-black uppercase text-white/60">Fruity Reverb</span>
                              <div className="h-1 bg-black/40 rounded-full mt-1.5 overflow-hidden">
                                 <div className="h-full bg-orange-500 transition-all duration-300" style={{ width: selectedTrack?.fx.reverb.enabled ? '100%' : '0%' }} />
                              </div>
                           </div>
                           <Power size={12} className={selectedTrack?.fx.reverb.enabled ? 'text-orange-500' : 'text-white/10'} />
                        </div>

                        <div className={`p-2.5 rounded-lg border transition-all flex items-center gap-3 ${selectedTrack?.fx.delay.enabled ? 'bg-blue-500/10 border-blue-500/30' : 'bg-black/20 border-white/5 opacity-50'}`}>
                           <button 
                            onClick={() => setTracks(p => p.map(t => t.id === selectedTrackId ? {...t, fx: {...t.fx, delay: {...t.fx.delay, enabled: !t.fx.delay.enabled}}} : t))}
                            className={`w-8 h-8 rounded flex items-center justify-center transition-colors ${selectedTrack?.fx.delay.enabled ? 'bg-blue-400 text-black shadow-lg' : 'bg-white/5 text-white/20'}`}>
                             <Clock size={16} />
                           </button>
                           <div className="flex flex-col flex-1">
                              <span className="text-[9px] font-black uppercase text-white/60">Fruity Delay</span>
                              <div className="h-1 bg-black/40 rounded-full mt-1.5 overflow-hidden">
                                 <div className="h-full bg-blue-400 transition-all duration-300" style={{ width: selectedTrack?.fx.delay.enabled ? '100%' : '0%' }} />
                              </div>
                           </div>
                           <Power size={12} className={selectedTrack?.fx.delay.enabled ? 'text-blue-400' : 'text-white/10'} />
                        </div>
                     </div>
                     <button className="mt-auto py-2 bg-white/5 rounded border border-white/5 text-[9px] font-black uppercase text-white/20 hover:text-white hover:bg-white/10 transition-all">+ Slot 3</button>
                  </div>
               </div>
            </WindowFrame>
          )}

          {/* Channel Rack / Sequencer */}
          {ui.rack && (
            <WindowFrame 
              title="Channel Rack" icon={<Layers size={14}/>} initialPos={{ x: 50, y: 420 }} onClose={() => setUi(u => ({...u, rack: false}))} width={680}
              active={focusedWindow === 'rack'} onClick={() => setFocusedWindow('rack')}>
               <div className="p-3 space-y-2.5 bg-[#33363d]/50 max-h-[450px] overflow-y-auto custom-scrollbar no-drag">
                  {tracks.map((track) => {
                     const instr = samplersRef.current[track.id]?.synth || samplersRef.current[track.id];
                     const isReady = samplersRef.current[track.id]?.synth ? true : (instr as Tone.Sampler)?.loaded;
                     return (
                       <div key={track.id} className={`flex items-center gap-3 bg-[#1c1e22] p-2 rounded-lg border border-black/40 group hover:border-orange-500/30 transition-all shadow-lg ${!isReady ? 'opacity-50 grayscale select-none' : ''}`}>
                          <div className="flex items-center gap-2 w-44">
                             <div className="flex items-center gap-1.5">
                                <FruityKnob label="PAN" value={track.pan} min={-1} max={1} onChange={v => setTracks(p => p.map(t => t.id === track.id ? {...t, pan: v} : t))} size={18} />
                                <FruityKnob label="VOL" value={track.volume} min={0} max={1.5} onChange={v => setTracks(p => p.map(t => t.id === track.id ? {...t, volume: v} : t))} size={18} />
                             </div>
                             <div className="flex flex-col min-w-0 flex-1 ml-1" onClick={() => setSelectedTrackId(track.id)}>
                               <span className={`font-black truncate uppercase text-[10px] transition-colors cursor-pointer ${selectedTrackId === track.id ? 'text-orange-400' : 'text-white/50 group-hover:text-white/80'}`}>{track.name}</span>
                               <div className="flex items-center gap-1.5">
                                  <span className="text-[6px] text-white/20 tracking-widest font-mono">INS {track.mixerTrack}</span>
                                  <div className="w-1.5 h-1.5 rounded-full shadow-[0_0_5px_currentColor]" style={{ backgroundColor: track.muted ? '#444' : track.color, color: track.color }} />
                                  {!isReady && <Loader2 size={8} className="text-yellow-500 animate-spin" />}
                               </div>
                             </div>
                          </div>
                          <div className="flex-1 grid grid-cols-16 gap-[3px]">
                             {(track.patterns[currentPatternId]?.steps || Array(16).fill(false)).map((s, i) => (
                               <button 
                                 key={i} 
                                 onClick={() => {
                                   if (!isReady) return;
                                   setTracks(p => p.map(t => {
                                     if (t.id !== track.id) return t;
                                     const pat = t.patterns[currentPatternId] || { id: currentPatternId, name: `Pattern ${currentPatternId}`, steps: Array(16).fill(false), notes: [], color: t.color };
                                     const steps = [...pat.steps];
                                     steps[i] = !steps[i];
                                     return { ...t, patterns: { ...t.patterns, [currentPatternId]: { ...pat, steps } } };
                                   }));
                                 }}
                                 className={`h-8 rounded-md border border-black/80 transition-all ${isPlaying && playbackMode === 'pat' && currentStep === i ? 'brightness-125 scale-[1.1] z-10 border-white/40 shadow-lg' : ''} ${s ? 'shadow-[inset_0_2px_10px_rgba(255,255,255,0.2)]' : ''}`}
                                 style={{ backgroundColor: s ? track.color : (Math.floor(i / 4) % 2 === 0 ? '#4d535b' : '#33363d') }}
                               />
                             ))}
                          </div>
                          <button onClick={() => { setSelectedTrackId(track.id); setUi(u => ({...u, piano: true})); }} 
                                  className="p-1.5 opacity-0 group-hover:opacity-100 bg-white/5 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-all shadow-inner"><Piano size={14}/></button>
                       </div>
                     )
                  })}
               </div>
               <div className="p-2.5 border-t border-black bg-black/40 flex justify-between items-center px-4 no-drag">
                  <div className="flex gap-3">
                     <button onClick={() => {
                        const nextId = Math.max(...tracks.flatMap(t => Object.keys(t.patterns).map(Number)), 0) + 1;
                        setTracks(p => p.map(t => ({
                          ...t,
                          patterns: { ...t.patterns, [nextId]: { id: nextId, name: `Pattern ${nextId}`, steps: Array(16).fill(false), notes: [], color: t.color } }
                        })));
                        setCurrentPatternId(nextId);
                        setHint(`New Pattern ${nextId} created.`);
                     }} className="text-[9px] font-black bg-white/5 px-3 py-1.5 rounded-lg border border-white/5 hover:bg-white/10 transition-all uppercase tracking-widest shadow-lg active:scale-95">New Pattern</button>
                     <button onClick={() => {
                        setTracks(p => p.map(t => ({
                          ...t,
                          patterns: { ...t.patterns, [currentPatternId]: { ...t.patterns[currentPatternId], steps: Array(16).fill(false), notes: [] } }
                        })));
                        setHint(`Pattern ${currentPatternId} cleared.`);
                     }} className="text-[9px] font-black bg-red-500/10 text-red-400 px-3 py-1.5 rounded-lg border border-red-500/20 hover:bg-red-500/20 transition-all uppercase tracking-widest">Clear</button>
                  </div>
                  <div className="flex items-center gap-3">
                     <div className="text-[10px] font-black text-white/20 uppercase tracking-widest">Global Swing</div>
                     <FruityKnob label="" value={swing} min={0} max={100} onChange={setSwing} size={22} color="#fbbf24" />
                  </div>
               </div>
            </WindowFrame>
          )}

          {/* Piano Roll - Refined UI and Feedback */}
          {ui.piano && selectedTrack && (
            <WindowFrame 
              title={`Piano Roll - ${selectedTrack.name}`} icon={<Piano size={14}/>} initialPos={{ x: 150, y: 150 }} onClose={() => setUi(u => ({...u, piano: false}))} width={850}
              active={focusedWindow === 'piano'} onClick={() => setFocusedWindow('piano')}>
               <div className="flex flex-col h-[520px]">
                  <div className="flex h-10 bg-[#2d3238] border-b border-black items-center px-4 gap-6 flex-shrink-0">
                     <div className="flex items-center gap-2">
                        <Pencil size={14} className="text-orange-500" />
                        <span className="text-[9px] font-black uppercase text-white/40 tracking-wider">Note Paint</span>
                     </div>
                     <div className="w-px h-4 bg-white/5" />
                     <div className="flex items-center gap-3 bg-black/30 p-1 px-2 rounded-md border border-white/5">
                        <span className="text-[8px] font-black uppercase text-white/20 tracking-tighter">Paint Length:</span>
                        {[1, 2, 4, 8].map(l => (
                          <button key={l} onClick={() => setBrushLength(l)} 
                                  className={`w-6 h-5 rounded flex items-center justify-center text-[9px] font-black transition-all ${brushLength === l ? 'bg-orange-500 text-black shadow-lg' : 'text-white/30 hover:text-white/60'}`}>
                            {l === 1 ? '1/16' : l === 2 ? '1/8' : l === 4 ? '1/4' : '1/2'}
                          </button>
                        ))}
                     </div>
                     <div className="flex-1" />
                     <div className="flex items-center gap-2 text-white/20 hover:text-white/50 cursor-help">
                        <Settings2 size={14} />
                        <span className="text-[9px] font-black uppercase tracking-tighter">Snap: 1/16 Cell</span>
                     </div>
                  </div>
                  <div className="flex flex-1 overflow-hidden relative no-drag">
                     {/* Playhead Cursor */}
                     <div className="absolute top-0 bottom-0 pointer-events-none transition-transform duration-75 z-50 bg-white/10 border-l border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.2)] w-[6.25%]" 
                          style={{ transform: `translateX(${currentStep * 100}% )`, left: '80px' }} />

                     <div className="w-20 bg-[#1c1e22] border-r border-black overflow-y-auto no-scrollbar shadow-2xl z-[60] flex flex-col">
                        {PIANO_ROLL_NOTES.map(note => {
                           const isBlack = note.includes('#');
                           return (
                              <button 
                                 key={note} 
                                 onMouseDown={() => auditionNote(note)}
                                 className={`h-8 w-full border-b border-black/30 flex items-center justify-end pr-2 text-[9px] font-black transition-all flex-shrink-0 ${isBlack ? 'bg-[#0a0a0a] text-white/30 hover:bg-[#1a1a1a] hover:text-orange-500 border-r-4 border-r-orange-500/20' : 'bg-[#1a1c1e] text-white/50 hover:bg-[#2d3238] hover:text-white'}`}>
                                 {note}
                              </button>
                           )
                        })}
                     </div>
                     
                     <div className="flex-1 overflow-auto custom-scrollbar relative piano-roll-bg z-30">
                        {/* Note Rendering Layer (Active Track) */}
                        <div className="absolute inset-0 pointer-events-none z-40">
                           {selectedTrack.patterns[currentPatternId]?.notes.map(note => {
                              const noteIndex = PIANO_ROLL_NOTES.indexOf(note.note);
                              if (noteIndex === -1) return null;
                              const d = durationToSteps(note.length);
                              return (
                                <div key={note.id} 
                                     className="absolute h-[30px] rounded border-t border-l border-white/40 shadow-[0_5px_15px_rgba(0,0,0,0.4)] flex items-center justify-start pl-2 overflow-hidden pointer-events-auto cursor-pointer group transition-transform active:scale-[0.98]"
                                     style={{ 
                                       top: noteIndex * 32 + 1, 
                                       left: `${(note.step / 16) * 100}%`, 
                                       width: `${(d / 16) * 100}%`,
                                       backgroundColor: selectedTrack.color,
                                       filter: 'brightness(1.1) saturate(1.2)'
                                     }}
                                     onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); removePianoNoteAt(selectedTrack.id, note.note, note.step); }}
                                     onClick={(e) => { e.stopPropagation(); removePianoNoteAt(selectedTrack.id, note.note, note.step); }}
                                >
                                   <div className="absolute top-0 left-0 w-full h-[30%] bg-gradient-to-b from-white/40 to-transparent" />
                                   <div className="absolute bottom-0 left-0 w-full h-[20%] bg-black/10" />
                                   <span className="text-[7px] font-black text-black/60 truncate leading-none uppercase drop-shadow-sm select-none">{note.note}</span>
                                   <div className="absolute right-0 top-0 bottom-0 w-1 bg-white/20" />
                                </div>
                              );
                           })}
                        </div>

                        {/* Ghost Notes Layer (Other Tracks) - Color Coded Ghosts */}
                        <div className="absolute inset-0 pointer-events-none z-10 opacity-30">
                           {tracks.filter(t => t.id !== selectedTrack.id).map(t => 
                             t.patterns[currentPatternId]?.notes.map(note => {
                               const noteIndex = PIANO_ROLL_NOTES.indexOf(note.note);
                               if (noteIndex === -1) return null;
                               const d = durationToSteps(note.length);
                               return (
                                 <div key={note.id} className="absolute h-[30px] rounded-sm border border-white/5 shadow-inner"
                                      style={{ 
                                        top: noteIndex * 32 + 1, 
                                        left: `${(note.step / 16) * 100}%`, 
                                        width: `${(d / 16) * 100}%`,
                                        backgroundColor: `${t.color}22` // Very faint version of original track color
                                      }}>
                                      <div className="absolute inset-0 border border-white/10 opacity-50" />
                                  </div>
                               );
                             })
                           )}
                        </div>

                        {/* Interactive Grid Layer */}
                        {PIANO_ROLL_NOTES.map((note, nIdx) => (
                          <div key={note} className="h-8 flex border-b border-white/5 relative group">
                             {Array.from({ length: 16 }).map((_, step) => (
                               <div 
                                 key={step} 
                                 onClick={() => addPianoNote(selectedTrack.id, note, step)}
                                 onContextMenu={(e) => { e.preventDefault(); removePianoNoteAt(selectedTrack.id, note, step); }}
                                 className={`flex-1 border-r border-black/10 cursor-crosshair relative z-20 hover:bg-orange-500/10 transition-colors group/cell`}
                               >
                                  {/* Placement Preview (Hover) */}
                                  <div className="absolute inset-0 bg-white/5 opacity-0 group-hover/cell:opacity-100 pointer-events-none" 
                                       style={{ width: `${brushLength * 100}%`, display: (step + brushLength <= 16) ? 'block' : 'none' }} />
                               </div>
                             ))}
                          </div>
                        ))}
                     </div>
                  </div>
                  {/* Velocity / Automation area */}
                  <div className="h-28 bg-[#141618] border-t border-black flex items-end px-20 gap-[2px] shadow-inner pb-2 flex-shrink-0 no-drag relative">
                     <div className="absolute top-2 left-3 text-[8px] font-black uppercase text-white/10 tracking-widest pointer-events-none">Velocity</div>
                     {Array.from({ length: 16 }).map((_, i) => (
                        <div key={i} className={`flex-1 bg-white/5 h-full relative group rounded-t-lg transition-all hover:bg-white/10 ${isPlaying && currentStep === i ? 'bg-white/10' : ''}`}>
                           <div className="absolute bottom-0 left-[1px] right-[1px] bg-gradient-to-t from-orange-500/40 to-orange-500/10 rounded-t-md transition-all group-hover:from-orange-500/60 group-hover:to-orange-500/20" style={{ height: '70%' }} />
                        </div>
                     ))}
                  </div>
               </div>
            </WindowFrame>
          )}
        </div>

        {/* Gemini Producer Sidebar */}
        {ui.producer && (
          <aside className="w-80 bg-[#1c1e22] border-l border-black flex flex-col z-50 shadow-2xl overflow-hidden animate-in slide-in-from-right duration-300">
             <div className="p-4 border-b border-black flex items-center justify-between bg-black/20">
                <div className="flex items-center gap-2">
                   <Wand2 size={16} className="text-orange-500" />
                   <span className="font-black text-white/60 uppercase tracking-widest text-[11px]">Producer Intel</span>
                </div>
                <button onClick={() => setUi(u => ({...u, producer: false}))} className="text-white/20 hover:text-white"><X size={16} /></button>
             </div>
             
             <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
                <div className="bg-black/40 border border-white/5 p-4 rounded-xl shadow-inner relative overflow-hidden group">
                   <div className="absolute top-0 right-0 p-2 opacity-20 group-hover:opacity-100 transition-opacity"><MessageSquare size={12} /></div>
                   <p className="text-[10px] leading-relaxed text-white/70 italic whitespace-pre-wrap font-medium">
                     "{producerAdvice}"
                   </p>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                   <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer group">
                      <Waves size={20} className="text-blue-400 group-hover:animate-pulse" />
                      <span className="text-[8px] font-black uppercase text-white/40">Analyze Spectrum</span>
                   </div>
                   <div className="p-3 bg-white/5 rounded-lg border border-white/5 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors cursor-pointer group">
                      <Headphones size={20} className="text-purple-400 group-hover:animate-pulse" />
                      <span className="text-[8px] font-black uppercase text-white/40">Mixing Tip</span>
                   </div>
                </div>
             </div>

             <div className="p-4 bg-black/20 border-t border-black">
                <div className="flex gap-2">
                   <input 
                     type="text" 
                     value={producerInput}
                     onChange={(e) => setProducerInput(e.target.value)}
                     onKeyDown={(e) => e.key === 'Enter' && handleGeminiProducer()}
                     placeholder="Ask Gemini for production advice..."
                     className="flex-1 bg-[#141618] border border-white/5 rounded-lg px-3 py-2 text-[10px] text-white placeholder:text-white/20 focus:outline-none focus:border-orange-500/50 transition-all"
                   />
                   <button onClick={handleGeminiProducer} className="w-10 h-10 bg-orange-500 text-black rounded-lg flex items-center justify-center hover:bg-orange-400 transition-all shadow-lg active:scale-95">
                      <ChevronRight size={20} />
                   </button>
                </div>
             </div>
          </aside>
        )}
      </main>

      {/* Status Bar */}
      <footer className="h-7 bg-[#2d3238] border-t border-black flex items-center justify-between px-3 gap-2 shadow-[0_-2px_10px_rgba(0,0,0,0.5)] flex-shrink-0">
        <div className="flex items-center gap-2 overflow-hidden flex-1">
           <Info size={12} className="text-orange-500 flex-shrink-0" />
           <span className="text-[9px] font-black text-white/30 uppercase tracking-[0.15em] truncate">{hint}</span>
        </div>
        <div className="flex items-center gap-5 text-[9px] font-mono text-white/20 flex-shrink-0">
           <div className="flex items-center gap-1.5 border-l border-white/10 pl-5">
              <div className={`w-2 h-2 rounded-full ${isAssetsLoading ? 'bg-yellow-500 animate-ping' : 'bg-green-500 shadow-[0_0_5px_rgba(34,197,94,0.5)]'}`} />
              <span className="uppercase font-black tracking-widest">{isAssetsLoading ? "Warming up" : "Core Ready"}</span>
           </div>
           <span className="font-black uppercase tracking-widest text-orange-500/40">DAW Engine V2.1 Platinum</span>
        </div>
      </footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #141618; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #444; border-radius: 4px; border: 1px solid #222; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .grid-cols-16 { grid-template-columns: repeat(16, minmax(0, 1fr)); }
        .playlist-bg { background-image: radial-gradient(#2d3238 1px, transparent 1px); background-size: 44px 44px; }
        .piano-roll-bg { background-image: linear-gradient(to right, #ffffff05 1px, transparent 1px); background-size: 6.25% 100%; }
        
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin-slow { animation: spin-slow 8s linear infinite; }

        input[type="range"] { -webkit-appearance: none; background: transparent; }
        input[type="range"]::-webkit-slider-thumb { -webkit-appearance: none; height: 16px; width: 16px; border-radius: 50%; background: #ff8a00; cursor: pointer; border: 2px solid #000; box-shadow: 0 0 10px rgba(249,115,22,0.4); margin-top: -6px; }
        input[type="range"]::-webkit-slider-runnable-track { width: 100%; height: 4px; background: #000; border-radius: 4px; }
      `}</style>
    </div>
  );
}

const VUMeter: React.FC<{ value: number, color: string, height: number }> = ({ value, color, height }) => {
  const segments = 24;
  const activeCount = Math.floor(value * segments);
  return (
    <div className="flex flex-col gap-[1px] w-3.5 bg-black/60 rounded-md p-[1.5px] shadow-[inset_0_2px_10px_rgba(0,0,0,0.8)] border border-white/5" style={{ height }}>
      {Array.from({ length: segments }).map((_, i) => {
        const idx = segments - 1 - i;
        const isActive = idx < activeCount;
        let segColor = '#141618';
        if (isActive) {
          if (idx > 20) segColor = '#ef4444';
          else if (idx > 16) segColor = '#fbbf24';
          else segColor = color;
        }
        return <div key={idx} className="flex-1 rounded-[1px] transition-all duration-75" style={{ backgroundColor: segColor, boxShadow: isActive ? `0 0 5px ${segColor}44` : 'none' }} />;
      })}
    </div>
  );
};
