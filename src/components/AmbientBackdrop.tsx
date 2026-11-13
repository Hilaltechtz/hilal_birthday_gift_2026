import { forwardRef, useEffect, useImperativeHandle, useRef } from 'react';
import { CelebrationBurstType } from '../types';
import { DEFAULT_WEBSITE_THEME, WebsiteThemeConfig } from '../types/theme';
import { hexToRgba, isLightHex } from '../utils/themeColorUtils';

export interface AmbientBackdropHandle {
  triggerBurst: (type: CelebrationBurstType) => void;
}

interface AmbientBackdropProps {
  showBalloons?: boolean;
  theme?: WebsiteThemeConfig;
}

interface Star {
  x: number;
  y: number;
  r: number;
  phase: number;
  speed: number;
  vy: number;
  gold: boolean;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  decay: number;
  gravity: number;
  rotation: number;
  vRot: number;
  shape: 'circle' | 'rect' | 'heart' | 'star';
}

interface Balloon {
  x: number;
  y: number;
  r: number;
  speed: number;
  swayOffset: number;
  colorIndex: number;
}

export const AmbientBackdrop = forwardRef<
  AmbientBackdropHandle,
  AmbientBackdropProps
>(function AmbientBackdrop(
  { showBalloons = false, theme = DEFAULT_WEBSITE_THEME },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const balloonsEnabledRef = useRef(showBalloons);
  const themeRef = useRef<WebsiteThemeConfig>(theme);

  useEffect(() => {
    balloonsEnabledRef.current = showBalloons;
  }, [showBalloons]);

  useEffect(() => {
    themeRef.current = theme;
  }, [theme]);

  const spawnBurst = (type: CelebrationBurstType) => {
    const t = themeRef.current;
    const palette = [
      t.primaryColor,
      t.buttonSecondaryColor,
      t.accentColor,
      t.secondaryColor,
      t.textColor,
      t.glowColor,
    ];
    const canvas = canvasRef.current;
    const width = canvas ? canvas.clientWidth : window.innerWidth;
    const height = canvas ? canvas.clientHeight : window.innerHeight;
    const particles = particlesRef.current;

    if (type === 'sparkles') {
      const cx = width * 0.5;
      const cy = height * 0.42;
      for (let i = 0; i < 65; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = 1.6 + Math.random() * 5.2;
        particles.push({
          x: cx + (Math.random() - 0.5) * 60,
          y: cy + (Math.random() - 0.5) * 30,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 2.2,
          size: 3 + Math.random() * 4.5,
          color: i % 3 === 0 ? t.textColor : t.primaryColor,
          alpha: 1,
          decay: 0.012 + Math.random() * 0.01,
          gravity: 0.055,
          rotation: Math.random() * Math.PI * 2,
          vRot: (Math.random() - 0.5) * 0.14,
          shape: 'star',
        });
      }
      return;
    }

    if (type === 'confetti') {
      const origins = [width * 0.25, width * 0.5, width * 0.75];
      origins.forEach((ox) => {
        for (let i = 0; i < 38; i++) {
          const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.45;
          const speed = 4.5 + Math.random() * 7.5;
          particles.push({
            x: ox,
            y: height * 0.55,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 5 + Math.random() * 5,
            color: palette[Math.floor(Math.random() * palette.length)],
            alpha: 1,
            decay: 0.008 + Math.random() * 0.007,
            gravity: 0.14,
            rotation: Math.random() * Math.PI * 2,
            vRot: (Math.random() - 0.5) * 0.22,
            shape: 'rect',
          });
        }
      });
      return;
    }

    if (type === 'fireworks') {
      const bursts = [
        { x: width * 0.24, y: height * 0.28 },
        { x: width * 0.76, y: height * 0.24 },
        { x: width * 0.5, y: height * 0.2 },
      ];
      bursts.forEach((b, idx) => {
        const color = palette[(idx * 2) % palette.length];
        for (let i = 0; i < 46; i++) {
          const angle = (i / 46) * Math.PI * 2 + Math.random() * 0.15;
          const speed = 2.2 + Math.random() * 5.8;
          particles.push({
            x: b.x,
            y: b.y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed,
            size: 2.5 + Math.random() * 3.5,
            color: i % 4 === 0 ? t.buttonSecondaryColor : color,
            alpha: 1,
            decay: 0.011 + Math.random() * 0.009,
            gravity: 0.075,
            rotation: 0,
            vRot: 0,
            shape: i % 5 === 0 ? 'star' : 'circle',
          });
        }
      });
      return;
    }

    if (type === 'hearts') {
      for (let i = 0; i < 42; i++) {
        const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.9;
        const speed = 2 + Math.random() * 5.2;
        particles.push({
          x: width * 0.5 + (Math.random() - 0.5) * 90,
          y: height * 0.55,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 1.2,
          size: 7 + Math.random() * 7,
          color: i % 2 === 0 ? t.accentColor : t.primaryColor,
          alpha: 1,
          decay: 0.0085 + Math.random() * 0.006,
          gravity: 0.04,
          rotation: (Math.random() - 0.5) * 0.4,
          vRot: (Math.random() - 0.5) * 0.04,
          shape: 'heart',
        });
      }
      spawnBurst('confetti');
    }
  };

  useImperativeHandle(ref, () => ({
    triggerBurst: spawnBurst,
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches;

    let width = window.innerWidth;
    let height = window.innerHeight;
    let dpr = Math.min(window.devicePixelRatio || 1, 2);

    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const starCount = width < 640 ? 48 : 88;
    const stars: Star[] = Array.from({ length: starCount }, (_, i) => ({
      x: Math.random() * width,
      y: Math.random() * height,
      r: 0.8 + Math.random() * 2.1,
      phase: Math.random() * Math.PI * 2,
      speed: 0.015 + Math.random() * 0.03,
      vy: 0.08 + Math.random() * 0.2,
      gold: i % 3 !== 0,
    }));

    const balloons: Balloon[] = Array.from({ length: 7 }, (_, i) => ({
      x: ((i + 0.5) / 7) * width + (Math.random() - 0.5) * 60,
      y: height + 80 + i * 110,
      r: 22 + (i % 3) * 7,
      speed: 0.35 + Math.random() * 0.35,
      swayOffset: Math.random() * Math.PI * 2,
      colorIndex: i % 3,
    }));

    const drawStarShape = (
      x: number,
      y: number,
      radius: number,
      rot: number,
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.beginPath();
      for (let i = 0; i < 4; i++) {
        const angle = (i * Math.PI) / 2;
        ctx.lineTo(Math.cos(angle) * radius * 1.4, Math.sin(angle) * radius * 1.4);
        const innerAngle = angle + Math.PI / 4;
        ctx.lineTo(
          Math.cos(innerAngle) * radius * 0.42,
          Math.sin(innerAngle) * radius * 0.42,
        );
      }
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    };

    const drawHeartShape = (
      x: number,
      y: number,
      size: number,
      rot: number,
    ) => {
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      const s = size * 0.55;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.4);
      ctx.bezierCurveTo(-s, -s * 0.4, -s * 1.3, s * 0.8, 0, s * 1.4);
      ctx.bezierCurveTo(s * 1.3, s * 0.8, s, -s * 0.4, 0, s * 0.4);
      ctx.fill();
      ctx.restore();
    };

    let rafId = 0;
    let time = 0;

    const render = () => {
      time += 0.016;
      const t = themeRef.current;
      const isLight = isLightHex(t.backgroundColor);
      ctx.clearRect(0, 0, width, height);

      // Stars and rising theme-tinted motes
      for (const s of stars) {
        if (!prefersReducedMotion) {
          s.phase += s.speed;
          s.y -= s.vy;
          if (s.y < -10) {
            s.y = height + 10;
            s.x = Math.random() * width;
          }
        }
        const rawAlpha = 0.25 + 0.65 * (0.5 + 0.5 * Math.sin(s.phase));
        const alpha = isLight ? rawAlpha * 0.45 : rawAlpha;
        ctx.fillStyle = s.gold
          ? hexToRgba(t.primaryColor, alpha)
          : hexToRgba(isLight ? t.secondaryColor : t.textColor, alpha * 0.85);
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
      }

      // Optional floating silk balloons
      if (balloonsEnabledRef.current && !prefersReducedMotion) {
        const balloonColors = [t.secondaryColor, t.primaryColor, t.accentColor];
        for (const b of balloons) {
          b.y -= b.speed;
          const swayX = Math.sin(time * 0.9 + b.swayOffset) * 18;
          if (b.y < -130) {
            b.y = height + 110;
            b.x = Math.random() * width;
          }
          const bx = b.x + swayX;
          const by = b.y;
          const c = balloonColors[b.colorIndex % balloonColors.length];

          ctx.strokeStyle = hexToRgba(t.primaryColor, 0.25);
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(bx, by + b.r * 1.18);
          ctx.quadraticCurveTo(bx + 6, by + b.r * 1.7, bx - 4, by + b.r * 2.4);
          ctx.stroke();

          ctx.save();
          ctx.translate(bx, by);
          ctx.scale(0.86, 1.08);
          ctx.fillStyle = hexToRgba(c, 0.22);
          ctx.beginPath();
          ctx.arc(0, 0, b.r, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = hexToRgba(c, 0.45);
          ctx.lineWidth = 1;
          ctx.stroke();

          ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
          ctx.beginPath();
          ctx.ellipse(-b.r * 0.32, -b.r * 0.34, b.r * 0.16, b.r * 0.28, -0.4, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      // Active burst particles
      const particles = particlesRef.current;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += p.gravity;
        p.vx *= 0.992;
        p.rotation += p.vRot;
        p.alpha -= p.decay;

        if (p.alpha <= 0 || p.y > height + 40) {
          particles.splice(i, 1);
          continue;
        }

        ctx.globalAlpha = Math.max(0, p.alpha);
        ctx.fillStyle = p.color;

        if (p.shape === 'circle') {
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.shape === 'rect') {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillRect(-p.size * 0.5, -p.size * 0.28, p.size, p.size * 0.56);
          ctx.restore();
        } else if (p.shape === 'star') {
          drawStarShape(p.x, p.y, p.size, p.rotation);
        } else {
          drawHeartShape(p.x, p.y, p.size, p.rotation);
        }
      }
      ctx.globalAlpha = 1;

      if (!prefersReducedMotion || particles.length > 0) {
        rafId = requestAnimationFrame(render);
      }
    };

    rafId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(rafId);
      window.removeEventListener('resize', resize);
    };
  }, []);

  const isLight = isLightHex(theme.backgroundColor);
  const backgroundCss = [
    `radial-gradient(circle at 20% 15%, ${hexToRgba(theme.glowColor, isLight ? 0.16 : 0.24)} 0%, transparent 45%)`,
    `radial-gradient(circle at 82% 20%, ${hexToRgba(theme.primaryColor, isLight ? 0.12 : 0.16)} 0%, transparent 40%)`,
    `radial-gradient(circle at 50% 85%, ${hexToRgba(theme.accentColor, isLight ? 0.12 : 0.14)} 0%, transparent 50%)`,
    `linear-gradient(${theme.gradientAngle}deg, ${theme.gradientStart} 0%, ${theme.backgroundColor} 52%, ${theme.gradientEnd} 100%)`,
  ].join(', ');

  return (
    <div
      className="fixed inset-0 pointer-events-none overflow-hidden z-0"
      aria-hidden="true"
    >
      <div
        className="absolute inset-0 transition-all duration-300"
        style={{ background: backgroundCss }}
      />
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
    </div>
  );
});
