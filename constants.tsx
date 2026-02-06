
export const DEFAULT_BPM = 120;
export const STEPS_COUNT = 16;
export const TRACK_COLORS = [
  '#ff4d4d', '#ffaf40', '#fffa65', '#32ff7e', 
  '#7efff5', '#18dcff', '#7d5fff', '#cd84f1'
];

export const DRUM_SAMPLES = {
  kick: 'https://tonejs.github.io/audio/drum-samples/CR78/kick.mp3',
  snare: 'https://tonejs.github.io/audio/drum-samples/CR78/snare.mp3',
  hihat: 'https://tonejs.github.io/audio/drum-samples/CR78/hihat.mp3',
  open_hihat: 'https://tonejs.github.io/audio/drum-samples/CR78/open_hihat.mp3',
  // CR78 doesn't have a clap in the standard Tone.js audio repo, using 808 instead
  clap: 'https://tonejs.github.io/audio/drum-samples/808/clap.mp3',
  rim: 'https://tonejs.github.io/audio/drum-samples/CR78/rim.mp3',
  perc1: 'https://tonejs.github.io/audio/drum-samples/CR78/perc1.mp3',
  perc2: 'https://tonejs.github.io/audio/drum-samples/CR78/perc2.mp3',
  conga_high: 'https://tonejs.github.io/audio/drum-samples/CR78/conga_high.mp3',
  conga_low: 'https://tonejs.github.io/audio/drum-samples/CR78/conga_low.mp3',
  bongo_high: 'https://tonejs.github.io/audio/drum-samples/CR78/bongo_high.mp3'
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
