
export const DEFAULT_BPM = 120;
export const STEPS_COUNT = 16;
export const TRACK_COLORS = [
  '#ff4d4d', '#ffaf40', '#fffa65', '#32ff7e', 
  '#7efff5', '#18dcff', '#7d5fff', '#cd84f1'
];

// Reliable default samples (using TR-808 as the core)
export const DRUM_SAMPLES = {
  kick: 'https://tonejs.github.io/audio/drum-samples/808/kick.mp3',
  snare: 'https://tonejs.github.io/audio/drum-samples/808/snare.mp3',
  hihat: 'https://tonejs.github.io/audio/drum-samples/808/hh.mp3',
  open_hihat: 'https://tonejs.github.io/audio/drum-samples/808/hh.mp3', // 808 pack often shares hh, can pitch shift in sampler if needed
  clap: 'https://tonejs.github.io/audio/drum-samples/808/clap.mp3',
  rim: 'https://tonejs.github.io/audio/drum-samples/808/rim.mp3',
  perc1: 'https://tonejs.github.io/audio/drum-samples/808/cowbell.mp3',
  perc2: 'https://tonejs.github.io/audio/drum-samples/808/tom2.mp3',
  conga_high: 'https://tonejs.github.io/audio/drum-samples/808/tom3.mp3',
  conga_low: 'https://tonejs.github.io/audio/drum-samples/808/tom1.mp3',
  bongo_high: 'https://tonejs.github.io/audio/drum-samples/808/tom3.mp3'
};

export const SAMPLE_PACKS = {
  'Drum Kits': {
    'Roland TR-808': {
      'Kick': 'https://tonejs.github.io/audio/drum-samples/808/kick.mp3',
      'Snare': 'https://tonejs.github.io/audio/drum-samples/808/snare.mp3',
      'HiHat': 'https://tonejs.github.io/audio/drum-samples/808/hh.mp3',
      'Clap': 'https://tonejs.github.io/audio/drum-samples/808/clap.mp3',
      'Rim': 'https://tonejs.github.io/audio/drum-samples/808/rim.mp3',
      'Cowbell': 'https://tonejs.github.io/audio/drum-samples/808/cowbell.mp3',
      'Tom High': 'https://tonejs.github.io/audio/drum-samples/808/tom3.mp3',
      'Tom Mid': 'https://tonejs.github.io/audio/drum-samples/808/tom2.mp3',
      'Tom Low': 'https://tonejs.github.io/audio/drum-samples/808/tom1.mp3'
    },
    'Roland TR-909': {
      'Kick': 'https://tonejs.github.io/audio/drum-samples/909/kick.mp3',
      'Snare': 'https://tonejs.github.io/audio/drum-samples/909/snare.mp3',
      'HiHat': 'https://tonejs.github.io/audio/drum-samples/909/hh.mp3',
      'Clap': 'https://tonejs.github.io/audio/drum-samples/909/clap.mp3',
      'Rim': 'https://tonejs.github.io/audio/drum-samples/909/rim.mp3',
      'Tom High': 'https://tonejs.github.io/audio/drum-samples/909/tom3.mp3',
      'Tom Mid': 'https://tonejs.github.io/audio/drum-samples/909/tom2.mp3',
      'Tom Low': 'https://tonejs.github.io/audio/drum-samples/909/tom1.mp3'
    },
    'LinnDrum': {
      'Kick': 'https://tonejs.github.io/audio/drum-samples/LinnDrum/kick.mp3',
      'Snare': 'https://tonejs.github.io/audio/drum-samples/LinnDrum/snare.mp3',
      'HiHat': 'https://tonejs.github.io/audio/drum-samples/LinnDrum/hh.mp3',
      'Clap': 'https://tonejs.github.io/audio/drum-samples/LinnDrum/clap.mp3',
      'Cowbell': 'https://tonejs.github.io/audio/drum-samples/LinnDrum/cowbell.mp3',
      'Tom': 'https://tonejs.github.io/audio/drum-samples/LinnDrum/tom.mp3'
    },
    'KPR-77': {
       'Kick': 'https://tonejs.github.io/audio/drum-samples/KPR77/kick.mp3',
       'Snare': 'https://tonejs.github.io/audio/drum-samples/KPR77/snare.mp3',
       'HiHat': 'https://tonejs.github.io/audio/drum-samples/KPR77/hh.mp3',
       'Clap': 'https://tonejs.github.io/audio/drum-samples/KPR77/clap.mp3',
       'Tom': 'https://tonejs.github.io/audio/drum-samples/KPR77/tom.mp3'
    },
    'Bongos': {
        'Bongo High': 'https://tonejs.github.io/audio/drum-samples/bongos/hi.mp3',
        'Bongo Low': 'https://tonejs.github.io/audio/drum-samples/bongos/low.mp3'
    }
  }
};

