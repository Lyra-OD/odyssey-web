"use client";

import { useEffect, useRef } from "react";

import { LUEUR_VIDEO_SRC } from "@/src/components/contribute/SanctuaryLueurOrb";

const ORB_COUNT = 15; // Nombre d'âmes dans la maquette

class Orb {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  size: number;
  angle: number;
  phase: number;
  vx: number;
  vy: number;

  constructor(cw: number, ch: number) {
    this.baseX = Math.random() * cw;
    this.baseY = Math.random() * ch;
    this.x = this.baseX;
    this.y = this.baseY;
    // Tailles variées pour la profondeur (entre 80px et 250px)
    this.size = 80 + Math.random() * 170;
    this.angle = Math.random() * Math.PI * 2;
    this.phase = Math.random() * 100;
    this.vx = 0;
    this.vy = 0;
  }

  update(mouseX: number, mouseY: number) {
    // 1. Dérive organique (flottaison)
    this.phase += 0.01;
    const driftX = Math.cos(this.phase) * 0.5;
    const driftY = Math.sin(this.phase) * 0.5;

    // 2. Répulsion magnétique de la souris
    const dx = mouseX - this.x;
    const dy = mouseY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const interactionRadius = 250;

    if (dist > 0 && dist < interactionRadius) {
      const force = (interactionRadius - dist) / interactionRadius;
      this.vx -= (dx / dist) * force * 1.5;
      this.vy -= (dy / dist) * force * 1.5;
    }

    // 3. Retour élastique vers le point d'ancrage
    this.vx += (this.baseX - this.x) * 0.02;
    this.vy += (this.baseY - this.y) * 0.02;

    // 4. Friction pour adoucir le mouvement
    this.vx *= 0.9;
    this.vy *= 0.9;

    this.x += this.vx + driftX;
    this.y += this.vy + driftY;

    // Rotation très lente sur soi-même
    this.angle += 0.002;
  }

  draw(ctx: CanvasRenderingContext2D, video: HTMLVideoElement) {
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);
    // screen : additionne la lumière sur fond noir (color-dodge → noir)
    ctx.globalCompositeOperation = "screen";
    ctx.drawImage(video, -this.size / 2, -this.size / 2, this.size, this.size);
    ctx.restore();
  }
}

export function SanctuaryCanvasSky() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const video = videoRef.current;
    if (!canvas || !video) return;

    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    let animationFrameId = 0;
    let orbs: Orb[] = [];
    let mouse = { x: -1000, y: -1000 };

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      // Régénérer les orbes à la bonne taille
      orbs = Array.from(
        { length: ORB_COUNT },
        () => new Orb(canvas.width, canvas.height),
      );
    };

    const onMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouse.x = e.clientX - rect.left;
      mouse.y = e.clientY - rect.top;
    };

    const onLeave = () => {
      mouse = { x: -1000, y: -1000 };
    };

    const render = () => {
      // Effacer avec un noir pur pour le mode color-dodge
      ctx.fillStyle = "#000000";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Ne dessiner que si la vidéo est prête et en lecture
      if (video.readyState >= 2) {
        orbs.forEach((orb) => {
          orb.update(mouse.x, mouse.y);
          orb.draw(ctx, video);
        });
      }
      animationFrameId = requestAnimationFrame(render);
    };

    window.addEventListener("resize", resize);
    canvas.addEventListener("mousemove", onMove);
    canvas.addEventListener("mouseleave", onLeave);

    // Lancer la lecture de la vidéo cachée
    void video.play().catch(() => {});

    resize();
    render();

    return () => {
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("mousemove", onMove);
      canvas.removeEventListener("mouseleave", onLeave);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <section className="relative h-screen w-full overflow-hidden bg-black">
      {/* Vidéo source invisible qui sert de texture */}
      <video
        ref={videoRef}
        src={LUEUR_VIDEO_SRC}
        loop
        muted
        playsInline
        crossOrigin="anonymous"
        className="pointer-events-none absolute h-px w-px opacity-0"
      />

      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full cursor-crosshair"
        aria-label="Ciel de lueurs interactif"
      />

      <div className="pointer-events-none absolute bottom-8 left-0 right-0 text-center">
        <p className="text-sm font-light uppercase tracking-widest text-teal-50/30">
          Le ciel se remplit
        </p>
      </div>
    </section>
  );
}
