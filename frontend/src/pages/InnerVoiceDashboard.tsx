import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";

const fl = document.createElement("link"); fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap";
if (!document.head.querySelector("link[href*='Cinzel']")) document.head.appendChild(fl);

const GROQ_API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_MODEL = import.meta.env.VITE_GROQ_MODEL || "openai/gpt-oss-120b";

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
.ivd-app{min-height:100vh;background:#050510;color:#fff;font-family:'Astra','Iceland',sans-serif;overflow-x:hidden;position:relative;}
.ivd-wrap{position:relative;z-index:1;max-width:1000px;margin:0 auto;padding:80px 28px 100px;}

.ivd-back{display:inline-flex;align-items:center;gap:7px;font-family:'Astra','Iceland',sans-serif;font-size:11px;letter-spacing:3px;color:rgba(188,106,77,.6);text-transform:uppercase;text-decoration:none;margin-bottom:32px;transition:color .3s;}
.ivd-back:hover{color:#BC6A4D;}
.ivd-hdr{text-align:center;margin-bottom:44px;}
.ivd-eyebrow{font-family:'Astra','Iceland',sans-serif;font-size:11px;letter-spacing:5px;color:#BC6A4D;text-transform:uppercase;margin-bottom:14px;}
.ivd-title{font-family:'Astra','Iceland',sans-serif;font-size:clamp(30px,5vw,48px);color:#BC6A4D;text-shadow:0 0 40px rgba(188,106,77,.3);margin-bottom:10px;}
.ivd-sub{color:rgba(255,255,255,.58);font-style:italic;font-size:19px;line-height:1.7;}

/* Setup form */
.ivd-setup{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:36px;margin-bottom:32px;}
.ivd-setup-title{font-family:'Astra','Iceland',sans-serif;font-size:22px;color:#BC6A4D;margin-bottom:8px;}
.ivd-setup-sub{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:28px;}
.ivd-grid2{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:16px;}
@media(max-width:540px){.ivd-grid2{grid-template-columns:1fr;}}
.ivd-field label{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;color:rgba(255,255,255,.45);text-transform:uppercase;display:block;margin-bottom:9px;}
.ivd-input{width:100%;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:13px 16px;color:#fff;font-family:'Astra','Iceland',sans-serif;font-size:19px;outline:none;transition:border .3s;}
.ivd-input:focus{border-color:rgba(188,106,77,.5);}
.ivd-select{width:100%;background:#0B1020;border:1px solid rgba(255,255,255,.12);border-radius:12px;padding:13px 16px;color:#fff;font-family:'Astra','Iceland',sans-serif;font-size:19px;outline:none;cursor:pointer;}
.ivd-select option{background:#0B1020;}
.ivd-setup-btn{width:100%;background:linear-gradient(135deg,#BC6A4D,#BC6A4D);color:#050510;border:none;border-radius:13px;padding:17px;font-family:'Astra','Iceland',sans-serif;font-size:12px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;font-weight:700;transition:all .3s;margin-top:8px;}
.ivd-setup-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 32px rgba(188,106,77,.38);}
.ivd-setup-btn:disabled{opacity:.38;cursor:not-allowed;}

/* Score ring */
.ivd-score-section{display:flex;align-items:center;justify-content:center;gap:44px;flex-wrap:wrap;margin-bottom:36px;}
.ivd-ring-wrap{position:relative;width:168px;height:168px;flex-shrink:0;}
.ivd-ring-svg{width:168px;height:168px;transform:rotate(-90deg);}
.ivd-ring-bg{fill:none;stroke:rgba(255,255,255,.07);stroke-width:10;}
.ivd-ring-fill{fill:none;stroke-width:10;stroke-linecap:round;transition:stroke-dashoffset 1.2s ease;}
.ivd-ring-center{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;}
.ivd-ring-num{font-family:'Astra','Iceland',sans-serif;font-size:40px;color:#BC6A4D;line-height:1;}
.ivd-ring-den{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;color:rgba(255,255,255,.38);margin-top:5px;}
.ivd-score-meta{max-width:300px;}
.ivd-score-name{font-family:'Astra','Iceland',sans-serif;font-size:18px;color:#fff;margin-bottom:8px;}
.ivd-score-msg{font-size:18px;line-height:1.78;color:rgba(255,255,255,.72);font-style:italic;}
.ivd-score-dasha{font-family:'Astra','Iceland',sans-serif;font-size:10px;color:rgba(188,106,77,.75);margin-top:10px;letter-spacing:1px;line-height:1.6;}

/* Breakdown */
.ivd-breakdown{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-bottom:24px;}
@media(max-width:540px){.ivd-breakdown{grid-template-columns:1fr 1fr;}}
.ivd-bk{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:18px;text-align:center;}
.ivd-bk-icon{font-size:24px;margin-bottom:8px;}
.ivd-bk-val{font-family:'Astra','Iceland',sans-serif;font-size:26px;margin-bottom:4px;}
.ivd-bk-lbl{font-family:'Astra','Iceland',sans-serif;font-size:9px;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase;}

/* Actions card */
.ivd-actions-card{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);border-radius:22px;padding:30px;margin-bottom:24px;}
.ivd-card-title{font-family:'Astra','Iceland',sans-serif;font-size:22px;color:#BC6A4D;margin-bottom:6px;}
.ivd-card-sub{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;color:rgba(255,255,255,.4);text-transform:uppercase;margin-bottom:22px;}
.ivd-actions-list{display:flex;flex-direction:column;gap:11px;}
.ivd-action-row{display:flex;align-items:center;gap:16px;padding:14px 18px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;transition:border .3s;}
.ivd-action-row.done{border-color:rgba(188,106,77,.25);background:rgba(188,106,77,.04);}
.ivd-action-check{width:26px;height:26px;border-radius:50%;border:1.5px solid rgba(255,255,255,.22);cursor:pointer;display:flex;align-items:center;justify-content:center;flex-shrink:0;transition:all .3s;}
.ivd-action-check.done{background:#BC6A4D;border-color:#BC6A4D;color:#050510;font-size:13px;}
.ivd-action-check:not(.done):hover{border-color:rgba(188,106,77,.55);}
.ivd-action-name{flex:1;font-size:18px;color:rgba(255,255,255,.88);}
.ivd-action-row.done .ivd-action-name{color:rgba(255,255,255,.38);text-decoration:line-through;}
.ivd-action-pts{font-family:'Astra','Iceland',sans-serif;font-size:10px;color:rgba(188,106,77,.75);}
.ivd-action-type{font-family:'Astra','Iceland',sans-serif;font-size:9px;letter-spacing:2px;text-transform:uppercase;border-radius:50px;padding:3px 11px;flex-shrink:0;}
.at-mantra{background:rgba(188,106,77,.12);border:1px solid rgba(188,106,77,.3);color:#BC6A4D;}
.at-pooja{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.25);color:#D9895F;}
.at-charity{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.22);color:#BC6A4D;}
.at-fast{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.22);color:#fda4af;}
.at-seva{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.22);color:#BC6A4D;}
.ivd-save-btn{width:100%;background:linear-gradient(135deg,#BC6A4D,#BC6A4D);color:#050510;border:none;border-radius:13px;padding:16px;font-family:'Astra','Iceland',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;font-weight:700;transition:all .3s;margin-top:18px;}
.ivd-save-btn:hover{transform:translateY(-2px);box-shadow:0 10px 30px rgba(188,106,77,.38);}
.ivd-saved{text-align:center;font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;color:#BC6A4D;margin-top:10px;}

/* Transit */
.ivd-transit{background:rgba(188,106,77,.04);border:1px solid rgba(188,106,77,.18);border-radius:20px;padding:26px;margin-bottom:24px;}
.ivd-transit-title{font-family:'Astra','Iceland',sans-serif;font-size:11px;letter-spacing:3px;color:#BC6A4D;text-transform:uppercase;margin-bottom:16px;}
.ivd-t-row{display:flex;gap:14px;align-items:flex-start;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.ivd-t-row:last-child{border-bottom:none;}
.ivd-t-icon{font-size:20px;flex-shrink:0;margin-top:2px;}
.ivd-t-text{flex:1;font-size:17px;color:rgba(255,255,255,.78);line-height:1.62;}
.ivd-t-text strong{color:#fff;}
.ivd-t-tip{font-size:15px;color:rgba(255,255,255,.48);margin-top:4px;}
.ivd-t-impact{font-family:'Astra','Iceland',sans-serif;font-size:9px;letter-spacing:2px;border-radius:50px;padding:3px 11px;flex-shrink:0;}
.ti-pos{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.22);color:#BC6A4D;}
.ti-neg{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.22);color:#D9895F;}
.ti-neu{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.2);color:#BC6A4D;}

/* Charts */
.ivd-chart{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:26px;margin-bottom:24px;}
.recharts-polar-angle-axis-tick-value{font-family:'Astra','Iceland',sans-serif;font-size:11px;fill:rgba(255,255,255,.55);}

/* History */
.ivd-history{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.08);border-radius:20px;padding:26px;}
.ivd-h-row{display:flex;align-items:center;gap:14px;padding:11px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.ivd-h-row:last-child{border-bottom:none;}
.ivd-h-date{font-family:'Astra','Iceland',sans-serif;font-size:10px;color:rgba(255,255,255,.38);min-width:70px;}
.ivd-h-bar{flex:1;height:5px;background:rgba(255,255,255,.07);border-radius:3px;}
.ivd-h-fill{height:100%;border-radius:3px;background:linear-gradient(90deg,#BC6A4D,#BC6A4D);}
.ivd-h-score{font-family:'Astra','Iceland',sans-serif;font-size:20px;color:#BC6A4D;min-width:50px;text-align:right;}
.ivd-h-acts{font-family:'Astra','Iceland',sans-serif;font-size:9px;color:rgba(188,106,77,.6);text-align:right;}
.ivd-empty{text-align:center;color:rgba(255,255,255,.35);font-style:italic;font-size:18px;padding:22px 0;}

/* Loading */
.ivd-loader-wrap{display:flex;align-items:center;justify-content:center;min-height:60vh;flex-direction:column;gap:18px;}
.ivd-spin{width:52px;height:52px;border:2px solid rgba(188,106,77,.15);border-top-color:#BC6A4D;border-radius:50%;animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.ivd-ltxt{font-family:'Astra','Iceland',sans-serif;font-size:11px;letter-spacing:3px;color:rgba(188,106,77,.65);text-transform:uppercase;}
`;

const ZODIAC = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
const NAKSHATRA = ["Ashwini","Bharani","Krittika","Rohini","Mrigashira","Ardra","Punarvasu","Pushya","Ashlesha","Magha","Purva Phalguni","Uttara Phalguni","Hasta","Chitra","Swati","Vishakha","Anuradha","Jyeshtha","Mula","Purva Ashadha","Uttara Ashadha","Shravana","Dhanishtha","Shatabhisha","Purva Bhadrapada","Uttara Bhadrapada","Revati"];
const DASHAS = ["Sun Dasha","Moon Dasha","Mars Dasha","Rahu Dasha","Jupiter Dasha","Saturn Dasha","Mercury Dasha","Ketu Dasha","Venus Dasha"];
const ACTIONS = [
  { id:"mantra", name:"Chant today's prescribed mantra", pts:8, type:"mantra" },
  { id:"meditation", name:"15 minutes of morning meditation", pts:5, type:"seva" },
  { id:"truth", name:"Speak only truth today (Satya)", pts:6, type:"seva" },
  { id:"feed", name:"Feed a cow, dog, or needy person", pts:10, type:"charity" },
  { id:"fast", name:"Keep today's vrat (if applicable)", pts:12, type:"fast" },
  { id:"pooja", name:"Perform morning pooja / aarti", pts:9, type:"pooja" },
  { id:"anger", name:"Did not lose temper today", pts:7, type:"seva" },
  { id:"charity", name:"Made a charitable donation or seva", pts:11, type:"charity" },
];

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
      for(let i=shoots.length-1;i>=0;i--){ const s=shoots[i]; s.x+=Math.cos(s.angle)*s.speed; s.y+=Math.sin(s.angle)*s.speed; s.life-=0.008; if(s.life<=0){shoots.splice(i,1);continue;} const tx=s.x-Math.cos(s.angle)*s.len,ty=s.y-Math.sin(s.angle)*s.len; const g=ctx.createLinearGradient(tx,ty,s.x,s.y); g.addColorStop(0,`rgba(188,106,77,0)`); g.addColorStop(0.6,`rgba(188,106,77,${s.life*0.5})`); g.addColorStop(1,`rgba(255,255,255,${s.life*0.9})`); ctx.beginPath(); ctx.moveTo(tx,ty); ctx.lineTo(s.x,s.y); ctx.strokeStyle=g; ctx.lineWidth=1.5; ctx.stroke(); ctx.beginPath(); ctx.arc(s.x,s.y,2.5,0,Math.PI*2); ctx.fillStyle=`rgba(255,255,255,${s.life*0.8})`; ctx.fill(); }
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
  const color=score>=70?"#BC6A4D":score>=50?"#BC6A4D":score>=30?"#D9895F":"#D9895F";
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
  const [profile, setProfile] = useState(()=>{ try{return JSON.parse(localStorage.getItem("iv_profile")||"null")}catch{return null} });
  const [form, setForm] = useState({name:"",dob:"",sign:"",nakshatra:"",dasha:""});
  const [history, setHistory] = useState(()=>{ try{return JSON.parse(localStorage.getItem("iv_karma_v2")||"[]")}catch{return[]} });
  const [done, setDone] = useState(()=>{ const today=new Date().toISOString().slice(0,10); try{return JSON.parse(localStorage.getItem(`iv_done_${today}`)||"[]")}catch{return[]} });
  const [aiData, setAiData] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(()=>{ const s=document.createElement("style"); s.textContent=CSS; document.head.appendChild(s); return()=>document.head.removeChild(s); },[]);
  useEffect(()=>{ if(profile && !aiData) loadAI(); },[profile]);

  const saveProfile=()=>{ if(!form.name||!form.sign) return; localStorage.setItem("iv_profile",JSON.stringify(form)); setProfile(form); };

  const loadAI=async()=>{
    setLoadingAI(true);
    const today=new Date().toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long",year:"numeric"});
    try {
      const res=await fetch(GROQ_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${GROQ_API_KEY}`},
        body:JSON.stringify({
          model:GROQ_MODEL, temperature:0.7, max_tokens:1000,
          response_format:{type:"json_object"},
          messages:[
            {role:"system",content:"You are a Vedic astrology karma calculator. Return ONLY valid JSON."},
            {role:"user",content:`Calculate karma score for: Name: ${profile.name}, Sun Sign: ${profile.sign}, Nakshatra: ${profile.nakshatra||"Unknown"}, Dasha: ${profile.dasha||"Unknown"}, DOB: ${profile.dob||"Unknown"}, Today: ${today}. Return JSON: {composite (0-100), natalBase (0-40), transitBonus (-20 to +30), behaviorBase (0-30), scoreMessage (2 sentences), currentDasha (string), transitAlerts [{planet,event,impact,tip}], radarData [{subject,value 1-10} for Dharma/Artha/Kama/Moksha/Karma/Seva]}`}
          ]
        }),
      });
      const data=await res.json();
      if(data.error) throw new Error(data.error.message);
      const parsed=JSON.parse(data.choices?.[0]?.message?.content||"{}");
      setAiData(parsed);
    } catch (e) {
      console.error("[Karma Dashboard] AI scoring failed, using fallback data:", e);
      setAiData({composite:62,natalBase:28,transitBonus:5,behaviorBase:29,scoreMessage:"Your karma shows moderate alignment. Complete your daily remedies to elevate your score.",currentDasha:"Consult Pandit Ji for your current dasha reading.",transitAlerts:[{planet:"Saturn",event:"Saturn's transit requires patience and discipline",impact:"neutral",tip:"Perform Shani Puja on Saturday"},{planet:"Jupiter",event:"Jupiter blesses your dharmic efforts",impact:"positive",tip:"Wear yellow, donate to education"}],radarData:[{subject:"Dharma",value:6},{subject:"Artha",value:5},{subject:"Kama",value:4},{subject:"Moksha",value:7},{subject:"Karma",value:6},{subject:"Seva",value:5}]});
    } finally { setLoadingAI(false); }
  };

  const toggleAction=(id)=>{ const today=new Date().toISOString().slice(0,10); const next=done.includes(id)?done.filter(d=>d!==id):[...done,id]; setDone(next); localStorage.setItem(`iv_done_${today}`,JSON.stringify(next)); };

  const behaviorPts=done.reduce((s,id)=>s+(ACTIONS.find(a=>a.id===id)?.pts||0),0);
  const composite=aiData?Math.min(100,aiData.natalBase+aiData.transitBonus+Math.round((behaviorPts/68)*aiData.behaviorBase)):null;

  const saveToday=()=>{ if(!composite) return; const today=new Date().toISOString().slice(0,10); const entry={date:today,composite,behaviorPts,actionsCompleted:done.length}; const updated=[entry,...history.filter(e=>e.date!==today)].slice(0,60); setHistory(updated); localStorage.setItem("iv_karma_v2",JSON.stringify(updated)); setSaved(true); setTimeout(()=>setSaved(false),2500); };

  const lineData=[...history].reverse().slice(-14).map(e=>({date:e.date.slice(5),score:e.composite}));

  if(!profile) return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap">
        <Link to="/inner-voice" className="ivd-back">← Inner Voice</Link>
        <div className="ivd-hdr"><div className="ivd-eyebrow">One-time Setup</div><h1 className="ivd-title">Karma Score</h1><p className="ivd-sub">Your score is calculated from birth chart + today's transits + your daily dharmic actions</p></div>
        <div className="ivd-setup">
          <div className="ivd-setup-title">Your Vedic Profile</div>
          <div className="ivd-setup-sub">Needed to calculate your natal karma base</div>
          <div className="ivd-grid2">
            <div className="ivd-field"><label>Your Name</label><input className="ivd-input" placeholder="Enter your name" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="ivd-field"><label>Date of Birth</label><input className="ivd-input" type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))}/></div>
            <div className="ivd-field"><label>Sun Sign / Rashi</label><select className="ivd-select" value={form.sign} onChange={e=>setForm(f=>({...f,sign:e.target.value}))}><option value="">Select...</option>{ZODIAC.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div className="ivd-field"><label>Nakshatra (if known)</label><select className="ivd-select" value={form.nakshatra} onChange={e=>setForm(f=>({...f,nakshatra:e.target.value}))}><option value="">Select...</option>{NAKSHATRA.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
          </div>
          <div className="ivd-field" style={{marginBottom:16}}><label>Current Mahadasha (if known)</label><select className="ivd-select" value={form.dasha} onChange={e=>setForm(f=>({...f,dasha:e.target.value}))}><option value="">Select...</option>{DASHAS.map(d=><option key={d} value={d}>{d}</option>)}</select></div>
          <button className="ivd-setup-btn" onClick={saveProfile} disabled={!form.name||!form.sign}>Calculate My Karma Score →</button>
        </div>
      </div>
    </div>
  );

  if(loadingAI) return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap"><div className="ivd-loader-wrap"><div className="ivd-spin"/><div className="ivd-ltxt">Calculating from birth chart + transits...</div></div></div>
    </div>
  );

  return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap">
        <Link to="/inner-voice" className="ivd-back">← Inner Voice</Link>
        <div className="ivd-hdr"><div className="ivd-eyebrow">Daily Karma Score</div><h1 className="ivd-title">Karma Score</h1><p className="ivd-sub">{profile.name} · {profile.sign}{profile.nakshatra ? ` · ${profile.nakshatra}`:""}</p></div>

        {composite!==null && (
          <div className="ivd-score-section">
            <ScoreRing score={composite}/>
            <div className="ivd-score-meta">
              <div className="ivd-score-name">Today's Composite Karma</div>
              <div className="ivd-score-msg">{aiData?.scoreMessage}</div>
              {aiData?.currentDasha && <div className="ivd-score-dasha">↳ {aiData.currentDasha}</div>}
            </div>
          </div>
        )}

        {aiData && (
          <div className="ivd-breakdown">
            <div className="ivd-bk"><div className="ivd-bk-icon">🌟</div><div className="ivd-bk-val" style={{color:"#BC6A4D"}}>{aiData.natalBase}</div><div className="ivd-bk-lbl">Natal Base</div></div>
            <div className="ivd-bk"><div className="ivd-bk-icon">🪐</div><div className="ivd-bk-val" style={{color:aiData.transitBonus>=0?"#BC6A4D":"#D9895F"}}>{aiData.transitBonus>=0?"+":""}{aiData.transitBonus}</div><div className="ivd-bk-lbl">Transit Bonus</div></div>
            <div className="ivd-bk"><div className="ivd-bk-icon">⚡</div><div className="ivd-bk-val" style={{color:"#BC6A4D"}}>{behaviorPts}</div><div className="ivd-bk-lbl">Today's Actions</div></div>
          </div>
        )}

        <div className="ivd-actions-card">
          <div className="ivd-card-title">Today's Karma Actions</div>
          <div className="ivd-card-sub">Complete these to boost your score — each action has real karma value</div>
          <div className="ivd-actions-list">
            {ACTIONS.map(a=>(
              <div key={a.id} className={`ivd-action-row${done.includes(a.id)?" done":""}`}>
                <div className={`ivd-action-check${done.includes(a.id)?" done":""}`} onClick={()=>toggleAction(a.id)}>{done.includes(a.id)?"✓":""}</div>
                <div className="ivd-action-name">{a.name}</div>
                <div className="ivd-action-pts">+{a.pts} pts</div>
                <span className={`ivd-action-type at-${a.type}`}>{a.type}</span>
              </div>
            ))}
          </div>
          <button className="ivd-save-btn" onClick={saveToday}>Save Today's Score</button>
          {saved && <div className="ivd-saved">✓ Saved — {composite}/100 karma points</div>}
        </div>

        {aiData?.transitAlerts?.length>0 && (
          <div className="ivd-transit">
            <div className="ivd-transit-title">🪐 Today's Planetary Influences</div>
            {aiData.transitAlerts.map((t,i)=>(
              <div key={i} className="ivd-t-row">
                <div className="ivd-t-icon">⭐</div>
                <div style={{flex:1}}>
                  <div className="ivd-t-text"><strong>{t.planet}:</strong> {t.event}</div>
                  <div className="ivd-t-tip">↳ {t.tip}</div>
                </div>
                <span className={`ivd-t-impact ti-${t.impact==="positive"?"pos":t.impact==="negative"?"neg":"neu"}`}>{t.impact}</span>
              </div>
            ))}
          </div>
        )}

        {aiData?.radarData && (
          <div className="ivd-chart">
            <div className="ivd-card-title" style={{marginBottom:4}}>Purushartha Balance</div>
            <div className="ivd-card-sub" style={{marginBottom:18}}>The four goals of life — your alignment today</div>
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={aiData.radarData}>
                <PolarGrid stroke="rgba(255,255,255,0.07)"/>
                <PolarAngleAxis dataKey="subject" tick={{fill:"rgba(255,255,255,0.55)",fontSize:11,fontFamily:"'Astra','Iceland',sans-serif"}}/>
                <Radar dataKey="value" stroke="#BC6A4D" fill="#BC6A4D" fillOpacity={0.12} strokeWidth={2}/>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}

        {lineData.length>1 && (
          <div className="ivd-chart">
            <div className="ivd-card-title" style={{marginBottom:4}}>Karma Trend</div>
            <div className="ivd-card-sub" style={{marginBottom:18}}>Your composite score over 14 days</div>
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={lineData}>
                <XAxis dataKey="date" tick={{fill:"rgba(255,255,255,.35)",fontSize:10,fontFamily:"'Astra','Iceland',sans-serif"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{fill:"rgba(255,255,255,.35)",fontSize:10}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#0B1020",border:"1px solid rgba(188,106,77,.3)",borderRadius:12,fontFamily:"'Astra','Iceland',sans-serif",fontSize:11}}/>
                <Line type="monotone" dataKey="score" stroke="#BC6A4D" strokeWidth={2} dot={{fill:"#BC6A4D",r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="ivd-history">
          <div className="ivd-card-title" style={{marginBottom:4}}>Score History</div>
          <div className="ivd-card-sub" style={{marginBottom:18}}>Last 30 days</div>
          {history.length===0 ? <div className="ivd-empty">No history yet. Save your first score above.</div> :
            history.slice(0,15).map(e=>(
              <div key={e.date} className="ivd-h-row">
                <div className="ivd-h-date">{new Date(e.date+"T00:00:00").toLocaleDateString("en-IN",{day:"numeric",month:"short"})}</div>
                <div className="ivd-h-bar"><div className="ivd-h-fill" style={{width:`${e.composite}%`}}/></div>
                <div><div className="ivd-h-score">{e.composite}</div><div className="ivd-h-acts">{e.actionsCompleted} actions</div></div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}