export const SYNTH_PRESETS = {
  'Instruments': {
    'Bass': {
      'Acid 303': {
        type: 'acid',
        settings: { oscillator: 'sawtooth', envelope: { attack: 0.01, decay: 0.2, sustain: 0.0, release: 0.1 }, filter: { frequency: 600, resonance: 10, type: 'lowpass' } }
      },
      'Deep Sub': {
        type: 'synth',
        settings: { oscillator: 'sine', envelope: { attack: 0.01, decay: 0.3, sustain: 0.8, release: 0.2 }, filter: { frequency: 150, resonance: 0, type: 'lowpass' } }
      },
      'Reese Bass': {
         type: 'synth',
         settings: { oscillator: 'sawtooth', envelope: { attack: 0.1, decay: 0.5, sustain: 0.8, release: 0.4 }, filter: { frequency: 300, resonance: 5, type: 'lowpass' }, distortion: 0.5 }
      },
      'Donk Bass': {
          type: 'synth',
          settings: { oscillator: 'square', envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }, filter: { frequency: 800, resonance: 10, type: 'lowpass' } }
      }
    },
    'Leads': {
       'Power Lead': {
          type: 'synth',
          settings: { oscillator: 'sawtooth', envelope: { attack: 0.01, decay: 0.1, sustain: 0.6, release: 0.3 }, filter: { frequency: 4000, resonance: 2, type: 'lowpass' } }
       },
       'Retro Square': {
          type: 'synth',
          settings: { oscillator: 'square', envelope: { attack: 0.01, decay: 0.1, sustain: 0.4, release: 0.1 }, filter: { frequency: 2000, resonance: 4, type: 'lowpass' } }
       },
       'Pluck': {
           type: 'synth',
           settings: { oscillator: 'triangle', envelope: { attack: 0.005, decay: 0.3, sustain: 0, release: 0.1 }, filter: { frequency: 3000, resonance: 1, type: 'lowpass' } }
       }
    },
    'Keys': {
        'Soft Keys': {
            type: 'synth',
            settings: { oscillator: 'sine', envelope: { attack: 0.05, decay: 0.5, sustain: 0.5, release: 1 }, filter: { frequency: 1000, resonance: 1, type: 'lowpass' } }
        },
        'Organ': {
            type: 'synth',
            settings: { oscillator: 'triangle', envelope: { attack: 0.1, decay: 0.1, sustain: 1, release: 0.1 }, filter: { frequency: 5000, resonance: 0.1, type: 'lowpass' } }
        }
    },
    'Pads': {
       'Space Pad': {
          type: 'synth',
          settings: { oscillator: 'triangle', envelope: { attack: 1.5, decay: 2.0, sustain: 0.8, release: 3.0 }, filter: { frequency: 600, resonance: 1, type: 'lowpass' } }
       },
       'Ethereal': {
          type: 'synth',
          settings: { oscillator: 'sine', envelope: { attack: 1.0, decay: 3.0, sustain: 0.5, release: 4.0 }, filter: { frequency: 1200, resonance: 0.5, type: 'highpass' } }
       }
    },
    'FX': {
        'Noise Sweep': {
            type: 'synth',
            settings: { oscillator: 'square', envelope: { attack: 2, decay: 0.1, sustain: 1, release: 2 }, filter: { frequency: 500, resonance: 10, type: 'bandpass' } } // Noise osc type usually handled by distinct Tone objects, using square for approximation or need custom logic. Standard PolySynth osc types are sine/square/tri/saw. Noise requires NoiseSynth. Keeping to PolySynth compatible types for now.
        },
        'Laser': {
            type: 'synth',
            settings: { oscillator: 'sawtooth', envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }, filter: { frequency: 8000, resonance: 15, type: 'lowpass' } }
        }
    }
  }
};

export const PIANO_ROLL_NOTES = [
  'C5', 'B4', 'A#4', 'A4', 'G#4', 'G4', 'F#4', 'F4', 'E4', 'D#4', 'D4', 'C#4', 'C4',
  'B3', 'A#3', 'A3', 'G#3', 'G3', 'F#3', 'F3', 'E3', 'D#3', 'D3', 'C#3', 'C3'
];

export const KEY_TO_NOTE: Record<string, string> = {
  'a': 'C4',
  'w': 'C#4',
  's': 'D4',
  'e': 'D#4',
  'd': 'E4',
  'f': 'F4',
  't': 'F#4',
  'g': 'G4',
  'y': 'G#4',
  'h': 'A4',
  'u': 'A#4',
  'j': 'B4',
  'k': 'C5',
  'l': 'D5',
  'o': 'D#5',
  ';': 'E5'
};
