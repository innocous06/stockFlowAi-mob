// Tactical Route Blocked Emergency Alarm Service
// Uses Web Audio API to synthesize an urgent cockpit klaxon alarm sound
// and Web Speech API for voice announcement without requiring external audio files.

let audioCtx: AudioContext | null = null;
let alarmInterval: any = null;
let isAlarmPlaying = false;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
  if (!AudioCtxClass) return null;
  if (!audioCtx || audioCtx.state === 'closed') {
    audioCtx = new AudioCtxClass();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function playTacticalAlarmPulse(): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Urgent tactical dual-frequency klaxon tones
    const tones = [
      { freq: 880, start: now, duration: 0.15 },
      { freq: 587, start: now + 0.17, duration: 0.15 },
      { freq: 880, start: now + 0.34, duration: 0.15 },
      { freq: 587, start: now + 0.51, duration: 0.22 },
    ];

    tones.forEach(({ freq, start, duration }) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, start);

      // Low pass filter for punchy tactical tone
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1400, start);

      gain.gain.setValueAtTime(0.001, start);
      gain.gain.exponentialRampToValueAtTime(0.4, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(start);
      osc.stop(start + duration);
    });
  } catch (err) {
    console.warn('Tactical alarm audio error:', err);
  }
}

export function startRouteBlockedAlarm(hazardTitle: string = 'Critical Hazard', reporterName: string = 'Field Operator'): void {
  // If already playing, don't duplicate intervals
  if (isAlarmPlaying) return;
  isAlarmPlaying = true;

  // Play first pulse immediately
  playTacticalAlarmPulse();

  // Voice announcement
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
      const text = `Warning! Your route is blocked right now. ${hazardTitle} reported ahead by ${reporterName}.`;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 1.0;
      utterance.volume = 1.0;
      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  // Repeat alarm pulses every 2.4 seconds until operator acknowledges and clicks
  alarmInterval = setInterval(() => {
    playTacticalAlarmPulse();
  }, 2400);
}

export function stopRouteBlockedAlarm(): void {
  isAlarmPlaying = false;
  if (alarmInterval) {
    clearInterval(alarmInterval);
    alarmInterval = null;
  }
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {}
  }
}
