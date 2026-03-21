export interface Template {
  id: string;
  name: string;
  description: string;
  icon: string;
  code: string;
}

export const TEMPLATES: Template[] = [
  {
    id: "blank",
    name: "Blank",
    description: "Start from scratch",
    icon: "📄",
    code: "",
  },
  {
    id: "landing",
    name: "Landing Page",
    description: "Clean responsive landing page",
    icon: "🌐",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>My App</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #f1f1f1; }
nav { display: flex; justify-content: space-between; align-items: center; padding: 1.5rem 5%; border-bottom: 1px solid #222; }
.logo { font-weight: 700; font-size: 1.3rem; color: #4ade80; }
.nav-links a { color: #aaa; text-decoration: none; margin-left: 2rem; transition: color 0.2s; }
.nav-links a:hover { color: #fff; }
hero { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 80vh; text-align: center; padding: 4rem 2rem; }
h1 { font-size: clamp(2.5rem, 8vw, 5rem); font-weight: 800; line-height: 1.1; max-width: 800px; }
.gradient { background: linear-gradient(135deg, #4ade80, #22d3ee); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
p.sub { color: #888; font-size: 1.25rem; margin: 1.5rem 0 2.5rem; max-width: 600px; }
.cta { display: inline-block; background: #4ade80; color: #000; padding: 0.875rem 2.25rem; border-radius: 8px; font-weight: 700; font-size: 1rem; text-decoration: none; transition: transform 0.2s, opacity 0.2s; }
.cta:hover { opacity: 0.88; transform: translateY(-2px); }
.features { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1.5rem; padding: 4rem 5%; max-width: 1100px; margin: 0 auto; }
.feature { background: #111; border: 1px solid #222; border-radius: 12px; padding: 1.75rem; }
.feature-icon { font-size: 2rem; margin-bottom: 1rem; }
.feature h3 { font-size: 1.1rem; margin-bottom: 0.5rem; }
.feature p { color: #888; font-size: 0.9rem; line-height: 1.6; }
footer { text-align: center; padding: 3rem; color: #555; font-size: 0.875rem; border-top: 1px solid #1a1a1a; }
</style>
</head>
<body>
<nav>
  <div class="logo">MyApp</div>
  <div class="nav-links">
    <a href="#features">Features</a>
    <a href="#about">About</a>
    <a href="#contact">Contact</a>
  </div>
</nav>
<section style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:80vh;text-align:center;padding:4rem 2rem">
  <h1>Build <span class="gradient">Amazing Things</span> Faster</h1>
  <p class="sub">The all-in-one platform for building modern web apps with AI-powered assistance and instant deployment.</p>
  <a href="#" class="cta">Get Started Free</a>
</section>
<div class="features" id="features">
  <div class="feature"><div class="feature-icon">⚡</div><h3>Lightning Fast</h3><p>Build and deploy in seconds with optimized workflows and instant previews.</p></div>
  <div class="feature"><div class="feature-icon">🤖</div><h3>AI Powered</h3><p>Let AI handle the heavy lifting while you focus on your creative vision.</p></div>
  <div class="feature"><div class="feature-icon">🌐</div><h3>Global Deploy</h3><p>Deploy to edge networks worldwide for blazing fast load times everywhere.</p></div>
</div>
<footer>© 2026 MyApp. Built with ❤️ using BrainForge.</footer>
</body>
</html>`,
  },
  {
    id: "dashboard",
    name: "Dashboard",
    description: "Admin dashboard with charts",
    icon: "📊",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Dashboard</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #f1f1f1; display: flex; min-height: 100vh; }
aside { width: 220px; background: #111; border-right: 1px solid #222; padding: 1.5rem 0; display: flex; flex-direction: column; }
.sidebar-logo { padding: 0 1.5rem 1.5rem; font-weight: 700; font-size: 1.2rem; color: #4ade80; border-bottom: 1px solid #1f1f1f; }
.sidebar-nav { padding: 1rem 0; flex: 1; }
.nav-item { padding: 0.65rem 1.5rem; color: #888; cursor: pointer; transition: all 0.2s; border-left: 2px solid transparent; }
.nav-item.active, .nav-item:hover { color: #fff; border-left-color: #4ade80; background: #1a1a1a; }
main { flex: 1; overflow: auto; padding: 2rem; }
.top-bar { display: flex; justify-content: space-between; align-items: center; margin-bottom: 2rem; }
h1 { font-size: 1.5rem; font-weight: 600; }
.stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 1rem; margin-bottom: 2rem; }
.stat-card { background: #111; border: 1px solid #222; border-radius: 10px; padding: 1.25rem; }
.stat-label { color: #777; font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.05em; }
.stat-value { font-size: 2rem; font-weight: 700; margin: 0.5rem 0; }
.stat-change { font-size: 0.8rem; color: #4ade80; }
.charts { display: grid; grid-template-columns: 2fr 1fr; gap: 1rem; margin-bottom: 2rem; }
.chart-card { background: #111; border: 1px solid #222; border-radius: 10px; padding: 1.25rem; }
.chart-title { font-size: 0.9rem; font-weight: 600; margin-bottom: 1rem; }
.chart-placeholder { height: 180px; background: linear-gradient(135deg, #1a2a1a, #0a1a0a); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #444; }
.table-card { background: #111; border: 1px solid #222; border-radius: 10px; padding: 1.25rem; }
table { width: 100%; border-collapse: collapse; }
th { text-align: left; color: #666; font-size: 0.75rem; text-transform: uppercase; padding: 0.5rem 0.75rem; border-bottom: 1px solid #1f1f1f; }
td { padding: 0.75rem; color: #ccc; font-size: 0.875rem; border-bottom: 1px solid #1a1a1a; }
.badge { padding: 0.2rem 0.6rem; border-radius: 20px; font-size: 0.7rem; }
.badge-green { background: #1a2e1a; color: #4ade80; }
.badge-yellow { background: #2e2a1a; color: #fbbf24; }
.badge-red { background: #2e1a1a; color: #f87171; }
</style>
</head>
<body>
<aside>
  <div class="sidebar-logo">⚡ AdminPanel</div>
  <nav class="sidebar-nav">
    <div class="nav-item active">📊 Dashboard</div>
    <div class="nav-item">👥 Users</div>
    <div class="nav-item">📦 Products</div>
    <div class="nav-item">📝 Orders</div>
    <div class="nav-item">⚙️ Settings</div>
  </nav>
</aside>
<main>
  <div class="top-bar"><h1>Dashboard</h1><button style="background:#4ade80;color:#000;border:none;padding:0.5rem 1rem;border-radius:6px;cursor:pointer;font-weight:600">+ New Report</button></div>
  <div class="stats">
    <div class="stat-card"><div class="stat-label">Total Revenue</div><div class="stat-value">$48,295</div><div class="stat-change">↑ 12.5% this month</div></div>
    <div class="stat-card"><div class="stat-label">Active Users</div><div class="stat-value">3,842</div><div class="stat-change">↑ 8.2% this month</div></div>
    <div class="stat-card"><div class="stat-label">Orders</div><div class="stat-value">1,249</div><div class="stat-change">↑ 3.1% this month</div></div>
    <div class="stat-card"><div class="stat-label">Conversion</div><div class="stat-value">4.6%</div><div class="stat-change">↓ 0.5% this month</div></div>
  </div>
  <div class="charts">
    <div class="chart-card"><div class="chart-title">Revenue Overview</div><div class="chart-placeholder">📈 Chart visualization here</div></div>
    <div class="chart-card"><div class="chart-title">Traffic Sources</div><div class="chart-placeholder">🍩 Donut chart here</div></div>
  </div>
  <div class="table-card"><div class="chart-title">Recent Orders</div><table><thead><tr><th>Order</th><th>Customer</th><th>Amount</th><th>Status</th></tr></thead><tbody><tr><td>#1042</td><td>Alice Johnson</td><td>$234.00</td><td><span class="badge badge-green">Paid</span></td></tr><tr><td>#1041</td><td>Bob Smith</td><td>$89.50</td><td><span class="badge badge-yellow">Pending</span></td></tr><tr><td>#1040</td><td>Carol White</td><td>$512.00</td><td><span class="badge badge-green">Paid</span></td></tr><tr><td>#1039</td><td>Dave Brown</td><td>$67.25</td><td><span class="badge badge-red">Failed</span></td></tr></tbody></table></div>
</main>
</body>
</html>`,
  },
  {
    id: "game",
    name: "Game",
    description: "Simple canvas game starter",
    icon: "🎮",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Canvas Game</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { background: #000; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; font-family: system-ui, sans-serif; color: #fff; }
canvas { border: 2px solid #333; border-radius: 8px; }
#ui { margin-top: 1rem; display: flex; gap: 2rem; font-size: 1rem; color: #888; }
span { color: #4ade80; font-weight: 700; }
#instructions { margin-top: 0.5rem; font-size: 0.75rem; color: #555; }
</style>
</head>
<body>
<canvas id="game" width="480" height="320"></canvas>
<div id="ui">Score: <span id="score">0</span> &nbsp; Lives: <span id="lives">3</span></div>
<div id="instructions">Arrow keys or WASD to move &nbsp;|&nbsp; Collect green circles</div>
<script>
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let score = 0, lives = 3, gameOver = false;
const player = { x: 240, y: 160, r: 14, speed: 3, color: '#4ade80' };
const keys = {};
const items = [];
let itemTimer = 0;
function spawnItem() {
  items.push({ x: Math.random()*(canvas.width-40)+20, y: Math.random()*(canvas.height-40)+20, r: 10, color: '#22d3ee', collected: false });
}
for(let i=0;i<5;i++) spawnItem();
document.addEventListener('keydown', e => keys[e.key]=true);
document.addEventListener('keyup', e => keys[e.key]=false);
function dist(a,b){return Math.sqrt((a.x-b.x)**2+(a.y-b.y)**2);}
function update() {
  if(gameOver) return;
  if(keys['ArrowLeft']||keys['a']) player.x = Math.max(player.r, player.x - player.speed);
  if(keys['ArrowRight']||keys['d']) player.x = Math.min(canvas.width-player.r, player.x + player.speed);
  if(keys['ArrowUp']||keys['w']) player.y = Math.max(player.r, player.y - player.speed);
  if(keys['ArrowDown']||keys['s']) player.y = Math.min(canvas.height-player.r, player.y + player.speed);
  items.forEach(item => { if(!item.collected && dist(player,item) < player.r+item.r) { item.collected=true; score+=10; document.getElementById('score').textContent=score; } });
  const active = items.filter(i => !i.collected);
  if(active.length < 3) spawnItem();
}
function draw() {
  ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,canvas.width,canvas.height);
  ctx.strokeStyle='#1a1a1a'; ctx.lineWidth=1;
  for(let x=0;x<canvas.width;x+=40) { ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); ctx.stroke(); }
  for(let y=0;y<canvas.height;y+=40) { ctx.beginPath(); ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); ctx.stroke(); }
  items.forEach(item => { if(!item.collected) { ctx.beginPath(); ctx.arc(item.x,item.y,item.r,0,Math.PI*2); ctx.fillStyle=item.color+'44'; ctx.fill(); ctx.strokeStyle=item.color; ctx.lineWidth=2; ctx.stroke(); } });
  ctx.beginPath(); ctx.arc(player.x,player.y,player.r,0,Math.PI*2);
  ctx.fillStyle=player.color+'33'; ctx.fill();
  ctx.strokeStyle=player.color; ctx.lineWidth=2.5; ctx.stroke();
  if(gameOver) { ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(0,0,canvas.width,canvas.height); ctx.fillStyle='#fff'; ctx.font='bold 32px system-ui'; ctx.textAlign='center'; ctx.fillText('Game Over', canvas.width/2, canvas.height/2); ctx.font='16px system-ui'; ctx.fillStyle='#888'; ctx.fillText('Score: '+score, canvas.width/2, canvas.height/2+40); }
}
function loop() { update(); draw(); requestAnimationFrame(loop); }
loop();
</script>
</body>
</html>`,
  },
  {
    id: "chat",
    name: "Chat App",
    description: "Basic chat UI",
    icon: "💬",
    code: `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Chat App</title>
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #f1f1f1; height: 100vh; display: flex; }
.sidebar { width: 260px; background: #111; border-right: 1px solid #1f1f1f; display: flex; flex-direction: column; }
.sidebar-header { padding: 1.25rem; border-bottom: 1px solid #1f1f1f; display: flex; align-items: center; justify-content: space-between; }
.sidebar-title { font-weight: 700; color: #4ade80; }
.contact-list { flex: 1; overflow-y: auto; }
.contact { padding: 0.875rem 1.25rem; cursor: pointer; border-bottom: 1px solid #1a1a1a; transition: background 0.15s; display: flex; align-items: center; gap: 0.75rem; }
.contact:hover, .contact.active { background: #1a1a1a; }
.avatar { width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #4ade80, #22d3ee); display: flex; align-items: center; justify-content: center; font-weight: 700; color: #000; font-size: 0.875rem; flex-shrink: 0; }
.contact-info .name { font-size: 0.9rem; font-weight: 500; }
.contact-info .last-msg { font-size: 0.75rem; color: #666; margin-top: 2px; }
.chat-area { flex: 1; display: flex; flex-direction: column; }
.chat-header { padding: 1.25rem; border-bottom: 1px solid #1f1f1f; display: flex; align-items: center; gap: 0.75rem; background: #111; }
.messages { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
.msg { max-width: 60%; padding: 0.625rem 0.875rem; border-radius: 12px; font-size: 0.875rem; line-height: 1.5; }
.msg.received { background: #1a1a1a; border: 1px solid #252525; align-self: flex-start; border-bottom-left-radius: 4px; }
.msg.sent { background: #1a3025; border: 1px solid #2a4535; align-self: flex-end; border-bottom-right-radius: 4px; }
.msg .time { font-size: 0.65rem; color: #555; margin-top: 4px; }
.input-area { padding: 1rem 1.25rem; border-top: 1px solid #1f1f1f; background: #111; display: flex; gap: 0.75rem; }
.input-area input { flex: 1; background: #1a1a1a; border: 1px solid #252525; border-radius: 24px; padding: 0.625rem 1rem; color: #f1f1f1; font-size: 0.875rem; outline: none; }
.input-area input:focus { border-color: #4ade80; }
.send-btn { background: #4ade80; color: #000; border: none; border-radius: 50%; width: 38px; height: 38px; cursor: pointer; font-size: 1rem; flex-shrink: 0; transition: opacity 0.2s; }
.send-btn:hover { opacity: 0.85; }
</style>
</head>
<body>
<div class="sidebar">
  <div class="sidebar-header"><span class="sidebar-title">💬 Chats</span></div>
  <div class="contact-list">
    <div class="contact active"><div class="avatar">A</div><div class="contact-info"><div class="name">Alice Johnson</div><div class="last-msg">Sounds great! 👍</div></div></div>
    <div class="contact"><div class="avatar" style="background:linear-gradient(135deg,#f97316,#f59e0b)">B</div><div class="contact-info"><div class="name">Bob Smith</div><div class="last-msg">When is the meeting?</div></div></div>
    <div class="contact"><div class="avatar" style="background:linear-gradient(135deg,#8b5cf6,#6366f1)">C</div><div class="contact-info"><div class="name">Carol White</div><div class="last-msg">Just sent the files</div></div></div>
  </div>
</div>
<div class="chat-area">
  <div class="chat-header"><div class="avatar">A</div><div><div style="font-weight:600">Alice Johnson</div><div style="font-size:0.75rem;color:#4ade80">● Online</div></div></div>
  <div class="messages" id="msgs">
    <div class="msg received">Hey! How's the project coming along?<div class="time">10:24 AM</div></div>
    <div class="msg sent">Pretty good! Just finished the UI part.<div class="time">10:26 AM</div></div>
    <div class="msg received">That's awesome! Can I take a look?<div class="time">10:27 AM</div></div>
    <div class="msg sent">Of course, I'll share the link now.<div class="time">10:28 AM</div></div>
    <div class="msg received">Sounds great! 👍<div class="time">10:30 AM</div></div>
  </div>
  <div class="input-area">
    <input type="text" id="msgInput" placeholder="Type a message..." />
    <button class="send-btn" onclick="sendMsg()">➤</button>
  </div>
</div>
<script>
function sendMsg() {
  const inp = document.getElementById('msgInput');
  const val = inp.value.trim();
  if(!val) return;
  const msgs = document.getElementById('msgs');
  const now = new Date();
  const time = now.getHours()+':'+String(now.getMinutes()).padStart(2,'0')+' '+(now.getHours()>=12?'PM':'AM');
  const div = document.createElement('div');
  div.className='msg sent';
  div.innerHTML=val+'<div class="time">'+time+'</div>';
  msgs.appendChild(div);
  inp.value='';
  msgs.scrollTop=msgs.scrollHeight;
}
document.getElementById('msgInput').addEventListener('keydown',e=>e.key==='Enter'&&sendMsg());
</script>
</body>
</html>`,
  },
];
