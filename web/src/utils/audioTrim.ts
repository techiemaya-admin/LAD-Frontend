/**
 * Client-side trimming of a decoded recording.
 *
 * The call-log player already decodes the whole recording into an AudioBuffer
 * for the waveform, so a clip is a slice of samples and a WAV header — no
 * server round-trip, no re-encoding through a lossy codec.
 */

/** A copy of `buffer` between `start` and `end` seconds (clamped, at least 1 sample). */
export function sliceAudioBuffer(buffer: AudioBuffer, start: number, end: number): AudioBuffer {
  const rate = buffer.sampleRate;
  const total = buffer.length;
  const s = Math.max(0, Math.min(total - 1, Math.floor(Math.min(start, end) * rate)));
  const e = Math.max(s + 1, Math.min(total, Math.ceil(Math.max(start, end) * rate)));
  const length = e - s;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const out = new Ctx().createBuffer(buffer.numberOfChannels, length, rate);
  for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
    const src = buffer.getChannelData(ch).subarray(s, e);
    out.copyToChannel(src, ch, 0);
  }
  return out;
}

/** 16-bit PCM WAV (RIFF) of the whole buffer. */
export function audioBufferToWav(buffer: AudioBuffer): Blob {
  const channels = buffer.numberOfChannels;
  const rate = buffer.sampleRate;
  const frames = buffer.length;
  const bytesPerSample = 2;
  const blockAlign = channels * bytesPerSample;
  const dataSize = frames * blockAlign;
  const ab = new ArrayBuffer(44 + dataSize);
  const view = new DataView(ab);

  const writeStr = (offset: number, s: string) => {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);          // PCM chunk size
  view.setUint16(20, 1, true);           // PCM
  view.setUint16(22, channels, true);
  view.setUint32(24, rate, true);
  view.setUint32(28, rate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);          // bits per sample
  writeStr(36, "data");
  view.setUint32(40, dataSize, true);

  const chans: Float32Array[] = [];
  for (let ch = 0; ch < channels; ch++) chans.push(buffer.getChannelData(ch));
  let offset = 44;
  for (let i = 0; i < frames; i++) {
    for (let ch = 0; ch < channels; ch++) {
      const v = Math.max(-1, Math.min(1, chans[ch][i]));
      view.setInt16(offset, v < 0 ? v * 0x8000 : v * 0x7fff, true);
      offset += 2;
    }
  }
  return new Blob([ab], { type: "audio/wav" });
}

/** Save a Blob through a temporary link. */
export function saveBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  // Give the browser a moment to start the download before revoking.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** "1:05" / "12:07.5" → seconds; null when unparsable. Accepts plain seconds too. */
export function clockToSeconds(text: string): number | null {
  const t = text.trim();
  if (!t) return null;
  if (/^\d+(\.\d+)?$/.test(t)) return parseFloat(t);
  const m = /^(\d+):(\d{1,2}(?:\.\d+)?)$/.exec(t);
  if (!m) return null;
  const sec = parseFloat(m[2]);
  if (sec >= 60) return null;
  return parseInt(m[1], 10) * 60 + sec;
}

/** seconds → "m:ss" (tenths when asked, for the trim handles). */
export function secondsToClock(seconds: number, tenths = false): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const m = Math.floor(seconds / 60);
  const s = seconds - m * 60;
  return tenths ? `${m}:${s.toFixed(1).padStart(4, "0")}` : `${m}:${String(Math.floor(s)).padStart(2, "0")}`;
}

/** `<base>_clip_0m05s-1m12s.wav` beside the full recording's name. */
export function clipFilename(baseName: string, start: number, end: number): string {
  const tag = (t: number) => `${Math.floor(t / 60)}m${String(Math.floor(t % 60)).padStart(2, "0")}s`;
  const base = baseName.replace(/\.(wav|ogg|mp3|m4a|opus)$/i, "") || "recording";
  return `${base}_clip_${tag(start)}-${tag(end)}.wav`;
}
