// import { useParams, Link, useNavigate } from "react-router-dom";
// import { useEffect, useState, useRef } from "react";
// import Layout from "@/components/Layout";
// import { zodiacSigns } from "@/data/zodiacData";

// // ─── Zodiac image map ─────────────────────────────────────────────────────────
// // These match the filenames you already have in src/assets/zodiac/
// const zodiacImages: Record<string, string> = {
//   aries:       new URL("../assets/zodiac/aries.png", import.meta.url).href,
//   taurus:      new URL("../assets/zodiac/taurus.png", import.meta.url).href,
//   gemini:      new URL("../assets/zodiac/gemini.png", import.meta.url).href,
//   cancer:      new URL("../assets/zodiac/cancer.png", import.meta.url).href,
//   leo:         new URL("../assets/zodiac/leo.png", import.meta.url).href,
//   virgo:       new URL("../assets/zodiac/virgo.png", import.meta.url).href,
//   libra:       new URL("../assets/zodiac/libra.png", import.meta.url).href,
//   scorpio:     new URL("../assets/zodiac/scorpio.png", import.meta.url).href,
//   sagittarius: new URL("../assets/zodiac/sagittarius.png", import.meta.url).href,
//   capricorn:   new URL("../assets/zodiac/capricorn.png", import.meta.url).href,
//   aquarius:    new URL("../assets/zodiac/aquarius.png", import.meta.url).href,
//   pisces:      new URL("../assets/zodiac/pisces.png", import.meta.url).href,
// };

// // ─── Types ────────────────────────────────────────────────────────────────────
// interface H { score: number; advice: string }
// interface DailyData {
//   cosmicEnergy: number; cosmicMessage: string; moonPhase: string; dominantPlanet: string;
//   horoscope: { love: H; career: H; money: H; health: H; family: H; mental: H };
//   lucky: { color: string; colorHex: string; number: number; gemstone: string; time: string; direction: string; planet: string };
//   todo: string[]; avoid: string[];
//   opportunities: { love: number; career: number; money: number; health: number };
//   powerWords: string[]; mood: string; moodIcon: string; challenge: string;
//   compatibility: { sign: string; score: number; reason: string };
//   celebrity: { name: string; fact: string };
//   tarot: { card: string; meaning: string };
//   manifestation: string; tomorrowTeaser: string; fortuneRewards: string[];
// }

// // ─── RNG ──────────────────────────────────────────────────────────────────────
// function rng(seed: number) {
//   let s = seed;
//   return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
// }
// function getDailySeed(sign: string) {
//   const d = new Date();
//   return (d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate()) * 1000 +
//     sign.split("").reduce((a,c) => a + c.charCodeAt(0), 0);
// }
// function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
//   const copy = [...arr]; const out: T[] = [];
//   for (let i = 0; i < n && copy.length; i++) { const idx = Math.floor(rand()*copy.length); out.push(copy.splice(idx,1)[0]); }
//   return out;
// }
// function pick<T>(arr: T[], rand: () => number): T { return arr[Math.floor(rand()*arr.length)]; }
// function num(min: number, max: number, rand: () => number) { return min + Math.floor(rand()*(max-min+1)); }

// function generateDailyData(sign: string): DailyData {
//   const rand = rng(getDailySeed(sign));
//   const messages = ["Mercury boosts your communication power today.","Venus aligns in your favor — expect harmony.","The Moon amplifies your intuition significantly.","Saturn rewards your discipline with breakthroughs.","Jupiter expands your horizons beyond limits.","Mars energizes your ambitions — act boldly.","Neptune unveils hidden truths — trust instincts.","Uranus sparks unexpected, beautiful opportunities."];
//   const moonPhases = ["🌑 New Moon","🌒 Waxing Crescent","🌓 First Quarter","🌔 Waxing Gibbous","🌕 Full Moon","🌖 Waning Gibbous","🌗 Last Quarter","🌘 Waning Crescent"];
//   const planets = ["Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Moon"];
//   const colors = [{name:"Royal Blue",hex:"#4169E1"},{name:"Emerald Green",hex:"#50C878"},{name:"Crimson Red",hex:"#DC143C"},{name:"Violet Purple",hex:"#8B00FF"},{name:"Golden Amber",hex:"#FFBF00"},{name:"Rose Quartz",hex:"#F7CAC9"},{name:"Midnight Teal",hex:"#008080"},{name:"Cosmic Silver",hex:"#C0C0C0"}];
//   const gemstones = ["Amethyst","Citrine","Lapis Lazuli","Rose Quartz","Obsidian","Moonstone","Turquoise","Garnet"];
//   const directions = ["North","South","East","West","Northeast","Northwest","Southeast","Southwest"];
//   const todos = ["Call an old friend you've been thinking about","Focus on one unfinished project with full attention","Learn a new skill or read something inspiring","Meditate for 10 minutes at sunrise","Write down 3 things you're grateful for","Take a nature walk and clear your mind","Reach out to a mentor or guide","Start a creative project you've been postponing","Cook a nourishing meal from scratch","Declutter one area of your living space"];
//   const avoids = ["Avoid impulsive financial decisions today","Avoid lending money to casual acquaintances","Avoid unnecessary arguments — choose peace","Don't overcommit to new obligations","Avoid skipping meals or neglecting sleep","Don't suppress your true feelings","Avoid rushing important decisions","Don't rely on second-hand information","Avoid negative social media spirals","Don't isolate yourself when support is near"];
//   const powerWordBank = ["Focus","Growth","Clarity","Flow","Rise","Heal","Create","Lead","Trust","Shine","Bloom","Evolve"];
//   const moods = [{mood:"Explorer Mode",icon:"🧭"},{mood:"Leader Mode",icon:"👑"},{mood:"Creative Mode",icon:"🎨"},{mood:"Healing Mode",icon:"🌿"},{mood:"Manifestation Mode",icon:"✨"},{mood:"Warrior Mode",icon:"⚔️"},{mood:"Lover Mode",icon:"💫"},{mood:"Visionary Mode",icon:"🔮"}];
//   const challenges = ["Speak to one new person and learn something valuable from them.","Complete a task you've been avoiding for over a week.","Express gratitude to someone who rarely hears it from you.","Spend 30 minutes in complete silence and observe your thoughts.","Write a letter to your future self about today's intentions.","Do one act of kindness without expecting anything in return.","Read for 20 minutes on a topic completely outside your comfort zone.","Disconnect from all screens for 2 hours and reconnect with yourself."];
//   const allSigns = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
//   const compatSigns = allSigns.filter(s => s.toLowerCase() !== sign.toLowerCase());
//   const compatReasons = ["Today's Venus trine creates magnetic attraction between you two.","Mercury alignment opens deep, meaningful conversation channels.","The Full Moon amplifies emotional resonance between these signs.","Jupiter's position favors growth and adventure together.","Mars energy creates passionate, dynamic synergy today."];
//   const celebrities: Record<string,{name:string;fact:string}[]> = {
//     aries:[{name:"Lady Gaga",fact:"Born with fearless Aries fire — she reinvented pop music three times."}],
//     taurus:[{name:"Adele",fact:"Her Taurus determination built a voice that moved millions."}],
//     gemini:[{name:"Kanye West",fact:"Classic Gemini duality — visionary genius and provocateur in one."},{name:"Marilyn Monroe",fact:"Gemini's charm made her an eternal icon of joy and mystery."},{name:"Elon Musk",fact:"Gemini's restless curiosity took him from PayPal to Mars."}],
//     cancer:[{name:"Ariana Grande",fact:"Cancer's emotional depth pours into every single note she sings."}],
//     leo:[{name:"Barack Obama",fact:"Leo charisma and leadership transformed global politics."}],
//     virgo:[{name:"Beyoncé",fact:"Virgo perfectionism created the most meticulous performances in music."}],
//     libra:[{name:"Kim Kardashian",fact:"Libra's love of beauty built a billion-dollar brand empire."}],
//     scorpio:[{name:"Leonardo DiCaprio",fact:"Scorpio intensity drove him to 20 years of Oscar-worthy performances."}],
//     sagittarius:[{name:"Taylor Swift",fact:"Sagittarius fire and honesty turned personal stories into anthems."}],
//     capricorn:[{name:"Michelle Obama",fact:"Capricorn discipline and grace elevated every room she entered."}],
//     aquarius:[{name:"Oprah Winfrey",fact:"Aquarius vision built the most influential media empire of the century."}],
//     pisces:[{name:"Rihanna",fact:"Pisces creativity birthed music, fashion, and beauty that defied genre."}],
//   };
//   const tarots = [{card:"The Star",meaning:"Hope, inspiration, and cosmic renewal surround you."},{card:"The Sun",meaning:"Radiant success and joyful clarity light your path."},{card:"The Moon",meaning:"Trust your intuition — hidden truths are surfacing."},{card:"The Wheel",meaning:"Fortune turns in your favor. Embrace the change."},{card:"The Tower",meaning:"Transformation through release. What falls was not serving you."},{card:"The World",meaning:"Completion and wholeness. You are exactly where you belong."},{card:"The Magician",meaning:"You hold every tool you need. Act with intention."},{card:"The High Priestess",meaning:"Stillness reveals wisdom. Listen before you speak."}];
//   const manifestations = ["I attract positive opportunities and meaningful connections effortlessly.","Abundance flows toward me in expected and unexpected ways.","I am aligned with my highest purpose and deepest joy.","Every challenge I face strengthens and evolves me.","I radiate love, confidence, and magnetic energy today.","The universe conspires in my favor — I am ready.","I release what no longer serves me and welcome what will."];
//   const teasers = ["Tomorrow's energy looks stronger for career and financial breakthroughs.","A powerful full moon energy approaches — rest and prepare.","Tomorrow brings unexpected social opportunities and connections.","Venus moves into alignment — love and beauty amplify tomorrow.","A surge of creative energy is building for tomorrow."];
//   const fortunes = ["🌟 Lucky Number: "+num(1,99,rand),"💫 Secret Power: Speak your truth boldly today","🔮 Cosmic Insight: A long-awaited answer arrives soon","✨ Bonus: Your intuition is 3× sharper than usual","🎯 Focus Energy: Creative projects flourish this week","💎 Hidden Gem: A stranger brings a meaningful message","🌙 Moon Blessing: Emotional clarity replaces confusion","⚡ Power Surge: Your energy peaks between 3–6 PM"];
//   const colorPick = pick(colors,rand); const moodPick = pick(moods,rand);
//   const celebList = celebrities[sign.toLowerCase()] || [{name:"A Great Soul",fact:"Their cosmic energy aligns with yours today."}];
//   return {
//     cosmicEnergy:num(60,97,rand),cosmicMessage:pick(messages,rand),moonPhase:pick(moonPhases,rand),dominantPlanet:pick(planets,rand),
//     horoscope:{
//       love:{score:num(55,98,rand),advice:pick(["Open your heart — vulnerability is your superpower today.","A meaningful conversation could deepen an important bond.","Don't overthink what feels naturally right in love.","Express appreciation to those who show up for you."],rand)},
//       career:{score:num(55,98,rand),advice:pick(["Your ideas are ahead of their time — speak them clearly.","Focus on one priority instead of scattering your energy.","A collaboration offers more than working alone today.","Your consistency is noticed by people who matter."],rand)},
//       money:{score:num(50,95,rand),advice:pick(["Review subscriptions and recurring expenses today.","A small investment in yourself yields long returns.","Patience over impulse leads to smarter financial choices.","Track where your energy and money flow — align them."],rand)},
//       health:{score:num(60,98,rand),advice:pick(["Hydration and rest double your natural energy today.","A 20-minute walk shifts your entire mental state.","Listen to subtle body signals before they amplify.","Your mental and physical health are deeply connected now."],rand)},
//       family:{score:num(55,95,rand),advice:pick(["A family member needs your patience more than your advice.","Shared meals and laughter heal more than words can.","Bridge a gap that has lingered too long between you.","Small gestures of care create the strongest family bonds."],rand)},
//       mental:{score:num(60,98,rand),advice:pick(["Journaling your thoughts creates surprising clarity today.","Give yourself permission to simply rest without guilt.","Your inner dialogue shapes your outer reality — choose kindly.","Breathwork and stillness reset your nervous system completely."],rand)},
//     },
//     lucky:{color:colorPick.name,colorHex:colorPick.hex,number:num(1,99,rand),gemstone:pick(gemstones,rand),time:pick(["6:00 AM – 8:00 AM","10:00 AM – 12:00 PM","2:00 PM – 4:00 PM","4:00 PM – 6:00 PM","7:00 PM – 9:00 PM"],rand),direction:pick(directions,rand),planet:pick(planets,rand)},
//     todo:pickN(todos,3,rand),avoid:pickN(avoids,3,rand),
//     opportunities:{love:num(55,96,rand),career:num(60,98,rand),money:num(50,92,rand),health:num(60,97,rand)},
//     powerWords:pickN(powerWordBank,3,rand),mood:moodPick.mood,moodIcon:moodPick.icon,
//     challenge:pick(challenges,rand),
//     compatibility:{sign:pick(compatSigns,rand),score:num(78,98,rand),reason:pick(compatReasons,rand)},
//     celebrity:pick(celebList,rand),tarot:pick(tarots,rand),
//     manifestation:pick(manifestations,rand),tomorrowTeaser:pick(teasers,rand),
//     fortuneRewards:pickN(fortunes,6,rand),
//   };
// }

