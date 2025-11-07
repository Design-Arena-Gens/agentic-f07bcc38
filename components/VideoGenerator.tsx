"use client";

import React, { useEffect, useRef, useState } from "react";

type GenerationState = "idle" | "recording" | "done" | "error";

const WIDTH = 1080; // vertical 1080x1920
const HEIGHT = 1920;
const DURATION_MS = 15000;

export default function VideoGenerator() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [recState, setRecState] = useState<GenerationState>("idle");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
  }, [blobUrl]);

  const start = async () => {
    try {
      setError(null);
      setBlobUrl(null);
      const canvas = canvasRef.current!;
      const stream = canvas.captureStream(30);
      const rec = new MediaRecorder(stream, {
        mimeType: getSupportedMimeType(),
        videoBitsPerSecond: 6_000_000
      });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        const url = URL.createObjectURL(blob);
        setBlobUrl(url);
        setRecState("done");
      };
      mediaRecorderRef.current = rec;
      setRecState("recording");
      rec.start();
      await playAnimation(canvas);
      rec.stop();
    } catch (e: any) {
      setError(e?.message ?? "Failed to generate video");
      setRecState("error");
    }
  };

  return (
    <div style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center",gap:12}}>
      <div className="canvasWrap" style={{width:360, height:640}}>
        <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} style={{ width: 360, height: 640, display:"block", background:"#fff7ed" }} />
      </div>

      <div className="controls">
        <button onClick={start} disabled={recState === "recording"}>
          {recState === "recording" ? "Generating 15s video..." : "Generate 15s Video"}
        </button>
        {blobUrl && (
          <a href={blobUrl} download={`gas-safety-video.webm`} className="badge">Download Video (WebM)</a>
        )}
      </div>

      <div className="small">Note: Recording runs entirely in your browser.</div>
      {error && <div style={{color:"crimson"}}>{error}</div>}
    </div>
  );
}

function getSupportedMimeType(): string {
  const candidates = [
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4;codecs=h264",
    "video/mp4"
  ];
  for (const type of candidates) {
    if (MediaRecorder.isTypeSupported(type)) return type;
  }
  return "video/webm";
}

