import { KeyRound, Lock, Mail, RefreshCw, Shield } from "lucide-react";
import { useEffect, useState } from "react";

// Generate a random recovery key like: BF-ABCD-1234-EFGH-5678
function generateRecoveryKey() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  return `BF-${seg()}-${seg()}-${seg()}-${seg()}`;
}

function simpleHash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h.toString(16);
}

type Screen = "loading" | "setup" | "pin_login" | "pw_login" | "unlocked" | "forgot_choice" | "recover_key" | "recover_otp" | "otp_sent" | "set_new_pw";

export function AdminPinGate({ children }: { children: React.ReactNode }) {
  const [screen, setScreen] = useState<Screen>("loading");
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPw, setConfirmPw] = useState("");
  const [email, setEmail] = useState("");
  const [recoveryInput, setRecoveryInput] = useState("");
  const [otpInput, setOtpInput] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPwConfirm, setNewPwConfirm] = useState("");
  const [generatedKey, setGeneratedKey] = useState("");
  const [err, setErr] = useState("");
  const [msg, setMsg] = useState("");
  const [loginMode, setLoginMode] = useState<"pin" | "password">("pin");

  useEffect(() => {
    const storedPin = localStorage.getItem("bf_admin_pin");
    const hasPw = !!localStorage.getItem("bf_admin_pw_hash");
    const lastUnlock = Number(localStorage.getItem("bf_admin_last_unlock") || "0");
    const TIMEOUT = 10 * 60 * 1000; // 10 minutes
    if (!storedPin && !hasPw) {
      setScreen("setup");
    } else if (Date.now() - lastUnlock < TIMEOUT) {
      setScreen("unlocked");
    } else {
      setScreen(hasPw ? "pw_login" : "pin_login");
      setLoginMode(hasPw ? "password" : "pin");
    }
  }, []);

  const unlock = () => {
    localStorage.setItem("bf_admin_last_unlock", Date.now().toString());
    setScreen("unlocked");
    setErr("");
  };

  // ===== Setup =====
  const handleSetup = () => {
    setErr("");
    if (!username.trim()) return setErr("Username zaroori hai");
    if (password.length < 6) return setErr("Password kam se kam 6 characters ka ho");
    if (password !== confirmPw) return setErr("Passwords match nahi kar rahe");
    if (pin.length > 0 && pin.length < 4) return setErr("PIN kam se kam 4 digits ka ho");

    const key = generateRecoveryKey();
    setGeneratedKey(key);

    localStorage.setItem("bf_admin_username", username);
    localStorage.setItem("bf_admin_pw_hash", simpleHash(password));
    localStorage.setItem("bf_admin_recovery_key", simpleHash(key));
    if (pin.length >= 4) {
      localStorage.setItem("bf_admin_pin", pin);
    }
    if (email.trim()) localStorage.setItem("bf_admin_email", email.trim());
    // Show the recovery key before unlocking
    setScreen("setup" as Screen);
    // show modal within setup state
    localStorage.setItem("bf_admin_last_unlock", Date.now().toString());
    setScreen("show_key" as Screen);
  };

  // ===== PIN Login =====
  const handlePinLogin = () => {
    const stored = localStorage.getItem("bf_admin_pin");
    if (pin === stored) { unlock(); }
    else { setErr("Galat PIN. Dobara try karo."); setPin(""); }
  };

  // ===== Password Login =====
  const handlePwLogin = () => {
    const storedUser = localStorage.getItem("bf_admin_username") || "";
    const storedHash = localStorage.getItem("bf_admin_pw_hash") || "";
    if (username.trim().toLowerCase() === storedUser.toLowerCase() && simpleHash(password) === storedHash) {
      unlock();
    } else {
      setErr("Galat username ya password.");
      setPassword("");
    }
  };

  // ===== Recovery Key =====
  const handleRecoveryKey = () => {
    const storedHash = localStorage.getItem("bf_admin_recovery_key") || "";
    if (simpleHash(recoveryInput.trim().toUpperCase()) === storedHash) {
      setScreen("set_new_pw");
      setErr("");
    } else {
      setErr("Recovery key galat hai. Dobara check karo.");
    }
  };

  // ===== OTP Send =====
  const handleSendOtp = async () => {
    const storedEmail = localStorage.getItem("bf_admin_email") || "";
    const emailToUse = email.trim() || storedEmail;
    if (!emailToUse) return setErr("Pehle apna email daalo");
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    localStorage.setItem("bf_admin_otp", simpleHash(otp));
    localStorage.setItem("bf_admin_otp_exp", (Date.now() + 10 * 60 * 1000).toString());

    try {
      const workerUrl = localStorage.getItem("bf_worker_url") || "https://brainforge-api.richard-brown-miami.workers.dev";
      const secret = localStorage.getItem("bf_worker_secret") || "";
      await fetch(`${workerUrl}/api/admin/send-otp`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-BrainForge-Secret": secret },
        body: JSON.stringify({ email: emailToUse, otp }),
      });
      setMsg(`OTP ${emailToUse} pe bheja gaya. 10 minute valid hai.`);
    } catch {
      setMsg(`Email send nahi ho saka. OTP testing ke liye console mein dikh raha hai.`);
      console.log("Admin OTP (testing only):", otp);
    }
    setScreen("otp_sent");
    setErr("");
  };

  // ===== OTP Verify =====
  const handleVerifyOtp = () => {
    const storedHash = localStorage.getItem("bf_admin_otp") || "";
    const exp = Number(localStorage.getItem("bf_admin_otp_exp") || "0");
    if (Date.now() > exp) return setErr("OTP expire ho gaya. Naya OTP maango.");
    if (simpleHash(otpInput.trim()) === storedHash) {
      setScreen("set_new_pw");
      setErr("");
    } else {
      setErr("Galat OTP. Dobara check karo.");
    }
  };

  // ===== Set New Password =====
  const handleSetNewPw = () => {
    if (newPw.length < 6) return setErr("Password kam se kam 6 characters");
    if (newPw !== newPwConfirm) return setErr("Passwords match nahi kar rahe");
    localStorage.setItem("bf_admin_pw_hash", simpleHash(newPw));
    localStorage.removeItem("bf_admin_otp");
    localStorage.removeItem("bf_admin_otp_exp");
    unlock();
  };

  if (screen === "loading") return null;
  if (screen === "unlocked") return <>{children}</>;

  const boxStyle = {
    background: "oklch(0.10 0.025 280)",
    borderColor: "oklch(0.30 0.15 280 / 0.5)",
  };
  const inputStyle = {
    background: "oklch(0.08 0.02 280)",
    border: "1px solid oklch(0.30 0.15 280 / 0.5)",
  };
  const btnStyle = { background: "oklch(0.55 0.25 280)" };
  const btnSecStyle = { background: "oklch(0.18 0.05 280)", border: "1px solid oklch(0.30 0.15 280 / 0.4)" };

  const Input = ({ value, onChange, placeholder, type = "text", onEnter }: {
    value: string; onChange: (v: string) => void; placeholder: string; type?: string; onEnter?: () => void;
  }) => (
    <input type={type} value={value}
      onChange={e => { onChange(e.target.value); setErr(""); }}
      onKeyDown={e => e.key === "Enter" && onEnter?.()}
      placeholder={placeholder}
      className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none transition-colors"
      style={inputStyle}
    />
  );

  const Btn = ({ onClick, children, disabled, secondary }: { onClick: () => void; children: React.ReactNode; disabled?: boolean; secondary?: boolean }) => (
    <button type="button" onClick={onClick} disabled={disabled}
      className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
      style={secondary ? btnSecStyle : btnStyle}>
      {children}
    </button>
  );

  // ===== SETUP SCREEN =====
  if (screen === "setup") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<Shield />} title="Admin Setup" subtitle="Pehli baar credentials set karo" />
          <div className="space-y-2.5">
            <Input value={username} onChange={setUsername} placeholder="Admin username" onEnter={() => {}} />
            <Input value={password} onChange={setPassword} placeholder="Password (6+ characters)" type="password" />
            <Input value={confirmPw} onChange={setConfirmPw} placeholder="Password confirm karo" type="password" />
            <Input value={email} onChange={setEmail} placeholder="Email (OTP recovery ke liye, optional)" />
            <div className="pt-1">
              <p className="text-[10px] text-muted-foreground mb-1.5">PIN (optional - quick access ke liye)</p>
              <input type="password" inputMode="numeric" value={pin}
                onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }}
                placeholder="4-6 digit PIN (optional)"
                maxLength={6}
                className="w-full rounded-lg px-3 py-2.5 text-center text-xl tracking-[0.4em] text-foreground focus:outline-none"
                style={inputStyle}
              />
              {pin.length > 0 && pin.length < 4 && <p className="text-[10px] text-amber-400 mt-1">PIN kam se kam 4 digits ka hona chahiye</p>}
              {pin.length >= 4 && (
                <input type="password" inputMode="numeric" value={confirmPin}
                  onChange={e => { setConfirmPin(e.target.value.replace(/\D/g, "")); setErr(""); }}
                  placeholder="PIN confirm karo"
                  maxLength={6}
                  className="w-full rounded-lg px-3 py-2.5 text-center text-xl tracking-[0.4em] text-foreground focus:outline-none mt-2"
                  style={inputStyle}
                />
              )}
            </div>
          </div>
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
          <Btn onClick={handleSetup} disabled={!username || password.length < 6 || password !== confirmPw || (pin.length > 0 && (pin.length < 4 || pin !== confirmPin))}>
            Setup Karo & Andar Jao
          </Btn>
        </Box>
      </Overlay>
    );
  }

  // ===== SHOW RECOVERY KEY =====
  if ((screen as string) === "show_key") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<KeyRound />} title="Recovery Key Save Karo!" subtitle="Yeh key sirf ek baar dikhegi" />
          <div className="rounded-xl p-4 text-center" style={{ background: "oklch(0.55 0.25 280 / 0.1)", border: "1px solid oklch(0.55 0.25 280 / 0.3)" }}>
            <p className="font-mono text-lg font-bold tracking-wider" style={{ color: "oklch(0.80 0.25 280)" }}>{generatedKey}</p>
          </div>
          <div className="rounded-lg p-3 text-xs space-y-1" style={{ background: "oklch(0.15 0.05 40 / 0.3)", border: "1px solid oklch(0.50 0.15 40 / 0.3)" }}>
            <p className="text-amber-300 font-semibold">⚠️ Zaroori:</p>
            <p className="text-muted-foreground">Yeh key screenshot ya notepad mein save karo. Agar password bhool gaye toh isi se reset hoga.</p>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={() => navigator.clipboard.writeText(generatedKey).catch(() => {})}
              className="flex-1 py-2 rounded-lg text-xs font-medium transition-all" style={btnSecStyle}>
              📋 Copy Key
            </button>
            <button type="button" onClick={() => { setScreen("unlocked"); }}
              className="flex-1 py-2.5 rounded-xl text-white text-sm font-semibold" style={btnStyle}>
              Save Kiya ✓ Andar Jao
            </button>
          </div>
        </Box>
      </Overlay>
    );
  }

  // ===== PIN LOGIN =====
  if (screen === "pin_login") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<Lock />} title="Admin Access" subtitle="PIN enter karo" />
          <input type="password" inputMode="numeric" value={pin}
            onChange={e => { setPin(e.target.value.replace(/\D/g, "")); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && handlePinLogin()}
            placeholder="• • • •" maxLength={6}
            className="w-full rounded-lg px-3 py-2.5 text-center text-xl tracking-[0.4em] text-foreground focus:outline-none"
            style={inputStyle}
          />
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
          <Btn onClick={handlePinLogin} disabled={pin.length < 4}>Unlock Admin Panel</Btn>
          {localStorage.getItem("bf_admin_pw_hash") && (
            <button type="button" onClick={() => { setScreen("pw_login"); setPin(""); setErr(""); }}
              className="w-full text-xs text-center py-1" style={{ color: "oklch(0.65 0.25 280)" }}>
              Password se login karo →
            </button>
          )}
        </Box>
      </Overlay>
    );
  }

  // ===== PASSWORD LOGIN =====
  if (screen === "pw_login") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<Lock />} title="Admin Login" subtitle="Username aur password se login karo" />
          <div className="space-y-2.5">
            <Input value={username} onChange={setUsername} placeholder="Username" onEnter={() => {}} />
            <Input value={password} onChange={setPassword} placeholder="Password" type="password" onEnter={handlePwLogin} />
          </div>
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
          <Btn onClick={handlePwLogin} disabled={!username || !password}>Login Karo</Btn>
          <div className="flex flex-col gap-1.5">
            <button type="button" onClick={() => { setScreen("forgot_choice"); setErr(""); setUsername(""); setPassword(""); }}
              className="w-full text-xs text-center py-1" style={{ color: "oklch(0.65 0.25 280)" }}>
              Password bhool gaya? →
            </button>
            {localStorage.getItem("bf_admin_pin") && (
              <button type="button" onClick={() => { setScreen("pin_login"); setErr(""); setUsername(""); setPassword(""); }}
                className="w-full text-xs text-center py-1 text-muted-foreground">
                PIN se login karo →
              </button>
            )}
          </div>
        </Box>
      </Overlay>
    );
  }

  // ===== FORGOT CHOICE =====
  if (screen === "forgot_choice") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<RefreshCw />} title="Password Recovery" subtitle="Recovery ka tarika chunno" />
          <div className="space-y-3">
            <button type="button" onClick={() => { setScreen("recover_key"); setErr(""); }}
              className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ background: "oklch(0.55 0.25 280 / 0.1)", border: "1px solid oklch(0.55 0.25 280 / 0.3)" }}>
              <div className="flex items-start gap-3">
                <KeyRound className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "oklch(0.70 0.25 280)" }} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Recovery Key</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Setup ke waqt jo key mili thi woh use karo</p>
                </div>
              </div>
            </button>
            <button type="button" onClick={() => { setScreen("recover_otp"); setErr(""); }}
              className="w-full p-4 rounded-xl text-left transition-all hover:scale-[1.01]"
              style={{ background: "oklch(0.55 0.15 200 / 0.1)", border: "1px solid oklch(0.55 0.15 200 / 0.3)" }}>
              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "oklch(0.70 0.15 200)" }} />
                <div>
                  <p className="text-sm font-semibold text-foreground">Email OTP</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Email pe 6-digit OTP mangao</p>
                </div>
              </div>
            </button>
          </div>
          <button type="button" onClick={() => setScreen("pw_login")}
            className="w-full text-xs text-center py-1 text-muted-foreground">
            ← Wapas Login Pe
          </button>
        </Box>
      </Overlay>
    );
  }

  // ===== RECOVER VIA KEY =====
  if (screen === "recover_key") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<KeyRound />} title="Recovery Key" subtitle="BF-XXXX-XXXX-XXXX-XXXX format mein daalo" />
          <Input value={recoveryInput} onChange={v => setRecoveryInput(v.toUpperCase())}
            placeholder="BF-XXXX-XXXX-XXXX-XXXX" onEnter={handleRecoveryKey} />
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
          <Btn onClick={handleRecoveryKey} disabled={recoveryInput.length < 10}>Verify Key</Btn>
          <button type="button" onClick={() => setScreen("forgot_choice")}
            className="w-full text-xs text-center py-1 text-muted-foreground">← Wapas</button>
        </Box>
      </Overlay>
    );
  }

  // ===== RECOVER VIA OTP =====
  if (screen === "recover_otp") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<Mail />} title="Email OTP" subtitle="Apna admin email daalo" />
          <Input value={email} onChange={setEmail} placeholder="Admin email address" onEnter={handleSendOtp} />
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
          <Btn onClick={handleSendOtp} disabled={!email.includes("@")}>OTP Bhejo</Btn>
          <button type="button" onClick={() => setScreen("forgot_choice")}
            className="w-full text-xs text-center py-1 text-muted-foreground">← Wapas</button>
        </Box>
      </Overlay>
    );
  }

  // ===== OTP SENT =====
  if (screen === "otp_sent") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<Mail />} title="OTP Enter Karo" subtitle={msg || "Email check karo"} />
          <input type="text" inputMode="numeric" value={otpInput}
            onChange={e => { setOtpInput(e.target.value.replace(/\D/g, "")); setErr(""); }}
            onKeyDown={e => e.key === "Enter" && handleVerifyOtp()}
            placeholder="6-digit OTP" maxLength={6}
            className="w-full rounded-lg px-3 py-2.5 text-center text-2xl tracking-[0.5em] text-foreground focus:outline-none"
            style={inputStyle}
          />
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
          <Btn onClick={handleVerifyOtp} disabled={otpInput.length < 6}>Verify OTP</Btn>
          <button type="button" onClick={() => { setScreen("recover_otp"); setOtpInput(""); setErr(""); }}
            className="w-full text-xs text-center py-1 text-muted-foreground">← Dobara OTP Bhejo</button>
        </Box>
      </Overlay>
    );
  }

  // ===== SET NEW PASSWORD =====
  if (screen === "set_new_pw") {
    return (
      <Overlay>
        <Box style={boxStyle}>
          <Header icon={<Lock />} title="Naya Password" subtitle="Apna naya password set karo" />
          <div className="space-y-2.5">
            <Input value={newPw} onChange={setNewPw} placeholder="Naya password (6+ characters)" type="password" />
            <Input value={newPwConfirm} onChange={setNewPwConfirm} placeholder="Password confirm karo" type="password" onEnter={handleSetNewPw} />
          </div>
          {err && <p className="text-xs text-red-400 text-center">{err}</p>}
          <Btn onClick={handleSetNewPw} disabled={newPw.length < 6 || newPw !== newPwConfirm}>Password Save Karo</Btn>
        </Box>
      </Overlay>
    );
  }

  return null;
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" style={{ background: "oklch(0.06 0.025 280)" }}>
      {children}
    </div>
  );
}

function Box({ children, style }: { children: React.ReactNode; style: React.CSSProperties }) {
  return (
    <div className="w-80 p-7 rounded-2xl border space-y-4 shadow-2xl" style={style}>
      {children}
    </div>
  );
}

function Header({ icon, title, subtitle }: { icon: React.ReactNode; title: string; subtitle: string }) {
  return (
    <div className="text-center">
      <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
        style={{ background: "oklch(0.65 0.25 280 / 0.15)", border: "1px solid oklch(0.65 0.25 280 / 0.4)" }}>
        <span className="w-7 h-7 [&>svg]:w-full [&>svg]:h-full" style={{ color: "oklch(0.65 0.25 280)" }}>{icon}</span>
      </div>
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
    </div>
  );
}