// // ─── Hooks ────────────────────────────────────────────────────────────────────
// function useCountUp(target: number, duration = 1200) {
//   const [val, setVal] = useState(0);
//   useEffect(() => {
//     let start = 0; const step = target/(duration/16);
//     const t = setInterval(() => { start+=step; if(start>=target){setVal(target);clearInterval(t);}else setVal(Math.floor(start)); },16);
//     return () => clearInterval(t);
//   }, [target]);
//   return val;
// }
// function useMidnightCountdown() {
//   const [time, setTime] = useState("");
//   useEffect(() => {
//     const tick = () => { const now=new Date(); const midnight=new Date(); midnight.setHours(24,0,0,0); const diff=midnight.getTime()-now.getTime(); const h=Math.floor(diff/3600000),m=Math.floor((diff%3600000)/60000),s=Math.floor((diff%60000)/1000); setTime(`${String(h).padStart(2,"0")}h ${String(m).padStart(2,"0")}m ${String(s).padStart(2,"0")}s`); };
//     tick(); const t=setInterval(tick,1000); return()=>clearInterval(t);
//   },[]);
//   return time;
// }
// function getStreak(sign: string): number {
//   try { const key=`streak_${sign}`;const dateKey=`streak_date_${sign}`;const today=new Date().toDateString();const stored=localStorage.getItem(dateKey);const streak=parseInt(localStorage.getItem(key)||"0");if(stored===today)return streak;const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const newStreak=stored===yesterday.toDateString()?streak+1:1;localStorage.setItem(key,String(newStreak));localStorage.setItem(dateKey,today);return newStreak; } catch{return 1;}
// }
// function getStreakBadge(s: number) {
//   if(s>=100)return{icon:"♾️",name:"Cosmic Legend"};
//   if(s>=30)return{icon:"☀️",name:"Solar Master"};
//   if(s>=7)return{icon:"🌙",name:"Moon Walker"};
//   return{icon:"⭐",name:"Star Seeker"};
// }

// // ─── Circle Gauge ─────────────────────────────────────────────────────────────
// function CircleGauge({value,label,color="#592209"}:{value:number;label:string;color?:string}) {
//   const animated = useCountUp(value);
//   const r=52; const circ=2*Math.PI*r; const dash=(animated/100)*circ;
//   return (
//     <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
//       <svg width={130} height={130}>
//         <circle cx={65} cy={65} r={r} fill="none" stroke="rgba(89,34,9,0.05)" strokeWidth={10}/>
//         <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10}
//           strokeDasharray={`${dash} ${circ}`} strokeLinecap="round" strokeDashoffset={circ/4}
//           style={{transition:"stroke-dasharray 1.2s ease",filter:`drop-shadow(0 0 8px ${color})`}}/>
//         <text x="65" y="70" textAnchor="middle" fill="#fff" fontSize="20" fontWeight="800">{animated}%</text>
//       </svg>
//       <span style={{fontSize:16,color:"#592209",textTransform:"uppercase",letterSpacing:"0.08em",textAlign:"center",fontWeight:700}}>{label}</span>
//     </div>
//   );
// }

// // ─── Tarot Card ───────────────────────────────────────────────────────────────
// function TarotCard({card,meaning}:{card:string;meaning:string}) {
//   const [flipped,setFlipped]=useState(false);
//   return (
//     <div style={{perspective:700,cursor:"pointer"}} onClick={()=>setFlipped(f=>!f)}>
//       <div style={{width:200,height:310,position:"relative",transformStyle:"preserve-3d",transition:"transform 0.7s ease",transform:flipped?"rotateY(180deg)":"rotateY(0)"}}>
//         <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",borderRadius:18,background:"#F5E9D6",border:"2px solid #592209",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:12}}>
//           <div style={{fontSize:60}}>🔮</div>
//           <div style={{color:"#592209",fontSize:15,letterSpacing:"0.15em",fontWeight:600}}>TAP TO REVEAL</div>
//         </div>
//         <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",borderRadius:18,background:"#F5E9D6",border:"2px solid #592209",transform:"rotateY(180deg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16,padding:28,textAlign:"center"}}>
//           <div style={{fontSize:44}}>✨</div>
//           <div style={{color:"#592209",fontWeight:800,fontSize:22,letterSpacing:"0.08em"}}>{card}</div>
//           <div style={{color:"#592209",fontSize:16,lineHeight:1.7}}>{meaning}</div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ─── Fortune Wheel ────────────────────────────────────────────────────────────
// function FortuneWheel({rewards,sign}:{rewards:string[];sign:string}) {
//   const [spinning,setSpinning]=useState(false);
//   const [result,setResult]=useState<string|null>(null);
//   const [rotation,setRotation]=useState(0);
//   const [spunToday,setSpunToday]=useState(false);
//   const canvasRef=useRef<HTMLCanvasElement>(null);
//   useEffect(()=>{
//     try{const k=`spun_${sign}_${new Date().toDateString()}`;setSpunToday(!!localStorage.getItem(k));}catch{}
//     drawWheel();
//   },[]);
//   function drawWheel(){
//     const canvas=canvasRef.current;if(!canvas)return;
//     const ctx=canvas.getContext("2d");if(!ctx)return;
//     const cx=150,cy=150,r=138;
//     ctx.clearRect(0,0,300,300);
//     const segColors=["#1a0a2e","#2d1b4e","#1a0a2e","#3d1a1a","#1a2a1a","#1a1a3d"];
//     rewards.forEach((_,i)=>{
//       const start=(i/rewards.length)*2*Math.PI-Math.PI/2;const end=((i+1)/rewards.length)*2*Math.PI-Math.PI/2;
//       ctx.beginPath();ctx.moveTo(cx,cy);ctx.arc(cx,cy,r,start,end);ctx.closePath();
//       ctx.fillStyle=segColors[i%segColors.length];ctx.fill();
//       ctx.strokeStyle="#592209";ctx.lineWidth=2;ctx.stroke();
//       ctx.save();ctx.translate(cx,cy);ctx.rotate((start+end)/2);
//       ctx.fillStyle="#592209";ctx.font="bold 12px sans-serif";ctx.textAlign="right";
//       ctx.fillText("✨",r-20,5);ctx.restore();
//     });
//     ctx.beginPath();ctx.arc(cx,cy,18,0,2*Math.PI);ctx.fillStyle="#592209";ctx.fill();
//     ctx.fillStyle="#000";ctx.font="bold 13px sans-serif";ctx.textAlign="center";ctx.textBaseline="middle";ctx.fillText("★",cx,cy);
//   }
//   function spin(){
//     if(spinning||spunToday)return;
//     setSpinning(true);setResult(null);
//     const idx=Math.floor(Math.random()*rewards.length);
//     const targetDeg=(5+Math.random()*5)*360+(idx/rewards.length)*360;
//     setRotation(prev=>prev+targetDeg);
//     setTimeout(()=>{setResult(rewards[idx]);setSpinning(false);setSpunToday(true);try{localStorage.setItem(`spun_${sign}_${new Date().toDateString()}`,"1");}catch{}},3000);
//   }
//   return (
//     <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24}}>
//       <div style={{position:"relative"}}>
//         <canvas ref={canvasRef} width={300} height={300} style={{borderRadius:"50%",border:"3px solid #592209",boxShadow:"0 0 40px rgba(89,34,9,0.3)",transform:`rotate(${rotation}deg)`,transition:spinning?"transform 3s cubic-bezier(0.17,0.67,0.12,0.99)":"none"}}/>
//         <div style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",color:"#592209",fontSize:28}}>▼</div>
//       </div>
//       {result&&<div style={{background:"rgba(89,34,9,0.1)",border:"1px solid rgba(89,34,9,0.4)",borderRadius:14,padding:"18px 28px",textAlign:"center",maxWidth:320}}><div style={{color:"#592209",fontSize:17,fontWeight:700,marginBottom:6}}>Your Fortune</div><div style={{color:"#301607",fontSize:16}}>{result}</div></div>}
//       <button onClick={spin} disabled={spinning||spunToday} style={{padding:"16px 44px",background:spunToday?"rgba(89,34,9,0.2)":"linear-gradient(135deg,#592209,#592209)",border:"none",borderRadius:30,color:spunToday?"rgba(89,34,9,0.3)":"#000",fontWeight:800,fontSize:18,cursor:spunToday?"not-allowed":"pointer",letterSpacing:"0.05em"}}>
//         {spunToday?"Come Back Tomorrow":spinning?"Spinning...":"🎡 Spin the Wheel"}
//       </button>
//     </div>
//   );
// }

// // ─── Constants ────────────────────────────────────────────────────────────────
// const SIGN_ORDER=["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
// const SIGN_SYMBOLS:Record<string,string>={aries:"♈",taurus:"♉",gemini:"♊",cancer:"♋",leo:"♌",virgo:"♍",libra:"♎",scorpio:"♏",sagittarius:"♐",capricorn:"♑",aquarius:"♒",pisces:"♓"};
// const HORO_ICONS:Record<string,string>={love:"❤️",career:"💼",money:"💰",health:"🏥",family:"👨‍👩‍👧",mental:"🧠"};
// const HORO_LABELS:Record<string,string>={love:"Love",career:"Career",money:"Money",health:"Health",family:"Family",mental:"Mental Wellness"};

// // ─── Main Page ────────────────────────────────────────────────────────────────
// export default function ZodiacDetail() {
//   const { sign = "gemini" } = useParams<{ sign: string }>();
//   const signLower = sign.toLowerCase();
//   const zodiac = zodiacSigns.find(z => z.name.toLowerCase() === signLower);
//   const [daily, setDaily] = useState<DailyData|null>(null);
//   const [imgError, setImgError] = useState(false);
//   const streak = getStreak(signLower);
//   const badge = getStreakBadge(streak);
//   const countdown = useMidnightCountdown();
//   const energyCount = useCountUp(daily?.cosmicEnergy ?? 0);
//   useEffect(()=>{ setDaily(generateDailyData(signLower)); setImgError(false); },[signLower]);

//   const todayStr = new Date().toLocaleDateString("en-US",{weekday:"long",year:"numeric",month:"long",day:"numeric"});
//   const prevSign = SIGN_ORDER[(SIGN_ORDER.indexOf(signLower)-1+12)%12];
//   const nextSign = SIGN_ORDER[(SIGN_ORDER.indexOf(signLower)+1)%12];
//   const zodiacImg = zodiacImages[signLower];

//   // Shared styles
//   const sec:React.CSSProperties = {background:"rgba(89,34,9,0.2)",border:"1px solid rgba(89,34,9,0.18)",borderRadius:24,padding:"36px 40px",marginBottom:28};
//   const ttl:React.CSSProperties = {color:"#592209",fontWeight:800,fontSize:16,letterSpacing:"0.2em",textTransform:"uppercase",display:"flex",alignItems:"center",gap:12,marginBottom:28};
//   const crd:React.CSSProperties = {background:"rgba(89,34,9,0.2)",border:"1px solid rgba(89,34,9,0.14)",borderRadius:16,padding:"24px"};

//   if (!zodiac || !daily) return (
//     <Layout>
//       <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#592209",fontSize:24}}>Loading cosmic data...</div>
//     </Layout>
//   );

