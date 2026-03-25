import { useEffect, useRef } from "react";

interface MatrixOverlayProps {
  visible: boolean;
}

export function MatrixOverlay({ visible }: MatrixOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = 260;
    const H = 140;
    canvas.width = W;
    canvas.height = H;

    const fontSize = 11;
    const cols = Math.floor(W / fontSize);
    const drops: number[] = Array(cols).fill(1);
    const chars = "アイウエオカキクケコABCDEF0123456789!@#$%";

    function draw() {
      ctx!.fillStyle = "rgba(0,0,0,0.05)";
      ctx!.fillRect(0, 0, W, H);
      ctx!.fillStyle = "#00ff41";
      ctx!.font = `${fontSize}px monospace`;
      for (let i = 0; i < drops.length; i++) {
        const c = chars[Math.floor(Math.random() * chars.length)];
        ctx!.fillText(c, i * fontSize, drops[i] * fontSize);
        if (drops[i] * fontSize > H && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      animRef.current = requestAnimationFrame(draw);
    }

    animRef.current = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animRef.current);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed z-[200] flex flex-col overflow-hidden rounded-lg shadow-2xl"
      style={{
        bottom: "80px",
        right: "12px",
        width: "260px",
        height: "140px",
        background: "oklch(0.06 0 0)",
        border: "1px solid oklch(0.2 0.05 140 / 0.6)",
      }}
      data-ocid="matrix.overlay"
    >
      <canvas
        ref={canvasRef}
        style={{ width: "260px", height: "116px", display: "block" }}
      />
      <div
        className="flex items-center justify-center shrink-0"
        style={{ height: "24px", background: "oklch(0.06 0 0)" }}
      >
        <span
          className="text-[9px] font-mono tracking-widest animate-pulse"
          style={{ color: "#00ff41" }}
        >
          AI IS CODING...
        </span>
      </div>
    </div>
  );
}
