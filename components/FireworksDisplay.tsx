import React, { useEffect, useRef, useState } from 'react';

// --- Types ---
interface Point {
  x: number;
  y: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
  alpha: number;
  decay: number;
}

interface Firework {
  x: number;
  y: number;
  targetY: number;
  vx: number;
  vy: number;
  hue: number;
  particles: Particle[];
  state: 'rising' | 'exploded' | 'dead';
  trail: Point[];
}

interface FireworksDisplayProps {
  audioEnabled: boolean;
}

const FireworksDisplay: React.FC<FireworksDisplayProps> = ({ audioEnabled }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });

  // Audio Refs
  const audioCtxRef = useRef<AudioContext | null>(null);
  const audioEnabledRef = useRef(audioEnabled);
  const noiseBufferRef = useRef<AudioBuffer | null>(null);

  // Sync prop to ref for use in animation loop without dependency issues
  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
    
    // Initialize audio context on first enable if not exists
    if (audioEnabled && !audioCtxRef.current) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        audioCtxRef.current = ctx;
        
        // Generate a 2-second white noise buffer for reuse
        const bufferSize = ctx.sampleRate * 2;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        noiseBufferRef.current = buffer;
      }
    }

    // Resume context if it was suspended (browser policy)
    if (audioEnabled && audioCtxRef.current?.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, [audioEnabled]);

  useEffect(() => {
    const handleResize = () => {
      setDimensions({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || dimensions.width === 0) return;

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    // Set canvas size
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;

    // --- Configuration ---
    const TEXT = "2026";
    const FONT_SIZE = Math.min(dimensions.width * 0.25, 300); // Responsive font size
    const FONT = `900 ${FONT_SIZE}px sans-serif`;
    
    // --- State ---
    let textPoints: Point[] = [];
    let sparklerParticles: Particle[] = [];
    let fireworks: Firework[] = [];
    let animationFrameId: number;
    let tick = 0;

    // --- Audio Helper Functions ---
    const playExplosionSound = () => {
      if (!audioEnabledRef.current || !audioCtxRef.current || !noiseBufferRef.current) return;
      
      const ctx = audioCtxRef.current;
      const t = ctx.currentTime;
      
      const source = ctx.createBufferSource();
      source.buffer = noiseBufferRef.current;
      
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(100, t + 0.3); // "Thud" sweep

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(0.2, t + 0.02); // Fast attack
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.5); // Decay

      source.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      
      source.start(t);
      source.stop(t + 0.6);
    };

    const playSparkleCrackles = () => {
        if (!audioEnabledRef.current || !audioCtxRef.current || !noiseBufferRef.current) return;
        
        // Only play occasionally to simulate crackling without overwhelming
        if (Math.random() > 0.15) return; 

        const ctx = audioCtxRef.current;
        const t = ctx.currentTime;
        
        const source = ctx.createBufferSource();
        source.buffer = noiseBufferRef.current;
        
        // Highpass for "hiss/click" sound
        const filter = ctx.createBiquadFilter();
        filter.type = 'highpass';
        filter.frequency.value = 5000;

        const gain = ctx.createGain();
        // Very short click/pop
        const volume = 0.02 + Math.random() * 0.03;
        gain.gain.setValueAtTime(volume, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        
        // Random start position in noise buffer to vary the sound
        const randomOffset = Math.random() * (noiseBufferRef.current.duration - 0.1);
        source.start(t, randomOffset, 0.1);
    };


    // --- Helper Functions ---

    // 1. Generate Points for the Text "2026"
    const generateTextPoints = () => {
      const offCanvas = document.createElement('canvas');
      offCanvas.width = dimensions.width;
      offCanvas.height = dimensions.height;
      const offCtx = offCanvas.getContext('2d');
      if (!offCtx) return [];

      offCtx.font = FONT;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillStyle = '#FFFFFF';
      offCtx.fillText(TEXT, dimensions.width / 2, dimensions.height / 2);

      const imageData = offCtx.getImageData(0, 0, dimensions.width, dimensions.height);
      const data = imageData.data;
      const points: Point[] = [];
      const density = 4; // Sample every n-th pixel (lower is more detailed but slower)

      for (let y = 0; y < dimensions.height; y += density) {
        for (let x = 0; x < dimensions.width; x += density) {
          const alpha = data[(y * dimensions.width + x) * 4 + 3];
          if (alpha > 128) {
            points.push({ x, y });
          }
        }
      }
      return points;
    };

    // 2. Sparkler Particle System
    const createSparklerParticle = (x: number, y: number): Particle => {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 1.5; // Slight burst
      return {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.0,
        maxLife: 1.0,
        color: `hsl(${30 + Math.random() * 30}, 100%, ${50 + Math.random() * 50}%)`, // Gold/Orange/White
        size: Math.random() * 2 + 0.5,
        alpha: 1,
        decay: Math.random() * 0.05 + 0.02
      };
    };

    // 3. Firework Logic
    const createFirework = (): Firework => {
      const x = Math.random() * dimensions.width;
      const startY = dimensions.height;
      const targetY = dimensions.height * 0.1 + Math.random() * (dimensions.height * 0.4);
      const hue = Math.random() * 360;
      
      return {
        x,
        y: startY,
        targetY,
        vx: (Math.random() - 0.5) * 4,
        vy: -(Math.random() * 3 + 12), // Initial upward velocity
        hue,
        particles: [],
        state: 'rising',
        trail: []
      };
    };

    const explodeFirework = (fw: Firework) => {
      // Audio Effect
      playExplosionSound();

      const particleCount = 80 + Math.random() * 50;
      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 1;
        const friction = 0.95;
        
        fw.particles.push({
          x: fw.x,
          y: fw.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: 1.0,
          maxLife: 1.0,
          color: `hsl(${fw.hue}, 100%, 60%)`,
          size: Math.random() * 3 + 1,
          alpha: 1,
          decay: Math.random() * 0.015 + 0.01
        });
      }
      fw.state = 'exploded';
    };

    // --- Init ---
    textPoints = generateTextPoints();

    // --- Animation Loop ---
    const render = () => {
      tick++;
      
      // 1. Clear Screen with Fade Effect (Trails)
      // Standard clear is fillRect with low opacity
      ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
      ctx.fillRect(0, 0, dimensions.width, dimensions.height);

      // 2. Handle Text Sparklers
      
      // Draw the base glow text first (faintly)
      ctx.save();
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(255, 160, 0, 0.5)';
      ctx.font = FONT;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = 'rgba(255, 200, 100, 0.05)'; // Very faint fill
      ctx.fillText(TEXT, dimensions.width / 2, dimensions.height / 2);
      ctx.restore();

      // Emit new sparks from text shape
      const emissionRate = 200; // Sparks per frame
      for (let i = 0; i < emissionRate; i++) {
        if (textPoints.length > 0) {
          const randIndex = Math.floor(Math.random() * textPoints.length);
          const p = textPoints[randIndex];
          sparklerParticles.push(createSparklerParticle(p.x, p.y));
        }
      }

      // Audio: sparkler burning ambient sound
      if (textPoints.length > 0) {
        playSparkleCrackles();
      }

      // Update and Draw Sparkler Particles
      for (let i = sparklerParticles.length - 1; i >= 0; i--) {
        const p = sparklerParticles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.life -= p.decay;
        p.vy += 0.05; // Gravity

        if (p.life <= 0) {
          sparklerParticles.splice(i, 1);
          continue;
        }

        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = p.color;
        ctx.globalAlpha = p.life;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      // 3. Handle Background Fireworks
      // Randomly spawn fireworks
      if (Math.random() < 0.03) { // % chance per frame
        fireworks.push(createFirework());
      }

      for (let i = fireworks.length - 1; i >= 0; i--) {
        const fw = fireworks[i];
        
        if (fw.state === 'rising') {
          fw.x += fw.vx;
          fw.y += fw.vy;
          fw.vy += 0.2; // Gravity acting on rocket
          
          // Draw trail
          ctx.strokeStyle = `hsla(${fw.hue}, 100%, 50%, 0.5)`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(fw.x, fw.y);
          ctx.lineTo(fw.x - fw.vx * 3, fw.y - fw.vy * 3);
          ctx.stroke();

          if (fw.vy >= 0 || fw.y <= fw.targetY) {
            explodeFirework(fw);
          }
        } else if (fw.state === 'exploded') {
          // Update particles
          let aliveParticles = false;
          for (const p of fw.particles) {
            if (p.life > 0) {
              aliveParticles = true;
              p.x += p.vx;
              p.y += p.vy;
              p.vy += 0.05; // Gravity
              p.vx *= 0.96; // Friction
              p.vy *= 0.96;
              p.life -= p.decay;
              
              // Draw explosion particle
              ctx.fillStyle = p.color;
              ctx.globalAlpha = Math.max(0, p.life);
              ctx.beginPath();
              ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
              ctx.fill();
            }
          }
          if (!aliveParticles) {
            fw.state = 'dead';
          }
        }
        
        if (fw.state === 'dead') {
          fireworks.splice(i, 1);
        }
      }
      ctx.globalAlpha = 1;
      ctx.globalCompositeOperation = 'source-over';

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [dimensions]); // Don't include audioEnabled here to prevent canvas reset

  return (
    <canvas 
      ref={canvasRef} 
      className="block w-full h-full"
    />
  );
};

export default FireworksDisplay;