//   return (
//     <Layout>
//       <style>{`
//         @keyframes pulse-glow{0%,100%{box-shadow:0 0 24px rgba(89,34,9,0.35)}50%{box-shadow:0 0 60px rgba(89,34,9,0.75)}}
//         @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
//         @keyframes shimmer{0%{background-position:200% center}100%{background-position:-200% center}}
//         @keyframes fade-in{from{opacity:0;transform:translateY(20px)}to{opacity:1;transform:translateY(0)}}
//         @keyframes word-glow{0%,100%{text-shadow:0 0 14px rgba(89,34,9,0.4)}50%{text-shadow:0 0 36px rgba(89,34,9,0.95),0 0 70px rgba(89,34,9,0.45)}}
//         .zd-sec{animation:fade-in 0.55s ease both}
//         .pword{animation:word-glow 2s ease-in-out infinite}
//         .hcard{transition:transform 0.2s ease,border-color 0.2s ease}
//         .hcard:hover{transform:translateY(-4px);border-color:rgba(89,34,9,0.4)!important}
//         .bfill{transition:width 1.4s cubic-bezier(0.4,0,0.2,1)}
//         .back-link:hover{color:#592209!important}
//         .signav:hover{color:#592209!important}
//       `}</style>

//       {/* ══ Full-width page wrapper ══ */}
//       <div style={{width:"100%",maxWidth:1280,margin:"0 auto",padding:"0 40px 80px",color:"#301607",boxSizing:"border-box"}}>

//         {/* ── SUB-NAV: sits below the Layout navbar, no overlap ── */}
//         <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"20px 0 32px",borderBottom:"1px solid rgba(89,34,9,0.1)",marginBottom:36}}>
//           <Link to="/zodiac" className="back-link"
//             style={{color:"#592209",textDecoration:"none",fontSize:16,letterSpacing:"0.12em",fontWeight:700,display:"flex",alignItems:"center",gap:8,transition:"color 0.2s"}}>
//             ← ALL SIGNS
//           </Link>
//           {/* Date — centred between the two sides */}
//           <div style={{color:"rgba(48,22,7,0.85)",fontSize:16,fontWeight:500,letterSpacing:"0.04em"}}>
//             {todayStr}
//           </div>
//           {/* Spacer to balance left side width */}
//           <div style={{width:120}}/>
//         </div>

//         {/* ── HERO ── */}
//         <div style={{display:"grid",gridTemplateColumns:"420px 1fr",gap:48,marginBottom:36,alignItems:"center"}}>
//           {/* Zodiac image box */}
//           <div style={{background:"rgba(89,34,9,0.2)",borderRadius:24,padding:44,display:"flex",alignItems:"center",justifyContent:"center",border:"1px solid rgba(89,34,9,0.14)",animation:"float 6s ease-in-out infinite",minHeight:340}}>
//             {zodiacImg && !imgError ? (
//               <img src={zodiacImg} alt={zodiac.name} onError={()=>setImgError(true)}
//                 style={{width:"100%",maxWidth:300,maxHeight:300,objectFit:"contain",filter:"drop-shadow(0 0 28px rgba(89,34,9,0.5))"}}/>
//             ) : (
//               <div style={{fontSize:140,filter:"drop-shadow(0 0 28px rgba(89,34,9,0.55))",lineHeight:1}}>{zodiac.symbol}</div>
//             )}
//           </div>
//           {/* Sign details */}
//           <div>
//             <div style={{fontSize:14,color:"#592209",letterSpacing:"0.25em",marginBottom:12,fontWeight:600}}>DAILY COSMIC READING</div>
//             <h1 style={{fontSize:72,fontWeight:900,letterSpacing:"0.12em",color:"#301607",margin:"0 0 10px",textTransform:"uppercase",lineHeight:1}}>{zodiac.name}</h1>
//             <div style={{color:"#592209",fontSize:20,marginBottom:22,fontWeight:600}}>{zodiac.dates}</div>
//             <div style={{display:"flex",gap:12,marginBottom:22,flexWrap:"wrap"}}>
//               <span style={{background:"rgba(89,34,9,0.1)",border:"1px solid rgba(89,34,9,0.35)",borderRadius:24,padding:"7px 20px",fontSize:16,color:"#592209",fontWeight:600}}>Element: {zodiac.element}</span>
//               <span style={{background:"rgba(89,34,9,0.1)",border:"1px solid rgba(89,34,9,0.35)",borderRadius:24,padding:"7px 20px",fontSize:16,color:"#592209",fontWeight:600}}>Ruler: {zodiac.ruling}</span>
//               <span style={{background:"rgba(89,34,9,0.2)",border:"1px solid rgba(89,34,9,0.2)",borderRadius:24,padding:"7px 20px",fontSize:16,color:"#F5E9D6"}}>{daily.moonPhase}</span>
//             </div>
//             <p style={{color:"#592209",fontSize:18,lineHeight:1.85,margin:0}}>{zodiac.description}</p>
//           </div>
//         </div>

//         {/* ── STREAK ── */}
//         <div className="zd-sec" style={{...sec,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:20}}>
//           <div style={{display:"flex",alignItems:"center",gap:20}}>
//             <span style={{fontSize:48}}>🔥</span>
//             <div>
//               <div style={{color:"#592209",fontWeight:800,fontSize:26}}>{streak}-Day Cosmic Streak</div>
//               <div style={{color:"#301607",fontSize:16,marginTop:4}}>Return daily to grow your streak</div>
//             </div>
//           </div>
//           <div style={{display:"flex",alignItems:"center",gap:16,background:"rgba(89,34,9,0.07)",border:"1px solid rgba(89,34,9,0.24)",borderRadius:16,padding:"16px 28px"}}>
//             <span style={{fontSize:36}}>{badge.icon}</span>
//             <div>
//               <div style={{color:"#592209",fontWeight:800,fontSize:20}}>{badge.name}</div>
//               <div style={{color:"rgba(48,22,7,0.72)",fontSize:15}}>Current Badge</div>
//             </div>
//           </div>
//         </div>

//         {/* ── COSMIC ENERGY ── */}
//         <div className="zd-sec" style={{...sec,textAlign:"center"}}>
//           <div style={ttl}>⚡ Today's Cosmic Energy</div>
//           <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24}}>
//             <div style={{position:"relative",width:200,height:200}}>
//               <div style={{position:"absolute",inset:0,borderRadius:"50%",background:`conic-gradient(#592209 ${energyCount*3.6}deg, rgba(89,34,9,0.2) 0)`,animation:"pulse-glow 3s ease-in-out infinite",display:"flex",alignItems:"center",justifyContent:"center"}}>
//                 <div style={{width:162,height:162,borderRadius:"50%",background:"#FBF5EC",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center"}}>
//                   <div style={{fontSize:46,fontWeight:900,color:"#592209",lineHeight:1}}>{energyCount}%</div>
//                   <div style={{fontSize:13,color:"#301607",letterSpacing:"0.12em",marginTop:4}}>ENERGY</div>
//                 </div>
//               </div>
//             </div>
//             <div style={{color:"#592209",fontSize:20,fontStyle:"italic",maxWidth:500}}>"{daily.cosmicMessage}"</div>
//             <div style={{display:"flex",gap:32,flexWrap:"wrap",justifyContent:"center"}}>
//               <span style={{fontSize:17,color:"rgba(48,22,7,0.75)"}}>☽ {daily.moonPhase}</span>
//               <span style={{fontSize:17,color:"rgba(48,22,7,0.75)"}}>🪐 {daily.dominantPlanet}</span>
//             </div>
//           </div>
//         </div>

//         {/* ── DAILY HOROSCOPE ── */}
//         <div className="zd-sec" style={sec}>
//           <div style={ttl}>🌟 Daily Horoscope</div>
//           <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:20}}>
//             {(Object.keys(daily.horoscope) as Array<keyof typeof daily.horoscope>).map(key=>{
//               const h=daily.horoscope[key];
//               return (
//                 <div key={key} className="hcard" style={crd}>
//                   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
//                     <div style={{display:"flex",alignItems:"center",gap:10}}>
//                       <span style={{fontSize:24}}>{HORO_ICONS[key]}</span>
//                       <span style={{fontSize:15,fontWeight:700,letterSpacing:"0.08em",color:"#592209",textTransform:"uppercase"}}>{HORO_LABELS[key]}</span>
//                     </div>
//                     <span style={{fontSize:20,fontWeight:800,color:h.score>=80?"#4ade80":h.score>=65?"#592209":"#f87171"}}>{h.score}%</span>
//                   </div>
//                   <div style={{background:"rgba(89,34,9,0.2)",borderRadius:6,height:6,overflow:"hidden",marginBottom:14}}>
//                     <div className="bfill" style={{height:"100%",width:`${h.score}%`,background:"linear-gradient(90deg,#592209,#592209)",borderRadius:6}}/>
//                   </div>
//                   <p style={{fontSize:16,color:"rgba(48,22,7,0.72)",lineHeight:1.65,margin:0}}>{h.advice}</p>
//                 </div>
//               );
//             })}
//           </div>
//         </div>

//         {/* ── LUCKY PREDICTIONS ── */}
//         <div className="zd-sec" style={sec}>
//           <div style={ttl}>🍀 Today's Lucky Predictions</div>
//           <div style={{display:"grid",gridTemplateColumns:"repeat(6,1fr)",gap:16}}>
//             {[
//               {icon:"🎨",label:"Lucky Color",value:daily.lucky.color,dot:daily.lucky.colorHex},
//               {icon:"🔢",label:"Lucky Number",value:String(daily.lucky.number)},
//               {icon:"💎",label:"Gemstone",value:daily.lucky.gemstone},
//               {icon:"⏰",label:"Lucky Time",value:daily.lucky.time},
//               {icon:"🧭",label:"Direction",value:daily.lucky.direction},
//               {icon:"🪐",label:"Lucky Planet",value:daily.lucky.planet},
//             ].map(item=>(
//               <div key={item.label} style={{...crd,textAlign:"center"}}>
//                 <div style={{fontSize:32,marginBottom:10}}>{item.icon}</div>
//                 <div style={{fontSize:12,color:"#592209",letterSpacing:"0.1em",textTransform:"uppercase",marginBottom:8}}>{item.label}</div>
//                 <div style={{fontSize:15,fontWeight:700,color:"#301607",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
//                   {item.value}
//                   {item.dot&&<span style={{width:12,height:12,borderRadius:"50%",background:item.dot,display:"inline-block",flexShrink:0}}/>}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>

//         {/* ── OPPORTUNITY METER ── */}
//         <div className="zd-sec" style={sec}>
//           <div style={ttl}>📊 Daily Opportunity Meter</div>
//           <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:20,justifyItems:"center"}}>
//             <CircleGauge value={daily.opportunities.love} label="Love" color="#e879a0"/>
//             <CircleGauge value={daily.opportunities.career} label="Career" color="#592209"/>
//             <CircleGauge value={daily.opportunities.money} label="Money" color="#4ade80"/>
//             <CircleGauge value={daily.opportunities.health} label="Health" color="#60a5fa"/>
//           </div>
//         </div>

//         {/* ── TODO + AVOID ── */}
//         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:28}}>
//           <div className="zd-sec" style={{...sec,marginBottom:0}}>
//             <div style={ttl}>✅ Things To Do Today</div>
//             <div style={{display:"flex",flexDirection:"column",gap:14}}>
//               {daily.todo.map((t,i)=>(
//                 <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,background:"rgba(229,138,69,0.05)",border:"1px solid rgba(229,138,69,0.18)",borderRadius:14,padding:"16px 20px"}}>
//                   <span style={{color:"#301607",fontSize:20,marginTop:1,flexShrink:0}}>✓</span>
//                   <span style={{fontSize:17,color:"rgba(48,22,7,0.85)",lineHeight:1.55}}>{t}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//           <div className="zd-sec" style={{...sec,marginBottom:0}}>
//             <div style={ttl}>⚠️ Things To Avoid</div>
//             <div style={{display:"flex",flexDirection:"column",gap:14}}>
//               {daily.avoid.map((a,i)=>(
//                 <div key={i} style={{display:"flex",alignItems:"flex-start",gap:14,background:"rgba(248,113,113,0.05)",border:"1px solid rgba(248,113,113,0.18)",borderRadius:14,padding:"16px 20px"}}>
//                   <span style={{color:"#9B2C1D",fontSize:20,marginTop:1,flexShrink:0}}>⚠</span>
//                   <span style={{fontSize:17,color:"rgba(48,22,7,0.85)",lineHeight:1.55}}>{a}</span>
//                 </div>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* ── POWER WORDS ── */}
//         <div className="zd-sec" style={{...sec,textAlign:"center"}}>
//           <div style={{...ttl,justifyContent:"center"}}>💫 Today's Power Words</div>
//           <div style={{display:"flex",justifyContent:"center",gap:48,flexWrap:"wrap",padding:"10px 0"}}>
//             {daily.powerWords.map((w,i)=>(
//               <div key={i} className="pword" style={{fontSize:36,fontWeight:900,color:"#592209",letterSpacing:"0.1em",textTransform:"uppercase",animationDelay:`${i*0.7}s`}}>{w}</div>
//             ))}
//           </div>
//         </div>

