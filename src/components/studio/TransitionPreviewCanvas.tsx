import { useEffect, useMemo, useRef } from 'react';
import {
  DEFAULT_TRANSITION_CONFIG,
  PhotoTransitionConfig,
  SAMPLE_STUDIO_PHOTOS,
  StudioPhoto,
} from '../../types';
import { DEFAULT_VIDEO_THEME, VideoThemeConfig } from '../../types/theme';
import {
  createParticleSeeds,
  drawStandaloneTransitionDemo,
  LoadedImageMap,
} from '../../utils/videoCanvasScene';

interface TransitionPreviewCanvasProps {
  photoA?: StudioPhoto;
  photoB?: StudioPhoto;
  images: LoadedImageMap;
  transition: PhotoTransitionConfig;
  videoTheme?: VideoThemeConfig;
  width?: number;
  height?: number;
  showCaptions?: boolean;
  highFps?: boolean;
  replayNonce?: number;
  className?: string;
}

export function TransitionPreviewCanvas({
  photoA = SAMPLE_STUDIO_PHOTOS[0],
  photoB = SAMPLE_STUDIO_PHOTOS[1],
  images,
  transition,
  videoTheme = DEFAULT_VIDEO_THEME,
  width = 280,
  height = 200,
  showCaptions = false,
  highFps = false,
  replayNonce = 0,
  className = '',
}: TransitionPreviewCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const visibleRef = useRef(true);
  const seeds = useMemo(() => createParticleSeeds(90), []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const observer = new IntersectionObserver(
      (entries) => {
        visibleRef.current = entries[0]?.isIntersecting ?? true;
      },
      { threshold: 0.05 },
    );
    observer.observe(canvas);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imgA = images[photoA.id] ?? null;
    const imgB = images[photoB.id] ?? null;

    const safeTransition = transition || DEFAULT_TRANSITION_CONFIG;
    const loopDurationMs = Math.max(
      1800,
      Math.min(4200, safeTransition.durationSec * 1700 + 850),
    );
    const minFrameDelta = highFps ? 16 : 42;
    let lastDraw = 0;
    const startMs = performance.now() - (replayNonce > 0 ? loopDurationMs * 0.12 : 0);
    let rafId = 0;

    const render = (now: number) => {
      rafId = requestAnimationFrame(render);
      if (!visibleRef.current) return;
      if (now - lastDraw < minFrameDelta) return;
      lastDraw = now;

      const progress01 = ((now - startMs) % loopDurationMs) / loopDurationMs;
      drawStandaloneTransitionDemo(
        ctx,
        width,
        height,
        progress01,
        photoA,
        imgA,
        photoB,
        imgB,
        safeTransition,
        seeds,
        showCaptions,
        videoTheme,
      );
    };

    rafId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafId);
  }, [
    photoA,
    photoB,
    images,
    transition,
    videoTheme,
    width,
    height,
    showCaptions,
    highFps,
    replayNonce,
    seeds,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
    />
  );
}
