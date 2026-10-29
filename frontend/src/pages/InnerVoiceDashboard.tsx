import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { requireSignIn } from "@/lib/authedFetch";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { ACTIONS, MAX_POINTS, computeDailyScore, pointsFor, localDateKey, recentAverage, scoreMessage, type ScoreEntry } from "@/lib/karmaScore";



const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
.ivd-app{min-height:100vh;background:#FBF5EC;color:#301607;font-family:'DM Sans', system-ui, sans-serif;overflow-x:hidden;position:relative;}
.ivd-wrap{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:80px 28px 100px;}

.ivd-back{display:inline-flex;align-items:center;gap:7px;font-family:'DM Sans', system-ui, sans-serif;font-size:11px;letter-spacing:3px;color:#592209;text-transform:uppercase;text-decoration:none;margin-bottom:32px;transition:color .3s;}
.ivd-back:hover{color:#592209;}
.ivd-hdr{text-align:center;margin-bottom:44px;}
.ivd-eyebrow{font-family:'DM Sans', system-ui, sans-serif;font-size:11px;letter-spacing:5px;color:#592209;text-transform:uppercase;margin-bottom:14px;}
.ivd-title{font-family:'DM Sans', system-ui, sans-serif;font-size:clamp(30px,5vw,48px);color:#592209;text-shadow:0 0 40px rgba(89,34,9,.3);margin-bottom:10px;}
.ivd-sub{color:rgba(48,22,7,0.83);font-style:italic;font-size:19px;line-height:1.7;}

/* Setup form */
.ivd-setup{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:24px;padding:36px;margin-bottom:32px;}
.ivd-setup-title{font-family:'DM Sans', system-ui, sans-serif;font-size:22px;color:#592209;margin-bottom:8px;}
.ivd-setup-sub{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:2px;color:#301607;text-transform:uppercase;margin-bottom:28px;}
.ivd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
@media(max-width:540px){.ivd-grid2{grid-template-columns:1fr;}}
.ivd-field label{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:2px;color:rgba(48,22,7,0.72);text-transform:uppercase;display:block;margin-bottom:9px;}
.ivd-input{width:100%;background:rgba(89,34,9,0.05);border:1px solid rgba(89,34,9,0.1);border-radius:12px;padding:13px 16px;color:#301607;font-family:'DM Sans', system-ui, sans-serif;font-size:19px;outline:none;transition:border .3s;}
.ivd-input:focus{border-color:rgba(89,34,9,.5);}
.ivd-select{width:100%;background:#FBF5EC;border:1px solid rgba(89,34,9,0.1);border-radius:12px;padding:13px 16px;color:#301607;font-family:'DM Sans', system-ui, sans-serif;font-size:19px;outline:none;cursor:pointer;}
.ivd-select option{background:#FBF5EC;}
.ivd-setup-btn{width:100%;background:#592209;color:#F5E9D6;border:none;border-radius:13px;padding:17px;font-family:'DM Sans', system-ui, sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;font-weight:700;transition:all .3s;margin-top:8px;}
.ivd-setup-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(89,34,9,.38);}
.ivd-setup-btn:disabled{opacity:.55;cursor:not-allowed;}

/* Score ring */
.ivd-score-section{display:flex;align-items:center;justify-content:center;gap:44px;flex-wrap:wrap;margin-bottom:36px;}
.ivd-ring-wrap{position:relative;width:168px;height:168px;flex-shrink:0;}
.ivd-ring-svg{width:168px;height:168px;transform:rotate(-90deg);}
.ivd-ring-bg{fill:none;stroke:rgba(89,34,9,0.05);stroke-width:10;}
.ivd-ring-fill{fill:none;stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset 1.2s ease;}
.ivd-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ivd-ring-num{font-family:'DM Sans', system-ui, sans-serif;font-size:40px;color:#592209;line-height:1;}
.ivd-ring-den{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:2px;color:rgba(48,22,7,0.72);margin-top:5px;}
.ivd-score-meta{max-width:300px;}
.ivd-score-name{font-family:'DM Sans', system-ui, sans-serif;font-size:18px;color:#301607;margin-bottom:8px;}
.ivd-score-msg{font-size:18px;line-height:1.78;color:rgba(48,22,7,0.97);font-style:italic;}
.ivd-score-dasha{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;color:#592209;margin-top:10px;letter-spacing:1px;line-height:1.6;}

/* Breakdown */
.ivd-breakdown{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
@media(max-width:540px){.ivd-breakdown{grid-template-columns:1fr 1fr;}}
.ivd-bk{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:16px;padding:18px;text-align:center;}
.ivd-bk-icon{font-size:24px;margin-bottom:8px;}
.ivd-bk-val{font-family:'DM Sans', system-ui, sans-serif;font-size:26px;margin-bottom:4px;}
.ivd-bk-lbl{font-family:'DM Sans', system-ui, sans-serif;font-size:9px;letter-spacing:2px;color:#301607;text-transform:uppercase;}

/* Actions card */
.ivd-actions-card{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:22px;padding:30px;margin-bottom:24px;}
.ivd-card-title{font-family:'DM Sans', system-ui, sans-serif;font-size:22px;color:#592209;margin-bottom:6px;}
.ivd-card-sub{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:2px;color:#301607;text-transform:uppercase;margin-bottom:22px;}
.ivd-actions-list{display:flex;flex-direction:column;gap:11px;}
.ivd-action-row{display:flex;align-items:center;gap:16px;padding:14px 18px;background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:14px;transition:border .3s;}
.ivd-action-row.done{border-color:rgba(89,34,9,.25);background:rgba(89,34,9,.04);}
.ivd-action-check{width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(89,34,9,0.3);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .3s;}
.ivd-action-check.done{background:#FBF5EC;border-color:#592209;color:#050510;font-size:13px;}
.ivd-action-check:not(.done):hover{border-color:rgba(89,34,9,.55);}
.ivd-action-name{flex:1;font-size:18px;color:rgba(48,22,7,1);}
.ivd-action-row.done .ivd-action-name{color:#301607;text-decoration:line-through;}
.ivd-action-pts{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;color:#592209;}
.ivd-action-type{font-family:'DM Sans', system-ui, sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;border-radius:50px;padding:3px 11px;flex-shrink:0;}
.at-mantra{background:rgba(89,34,9,.12);border:1px solid rgba(89,34,9,.3);color:#592209;}
.at-pooja{background:rgba(89,34,9,.1);border:1px solid rgba(89,34,9,.25);color:#592209;}
.at-charity{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.22);color:#592209;}
.at-fast{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.22);color:#6B4A37;}
.at-seva{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.22);color:#592209;}
.ivd-save-btn{width:100%;background:#592209;color:#F5E9D6;border:none;border-radius:13px;padding:16px;font-family:'DM Sans', system-ui, sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;font-weight:700;transition:all .3s;margin-top:18px;}
.ivd-save-btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(89,34,9,.38);}
.ivd-saved{text-align:center;font-family:'DM Sans', system-ui, sans-serif;font-size:10px;letter-spacing:2px;color:#592209;margin-top:10px;}

/* Transit */
.ivd-transit{background:rgba(89,34,9,.04);border:1px solid rgba(89,34,9,.18);border-radius:20px;padding:26px;margin-bottom:24px;}
.ivd-transit-title{font-family:'DM Sans', system-ui, sans-serif;font-size:11px;letter-spacing:3px;color:#592209;text-transform:uppercase;margin-bottom:16px;}
.ivd-t-row{display:flex;gap:14px;align-items:flex-start;padding:11px 0;border-bottom:1px solid rgba(89,34,9,0.2);}
.ivd-t-row:last-child{border-bottom:none;}
.ivd-t-icon{font-size:20px;flex-shrink:0;margin-top:2px;}
.ivd-t-text{flex:1;font-size:17px;color:rgba(48,22,7,1);line-height:1.62;}
.ivd-t-text strong{color:#301607;}
.ivd-t-tip{font-size:15px;color:#301607;margin-top:4px;}
.ivd-t-impact{font-family:'DM Sans', system-ui, sans-serif;font-size:9px;letter-spacing:2px;border-radius:50px;padding:3px 11px;flex-shrink:0;}
.ti-pos{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.22);color:#592209;}
.ti-neg{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.22);color:#592209;}
.ti-neu{background:rgba(89,34,9,.08);border:1px solid rgba(89,34,9,.2);color:#592209;}

/* Charts */
.ivd-chart{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:20px;padding:26px;margin-bottom:24px;}
.recharts-polar-angle-axis-tick-value{font-family:'DM Sans', system-ui, sans-serif;font-size:11px;fill:rgba(89,34,9,0.1);}

/* History */
.ivd-history{background:rgba(89,34,9,0.2);border:1px solid rgba(89,34,9,0.2);border-radius:20px;padding:26px;}
.ivd-h-row{display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid rgba(89,34,9,0.2);}
.ivd-h-row:last-child{border-bottom:none;}
.ivd-h-date{font-family:'DM Sans', system-ui, sans-serif;font-size:10px;color:#301607;min-width:70px;}
.ivd-h-bar{flex:1;height:5px;background:rgba(89,34,9,0.2);border-radius:3px;}
.ivd-h-fill{height:100%;border-radius:3px;background:#F5E9D6;}
.ivd-h-score{font-family:'DM Sans', system-ui, sans-serif;font-size:20px;color:#592209;min-width:50px;text-align:right;}
.ivd-h-acts{font-family:'DM Sans', system-ui, sans-serif;font-size:9px;color:#592209;text-align:right;}
.ivd-empty{text-align:center;color:rgba(48,22,7,0.72);font-style:italic;font-size:18px;padding:22px 0;}

/* Loading */
.ivd-loader-wrap{display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:18px;}
.ivd-spin{width:52px;height:52px;border:2px solid rgba(89,34,9,.15);border-top-color:#592209;border-radius:50%;animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.ivd-ltxt{font-family:'DM Sans', system-ui, sans-serif;font-size:11px;letter-spacing:3px;color:#592209;text-transform:uppercase;}
`;

const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAKSHATRA = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const DASHAS = ["Sun Dasha","Moon Dasha","Mars Dasha","Rahu Dasha","Jupiter Dasha","Saturn Dasha","Mercury Dasha","Ketu Dasha","Venus Dasha"];

function StarCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W=window.innerWidth, H=window.innerHeight; canvas.width=W; canvas.height=H;
    const stars = Array.from({length:180},()=>({ x:Math.random()*W, y:Math.random()*H, r:Math.random()*1.4+0.2, opacity:Math.random()*0.5+0.1, speed:Math.random()*0.001+0.0005, phase:Math.random()*Math.PI*2 }));
    const shoots=[]; const spawnShoot=()=>shoots.push({ x:Math.random()*W*0.8, y:Math.random()*H*0.4, len:Math.random()*160+80, speed:Math.random()*3+2, angle:Math.PI/5+Math.random()*0.3, life:1 });
    let t=0,shootTimer=0,raf;
    const frame=()=>{ ctx.clearRect(0,0,W,H); t+=0.016; shootTimer+=0.016;
      if(shootTimer>3.5+Math.random()*3){spawnShoot();shootTimer=0;}
      stars.forEach(s=>{ const op=s.opacity*(0.6+0.4*Math.sin(t*s.speed*60+s.phase)); ctx.beginPath(); ctx.arc(s.x,s.y,s.r,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${op})`; ctx.fill(); });
      for(let i=shoots.length-1;i>=0;i--){ const s=shoots[i]; s.x+=Math.cos(s.angle)*s.speed; s.y+=Math.sin(s.angle)*s.speed; s.life-=0.008; if(s.life<=0){shoots.splice(i,1);continue;} const tx=s.x-Math.cos(s.angle)*s.len,ty=s.y-Math.sin(s.angle)*s.len; const g=ctx.createLinearGradient(tx,ty,s.x,s.y); g.addColorStop(0,`rgba(89,34,9,0)`); g.addColorStop(0.6,`rgba(89,34,9,${s.life*0.5})`); g.addColorStop(1,`rgba(255,255,255,${s.life*0.9})`); ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(s.x,s.y); ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(s.x,s.y,2.5,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${s.life*0.8})`; ctx.fill(); }
      raf=requestAnimationFrame(frame); };
    raf=requestAnimationFrame(frame);
    const resize=()=>{W=window.innerWidth;H=window.innerHeight;canvas.width=W;canvas.height=H;};
    window.addEventListener("resize",resize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={canvasRef} style={{position:"fixed",inset:0,zIndex:0,pointerEvents:"none"}} />;
}

function ScoreRing({ score }) {
  const r=68, circ=2*Math.PI*r;
  const offset=circ-(score/100)*circ;
  const color=score>=70?"#592209":score>=50?"#592209":score>=30?"#D9895F":"#D9895F";
  return (
    <div className="ivd-ring-wrap">
      <svg className="ivd-ring-svg" viewBox="0 0 168 168">
        <circle className="ivd-ring-bg" cx="84" cy="84" r={r}/>
        <circle className="ivd-ring-fill" cx="84" cy="84" r={r} stroke={color} strokeDasharray={circ} strokeDashoffset={offset}/>
      </svg>
      <div className="ivd-ring-center">
        <div className="ivd-ring-num">{score}</div>
        <div className="ivd-ring-den">/ 100</div>
      </div>
    </div>
  );
}

export default function InnerVoiceDashboard() {
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const [profile, setProfile] = useState(()=>{ try{return JSON.parse(localStorage.getItem("iv_profile")||"null")}catch{return null} });
  const [form, setForm] = useState({name:"",dob:"",sign:"",nakshatra:"",dasha:""});
  const [history, setHistory] = useState<ScoreEntry[]>(()=>{ try{return JSON.parse(localStorage.getItem("iv_karma_v2")||"[]")}catch{return[]} });
  const [done, setDone] = useState<string[]>(()=>{ try{return JSON.parse(localStorage.getItem(`iv_done_${localDateKey()}`)||"[]")}catch{return[]} });
  const [saved, setSaved] = useState(false);

  useEffect(()=>{ const s=document.createElement("style"); s.textContent=CSS; document.head.appendChild(s); return()=>{ document.head.removeChild(s); }; },[]);

  const saveProfile=()=>{ if(!form.name.trim()) return; const p={...form,name:form.name.trim()}; try{localStorage.setItem("iv_profile",JSON.stringify(p));}catch{/* storage unavailable */} setProfile(p); };

  const toggleAction=(id:string)=>{ if(!requireSignIn()) return; const next=done.includes(id)?done.filter(d=>d!==id):[...done,id]; setDone(next); setSaved(false); try{localStorage.setItem(`iv_done_${localDateKey()}`,JSON.stringify(next));}catch{/* storage unavailable */} };

  const behaviorPts=pointsFor(done);
  const composite=computeDailyScore(done);
  const weekAvg=recentAverage(history,7);

  const saveToday=()=>{ if(!requireSignIn()) return; const entry={date:localDateKey(),composite,behaviorPts,actionsCompleted:done.length}; const updated=[entry,...history.filter(e=>e.date!==entry.date)].slice(0,60); setHistory(updated); try{localStorage.setItem("iv_karma_v2",JSON.stringify(updated));}catch{/* storage unavailable */} setSaved(true); setTimeout(()=>setSaved(false),2500); };

  const lineData=[...history].reverse().slice(-14).map(e=>({date:e.date.slice(5),score:e.composite}));

  if(!signedIn) return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap">
        <div className="ivd-hdr"><div className="ivd-eyebrow">Daily Karma Score</div><h1 className="ivd-title">Karma Score</h1><p className="ivd-sub">A simple daily score based on the mindful practices you complete. It is symbolic, meant to encourage consistency.</p></div>
        <div className="ivd-setup">
          <div className="ivd-setup-title">Sign in to track your score</div>
          <div className="ivd-setup-sub">Your practices and score history are personal, so they are kept for signed-in members only.</div>
          <button className="ivd-setup-btn" onClick={()=>requireSignIn()}>Sign in to continue →</button>
        </div>
      </div>
    </div>
  );

  if(!profile) return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap">
        <div className="ivd-hdr"><div className="ivd-eyebrow">One-time Setup</div><h1 className="ivd-title">Karma Score</h1><p className="ivd-sub">A simple daily score based on the mindful practices you complete. It is symbolic, meant to encourage consistency.</p></div>
        <div className="ivd-setup">
          <div className="ivd-setup-title">Your Profile</div>
          <div className="ivd-setup-sub">Only your name is needed. Other details are optional and are not used in the score.</div>
          <div className="ivd-grid2">
            <div className="ivd-field"><label>Your Name</label><input className="ivd-input" placeholder="Enter your name" maxLength={60} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="ivd-field"><label>Date of Birth (optional)</label><input className="ivd-input" type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))}/></div>
            <div className="ivd-field"><label>Sun Sign / Rashi (optional)</label><select className="ivd-select" value={form.sign} onChange={e=>setForm(f=>({...f,sign:e.target.value}))}><option value="">Select...</option>{ZODIAC.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div className="ivd-field"><label>Nakshatra (optional)</label><select className="ivd-select" value={form.nakshatra} onChange={e=>setForm(f=>({...f,nakshatra:e.target.value}))}><option value="">Select...</option>{NAKSHATRA.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
          </div>
          <button className="ivd-setup-btn" onClick={saveProfile} disabled={!form.name.trim()}>Start Tracking →</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap">
        <div className="ivd-hdr"><div className="ivd-eyebrow">Daily Karma Score</div><h1 className="ivd-title">Karma Score</h1><p className="ivd-sub">{profile.name}{profile.sign ? ` · ${profile.sign}`:""}</p></div>

        <div className="ivd-score-section">
          <ScoreRing score={composite}/>
          <div className="ivd-score-meta">
            <div className="ivd-score-name">Today's Practice Score</div>
            <div className="ivd-score-msg">{scoreMessage(composite,done.length)}</div>
            <div className="ivd-score-dasha">{behaviorPts} of {MAX_POINTS} points · {done.length} of {ACTIONS.length} practices</div>
          </div>
        </div>

        <div className="ivd-breakdown">
          <div className="ivd-bk"><div className="ivd-bk-icon">⚡</div><div className="ivd-bk-val" style={{color:"#592209"}}>{behaviorPts}</div><div className="ivd-bk-lbl">Points Today</div></div>
          <div className="ivd-bk"><div className="ivd-bk-icon">🗓</div><div className="ivd-bk-val" style={{color:"#592209"}}>{weekAvg===null?"–":weekAvg}</div><div className="ivd-bk-lbl">7-Day Average</div></div>
          <div className="ivd-bk"><div className="ivd-bk-icon">📿</div><div className="ivd-bk-val" style={{color:"#592209"}}>{history.length}</div><div className="ivd-bk-lbl">Days Saved</div></div>
        </div>

        <div className="ivd-actions-card">
          <div className="ivd-card-title">Today's Practices</div>
          <div className="ivd-card-sub">Tick what you have done today. Each practice carries the points shown.</div>
          <div className="ivd-actions-list">
            {ACTIONS.map(a=>(
              <div key={a.id} className={`ivd-action-row${done.includes(a.id)?" done":""}`}>
                <div role="checkbox" aria-checked={done.includes(a.id)} aria-label={a.name} tabIndex={0} className={`ivd-action-check${done.includes(a.id)?" done":""}`} onClick={()=>toggleAction(a.id)} onKeyDown={e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggleAction(a.id); } }}>{done.includes(a.id)?"✓":""}</div>
                <div className="ivd-action-name">{a.name}</div>
                <div className="ivd-action-pts">+{a.pts} pts</div>
                <span className={`ivd-action-type at-${a.type}`}>{a.type}</span>
              </div>
            ))}
          </div>
          <button className="ivd-save-btn" onClick={saveToday}>Save Today's Score</button>
          {saved && <div className="ivd-saved" role="status">✓ Saved — {composite}/100</div>}
        </div>

        <div className="ivd-transit">
          <div className="ivd-transit-title">How this score works</div>
          <div className="ivd-t-row"><div style={{flex:1}}>
            <div className="ivd-t-text">Score = points from the practices you tick ÷ {MAX_POINTS} total points × 100. It is a symbolic habit tracker, not a calculation from your birth chart or planetary positions, and it has no scientific or predictive meaning.</div>
            <div className="ivd-t-tip">↳ Reflect: which practice felt most meaningful today, and why?</div>
          </div></div>
        </div>

        {lineData.length>1 && (
          <div className="ivd-chart">
            <div className="ivd-card-title" style={{marginBottom:4}}>Trend</div>
            <div className="ivd-card-sub" style={{marginBottom:18}}>Your saved scores over the last 14 entries</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={lineData}>
                <XAxis dataKey="date" tick={{fill:"rgba(89,34,9,0.1)",fontSize:10,fontFamily:"'DM Sans', system-ui, sans-serif"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{fill:"rgba(89,34,9,0.1)",fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#FBF5EC",border:"1px solid rgba(89,34,9,.3)",borderRadius:12,fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:11}}/>
                <Line type="monotone" dataKey="score" stroke="#592209" strokeWidth={2} dot={{fill:"#592209",r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="ivd-history">
          <div className="ivd-card-title" style={{marginBottom:4}}>Score History</div>
          <div className="ivd-card-sub" style={{marginBottom:18}}>Your most recent saved days</div>
          {history.length===0 ? <div className="ivd-empty">No history yet. Tick today's practices and save your first score above.</div> :
            history.slice(0,15).map(e=>(
              <div key={e.date} className="ivd-h-row">
                <div className="ivd-h-date">{new Date(e.date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
                <div className="ivd-h-bar"><div className="ivd-h-fill" style={{width:`${e.composite}%`}}/></div>
                <div><div className="ivd-h-score">{e.composite}</div><div className="ivd-h-acts">{e.actionsCompleted ?? 0} practices</div></div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