//         {/* ── COSMIC MOOD ── */}
//         <div className="zd-sec" style={{...sec,textAlign:"center"}}>
//           <div style={{...ttl,justifyContent:"center"}}>🌀 Cosmic Mood Detector</div>
//           <div style={{fontSize:72,marginBottom:18}}>{daily.moodIcon}</div>
//           <div style={{fontSize:34,fontWeight:900,color:"#592209",letterSpacing:"0.1em",marginBottom:10}}>{daily.mood}</div>
//           <div style={{fontSize:17,color:"rgba(48,22,7,0.72)"}}>Your cosmic frequency for today</div>
//         </div>

//         {/* ── CHALLENGE ── */}
//         <div className="zd-sec" style={sec}>
//           <div style={ttl}>🎯 AI Daily Challenge</div>
//           <div style={{background:"rgba(89,34,9,0.05)",border:"1px solid rgba(89,34,9,0.2)",borderRadius:18,padding:"32px",textAlign:"center"}}>
//             <div style={{fontSize:44,marginBottom:14}}>⚡</div>
//             <div style={{fontSize:20,color:"rgba(48,22,7,0.88)",fontStyle:"italic",lineHeight:1.75,marginBottom:18}}>"{daily.challenge}"</div>
//             <div style={{fontSize:15,color:"#592209",letterSpacing:"0.12em",fontWeight:600}}>REWARD: +10 Cosmic Energy</div>
//           </div>
//         </div>

//         {/* ── COMPATIBILITY ── */}
//         <div className="zd-sec" style={{...sec,textAlign:"center"}}>
//           <div style={{...ttl,justifyContent:"center"}}>💞 Today's Best Compatibility</div>
//           <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:40,flexWrap:"wrap"}}>
//             <div style={{textAlign:"center"}}>
//               <div style={{fontSize:64}}>{SIGN_SYMBOLS[signLower]}</div>
//               <div style={{color:"#592209",fontWeight:700,fontSize:20,marginTop:10,textTransform:"capitalize"}}>{zodiac.name}</div>
//             </div>
//             <div style={{textAlign:"center"}}>
//               <div style={{fontSize:44,fontWeight:900,color:"#592209"}}>{daily.compatibility.score}%</div>
//               <div style={{fontSize:14,color:"rgba(48,22,7,0.72)",letterSpacing:"0.1em",marginTop:4}}>TODAY</div>
//             </div>
//             <div style={{textAlign:"center"}}>
//               <div style={{fontSize:64}}>{SIGN_SYMBOLS[daily.compatibility.sign.toLowerCase()]}</div>
//               <div style={{color:"#592209",fontWeight:700,fontSize:20,marginTop:10}}>{daily.compatibility.sign}</div>
//             </div>
//           </div>
//           <div style={{marginTop:22,color:"rgba(48,22,7,0.72)",fontSize:18,fontStyle:"italic"}}>{daily.compatibility.reason}</div>
//         </div>

//         {/* ── CELEBRITY ── */}
//         <div className="zd-sec" style={sec}>
//           <div style={ttl}>⭐ {zodiac.name} Inspiration</div>
//           <div style={{display:"flex",alignItems:"center",gap:24,flexWrap:"wrap"}}>
//             <div style={{width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#592209,#592209)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:36,flexShrink:0}}>⭐</div>
//             <div>
//               <div style={{color:"#592209",fontWeight:800,fontSize:24,marginBottom:8}}>{daily.celebrity.name}</div>
//               <div style={{color:"#592209",fontSize:18,lineHeight:1.65}}>{daily.celebrity.fact}</div>
//             </div>
//           </div>
//         </div>

//         {/* ── FORTUNE WHEEL ── */}
//         <div className="zd-sec" style={{...sec,textAlign:"center"}}>
//           <div style={{...ttl,justifyContent:"center"}}>🎡 Cosmic Fortune Wheel</div>
//           <div style={{fontSize:17,color:"rgba(48,22,7,0.72)",marginBottom:28}}>Spin once daily to reveal your cosmic fortune</div>
//           <div style={{display:"flex",justifyContent:"center"}}><FortuneWheel rewards={daily.fortuneRewards} sign={signLower}/></div>
//         </div>

//         {/* ── TAROT ── */}
//         <div className="zd-sec" style={{...sec,textAlign:"center"}}>
//           <div style={{...ttl,justifyContent:"center"}}>🃏 Daily Tarot Reveal</div>
//           <div style={{fontSize:17,color:"rgba(48,22,7,0.72)",marginBottom:28}}>Tap the card to reveal today's cosmic message</div>
//           <div style={{display:"flex",justifyContent:"center"}}><TarotCard card={daily.tarot.card} meaning={daily.tarot.meaning}/></div>
//         </div>

//         {/* ── MANIFESTATION ── */}
//         <div className="zd-sec" style={{...sec,textAlign:"center"}}>
//           <div style={{...ttl,justifyContent:"center"}}>🌌 Today's Manifestation</div>
//           <div style={{fontSize:22,fontStyle:"italic",lineHeight:1.85,maxWidth:620,margin:"0 auto",background:"linear-gradient(135deg,#592209,#592209,#592209)",backgroundSize:"200% auto",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite"}}>
//             "{daily.manifestation}"
//           </div>
//         </div>

//         {/* ── PERSONALITY + LOVE ── */}
//         <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:24,marginBottom:28}}>
//           <div className="zd-sec" style={{...sec,marginBottom:0}}>
//             <div style={ttl}>👤 Personality</div>
//             <div style={{marginBottom:18}}>
//               <div style={{fontSize:13,color:"#592209",letterSpacing:"0.18em",marginBottom:12,fontWeight:600}}>CORE TRAITS</div>
//               <div style={{display:"flex",flexWrap:"wrap",gap:10}}>
//                 {zodiac.traits.map(t=><span key={t} style={{background:"rgba(89,34,9,0.09)",border:"1px solid rgba(89,34,9,0.24)",borderRadius:22,padding:"6px 16px",fontSize:15,color:"#592209",fontWeight:600}}>{t}</span>)}
//               </div>
//             </div>
//             <div style={{marginBottom:18}}>
//               <div style={{fontSize:13,color:"#592209",letterSpacing:"0.18em",marginBottom:12,fontWeight:600}}>STRENGTHS</div>
//               {zodiac.strengths.map(s=><div key={s} style={{color:"#592209",fontSize:17,marginBottom:6}}>☆ {s}</div>)}
//             </div>
//             <div>
//               <div style={{fontSize:13,color:"#592209",letterSpacing:"0.18em",marginBottom:12,fontWeight:600}}>CHALLENGES</div>
//               {zodiac.weaknesses.map(w=><div key={w} style={{color:"#592209",fontSize:17,marginBottom:6}}>• {w}</div>)}
//             </div>
//           </div>
//           <div className="zd-sec" style={{...sec,marginBottom:0}}>
//             <div style={ttl}>♥ Love & Relationships</div>
//             <p style={{color:"#592209",fontSize:17,lineHeight:1.8,marginBottom:22}}>{zodiac.description}</p>
//             <div style={{fontSize:13,color:"#592209",letterSpacing:"0.18em",marginBottom:12,fontWeight:600}}>BEST MATCHES</div>
//             <div style={{display:"flex",flexWrap:"wrap",gap:12}}>
//               {zodiac.compatibility.map(m=>(
//                 <Link key={m} to={`/zodiac/${m.toLowerCase()}`}
//                   style={{background:"rgba(89,34,9,0.09)",border:"1px solid rgba(89,34,9,0.24)",borderRadius:22,padding:"7px 16px",fontSize:15,color:"#592209",textDecoration:"none",display:"flex",alignItems:"center",gap:8,fontWeight:600}}>
//                   {SIGN_SYMBOLS[m.toLowerCase()]} {m}
//                 </Link>
//               ))}
//             </div>
//           </div>
//         </div>

//         {/* ── TOMORROW PREVIEW ── */}
//         <div className="zd-sec" style={{...sec,textAlign:"center",border:"1px solid rgba(89,34,9,0.25)",background:"linear-gradient(135deg,rgba(89,34,9,0.05),rgba(89,34,9,0))"}}>
//           <div style={{...ttl,justifyContent:"center"}}>🔭 Tomorrow's Preview</div>
//           <div style={{color:"#592209",fontSize:19,fontStyle:"italic",marginBottom:20}}>{daily.tomorrowTeaser}</div>
//           <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:12}}>
//             <span style={{fontSize:15,color:"rgba(48,22,7,0.72)",letterSpacing:"0.12em"}}>UNLOCKS IN</span>
//             <span style={{fontSize:22,fontWeight:800,color:"#592209",fontVariantNumeric:"tabular-nums"}}>{countdown}</span>
//           </div>
//         </div>

//         {/* ── SIGN NAVIGATION ── */}
//         <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:16,flexWrap:"wrap",gap:16}}>
//           <Link to={`/zodiac/${prevSign}`} className="signav"
//             style={{display:"flex",alignItems:"center",gap:10,color:"#592209",textDecoration:"none",fontSize:18,fontWeight:700,transition:"color 0.2s"}}>
//             ← {SIGN_SYMBOLS[prevSign]} {prevSign.charAt(0).toUpperCase()+prevSign.slice(1)}
//           </Link>
//           <Link to="/compatibility"
//             style={{background:"#F5E9D6",color:"#000",fontWeight:800,fontSize:17,letterSpacing:"0.1em",padding:"16px 36px",borderRadius:32,textDecoration:"none"}}>
//             CHECK COMPATIBILITY ♡
//           </Link>
//           <Link to={`/zodiac/${nextSign}`} className="signav"
//             style={{display:"flex",alignItems:"center",gap:10,color:"#592209",textDecoration:"none",fontSize:18,fontWeight:700,transition:"color 0.2s"}}>
//             {nextSign.charAt(0).toUpperCase()+nextSign.slice(1)} {SIGN_SYMBOLS[nextSign]} →
//           </Link>
//         </div>

//       </div>
//     </Layout>
//   );
// }


//komal


