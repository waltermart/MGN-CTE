/**
 * Web Audio API synthesized doorbell/counter chime and Text-To-Speech announcement.
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function playChime(): Promise<void> {
  return new Promise((resolve) => {
    try {
      const ctx = getAudioContext();
      if (!ctx) {
        resolve();
        return;
      }

      const now = ctx.currentTime;

      // Tone 1: High crisp ding (approx 659.25 Hz - E5)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(659.25, now);

      gain1.gain.setValueAtTime(0.001, now);
      gain1.gain.exponentialRampToValueAtTime(0.3, now + 0.05);
      gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.6);

      osc1.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 0.65);

      // Tone 2: Lower harmonious chime (approx 523.25 Hz - C5)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(880, now + 0.18);

      gain2.gain.setValueAtTime(0.001, now + 0.18);
      gain2.gain.exponentialRampToValueAtTime(0.35, now + 0.22);
      gain2.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);

      osc2.connect(gain2);
      gain2.connect(ctx.destination);

      osc2.start(now + 0.18);
      osc2.stop(now + 1.15);

      setTimeout(() => {
        resolve();
      }, 700);
    } catch {
      resolve();
    }
  });
}

/**
 * Pronounces a plate number with pauses between characters for maximum clarity.
 * e.g., "AAS 212" -> "A A S... 2 1 2"
 */
export function formatPlateForSpeech(plate: string): string {
  return plate
    .trim()
    .split('')
    .map((char) => (char === ' ' ? ', ' : char + ' '))
    .join('');
}

export function announcePlate(plate: string, service?: string, enableVoice = true, enableChime = true): void {
  if (enableChime) {
    playChime().then(() => {
      if (enableVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        speakCallout(plate, service);
      }
    });
  } else if (enableVoice && typeof window !== 'undefined' && 'speechSynthesis' in window) {
    speakCallout(plate, service);
  }
}

function speakCallout(plate: string, service?: string): void {
  try {
    window.speechSynthesis.cancel();
    const phoneticPlate = formatPlateForSpeech(plate);
    const cleanService = service ? service.replace(/^\d+\.\s*/, '') : '';
    const text = cleanService
      ? `Now serving plate number ${phoneticPlate}. For ${cleanService}.`
      : `Now serving plate number ${phoneticPlate}.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.88; // Slightly deliberate for clear listening in a lobby
    utterance.pitch = 1.05;
    utterance.volume = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith('en') && (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel')));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    window.speechSynthesis.speak(utterance);
  } catch (err) {
    console.error('TTS error', err);
  }
}