async function playAnimation(canvas: HTMLCanvasElement): Promise<void> {
  const ctx = canvas.getContext("2d")!;
  const start = performance.now();
  const end = start + DURATION_MS;

  const palette = {
    bg: "#fff7ed", // warm peach
    primary: "#f97316", // orange
    secondary: "#fde68a", // soft yellow
    text: "#1f2937", // slate-800
    muted: "#6b7280", // gray-500
    ok: "#16a34a" // green-600
  } as const;

  const house = makeHouseIcon();
  const stove = makeStoveIcon();
  const device = makeDeviceIcon();
  const shield = makeShieldIcon();
  const whatsapp = makeWhatsAppIcon();

  const drawBackground = () => {
    // gradient
    const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad.addColorStop(0, "#fff1e6");
    grad.addColorStop(1, "#ffe4d0");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // soft vignette
    ctx.fillStyle = "rgba(0,0,0,0.05)";
    ctx.beginPath();
    ctx.roundRect(40, 40, canvas.width - 80, canvas.height - 80, 40);
    ctx.fill();
  };

  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  const ease = (t: number) => 1 - Math.pow(1 - t, 3);

  return new Promise<void>((resolve) => {
    const frame = () => {
      const now = performance.now();
      const t = Math.min(1, (now - start) / (end - start));
      const ms = (now - start);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawBackground();

      // Sections: 0-3 intro, 3-8 install, 8-12 prevent, 12-15 CTA
      if (ms < 3000) {
        // Intro
        drawHeader(ctx, "Gas Safety Device", palette.text, 84, 0.06);
        drawSub(ctx, "Safe, Reliable, Easy Installation", palette.primary, 44, 0.12);
        // House pulsating
        const scale = 1 + Math.sin(now / 400) * 0.03;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height * 0.42);
        ctx.scale(scale, scale);
        house(ctx, -200, -200, 400, 400, palette);
        ctx.restore();
      } else if (ms < 8000) {
        // Installation animation
        const local = (ms - 3000) / 5000; // 0..1
        drawHeader(ctx, "Easy Installation", palette.text, 74, 0.06);
        drawSub(ctx, "Fits seamlessly in your kitchen", palette.muted, 38, 0.115);

        // Draw stove on right
        ctx.save();
        ctx.translate(canvas.width * 0.65, canvas.height * 0.5);
        stove(ctx, -220, -220, 440, 440, palette);
        ctx.restore();

        // Device moves from left to stove
        const x = lerp(canvas.width * 0.2, canvas.width * 0.5, ease(Math.min(1, local)));
        const y = canvas.height * 0.55 + Math.sin(now / 250) * 6;
        ctx.save();
        ctx.translate(x, y);
        const s = 1 + (1 - local) * 0.15;
        ctx.scale(s, s);
        device(ctx, -130, -130, 260, 260, palette);
        // connector line
        ctx.strokeStyle = palette.primary;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(canvas.width * 0.15, 0);
        ctx.stroke();
        ctx.restore();
      } else if (ms < 12000) {
        // Prevention scene
        drawHeader(ctx, "Prevents Gas Leaks", palette.text, 78, 0.06);
        drawSub(ctx, "Protects your family from accidents", palette.muted, 40, 0.115);

        // Stove faint + shield overlay
        ctx.save();
        ctx.globalAlpha = 0.25;
        stove(ctx, canvas.width * 0.1, canvas.height * 0.3, 420, 420, palette);
        ctx.restore();

        // Shield pulse
        const pulse = 1 + Math.sin(now / 300) * 0.06;
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height * 0.55);
        ctx.scale(pulse, pulse);
        shield(ctx, -220, -220, 440, 440, palette);
        // checkmark
        ctx.strokeStyle = palette.ok;
        ctx.lineWidth = 26;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(-60, 20);
        ctx.lineTo(-10, 70);
        ctx.lineTo(90, -40);
        ctx.stroke();
        ctx.restore();

        // Tagline
        roundedTag(ctx, "Safe ? Reliable", canvas.width / 2, canvas.height * 0.82, palette.ok, palette);
      } else if (ms <= 15000) {
        // CTA
        drawHeader(ctx, "Order Now", palette.text, 86, 0.06);
        drawSub(ctx, "Cash on Delivery Available", palette.primary, 46, 0.115);

        // WhatsApp CTA button
        const bx = canvas.width / 2;
        const by = canvas.height * 0.6;
        ctaButton(ctx, whatsapp, bx, by, "Order via WhatsApp", palette);

        // Device big on top right
        device(ctx, canvas.width * 0.6, canvas.height * 0.28, 280, 280, palette);

        // subtle confetti
        drawConfetti(ctx, now, canvas);
      }

      if (now < end) requestAnimationFrame(frame); else resolve();
    };
    requestAnimationFrame(frame);
  });
}

function drawHeader(ctx: CanvasRenderingContext2D, text: string, color: string, size: number, yRel: number) {
  ctx.fillStyle = color;
  ctx.font = `800 ${size}px Inter, ui-sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, ctx.canvas.width / 2, ctx.canvas.height * yRel);
}

function drawSub(ctx: CanvasRenderingContext2D, text: string, color: string, size: number, yRel: number) {
  ctx.fillStyle = color;
  ctx.font = `600 ${size}px Inter, ui-sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, ctx.canvas.width / 2, ctx.canvas.height * yRel);
}

function roundedTag(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, color: string, palette: any) {
  ctx.save();
  const padX = 28, padY = 16;
  ctx.font = `700 44px Inter`;
  const m = ctx.measureText(text);
  const w = m.width + padX * 2;
  const h = 44 + padY * 2;
  ctx.fillStyle = "#ffffff";
  ctx.strokeStyle = color;
  ctx.lineWidth = 6;
  roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 30);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, x, y + 2);
  ctx.restore();
}

function ctaButton(
  ctx: CanvasRenderingContext2D,
  icon: (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, palette: any) => void,
  x: number,
  y: number,
  label: string,
  palette: any
) {
  ctx.save();
  const w = 760, h = 140;
  roundRectPath(ctx, x - w / 2, y - h / 2, w, h, 30);
  ctx.fillStyle = palette.primary;
  ctx.shadowColor = "rgba(0,0,0,.12)";
  ctx.shadowBlur = 30;
  ctx.fill();
  // icon
  icon(ctx, x - w / 2 + 36, y - 48, 96, 96, palette);
  ctx.fillStyle = "white";
  ctx.font = `800 58px Inter`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x + 80, y + 4);
  ctx.restore();
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  (ctx as any).beginPath();
  (ctx as any).roundRect(x, y, w, h, r);
}