import { useParams, Link, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import { zodiacSigns } from "@/data/zodiacData";
import luckyColorIcon from "@/assets/lucky/lucky-color.png";
import luckyNumberIcon from "@/assets/lucky/lucky-number.png";
import gemstoneIcon from "@/assets/lucky/gemstone.png";
import luckyTimeIcon from "@/assets/lucky/lucky-time.png";
import directionIcon from "@/assets/lucky/direction.png";
import luckyPlanetIcon from "@/assets/lucky/lucky-planet.png";
import tarotCardBackImg from "@/assets/tarot/tarot-card-back.png";
import fortuneWheelImg from "@/assets/tarot/fortune-wheel.png";

// ─── Zodiac image map ─────────────────────────────────────────────────────────
// These match the filenames you already have in src/assets/zodiac/
const zodiacImages: Record<string, string> = {
  aries:       new URL("../assets/zodiac/aries.png", import.meta.url).href,
  taurus:      new URL("../assets/zodiac/taurus.png", import.meta.url).href,
  gemini:      new URL("../assets/zodiac/gemini.png", import.meta.url).href,
  cancer:      new URL("../assets/zodiac/cancer.png", import.meta.url).href,
  leo:         new URL("../assets/zodiac/leo.png", import.meta.url).href,
  virgo:       new URL("../assets/zodiac/virgo.png", import.meta.url).href,
  libra:       new URL("../assets/zodiac/libra.png", import.meta.url).href,
  scorpio:     new URL("../assets/zodiac/scorpio.png", import.meta.url).href,
  sagittarius: new URL("../assets/zodiac/sagittarius.png", import.meta.url).href,
  capricorn:   new URL("../assets/zodiac/capricorn.png", import.meta.url).href,
  aquarius:    new URL("../assets/zodiac/aquarius.png", import.meta.url).href,
  pisces:      new URL("../assets/zodiac/pisces.png", import.meta.url).href,
};

// ─── Types ────────────────────────────────────────────────────────────────────
interface H { score: number; advice: string }
interface DailyData {
  cosmicEnergy: number; cosmicMessage: string; moonPhase: string; dominantPlanet: string;
  horoscope: { love: H; career: H; money: H; health: H; family: H; mental: H };
  lucky: { color: string; colorHex: string; number: number; gemstone: string; time: string; direction: string; planet: string };
  todo: string[]; avoid: string[];
  opportunities: { love: number; career: number; money: number; health: number };
  powerWords: string[]; mood: string; moodIcon: string; challenge: string;
  compatibility: { sign: string; score: number; reason: string };
  celebrity: { name: string; fact: string };
  tarot: { card: string; meaning: string };
  manifestation: string; tomorrowTeaser: string; fortuneRewards: string[];
}

// ─── RNG ──────────────────────────────────────────────────────────────────────
function rng(seed: number) {
  let s = seed;
  return () => { s = (s * 1664525 + 1013904223) & 0xffffffff; return (s >>> 0) / 4294967296; };
}
function getDailySeed(sign: string) {
  const d = new Date();
  return (d.getFullYear() * 10000 + (d.getMonth()+1) * 100 + d.getDate()) * 1000 +
    sign.split("").reduce((a,c) => a + c.charCodeAt(0), 0);
}
function pickN<T>(arr: T[], n: number, rand: () => number): T[] {
  const copy = [...arr]; const out: T[] = [];
  for (let i = 0; i < n && copy.length; i++) { const idx = Math.floor(rand()*copy.length); out.push(copy.splice(idx,1)[0]); }
  return out;
}
function pick<T>(arr: T[], rand: () => number): T { return arr[Math.floor(rand()*arr.length)]; }
function num(min: number, max: number, rand: () => number) { return min + Math.floor(rand()*(max-min+1)); }

function generateDailyData(sign: string): DailyData {
  const rand = rng(getDailySeed(sign));
  const messages = ["Mercury boosts your communication power today.","Venus aligns in your favor — expect harmony.","The Moon amplifies your intuition significantly.","Saturn rewards your discipline with breakthroughs.","Jupiter expands your horizons beyond limits.","Mars energizes your ambitions — act boldly.","Neptune unveils hidden truths — trust instincts.","Uranus sparks unexpected, beautiful opportunities."];
  const moonPhases = ["🌑 New Moon","🌒 Waxing Crescent","🌓 First Quarter","🌔 Waxing Gibbous","🌕 Full Moon","🌖 Waning Gibbous","🌗 Last Quarter","🌘 Waning Crescent"];
  const planets = ["Mercury","Venus","Mars","Jupiter","Saturn","Uranus","Neptune","Moon"];
  const colors = [{name:"Royal Blue",hex:"#4169E1"},{name:"Emerald Green",hex:"#50C878"},{name:"Crimson Red",hex:"#DC143C"},{name:"Violet Purple",hex:"#8B00FF"},{name:"Golden Amber",hex:"#FFBF00"},{name:"Rose Quartz",hex:"#F7CAC9"},{name:"Midnight Teal",hex:"#008080"},{name:"Cosmic Silver",hex:"#C0C0C0"}];
  const gemstones = ["Amethyst","Citrine","Lapis Lazuli","Rose Quartz","Obsidian","Moonstone","Turquoise","Garnet"];
  const directions = ["North","South","East","West","Northeast","Northwest","Southeast","Southwest"];
  const todos = ["Call an old friend you've been thinking about","Focus on one unfinished project with full attention","Learn a new skill or read something inspiring","Meditate for 10 minutes at sunrise","Write down 3 things you're grateful for","Take a nature walk and clear your mind","Reach out to a mentor or guide","Start a creative project you've been postponing","Cook a nourishing meal from scratch","Declutter one area of your living space"];
  const avoids = ["Avoid impulsive financial decisions today","Avoid lending money to casual acquaintances","Avoid unnecessary arguments — choose peace","Don't overcommit to new obligations","Avoid skipping meals or neglecting sleep","Don't suppress your true feelings","Avoid rushing important decisions","Don't rely on second-hand information","Avoid negative social media spirals","Don't isolate yourself when support is near"];
  const powerWordBank = ["Focus","Growth","Clarity","Flow","Rise","Heal","Create","Lead","Trust","Shine","Bloom","Evolve"];
  const moods = [{mood:"Explorer Mode",icon:"🧭"},{mood:"Leader Mode",icon:"👑"},{mood:"Creative Mode",icon:"🎨"},{mood:"Healing Mode",icon:"🌿"},{mood:"Manifestation Mode",icon:"✨"},{mood:"Warrior Mode",icon:"⚔️"},{mood:"Lover Mode",icon:"💫"},{mood:"Visionary Mode",icon:"🔮"}];
  const challenges = ["Speak to one new person and learn something valuable from them.","Complete a task you've been avoiding for over a week.","Express gratitude to someone who rarely hears it from you.","Spend 30 minutes in complete silence and observe your thoughts.","Write a letter to your future self about today's intentions.","Do one act of kindness without expecting anything in return.","Read for 20 minutes on a topic completely outside your comfort zone.","Disconnect from all screens for 2 hours and reconnect with yourself."];
  const allSigns = ["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const compatSigns = allSigns.filter(s => s.toLowerCase() !== sign.toLowerCase());
  const compatReasons = ["Today's Venus trine creates magnetic attraction between you two.","Mercury alignment opens deep, meaningful conversation channels.","The Full Moon amplifies emotional resonance between these signs.","Jupiter's position favors growth and adventure together.","Mars energy creates passionate, dynamic synergy today."];
  const celebrities: Record<string,{name:string;fact:string}[]> = {
    aries:[{name:"Lady Gaga",fact:"Born with fearless Aries fire — she reinvented pop music three times."}],
    taurus:[{name:"Adele",fact:"Her Taurus determination built a voice that moved millions."}],
    gemini:[{name:"Kanye West",fact:"Classic Gemini duality — visionary genius and provocateur in one."},{name:"Marilyn Monroe",fact:"Gemini's charm made her an eternal icon of joy and mystery."},{name:"Elon Musk",fact:"Gemini's restless curiosity took him from PayPal to Mars."}],
    cancer:[{name:"Ariana Grande",fact:"Cancer's emotional depth pours into every single note she sings."}],
    leo:[{name:"Barack Obama",fact:"Leo charisma and leadership transformed global politics."}],
    virgo:[{name:"Beyoncé",fact:"Virgo perfectionism created the most meticulous performances in music."}],
    libra:[{name:"Kim Kardashian",fact:"Libra's love of beauty built a billion-dollar brand empire."}],
    scorpio:[{name:"Leonardo DiCaprio",fact:"Scorpio intensity drove him to 20 years of Oscar-worthy performances."}],
    sagittarius:[{name:"Taylor Swift",fact:"Sagittarius fire and honesty turned personal stories into anthems."}],
    capricorn:[{name:"Michelle Obama",fact:"Capricorn discipline and grace elevated every room she entered."}],
    aquarius:[{name:"Oprah Winfrey",fact:"Aquarius vision built the most influential media empire of the century."}],
    pisces:[{name:"Rihanna",fact:"Pisces creativity birthed music, fashion, and beauty that defied genre."}],
  };
  const tarots = [{card:"The Star",meaning:"Hope, inspiration, and cosmic renewal surround you."},{card:"The Sun",meaning:"Radiant success and joyful clarity light your path."},{card:"The Moon",meaning:"Trust your intuition — hidden truths are surfacing."},{card:"The Wheel",meaning:"Fortune turns in your favor. Embrace the change."},{card:"The Tower",meaning:"Transformation through release. What falls was not serving you."},{card:"The World",meaning:"Completion and wholeness. You are exactly where you belong."},{card:"The Magician",meaning:"You hold every tool you need. Act with intention."},{card:"The High Priestess",meaning:"Stillness reveals wisdom. Listen before you speak."}];
  const manifestations = ["I attract positive opportunities and meaningful connections effortlessly.","Abundance flows toward me in expected and unexpected ways.","I am aligned with my highest purpose and deepest joy.","Every challenge I face strengthens and evolves me.","I radiate love, confidence, and magnetic energy today.","The universe conspires in my favor — I am ready.","I release what no longer serves me and welcome what will."];
  const teasers = ["Tomorrow's energy looks stronger for career and financial breakthroughs.","A powerful full moon energy approaches — rest and prepare.","Tomorrow brings unexpected social opportunities and connections.","Venus moves into alignment — love and beauty amplify tomorrow.","A surge of creative energy is building for tomorrow."];
  const fortunes = ["🌟 Lucky Number: "+num(1,99,rand),"💫 Secret Power: Speak your truth boldly today","🔮 Cosmic Insight: A long-awaited answer arrives soon","✨ Bonus: Your intuition is 3× sharper than usual","🎯 Focus Energy: Creative projects flourish this week","💎 Hidden Gem: A stranger brings a meaningful message","🌙 Moon Blessing: Emotional clarity replaces confusion","⚡ Power Surge: Your energy peaks between 3–6 PM"];
  const colorPick = pick(colors,rand); const moodPick = pick(moods,rand);
  const celebList = celebrities[sign.toLowerCase()] || [{name:"A Great Soul",fact:"Their cosmic energy aligns with yours today."}];
  return {
    cosmicEnergy:num(60,97,rand),cosmicMessage:pick(messages,rand),moonPhase:pick(moonPhases,rand),dominantPlanet:pick(planets,rand),
    horoscope:{
      love:{score:num(55,98,rand),advice:pick(["Open your heart — vulnerability is your superpower today.","A meaningful conversation could deepen an important bond.","Don't overthink what feels naturally right in love.","Express appreciation to those who show up for you."],rand)},
      career:{score:num(55,98,rand),advice:pick(["Your ideas are ahead of their time — speak them clearly.","Focus on one priority instead of scattering your energy.","A collaboration offers more than working alone today.","Your consistency is noticed by people who matter."],rand)},
      money:{score:num(50,95,rand),advice:pick(["Review subscriptions and recurring expenses today.","A small investment in yourself yields long returns.","Patience over impulse leads to smarter financial choices.","Track where your energy and money flow — align them."],rand)},
      health:{score:num(60,98,rand),advice:pick(["Hydration and rest double your natural energy today.","A 20-minute walk shifts your entire mental state.","Listen to subtle body signals before they amplify.","Your mental and physical health are deeply connected now."],rand)},
      family:{score:num(55,95,rand),advice:pick(["A family member needs your patience more than your advice.","Shared meals and laughter heal more than words can.","Bridge a gap that has lingered too long between you.","Small gestures of care create the strongest family bonds."],rand)},
      mental:{score:num(60,98,rand),advice:pick(["Journaling your thoughts creates surprising clarity today.","Give yourself permission to simply rest without guilt.","Your inner dialogue shapes your outer reality — choose kindly.","Breathwork and stillness reset your nervous system completely."],rand)},
    },
    lucky:{color:colorPick.name,colorHex:colorPick.hex,number:num(1,99,rand),gemstone:pick(gemstones,rand),time:pick(["6:00 AM – 8:00 AM","10:00 AM – 12:00 PM","2:00 PM – 4:00 PM","4:00 PM – 6:00 PM","7:00 PM – 9:00 PM"],rand),direction:pick(directions,rand),planet:pick(planets,rand)},
    todo:pickN(todos,3,rand),avoid:pickN(avoids,3,rand),
    opportunities:{love:num(55,96,rand),career:num(60,98,rand),money:num(50,92,rand),health:num(60,97,rand)},
    powerWords:pickN(powerWordBank,3,rand),mood:moodPick.mood,moodIcon:moodPick.icon,
    challenge:pick(challenges,rand),
    compatibility:{sign:pick(compatSigns,rand),score:num(78,98,rand),reason:pick(compatReasons,rand)},
    celebrity:pick(celebList,rand),tarot:pick(tarots,rand),
    manifestation:pick(manifestations,rand),tomorrowTeaser:pick(teasers,rand),
    fortuneRewards:pickN(fortunes,6,rand),
  };
}

// ─── Hooks ────────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    let start = 0; const step = target/(duration/16);
    const t = setInterval(() => { start+=step; if(start>=target){setVal(target);clearInterval(t);}else setVal(Math.floor(start)); },16);
    return () => clearInterval(t);
  }, [target]);
  return val;
}

// Runs a count-up from 0 → target only once the element scrolls into view.
function useCountUpOnVisible<T extends HTMLElement>(target: number, duration = 1200) {
  const [val, setVal] = useState(0);
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let intervalId: ReturnType<typeof setInterval> | null = null;
    const obs = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        obs.disconnect();
        let start = 0; const step = target/(duration/16);
        intervalId = setInterval(() => { start+=step; if(start>=target){setVal(target); if(intervalId) clearInterval(intervalId);} else setVal(Math.floor(start)); },16);
      }
    }, { threshold: 0.35 });
    obs.observe(el);
    return () => { obs.disconnect(); if (intervalId) clearInterval(intervalId); };
  }, [target, duration]);
  return [val, ref] as const;
}

