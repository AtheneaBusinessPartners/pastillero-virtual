let audioCtx: AudioContext | null = null;
let stopTimer: ReturnType<typeof setInterval> | null = null;

function beepOnce() {
  if (!audioCtx) return;
  const oscillator = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  oscillator.type = "sine";
  oscillator.frequency.value = 880;
  gain.gain.setValueAtTime(0.0001, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.3, audioCtx.currentTime + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + 0.6);
  oscillator.connect(gain);
  gain.connect(audioCtx.destination);
  oscillator.start();
  oscillator.stop(audioCtx.currentTime + 0.6);
}

export function startAlarmSound() {
  if (typeof window === "undefined") return;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    audioCtx = new AudioContextClass();
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  beepOnce();
  stopTimer = setInterval(beepOnce, 1200);
  if (navigator.vibrate) navigator.vibrate([300, 200, 300, 200, 300]);
}

export function stopAlarmSound() {
  if (stopTimer) {
    clearInterval(stopTimer);
    stopTimer = null;
  }
}