// ICONS
function makeHouseIcon() {
  return (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, palette: any) => {
    ctx.save();
    // base
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 12;
    roundRectPath(ctx, x + w * 0.15, y + h * 0.45, w * 0.7, h * 0.45, 30);
    ctx.fill();
    ctx.stroke();
    // roof
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y + h * 0.05);
    ctx.lineTo(x + w * 0.1, y + h * 0.5);
    ctx.lineTo(x + w * 0.9, y + h * 0.5);
    ctx.closePath();
    ctx.fillStyle = palette.primary;
    ctx.fill();
    // door
    ctx.fillStyle = palette.secondary;
    roundRectPath(ctx, x + w * 0.45, y + h * 0.58, w * 0.1, h * 0.22, 12);
    ctx.fill();
    ctx.restore();
  };
}

function makeStoveIcon() {
  return (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, palette: any) => {
    ctx.save();
    // body
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = palette.text;
    ctx.lineWidth = 12;
    roundRectPath(ctx, x + w * 0.05, y + h * 0.15, w * 0.9, h * 0.75, 20);
    ctx.fill();
    ctx.stroke();
    // panel
    ctx.fillStyle = "#f3f4f6";
    roundRectPath(ctx, x + w * 0.08, y + h * 0.18, w * 0.84, h * 0.18, 16);
    ctx.fill();
    // knobs
    ctx.fillStyle = palette.primary;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.arc(x + w * (0.2 + i * 0.2), y + h * 0.27, 16, 0, Math.PI * 2);
      ctx.fill();
    }
    // burners
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.roundRect(x + w * 0.12, y + h * 0.42, w * 0.76, h * 0.18, 16);
    ctx.stroke();
    // oven window
    ctx.fillStyle = "#e5e7eb";
    roundRectPath(ctx, x + w * 0.15, y + h * 0.62, w * 0.7, h * 0.22, 16);
    ctx.fill();
    ctx.restore();
  };
}

function makeDeviceIcon() {
  return (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, palette: any) => {
    ctx.save();
    // body
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = palette.primary;
    ctx.lineWidth = 12;
    roundRectPath(ctx, x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.7, 40);
    ctx.fill();
    ctx.stroke();
    // grill
    ctx.strokeStyle = palette.muted;
    ctx.lineWidth = 8;
    for (let i = 0; i < 4; i++) {
      const gy = y + h * 0.35 + i * 26;
      ctx.beginPath();
      ctx.moveTo(x + w * 0.25, gy);
      ctx.lineTo(x + w * 0.75, gy);
      ctx.stroke();
    }
    // indicator led
    ctx.fillStyle = palette.ok;
    ctx.beginPath();
    ctx.arc(x + w * 0.5, y + h * 0.25, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };
}

function makeShieldIcon() {
  return (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, palette: any) => {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(x + w * 0.5, y);
    ctx.lineTo(x + w * 0.9, y + h * 0.25);
    ctx.lineTo(x + w * 0.8, y + h * 0.85);
    ctx.lineTo(x + w * 0.5, y + h);
    ctx.lineTo(x + w * 0.2, y + h * 0.85);
    ctx.lineTo(x + w * 0.1, y + h * 0.25);
    ctx.closePath();
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = palette.ok;
    ctx.lineWidth = 16;
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  };
}

function makeWhatsAppIcon() {
  return (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, palette: any) => {
    ctx.save();
    // bubble
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, Math.min(w, h) / 2, 0, Math.PI * 2);
    ctx.fillStyle = "#25D366";
    ctx.fill();
    // phone-like glyph
    ctx.strokeStyle = "white";
    ctx.lineWidth = 10;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x + w * 0.35, y + h * 0.45);
    ctx.quadraticCurveTo(x + w * 0.6, y + h * 0.35, x + w * 0.65, y + h * 0.6);
    ctx.stroke();
    ctx.restore();
  };
}

function drawConfetti(ctx: CanvasRenderingContext2D, now: number, canvas: HTMLCanvasElement) {
  const rng = (seed: number) => {
    const s = Math.sin(seed) * 10000;
    return s - Math.floor(s);
  };
  for (let i = 0; i < 80; i++) {
    const seed = i * 123.456 + now * 0.002;
    const x = rng(seed) * canvas.width;
    const y = (rng(seed + 1.23) * canvas.height * 0.6) + canvas.height * 0.2;
    const size = 6 + rng(seed + 2.34) * 14;
    const hue = 20 + rng(seed + 3.45) * 40;
    ctx.fillStyle = `hsl(${hue} 90% 60%)`;
    ctx.beginPath();
    ctx.roundRect(x, y, size, size * 0.5, 3);
    ctx.fill();
  }
}