// ─── Daily Horoscope Card (linear bar + score count-up, plays on scroll into view) ──
function HoroscopeCard({icon, label, score, advice, color}:{icon:string; label:string; score:number; advice:string; color:string}) {
  const [count, ref] = useCountUpOnVisible<HTMLDivElement>(score, 1200);
  return (
    <div ref={ref} className="hcard" style={{background:"rgba(89,34,9,0.07)", border:"1px solid rgba(89,34,9,0.25)", borderRadius: 16, padding: "30px 24px"}}>
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom: 24}}>
        <div style={{display:"flex", alignItems:"center", gap: 14}}>
          <span style={{fontSize: 28, opacity: 0.9}}>{icon}</span>
          <span style={{color:"#301607", fontSize: 22, fontWeight: 700}}>{label}</span>
        </div>
        <span style={{color: color, fontSize: 24, fontWeight: 800}}>{count}%</span>
      </div>

      <div style={{height: 4, background:"rgba(89,34,9,0.2)", borderRadius: 2, marginBottom: 24, position:"relative"}}>
        <div style={{width:`${count}%`, height:"100%", background:"linear-gradient(90deg, rgba(89,34,9,0.3), #592209)", borderRadius: 2, position:"relative"}}>
          <div style={{position:"absolute", right: -4, top: -2, width: 8, height: 8, background:"rgba(89,34,9,0.25)", borderRadius:"50%", boxShadow:"0 0 10px rgba(89,34,9,0.3)"}}></div>
        </div>
      </div>

      <div style={{color:"#592209", fontSize: 16, lineHeight: 1.6, fontStyle:"italic"}}>
        {advice}
      </div>
    </div>
  );
}

// ─── Opportunity Meter Circle (0 → target loading animation, plays on scroll into view) ──
function OpportunityCircle({label, value}:{label:string; value:number}) {
  const [count, ref] = useCountUpOnVisible<HTMLDivElement>(value, 1400);
  const circumference = 2 * Math.PI * 85;
  return (
    <div ref={ref} style={{display:"flex", flexDirection:"column", alignItems:"center", gap: 30}}>
      <div style={{fontSize: 20, color:"#301607", fontWeight: 700, letterSpacing:"0.2em"}}>{label}</div>
      <div style={{position:"relative", width: 200, height: 200}}>
        <svg width={200} height={200} style={{transform: "rotate(-90deg)"}}>
          <circle cx={100} cy={100} r={85} fill="none" stroke="rgba(255,126,71,0.15)" strokeWidth={10} />
          <circle cx={100} cy={100} r={85} fill="none" stroke="#ff7e47" strokeWidth={10} strokeLinecap="round" strokeDasharray={`${(count/100) * circumference} ${circumference}`} />
        </svg>
        <div style={{position:"absolute", inset: 0, display:"flex", alignItems:"center", justifyContent:"center"}}>
          <span style={{fontFamily:"'DM Sans', system-ui, sans-serif", fontSize: 48, color:"#301607", fontWeight: 800, letterSpacing:"0.05em"}}>{count}%</span>
        </div>
      </div>
    </div>
  );
}

function getStreak(sign: string): number {
  try { const key=`streak_${sign}`;const dateKey=`streak_date_${sign}`;const today=new Date().toDateString();const stored=localStorage.getItem(dateKey);const streak=parseInt(localStorage.getItem(key)||"0");if(stored===today)return streak;const yesterday=new Date();yesterday.setDate(yesterday.getDate()-1);const newStreak=stored===yesterday.toDateString()?streak+1:1;localStorage.setItem(key,String(newStreak));localStorage.setItem(dateKey,today);return newStreak; } catch{return 1;}
}
function getStreakBadge(s: number) {
  if(s>=100)return{icon:"♾️",name:"Cosmic Legend"};
  if(s>=30)return{icon:"☀️",name:"Solar Master"};
  if(s>=7)return{icon:"🌙",name:"Moon Walker"};
  return{icon:"⭐",name:"Star Seeker"};
}


// ─── Tarot Card ───────────────────────────────────────────────────────────────
function TarotCard({card,meaning}:{card:string;meaning:string}) {
  const [flipped,setFlipped]=useState(false);
  return (
    <div style={{perspective:700,cursor:"pointer"}} onClick={()=>setFlipped(f=>!f)}>
      <div style={{width:220,height:330,position:"relative",transformStyle:"preserve-3d",transition:"transform 0.7s ease",transform:flipped?"rotateY(180deg)":"rotateY(0)"}}>
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",borderRadius:18,overflow:"hidden",border:"2px solid #592209"}}>
          <img src={tarotCardBackImg} alt="Tap to reveal" style={{width:"100%",height:"100%",objectFit:"cover"}}/>
        </div>
        <div style={{position:"absolute",inset:0,backfaceVisibility:"hidden",borderRadius:18,background:"radial-gradient(circle at 50% 30%, #FBF5EC 0%, #FBF5EC 65%, #FBF5EC 100%)",border:"1.5px solid #E58A45",transform:"rotateY(180deg)",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"space-between",gap:10,padding:"26px 20px",textAlign:"center"}}>
          <svg width="54" height="54" viewBox="0 0 100 100" style={{flexShrink:0}}>
            <circle cx="50" cy="50" r="44" fill="none" stroke="#d4af6a" strokeWidth="1" strokeDasharray="2 5" opacity="0.6"/>
            {[0,90,180,270].map(deg => (
              <circle key={deg} cx={50+44*Math.cos(deg*Math.PI/180)} cy={50+44*Math.sin(deg*Math.PI/180)} r="2" fill="#d4af6a" opacity="0.7"/>
            ))}
            <path d="M50 8 C53 38 53 38 84 42 C53 46 53 46 50 92 C47 46 47 46 16 42 C47 38 47 38 50 8 Z" fill="#e8c887"/>
            <path d="M50 26 C51.5 40 51.5 40 66 42 C51.5 44 51.5 44 50 74 C48.5 44 48.5 44 34 42 C48.5 40 48.5 40 50 26 Z" fill="#fff6e0" opacity="0.85"/>
          </svg>
          <div style={{fontFamily:"'DM Sans', system-ui, sans-serif", color:"#6B4A37", fontWeight:700, fontSize:24, letterSpacing:"0.04em"}}>{card}</div>
          <div style={{width:70, height:1, background:"linear-gradient(90deg, transparent, #592209, transparent)"}}></div>
          <div style={{color:"rgba(48,22,7,0.9)", fontSize:14.5, lineHeight:1.6, padding:"0 4px"}}>{meaning}</div>
          <div style={{color:"#6B4A37", fontSize:13, letterSpacing:"0.3em", opacity:0.75}}>•• ☾ ● ☽ ••</div>
        </div>
      </div>
    </div>
  );
}

// ─── Fortune Wheel ────────────────────────────────────────────────────────────
function FortuneWheel({rewards,sign}:{rewards:string[];sign:string}) {
  const [spinning,setSpinning]=useState(false);
  const [result,setResult]=useState<string|null>(null);
  const [rotation,setRotation]=useState(0);
  const [spunToday,setSpunToday]=useState(false);
  useEffect(()=>{
    try{const k=`spun_${sign}_${new Date().toDateString()}`;setSpunToday(!!localStorage.getItem(k));}catch{}
  },[]);
  function spin(){
    if(spinning||spunToday)return;
    setSpinning(true);setResult(null);
    const idx=Math.floor(Math.random()*rewards.length);
    const targetDeg=(5+Math.random()*5)*360+(idx/rewards.length)*360;
    setRotation(prev=>prev+targetDeg);
    setTimeout(()=>{setResult(rewards[idx]);setSpinning(false);setSpunToday(true);try{localStorage.setItem(`spun_${sign}_${new Date().toDateString()}`,"1");}catch{}},3000);
  }
  return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:24}}>
      <div style={{position:"relative"}}>
        <img src={fortuneWheelImg} alt="Fortune wheel" width={300} height={300} style={{borderRadius:"50%",boxShadow:"0 0 40px rgba(89,34,9,0.3)",transform:`rotate(${rotation}deg)`,transition:spinning?"transform 3s cubic-bezier(0.17,0.67,0.12,0.99)":"none"}}/>
        <div style={{position:"absolute",top:-18,left:"50%",transform:"translateX(-50%)",color:"#592209",fontSize:28}}>▼</div>
      </div>
      {result&&<div style={{background:"rgba(89,34,9,0.07)",border:"1px solid rgba(89,34,9,0.3)",borderRadius:16,padding:"20px 30px",textAlign:"center",maxWidth:320}}><div style={{color:"#592209",fontSize:17,fontWeight:700,marginBottom:6}}>Your Fortune</div><div style={{color:"#301607",fontSize:16}}>{result}</div></div>}
      <button onClick={spin} disabled={spinning||spunToday} style={{padding:"16px 44px",background:spunToday?"rgba(89,34,9,0.2)":"linear-gradient(135deg,#ff7e47,#a07830)",border:"none",borderRadius:30,color:spunToday?"rgba(89,34,9,0.3)":"#000",fontWeight:800,fontSize:18,cursor:spunToday?"not-allowed":"pointer",letterSpacing:"0.05em"}}>
        {spunToday?"Come Back Tomorrow":spinning?"Spinning...":"🎡 Spin the Wheel"}
      </button>
    </div>
  );
}

