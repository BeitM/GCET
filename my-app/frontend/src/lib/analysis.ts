import type { TelemetryFrame } from "@/lib/types";

export const MAX_ANALYSIS_FRAMES = 900;

export function selectAnalysisFrames(frames: TelemetryFrame[], limit = MAX_ANALYSIS_FRAMES) {
  if (frames.length <= limit) return frames.map(compactFrame);

  const important = frames
    .map((frame, index) => (frame.event || frame.warning || frame.shot || frame.scoreEvent ? index : -1))
    .filter((index) => index >= 0);
  const selected = new Set<number>([0, frames.length - 1]);

  if (important.length >= limit - 2) {
    important.slice(-(limit - 2)).forEach((index) => selected.add(index));
  } else {
    important.forEach((index) => selected.add(index));
    const remaining = limit - selected.size;
    const stride = (frames.length - 1) / Math.max(1, remaining);
    for (let sample = 0; sample < remaining; sample++) selected.add(Math.round(sample * stride));
  }

  return Array.from(selected)
    .sort((a, b) => a - b)
    .slice(0, limit)
    .map((index) => compactFrame(frames[index]));
}

function compactFrame(frame: TelemetryFrame): TelemetryFrame {
  return { ...frame, artifacts: undefined, shots: undefined };
}
