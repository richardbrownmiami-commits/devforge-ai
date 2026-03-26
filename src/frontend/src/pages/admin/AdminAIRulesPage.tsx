import { Save, Shield } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const RULES_KEY = "bf_global_ai_rules";

const DEFAULT_RULES = `# Global AI Rules
# Yeh rules sab projects ki AI follow karti hain.
# Admin yahan se control kar sakta hai.

- Hamesha Hinglish mein jawab do (Hindi + English mix)
- Pehle poochho, phir changes karo
- Code mein comments zaroor likho
- Chhoti steps mein kaam karo
- Koi bhi destructive change karne se pehle confirm karo
`;

export function AdminAIRulesPage() {
  const [rules, setRules] = useState(() => localStorage.getItem(RULES_KEY) || DEFAULT_RULES);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    localStorage.setItem(RULES_KEY, rules);
    setSaved(true);
    toast.success("Global AI Rules saved! Sab projects sync ho jayengi.");
    setTimeout(() => setSaved(false), 3000);
  };

  const cardStyle = { background: "oklch(0.10 0.025 280)", border: "1px solid oklch(0.20 0.08 280)" };

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-2xl">
      <div>
        <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
          <Shield className="w-5 h-5" style={{ color: "oklch(0.65 0.25 280)" }} />
          Global AI Rules
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Yeh rules sab projects ki AI automatically follow karti hain. Ek jagah change karo — sab sync.
        </p>
      </div>

      <div className="rounded-xl p-4 space-y-1" style={{ background: "oklch(0.55 0.25 280 / 0.08)", border: "1px solid oklch(0.55 0.25 280 / 0.25)" }}>
        <p className="text-xs font-medium" style={{ color: "oklch(0.75 0.25 280)" }}>⚡ Kaise Kaam Karta Hai</p>
        <p className="text-[10px] text-muted-foreground">
          Jab bhi koi user project AI se baat kare, yeh rules automatically system prompt mein add ho jaate hain.
          Project ki apni memory alag hoti hai — rules global hain.
        </p>
      </div>

      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid oklch(0.18 0.06 280)" }}>
          <p className="text-xs font-semibold text-foreground">Rules File</p>
          <span className="text-[10px] text-muted-foreground">{rules.length} chars</span>
        </div>
        <textarea
          value={rules}
          onChange={e => setRules(e.target.value)}
          rows={18}
          className="w-full px-4 py-3 text-xs font-mono text-foreground resize-none focus:outline-none"
          style={{ background: "oklch(0.08 0.02 280)" }}
          placeholder="Yahan rules likho..."
          spellCheck={false}
        />
      </div>

      <button type="button" onClick={handleSave}
        className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-all flex items-center justify-center gap-2"
        style={{ background: saved ? "oklch(0.50 0.20 160)" : "oklch(0.55 0.25 280)" }}>
        <Save className="w-4 h-4" />
        {saved ? "✓ Saved — Sab Projects Sync" : "Save Global Rules"}
      </button>
    </div>
  );
}
