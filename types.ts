
export type InstrumentType = 'sampler' | 'synth' | 'acid';
export type PlaybackMode = 'pat' | 'song';

export interface PianoNote {
  id: string;
  step: number;
  note: string;
  velocity: number;
  length: string;
}

export interface FXSlot {
  id: string;
  type: 'reverb' | 'delay' | 'dist' | 'filter';
  enabled: boolean;
  params: Record<string, number>;
}

export interface FXSettings {
  reverb: { enabled: boolean; roomSize: number; dampening: number };
  delay: { enabled: boolean; delayTime: string; feedback: number };
}

export interface SynthSettings {
  oscillator: 'sine' | 'square' | 'sawtooth' | 'triangle';
  envelope: {
    attack: number;
    decay: number;
    sustain: number;
    release: number;
  };
  filter: {
    frequency: number;
    resonance: number;
    type: 'lowpass' | 'highpass' | 'bandpass';
  };
  distortion?: number;
}

export interface PatternData {
  id: number;
  name: string;
  steps: boolean[];
  velocities: number[];
  notes: PianoNote[];
  color: string;
}

export interface Track {
  id: string;
  name: string;
  type: InstrumentType;
  sampleUrl?: string;
  patterns: { [key: number]: PatternData };
  synthSettings?: SynthSettings;
  fx: FXSettings;
  fxSlots: FXSlot[];
  volume: number; 
  pan: number; 
  muted: boolean;
  solo: boolean;
  color: string;
  mixerTrack: number;
}

export interface PlaylistClip {
  id: string;
  patternId: number;
  trackIndex: number;
  startBar: number;
}

export interface AppState {
  tracks: Track[];
  playlistClips: PlaylistClip[];
  isPlaying: boolean;
  bpm: number;
  mode: PlaybackMode;
  currentStep: number;
  currentPatternId: number;
}