// ─── Constants ────────────────────────────────────────────────────────────────
const SIGN_SYMBOLS:Record<string,string>={aries:"♈",taurus:"♉",gemini:"♊",cancer:"♋",leo:"♌",virgo:"♍",libra:"♎",scorpio:"♏",sagittarius:"♐",capricorn:"♑",aquarius:"♒",pisces:"♓"};
const SIGN_ORDER=["aries","taurus","gemini","cancer","leo","virgo","libra","scorpio","sagittarius","capricorn","aquarius","pisces"];
const HORO_ICONS:Record<string,string>={love:"❤️",career:"💼",money:"💰",health:"🏥",family:"👨‍👩‍👧",mental:"🧠"};
const HORO_LABELS:Record<string,string>={love:"Love",career:"Career",money:"Money",health:"Health",family:"Family",mental:"Mental Wellness"};

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function ZodiacDetail() {
  const { sign = "gemini" } = useParams<{ sign: string }>();
  const signLower = sign.toLowerCase();
  const zodiac = zodiacSigns.find(z => z.name.toLowerCase() === signLower);
  const [daily, setDaily] = useState<DailyData|null>(null);
  const [imgError, setImgError] = useState(false);
  const streak = getStreak(signLower);
  const badge = getStreakBadge(streak);
  const energyCount = useCountUp(daily?.cosmicEnergy ?? 0);
  
  useEffect(()=>{ setDaily(generateDailyData(signLower)); setImgError(false); },[signLower]);

  const now = new Date();
  const todayStr = `${now.toLocaleDateString("en-US", {weekday:"long"})} ${now.toLocaleDateString("en-US", {month:"long"})} ${now.getDate()},${now.getFullYear()}`;

  const prevSign = SIGN_ORDER[(SIGN_ORDER.indexOf(signLower)-1+12)%12];
  const nextSign = SIGN_ORDER[(SIGN_ORDER.indexOf(signLower)+1)%12];
  const zodiacImg = zodiacImages[signLower];

  if (!zodiac || !daily) return (
    <div style={{minHeight:"60vh",display:"flex",alignItems:"center",justifyContent:"center",color:"#592209",fontSize:24}}>Loading cosmic data...</div>
  );

  return (
    <>
      <style>{`
        @keyframes fade-in { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes sun-glow-pulse {
          0%, 100% {
            box-shadow: 0 0 14px 1px rgba(229,138,69,0.45), 0 0 28px 5px rgba(229,138,69,0.22), 0 0 46px 8px rgba(89,34,9,0.1);
          }
          50% {
            box-shadow: 0 0 17px 2px rgba(229,138,69,0.6), 0 0 34px 6px rgba(229,138,69,0.28), 0 0 54px 10px rgba(89,34,9,0.13);
          }
        }
        .zd-sec { animation: fade-in 0.6s ease-out both; }
        .hcard { transition: transform 0.2s ease, border-color 0.2s ease; }
        .hcard:hover { transform: translateY(-4px); border-color: rgba(89,34,9,0.6)!important; }
        .meter-circle { transition: stroke-dasharray 1.5s cubic-bezier(0.4,0,0.2,1); }
        @keyframes sun-breathe { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.015); } }
        .sun-breathe.sun-glow { animation: sun-breathe 4.5s ease-in-out infinite, sun-glow-pulse 3.5s ease-in-out infinite; }
        .sun-glow:not(.sun-breathe) { animation: sun-glow-pulse 3.5s ease-in-out infinite; }
      `}</style>

      {/* ══ Full-width page wrapper ══ */}
      <div style={{width:"100%",maxWidth:1200,margin:"0 auto",padding:"40px 20px 80px",color:"#301607",boxSizing:"border-box", fontFamily: "'DM Sans', system-ui, sans-serif"}}>

        {/* ── HEADER ── */}
        <div className="zd-sec" style={{textAlign:"center", marginBottom: 70, animationDelay: "0.1s"}}>
          <div style={{fontSize: 32, color: "#301607", fontWeight: 400, marginBottom: 6}}>Todays Horoscope</div>
          <div style={{fontSize: 28, color: "#592209", fontWeight: 400}}>{todayStr}</div>
        </div>

        {/* ── HERO (Daily Cosmic Reading) ── */}
        <div className="zd-sec" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap:60, alignItems:"center", marginBottom: 80, animationDelay: "0.2s"}}>
          <div style={{position:"relative", display:"flex", justifyContent:"center"}}>
            <div style={{position:"absolute", inset:"-15%", borderRadius:"50%", background:"radial-gradient(circle, rgba(89,34,9,0.09) 0%, rgba(89,34,9,0.04) 40%, transparent 70%)", filter:"blur(10px)", zIndex:0}}></div>
            {zodiacImg && !imgError ? (
              <img src={zodiacImg} alt={zodiac.name} onError={()=>setImgError(true)} style={{position:"relative", zIndex:1, width:"100%", maxWidth:450, objectFit:"contain"}}/>
            ) : (
              <div style={{position:"relative", zIndex:1, fontSize:180, color:"#592209"}}>{zodiac.symbol}</div>
            )}
          </div>
          <div>
            <div style={{fontSize: 18, color:"#301607", letterSpacing: "0.08em", marginBottom: 20, textTransform: "uppercase"}}>DAILY COSMIC READING</div>

            <div style={{display:"flex", alignItems:"center", gap:16, marginBottom: 6}}>
              <div style={{fontFamily:"'DM Sans', system-ui, sans-serif", fontSize: 48, color:"#301607", fontWeight:700, letterSpacing:"0.1em", textTransform:"uppercase", lineHeight: 1}}>{zodiac.name}</div>
            </div>

            <div style={{fontSize: 22, color:"#301607", marginBottom: 30}}>{zodiac.dates}</div>

            <div style={{display:"flex", gap:16, flexWrap:"nowrap", marginBottom: 36}}>
              <span style={{border:"1px solid rgba(89,34,9,0.5)", borderRadius: 30, padding:"10px 24px", fontSize: 18, color:"rgba(48,22,7,0.75)", background:"rgba(89,34,9,0.2)", whiteSpace:"nowrap"}}>Element : {zodiac.element}</span>
              <span style={{border:"1px solid rgba(89,34,9,0.5)", borderRadius: 30, padding:"10px 24px", fontSize: 18, color:"rgba(48,22,7,0.75)", background:"rgba(89,34,9,0.2)", whiteSpace:"nowrap"}}>Ruler: {zodiac.ruling}</span>
              <span style={{border:"1px solid rgba(89,34,9,0.5)", borderRadius: 30, padding:"10px 24px", fontSize: 18, color:"rgba(48,22,7,0.75)", background:"rgba(89,34,9,0.2)", display:"flex", alignItems:"center", gap:8, whiteSpace:"nowrap"}}>
                {daily.moonPhase}
              </span>
            </div>

            <div style={{fontSize: 18, color:"#301607", lineHeight: 1.6}}>{zodiac.description}</div>
          </div>
        </div>

        {/* ── STREAK & BADGE ── */}
        <div className="zd-sec" style={{display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:20, marginBottom: 80, padding: "0 20px", animationDelay: "0.3s"}}>
          <div>
            <div style={{display:"flex", alignItems:"center", gap:16, marginBottom: 12}}>
              <div style={{border:"1px solid rgba(89,34,9,0.6)", borderRadius: 16, width: 60, height: 60, display:"flex", alignItems:"center", justifyContent:"center"}}>
                <span style={{fontSize: 28}}>🔥</span>
              </div>
              <div style={{fontSize: 28, fontWeight: 700}}>
                <span style={{color:"#301607"}}>{streak}-Days </span>
                <span style={{color:"#592209"}}>Cosmic Streak</span>
              </div>
            </div>
            <div style={{display:"flex", gap:10, paddingLeft: 76}}>
              {[...Array(6)].map((_, i) => (
                <div key={i} style={{width: 32, height: 32, borderRadius:"50%", border:"1px solid rgba(89,34,9,0.2)", display:"flex", alignItems:"center", justifyContent:"center"}}>
                  <span style={{fontSize: 14, color: i < (streak % 6 || 6) ? "#ff7e47" : "rgba(48,22,7,0.45)"}}>★</span>
                </div>
              ))}
            </div>
          </div>
          
          <div style={{border:"1px solid rgba(89,34,9,0.2)", borderRadius: 12, padding:"14px 24px", display:"flex", alignItems:"center", gap:20, background:"rgba(89,34,9,0.07)", minWidth: 220}}>
            <span style={{fontSize: 24, color:"#592209"}}>✨</span>
            <div style={{flex: 1}}>
              <div style={{color:"#592209", fontSize: 14, fontWeight: 700, textTransform:"uppercase"}}>{badge.name}</div>
              <div style={{color:"rgba(48,22,7,0.85)", fontSize: 13}}>Current Badge</div>
            </div>
            <span style={{color:"rgba(48,22,7,0.72)", fontSize: 18}}>&gt;</span>
          </div>
        </div>

        {/* ── TODAY'S COSMIC ENERGY ── */}
        <div className="zd-sec" style={{textAlign:"center", marginBottom: 100, animationDelay: "0.4s"}}>
          <div style={{fontSize: 28, color:"#301607", fontWeight: 700, marginBottom: 50}}>Today's Cosmic Energy</div>
          
          <div style={{display:"flex", justifyContent:"center", marginBottom: 40}}>
            <div className="sun-breathe sun-glow" style={{width: 260, height: 260, borderRadius:"50%", position:"relative", display:"flex", alignItems:"center", justifyContent:"center", border:"5px solid #E58A45"}}>
              <div style={{textAlign:"center", zIndex: 10, display:"flex", flexDirection:"column", alignItems:"center", gap: 4}}>
                <div style={{fontFamily:"'DM Sans', system-ui, sans-serif", fontSize: 64, fontWeight: 700, color:"#301607", lineHeight: 1, letterSpacing: "0.05em"}}>{energyCount}%</div>
                <div style={{fontSize: 16, color:"#592209", fontWeight: 700, letterSpacing: "0.1em", marginTop: 4}}>ENERGY</div>
              </div>
            </div>
          </div>
          
          <div style={{fontSize: 22, color:"#301607", fontStyle:"italic", marginBottom: 30}}>"{daily.cosmicMessage}"</div>
          
          <div style={{display:"flex", justifyContent:"center", gap:40}}>
            <span style={{color:"#301607", fontSize: 20, display:"flex", alignItems:"center", gap:10}}>
              {daily.moonPhase}
            </span>
            <span style={{color:"#301607", fontSize: 20, display:"flex", alignItems:"center", gap:10}}>
              <span style={{fontSize: 24}}>🪐</span> {daily.dominantPlanet}
            </span>
          </div>
        </div>

        {/* ── DAILY HOROSCOPE ── */}
        <div className="zd-sec" style={{marginBottom: 100, animationDelay: "0.5s"}}>
          <div style={{fontSize: 32, color:"#301607", fontWeight: 700, marginBottom: 40, marginLeft: 10}}>Daily Horoscope</div>
          
          <div style={{display:"grid", gridTemplateColumns:"repeat(3, 1fr)", gap: 24}}>
            {(Object.keys(daily.horoscope) as Array<keyof typeof daily.horoscope>).map((key) => {
              const h = daily.horoscope[key];
              const color = h.score >= 80 ? "#4ade80" : h.score >= 65 ? "#ff7e47" : "#f87171";
              return (
                <HoroscopeCard key={key} icon={HORO_ICONS[key]} label={HORO_LABELS[key]} score={h.score} advice={h.advice} color={color} />
              );
            })}
          </div>
        </div>

        {/* ── TODAY'S LUCKY PREDICTIONS ── */}
        <div className="zd-sec" style={{marginBottom: 100, animationDelay: "0.6s"}}>
          <div style={{marginBottom: 40}}>
            <div style={{fontSize: 32, color:"#301607", fontWeight: 700}}>TODAY'S LUCKY PREDICTIONS</div>
          </div>
          
          <div style={{display:"grid", gridTemplateColumns:"repeat(6, 1fr)", gap: 20}}>
            {[
              {icon:luckyColorIcon, label:"LUCKY COLOR", value:daily.lucky.color, dot:daily.lucky.colorHex},
              {icon:luckyNumberIcon, label:"LUCKY NUMBER", value:daily.lucky.number},
              {icon:gemstoneIcon, label:"GEMSTONE", value:daily.lucky.gemstone},
              {icon:luckyTimeIcon, label:"LUCKY TIME", value:daily.lucky.time},
              {icon:directionIcon, label:"DIRECTION", value:daily.lucky.direction},
              {icon:luckyPlanetIcon, label:"LUCKY PLANET", value:daily.lucky.planet},
            ].map(item => (
              <div key={item.label} style={{background:"rgba(89,34,9,0.07)", border:"1px solid rgba(89,34,9,0.3)", borderRadius: 16, padding:"30px 10px", textAlign:"center", display:"flex", flexDirection:"column", alignItems:"center", gap: 24, transition:"transform 0.2s ease"}} onMouseOver={(e)=>e.currentTarget.style.transform="translateY(-4px)"} onMouseOut={(e)=>e.currentTarget.style.transform="translateY(0)"}>
                <img src={item.icon} alt={item.label} style={{width:70, height:70, objectFit:"contain"}}/>
                <div style={{fontSize: 12, color:"#592209", fontWeight: 700, letterSpacing:"0.05em"}}>{item.label}</div>
                <div style={{fontSize: 16, color:"#301607", fontWeight: 700, display:"flex", alignItems:"center", justifyContent:"center", gap:10}}>
                  {item.value}
                  {item.dot && <span style={{width:12, height:12, borderRadius:"50%", background:item.dot, display:"inline-block", flexShrink:0}}></span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── DAILY OPPORTUNITY METER ── */}
        <div className="zd-sec" style={{marginBottom: 100, animationDelay: "0.7s"}}>
          <div style={{marginBottom: 50}}>
            <div style={{fontSize: 32, color:"#301607", fontWeight: 700}}>DAILY OPPORTUNITY METER</div>
          </div>
          
          <div style={{display:"grid", gridTemplateColumns:"repeat(4, 1fr)", gap: 20, justifyItems:"center"}}>
            {[
              {label: "LOVE", value: daily.opportunities.love},
              {label: "CAREER", value: daily.opportunities.career},
              {label: "MONEY", value: daily.opportunities.money},
              {label: "HEALTH", value: daily.opportunities.health},
            ].map((meter) => (
              <OpportunityCircle key={meter.label} label={meter.label} value={meter.value} />
            ))}
          </div>
        </div>

        {/* ── COSMIC ALIGNMENT BANNER ── */}
        <div className="zd-sec" style={{marginBottom: 80, animationDelay: "0.8s"}}>
          <div style={{display:"flex", alignItems:"flex-start", gap: 16, padding: "24px 30px", border:"1px solid rgba(89,34,9,0.3)", borderRadius: 16, background:"rgba(89,34,9,0.07)"}}>
            <div style={{width: 20, height: 20, borderRadius:"50%", border:"2px solid #592209", flexShrink: 0, marginTop: 4}}></div>
            <div style={{fontSize: 18, color:"#301607", lineHeight: 1.7, fontStyle:"italic"}}>
              Your cosmic alignment for <span style={{color:"#592209", fontWeight: 700}}>Career</span> is reaching a peak of <span style={{color:"#592209", fontWeight: 700}}>{daily.horoscope.career.score}%</span>. Today is an ideal time for negotiations or starting high-impact projects as {daily.dominantPlanet} enters your second house.
            </div>
          </div>
        </div>

        {/* ── PERSONALITY & LOVE CARDS ── */}
        <div className="zd-sec" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 30, marginBottom: 80, animationDelay: "0.9s"}}>
          {/* Personality Card */}
          <div className="hcard" style={{background:"linear-gradient(180deg, #FBF5EC 0%, #FBF5EC 100%)", border:"1px solid rgba(89,34,9,0.25)", borderRadius: 16, padding: "36px 30px"}}>
            <div style={{display:"flex", alignItems:"center", gap: 12, marginBottom: 30}}>
              <span style={{fontSize: 24}}>👤</span>
              <span style={{color:"#301607", fontSize: 24, fontWeight: 700}}>Personality</span>
            </div>
            
            <div style={{color:"#592209", fontSize: 14, fontWeight: 700, letterSpacing:"0.08em", marginBottom: 14}}>CORE TRAITS</div>
            <div style={{display:"flex", gap: 10, flexWrap:"wrap", marginBottom: 30}}>
              {zodiac.traits.map(t => (
                <span key={t} style={{border:"1px solid rgba(89,34,9,0.4)", borderRadius: 20, padding:"6px 16px", fontSize: 14, color:"#301607"}}>{t}</span>
              ))}
            </div>
            
            <div style={{color:"#592209", fontSize: 14, fontWeight: 700, letterSpacing:"0.08em", marginBottom: 14}}>STRENGTHS</div>
            <div style={{marginBottom: 30}}>
              {zodiac.strengths.map(s => (
                <div key={s} style={{display:"flex", alignItems:"center", gap: 10, marginBottom: 6, color:"#301607", fontSize: 15}}>
                  <span style={{color:"#592209", fontSize: 12}}>☆</span> {s}
                </div>
              ))}
            </div>
            
            <div style={{color:"#592209", fontSize: 14, fontWeight: 700, letterSpacing:"0.08em", marginBottom: 14}}>CHALLENGES</div>
            <div>
              {zodiac.weaknesses.map(w => (
                <div key={w} style={{display:"flex", alignItems:"center", gap: 10, marginBottom: 6, color:"#301607", fontSize: 15}}>
                  <span style={{color:"#592209", fontSize: 12}}>☆</span> {w}
                </div>
              ))}
            </div>
          </div>

          {/* Love & Relationships Card */}
          <div className="hcard" style={{background:"linear-gradient(180deg, #FBF5EC 0%, #FBF5EC 100%)", border:"1px solid rgba(89,34,9,0.25)", borderRadius: 16, padding: "36px 30px"}}>
            <div style={{display:"flex", alignItems:"center", gap: 12, marginBottom: 30}}>
              <span style={{fontSize: 24}}>❤️</span>
              <span style={{color:"#301607", fontSize: 24, fontWeight: 700}}>Love & Relationships</span>
            </div>
            
            <div style={{color:"#592209", fontSize: 16, lineHeight: 1.7, marginBottom: 40}}>
              {zodiac.description}
            </div>
            
            <div style={{color:"#301607", fontSize: 16, fontWeight: 700, letterSpacing:"0.12em", marginBottom: 18}}>BEST MATCHES</div>
            <div style={{display:"flex", gap: 12, flexWrap:"wrap"}}>
              {zodiac.compatibility.map(c => {
                const matchSign = zodiacSigns.find(z => z.name === c);
                return (
                  <span key={c} style={{border:"1px solid rgba(89,34,9,0.4)", borderRadius: 20, padding:"8px 18px", fontSize: 14, color:"#301607", display:"flex", alignItems:"center", gap: 8}}>
                    <span style={{color:"#592209"}}>{matchSign?.symbol}</span> {c}
                  </span>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── DO TODAY & AVOID ── */}
        <div className="zd-sec" style={{display:"grid", gridTemplateColumns:"1fr 1fr", gap: 30, marginBottom: 100, animationDelay: "1.0s"}}>
          {/* Do Today Card */}
          <div className="hcard" style={{background:"rgba(89,34,9,0.07)", border:"1px solid rgba(89,34,9,0.25)", borderRadius: 16, padding: "36px 30px"}}>
            <div style={{display:"flex", alignItems:"center", gap: 12, marginBottom: 30}}>
              <span style={{fontSize: 24}}>✅</span>
              <span style={{color:"#301607", fontSize: 24, fontWeight: 700}}>Do Today</span>
            </div>
            <div style={{display:"flex", flexDirection:"column", gap: 16}}>
              {daily.todo.map((t, i) => (
                <div key={i} style={{background:"rgba(229,138,69,0.05)", border:"1px solid rgba(229,138,69,0.25)", borderRadius: 8, padding: "16px 20px", display:"flex", alignItems:"center", gap: 12}}>
                  <span style={{color:"#301607", fontSize: 18, fontWeight: 600}}>✓</span>
                  <span style={{color:"#301607", fontSize: 16, fontStyle:"italic"}}>{t}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Things To Avoid Card */}
          <div className="hcard" style={{background:"rgba(89,34,9,0.07)", border:"1px solid rgba(89,34,9,0.25)", borderRadius: 16, padding: "36px 30px"}}>
            <div style={{display:"flex", alignItems:"center", gap: 12, marginBottom: 30}}>
              <span style={{fontSize: 24}}>⚠️</span>
              <span style=  {{color:"#301607", fontSize: 24, fontWeight: 700}}>Things To Avoid</span>
            </div>
            <div style={{display:"flex", flexDirection:"column", gap: 16}}>
              {daily.avoid.map((a, i) => (
                <div key={i} style={{background:"rgba(248, 113, 113, 0.05)", border:"1px solid rgba(248, 113, 113, 0.25)", borderRadius: 8, padding: "16px 20px", display:"flex", alignItems:"center", gap: 12}}>
                  <span style={{color:"#9B2C1D", fontSize: 18, fontWeight: 600, paddingLeft: 2}}>!</span>
                  <span style={{color:"#301607", fontSize: 16, fontStyle:"italic"}}>{a}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── POWER WORDS, MOOD, MANIFESTATION ── */}
        <div className="zd-sec" style={{display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap: 30, marginBottom: 100, animationDelay: "1.1s", textAlign:"center"}}>
          {/* Power Words */}
          <div style={{borderRight:"1px solid rgba(89,34,9,0.2)", paddingRight: 20}}>
            <div style={{marginBottom: 20}}>
              <span style={{color:"#301607", fontSize: 22, fontWeight: 700}}>Today's Power Words</span>
            </div>
            <div style={{display:"flex", justifyContent:"center", gap: 16}}>
              {daily.powerWords.map(w => (
                <span key={w} style={{color:"#592209", fontSize: 20, fontStyle:"italic", fontWeight: 600}}>{w}</span>
              ))}
            </div>
          </div>

          {/* Mood Detector */}
          <div style={{borderRight:"1px solid rgba(89,34,9,0.2)", paddingRight: 20, paddingLeft: 20}}>
            <div style={{marginBottom: 20}}>
              <span style={{color:"#301607", fontSize: 22, fontWeight: 700}}>Cosmic Mood Detector</span>
            </div>
            <div style={{color:"#592209", fontSize: 20, fontStyle:"italic", fontWeight: 600}}>{daily.mood}</div>
          </div>

          {/* Manifestation */}
          <div style={{paddingLeft: 20}}>
            <div style={{marginBottom: 20}}>
              <span style={{color:"#301607", fontSize: 22, fontWeight: 700}}>Today's Manifestation</span>
            </div>
            <div style={{color:"#592209", fontSize: 18, fontStyle:"italic", fontWeight: 600}}>"{daily.manifestation}"</div>
          </div>
        </div>

        {/* ── TODAY'S BEST COMPATIBILITY ── */}
        <div className="zd-sec" style={{textAlign:"center", marginBottom: 100, animationDelay: "1.2s"}}>
          <div style={{marginBottom: 30}}>
            <div style={{fontSize: 28, color:"#301607", fontWeight: 700}}>Today's Best Compatibility</div>
          </div>
          <div style={{fontSize: 64, fontWeight: 800, color:"#301607", fontFamily:"'DM Sans', system-ui, sans-serif", marginBottom: 30}}>{daily.compatibility.score}%</div>
          
          <div style={{display:"flex", justifyContent:"center", gap: 40, marginBottom: 30}}>
            {/* Current Sign */}
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap: 10}}>
              <div style={{width: 54, height: 54, background: "#592209", borderRadius: 12, display:"flex", alignItems:"center", justifyContent:"center", fontSize: 28, color:"#F5E9D6"}}>
                {zodiac.symbol}
              </div>
              <div style={{color:"#301607", fontSize: 16, fontWeight: 600}}>{zodiac.name}</div>
            </div>
            {/* Compatible Sign */}
            <div style={{display:"flex", flexDirection:"column", alignItems:"center", gap: 10}}>
              <div style={{width: 54, height: 54, background: "#592209", borderRadius: 12, display:"flex", alignItems:"center", justifyContent:"center", fontSize: 28, color:"#F5E9D6"}}>
                {SIGN_SYMBOLS[daily.compatibility.sign.toLowerCase()]}
              </div>
              <div style={{color:"#301607", fontSize: 16, fontWeight: 600}}>{daily.compatibility.sign}</div>
            </div>
          </div>

          <div style={{color:"#592209", fontSize: 20, fontStyle:"italic", fontWeight: 600}}>{daily.compatibility.reason}</div>
        </div>

        {/* ── COSMIC FORTUNE WHEEL ── */}
        <div className="zd-sec" style={{textAlign:"center", marginBottom: 100, animationDelay: "1.3s"}}>
          <div style={{marginBottom: 10}}>
            <div style={{fontSize: 28, color:"#301607", fontWeight: 700}}>Cosmic Fortune Wheel</div>
          </div>
          <div style={{fontSize: 16, color:"rgba(48,22,7,0.85)", marginBottom: 40}}>Spin once daily to reveal your cosmic fortune</div>
          <FortuneWheel rewards={daily.fortuneRewards} sign={signLower} />
        </div>

        {/* ── DAILY TAROT REVEAL ── */}
        <div className="zd-sec" style={{textAlign:"center", marginBottom: 100, animationDelay: "1.4s", display:"flex", flexDirection:"column", alignItems:"center"}}>
          <div style={{marginBottom: 10}}>
            <div style={{fontSize: 28, color:"#301607", fontWeight: 700}}>Daily Tarot Reveal</div>
          </div>
          <div style={{fontSize: 16, color:"rgba(48,22,7,0.85)", marginBottom: 40}}>Tap the card to reveal today's cosmic message</div>
          <TarotCard card={daily.tarot.card} meaning={daily.tarot.meaning} />
          <Link to="/compatibility" style={{marginTop: 40, display:"inline-block", border:"1px solid rgba(89,34,9,0.6)", borderRadius: 30, padding:"16px 44px", color:"rgba(48,22,7,0.75)", fontSize: 16, fontWeight: 700, letterSpacing:"0.1em", textDecoration:"none", textTransform:"uppercase", transition:"background 0.2s ease, transform 0.2s ease"}}
            onMouseOver={(e)=>{e.currentTarget.style.background="rgba(255,126,71,0.12)"; e.currentTarget.style.transform="translateY(-2px)";}}
            onMouseOut={(e)=>{e.currentTarget.style.background="transparent"; e.currentTarget.style.transform="translateY(0)";}}>
            Check Compatibility
          </Link>
        </div>

        {/* ── SIGN NAVIGATION ── */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:40,flexWrap:"wrap",gap:16}}>
          <Link to={`/zodiac/${prevSign}`} className="signav"
            style={{display:"flex",alignItems:"center",gap:10,color:"rgba(89,34,9,0.7)",textDecoration:"none",fontSize:16,fontWeight:600,letterSpacing:"0.1em",transition:"color 0.2s"}}>
            ← {prevSign.toUpperCase()}
          </Link>
          <Link to={`/zodiac/${nextSign}`} className="signav"
            style={{display:"flex",alignItems:"center",gap:10,color:"rgba(89,34,9,0.7)",textDecoration:"none",fontSize:16,fontWeight:600,letterSpacing:"0.1em",transition:"color 0.2s"}}>
            {nextSign.toUpperCase()} →
          </Link>
        </div>

      </div>
    </>
  );
}