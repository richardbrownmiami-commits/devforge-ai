import { useEffect, useRef } from "react";

interface MatrixOverlayProps {
  visible: boolean;
}

export function MatrixOverlay({ visible }: MatrixOverlayProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);

  useEffect(() => {
    if (!visible) {
      cancelAnimationFrame(rafRef.current);
      return;
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const cols = Math.floor(canvas.width / 16);
    const drops = Array(cols).fill(1);
    const chars = "01アイウエオカキクケコサシスセソタチツテトナニヌネノABCDEF";

    const draw = () => {
      ctx.fillStyle = "rgba(0,0,0,0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#00ff41";
      ctx.font = "14px monospace";

      for (let i = 0; i < drops.length; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        ctx.fillText(char, i * 16, drops[i] * 16);
        if (drops[i] * 16 > canvas.height && Math.random() > 0.975) drops[i] = 0;
        drops[i]++;
      }
      rafRef.current = requestAnimationFrame(draw);
    };
    draw();

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", resize);
    };
  }, [visible]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col items-center justify-center" style={{ background: "rgba(0,0,0,0.92)" }}>
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full opacity-60" />
      <div className="relative z-10 text-center space-y-3">
        <div className="flex gap-1.5 justify-center">
          {[0,1,2].map(i => (
            <span key={i} className="w-2 h-2 rounded-full bg-green-400 animate-pulse" style={{ animationDelay: `${i*0.2}s` }} />
          ))}
        </div>
        <p className="text-green-400 font-mono text-sm tracking-widest animate-pulse">AI IS WRITING CODE...</p>
        <p className="text-green-600 font-mono text-xs">Please wait</p>
      </div>
    </div>
  );
}
