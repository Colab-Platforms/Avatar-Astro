import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import FeatureIntro from "@/components/FeatureIntro";
import { aiChat } from "@/lib/aiClient";

const fl = document.createElement("link"); fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Space+Mono:wght@400;700&display=swap";
if (!document.head.querySelector("link[href*='Cinzel']")) document.head.appendChild(fl);


const SYSTEM_PROMPT = `You are a Vedic scripture scholar. When given a situation, find the most relevant verse.
Return ONLY a JSON object with exactly these keys (all required, no nulls):
{
  "source": "Bhagavad Gita",
  "chapter": "Chapter 2, Verse 47",
  "devanagari": "कर्मण्येवाधिकारस्ते...",
  "transliteration": "karmany-evadhikaras te...",
  "wordByWord": "karma = action | phala = fruit | adhikara = right",
  "meaning": "Plain English translation of the verse",
  "application": "How this specifically applies to the person's situation (3 sentences)",
  "deeperWisdom": "The deeper philosophical meaning",
  "action": "One concrete action to take today",
  "mantra": "Short key phrase to repeat",
  "mantraCount": "108 times daily for 21 days"
}`;

async function callAI(userMsg) {
  const res = await aiChat({
      temperature: 0.7,
      max_tokens: 1500,
      json: true,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userMsg }
      ]
    });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  const raw = data.choices?.[0]?.message?.content || "{}";
  try { return JSON.parse(raw); } catch { return {}; }
}

const CSS = `
*{box-sizing:border-box;}
.ivw-app{min-height:100vh;background:#050510;color:#fff;font-family:'Astra','Iceland',sans-serif;overflow-x:hidden;position:relative;}
.ivw-stars{position:fixed;inset:0;pointer-events:none;z-index:0;}
.ivw-star{position:absolute;border-radius:50%;background:#fff;animation:twk var(--d,3s) ease-in-out infinite var(--dl,0s);opacity:var(--op,.4);}
@keyframes twk{0%,100%{opacity:var(--op);transform:scale(1);}50%{opacity:.05;transform:scale(.2);}}
.ivw-nb{position:fixed;border-radius:50%;filter:blur(120px);pointer-events:none;z-index:0;}
.ivw-wrap{position:relative;z-index:1;max-width:860px;margin:0 auto;padding:70px 24px 100px;}

/* Back */
.ivw-back{display:inline-flex;align-items:center;gap:6px;font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;color:rgba(188,106,77,.5);text-transform:uppercase;text-decoration:none;margin-bottom:32px;transition:color .3s;}
.ivw-back:hover{color:#BC6A4D;}

/* Header */
.ivw-hdr{text-align:center;margin-bottom:40px;}
.ivw-eyebrow{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:5px;color:#BC6A4D;text-transform:uppercase;margin-bottom:14px;}
.ivw-h1{font-family:'Astra','Iceland',sans-serif;font-size:clamp(24px,6vw,56px);color:#BC6A4D;line-height:1.1;margin-bottom:14px;text-shadow:0 0 60px rgba(188,106,77,.4);}
.ivw-hsub{color:rgba(255,255,255,.55);font-style:italic;font-size:16px;line-height:1.7;}

/* Scripture pills */
.ivw-pills{display:flex;gap:10px;flex-wrap:wrap;justify-content:center;margin-bottom:28px;}
.ivw-pill{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:50px;padding:8px 20px;font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;color:rgba(255,255,255,.55);text-transform:uppercase;cursor:pointer;transition:all .3s;}
.ivw-pill:hover{border-color:rgba(188,106,77,.4);}
.ivw-pill.on{background:rgba(188,106,77,.14);border-color:rgba(188,106,77,.5);color:#BC6A4D;}

/* Form card */
.ivw-form{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:24px;padding:32px;}
.ivw-flabel{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:3px;color:rgba(255,255,255,.48);text-transform:uppercase;display:block;margin-bottom:12px;}
.ivw-ta{width:100%;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);border-radius:14px;padding:18px;color:#fff;font-family:'Astra','Iceland',sans-serif;font-size:16px;line-height:1.7;resize:vertical;min-height:130px;outline:none;transition:border .3s;margin-bottom:20px;}
.ivw-ta:focus{border-color:#BC6A4D;box-shadow:0 0 0 3px rgba(188,106,77,.1);}
.ivw-ta::placeholder{color:rgba(232,224,240,.22);font-size:14px;}

/* Quick prompts */
.ivw-qps{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:22px;}
.ivw-qp{background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.2);border-radius:50px;padding:8px 16px;font-family:'Astra','Iceland',sans-serif;font-style:italic;font-size:15px;color:rgba(255,255,255,.68);cursor:pointer;transition:all .3s;}
.ivw-qp:hover{background:rgba(188,106,77,.16);color:#fff;border-color:rgba(188,106,77,.4);}

.ivw-btn{width:100%;background:linear-gradient(135deg,#BC6A4D,#BC6A4D);color:#03010a;border:none;border-radius:14px;padding:18px;font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;cursor:pointer;font-weight:700;transition:all .3s;}
.ivw-btn:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 40px rgba(188,106,77,.4);}
.ivw-btn:disabled{opacity:.4;cursor:not-allowed;}
.ivw-err{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.25);border-radius:12px;padding:16px;color:#ff6b9d;font-family:'Astra','Iceland',sans-serif;font-size:10px;text-align:center;margin-top:16px;}

/* Loading */
.ivw-loader-wrap{text-align:center;padding:50px 0;}
.ivw-spin{width:56px;height:56px;border:2px solid rgba(188,106,77,.15);border-top-color:#BC6A4D;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 18px;}
@keyframes spin{to{transform:rotate(360deg);}}
.ivw-ltxt{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:3px;color:rgba(188,106,77,.6);text-transform:uppercase;}

/* Result */
.ivw-result{animation:fadein .8s ease-out;}
@keyframes fadein{from{opacity:0;transform:translateY(20px);}to{opacity:1;transform:translateY(0);}}

/* Source header */
.ivw-src-row{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:8px;margin-bottom:28px;text-align:center;}
.ivw-src-badge{display:inline-block;background:rgba(188,106,77,.14);border:1px solid rgba(188,106,77,.4);border-radius:50px;padding:8px 24px;font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:3px;color:#BC6A4D;text-transform:uppercase;}
.ivw-src-chapter{font-family:'Astra','Iceland',sans-serif;font-size:10px;color:rgba(255,255,255,.48);letter-spacing:2px;}

/* Shloka display */
.ivw-shloka{background:linear-gradient(160deg,rgba(188,106,77,.08),rgba(188,106,77,.06));border:1px solid rgba(188,106,77,.25);border-radius:24px;padding:48px 36px;text-align:center;margin-bottom:20px;position:relative;}
.ivw-shloka-deco{position:absolute;font-family:'Astra','Iceland',sans-serif;font-size:22px;color:rgba(188,106,77,.15);}
.ivw-shloka-deco.tl{top:16px;left:24px;}
.ivw-shloka-deco.br{bottom:16px;right:24px;}
.ivw-dev{font-size:clamp(14px,3.5vw,30px);line-height:2.1;color:#BC6A4D;margin-bottom:22px;font-weight:400;letter-spacing:.8px;}
.ivw-roman{font-style:italic;font-size:clamp(14px,2vw,20px);line-height:2;color:rgba(188,106,77,.6);margin-bottom:18px;}
.ivw-wbw-divider{width:60px;height:1px;background:rgba(188,106,77,.2);margin:18px auto;}
.ivw-wbw{font-family:'Astra','Iceland',sans-serif;font-size:10px;color:rgba(255,255,255,.5);line-height:2;}

/* Info sections */
.ivw-sections{display:flex;flex-direction:column;gap:16px;margin-bottom:20px;}

.ivw-sec{border-radius:18px;padding:28px 30px;}
.ivw-sec.meaning{background:rgba(188,106,77,.05);border:1px solid rgba(188,106,77,.2);}
.ivw-sec.application{background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.1);}
.ivw-sec.wisdom{background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.22);}
.ivw-sec.action{background:rgba(188,106,77,.05);border:1px solid rgba(188,106,77,.2);}
.ivw-sec.related{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);}

.ivw-sec-icon{font-size:22px;margin-bottom:10px;display:block;}
.ivw-sec-lbl{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:3px;text-transform:uppercase;margin-bottom:14px;display:block;}
.lbl-meaning{color:rgba(188,106,77,.7);}
.lbl-app{color:rgba(255,255,255,.5);}
.lbl-wisdom{color:rgba(188,106,77,.8);}
.lbl-action{color:rgba(188,106,77,.7);}
.lbl-related{color:rgba(255,255,255,.42);}

.ivw-sec-text{font-size:clamp(14px,2.2vw,21px);line-height:1.85;color:#fff;}
.ivw-sec-text.gold{color:#D9895F;}
.ivw-sec-text.italic{font-style:italic;color:rgba(255,255,255,.88);}
.ivw-sec-text.small{font-size:16px;color:rgba(255,255,255,.62);font-style:italic;}

/* Mantra box */
.ivw-mantra{background:linear-gradient(135deg,rgba(188,106,77,.15),rgba(188,106,77,.08));border:1px solid rgba(188,106,77,.35);border-radius:18px;padding:32px;text-align:center;margin-bottom:20px;}
.ivw-mantra-lbl{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:3px;color:rgba(188,106,77,.8);text-transform:uppercase;margin-bottom:14px;display:block;}
.ivw-mantra-txt{font-family:'Astra','Iceland',sans-serif;font-size:clamp(14px,2.5vw,24px);color:#BC6A4D;letter-spacing:3px;line-height:1.8;margin-bottom:10px;}
.ivw-mantra-count{font-family:'Astra','Iceland',sans-serif;font-size:10px;color:rgba(188,106,77,.6);}

/* Buttons */
.ivw-btns{display:flex;gap:12px;margin-top:8px;}
.ivw-save{flex:1;background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.3);border-radius:12px;padding:16px;color:#BC6A4D;font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .3s;}
.ivw-save:hover{background:rgba(188,106,77,.16);}
.ivw-again{flex:1;background:transparent;border:1px solid rgba(188,106,77,.25);border-radius:12px;padding:16px;color:rgba(188,106,77,.7);font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;cursor:pointer;transition:all .3s;}
.ivw-again:hover{background:rgba(188,106,77,.07);color:#BC6A4D;}

/* Saved */
.ivw-saved-hdr{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:3px;color:rgba(255,255,255,.42);text-transform:uppercase;margin:32px 0 14px;}
.ivw-saved-card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px;padding:16px 20px;margin-bottom:10px;cursor:pointer;transition:border .3s;}
.ivw-saved-card:hover{border-color:rgba(188,106,77,.25);}
.ivw-saved-src{font-family:'Astra','Iceland',sans-serif;font-size:10px;letter-spacing:2px;color:#BC6A4D;margin-bottom:5px;}
.ivw-saved-prev{font-size:15px;color:rgba(255,255,255,.58);font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
`;

const SCRIPTURES = ["Bhagavad Gita","Upanishads","Ramayana","Mahabharata","Vedas","Puranas"];
const QUICK_PROMPTS = [
  "I keep failing despite working hard",
  "My relationship is breaking apart",
  "I can't control my anger",
  "I feel lost and have no purpose",
  "I fear death and the unknown",
  "I'm jealous of others' success",
  "How do I find inner peace?",
  "I feel God has abandoned me",
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

interface FieldProps {
  icon?: string;
  label: string;
  labelClass: string;
  text?: string;
  textClass?: string;
  children?: React.ReactNode;
}

function Field({ icon, label, labelClass, text, textClass, children }: FieldProps) {
  const content = text || children;
  if (!content) return null;
  return (
    <div>
      {icon && <span className="ivw-sec-icon">{icon}</span>}
      <span className={`ivw-sec-lbl ${labelClass}`}>{label}</span>
      <div className={`ivw-sec-text ${textClass || ""}`}>{content}</div>
    </div>
  );
}

export default function InnerVoiceWisdom() {
  const [situation, setSituation] = useState("");
  const [scripture, setScripture] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [savedShlokas, setSavedShlokas] = useState(() => {
    try { return JSON.parse(localStorage.getItem("iv_shlokas") || "[]"); } catch { return []; }
  });
  const [viewingSaved, setViewingSaved] = useState(null);

  useEffect(() => {
    const s = document.createElement("style");
    s.textContent = CSS;
    document.head.appendChild(s);
    return () => { document.head.removeChild(s); };
  }, []);

  const fetchWisdom = async (sit?: string) => {
    const q = (sit || situation).trim();
    if (!q) return;
    if (sit) setSituation(sit);
    setLoading(true); setError(""); setResult(null); setViewingSaved(null);
    try {
      const msg = scripture
        ? `Scripture preference: ${scripture}\n\nMy situation: ${q}`
        : `My situation: ${q}`;
      const data = await callAI(msg);
      if (!data || Object.keys(data).length === 0) throw new Error("Empty response from AI");
      setResult(data);
    } catch(e) {
      console.error("[Sacred Shloka] request failed:", e);
      setError("Could not retrieve wisdom right now. Please try again in a moment.");
    } finally {
      setLoading(false);
    }
  };

  const saveShloka = () => {
    if (!result) return;
    const entry = { id: Date.now(), source: result.source, chapter: result.chapter, situation: situation.slice(0,80), result };
    const updated = [entry, ...savedShlokas].slice(0, 20);
    setSavedShlokas(updated);
    localStorage.setItem("iv_shlokas", JSON.stringify(updated));
  };

  const display = viewingSaved?.result || result;

  return (
    <div className="ivw-app">
      <style>{CSS}</style>
      <StarCanvas />
      <div className="ivw-wrap">
        <Link to="/inner-voice" className="ivw-back">← Inner Voice</Link>

        <div className="ivw-hdr">
          <div className="ivw-eyebrow">Ancient Vedic Scripture</div>
          <h1 className="ivw-h1">Sacred Shloka</h1>
        </div>

        {!display && (
          <FeatureIntro
            className="mb-10"
            description="Discover timeless wisdom from sacred Sanskrit verses and traditional Indian scriptures. Sacred Shloka helps you explore the meaning, context, and practical lessons behind each verse so you can connect ancient teachings with everyday life."
            steps={[
              { title: "Share Your Situation", text: "Describe what you are going through, or pick a quick situation. You may also choose a scripture." },
              { title: "Understand Its Meaning", text: "Read the Sanskrit verse, its transliteration, word meanings and the English meaning." },
              { title: "Apply the Wisdom", text: "Explore how the verse applies to you and the practical action it suggests." },
            ]}
            disclaimer="Verses are suggested by an AI and may contain errors in text, translation or verse numbers. Please verify the verse and its reference in an authentic edition before quoting or relying on it."
          />
        )}

        {!display ? (
          <>
            {/* Scripture filter */}
            <div className="ivw-pills">
              <div className={`ivw-pill${scripture===""?" on":""}`} onClick={()=>setScripture("")}>Any Scripture</div>
              {SCRIPTURES.map(s=>(
                <div key={s} className={`ivw-pill${scripture===s?" on":""}`} onClick={()=>setScripture(s)}>{s}</div>
              ))}
            </div>

            <div className="ivw-form">
              <label className="ivw-flabel">What are you going through?</label>
              <textarea
                className="ivw-ta"
                placeholder={`Describe your situation honestly and specifically...\n\nExample: "I worked hard for 2 years on my startup. It failed. I feel God doesn't reward honest effort."`}
                value={situation}
                onChange={e=>setSituation(e.target.value)}
              />

              <label className="ivw-flabel">Or pick a quick situation</label>
              <div className="ivw-qps">
                {QUICK_PROMPTS.map(p=>(
                  <button key={p} className="ivw-qp" onClick={()=>fetchWisdom(p)}>{p}</button>
                ))}
              </div>

              {loading ? (
                <div className="ivw-loader-wrap">
                  <div className="ivw-spin" />
                  <div className="ivw-ltxt">Searching the scriptures...</div>
                </div>
              ) : (
                <button className="ivw-btn" onClick={()=>fetchWisdom()} disabled={situation.trim().length < 8}>
                  🕉 &nbsp; Receive the Verse
                </button>
              )}
              {error && <div className="ivw-err">⚠ {error}</div>}
            </div>

            {/* Saved shlokas */}
            {savedShlokas.length > 0 && (
              <>
                <div className="ivw-saved-hdr">📿 Your Saved Shlokas ({savedShlokas.length})</div>
                {savedShlokas.map(s=>(
                  <div key={s.id} className="ivw-saved-card" onClick={()=>setViewingSaved(s)}>
                    <div className="ivw-saved-src">{s.source} · {s.chapter}</div>
                    <div className="ivw-saved-prev">{s.situation}...</div>
                  </div>
                ))}
              </>
            )}
          </>
        ) : (
          <div className="ivw-result">

            {/* Source header */}
            <div className="ivw-src-row">
              <span className="ivw-src-badge">{display.source || "Vedic Scripture"}</span>
              {display.chapter && <span className="ivw-src-chapter">{display.chapter}</span>}
            </div>

            {/* The Shloka */}
            <div className="ivw-shloka">
              <span className="ivw-shloka-deco tl">॥</span>
              <span className="ivw-shloka-deco br">॥</span>
              {display.devanagari && <div className="ivw-dev">{display.devanagari}</div>}
              {display.transliteration && <div className="ivw-roman">{display.transliteration}</div>}
              {display.wordByWord && (
                <>
                  <div className="ivw-wbw-divider" />
                  <div className="ivw-wbw">{display.wordByWord}</div>
                </>
              )}
            </div>

            {/* Content sections */}
            <div className="ivw-sections">

              {display.meaning && (
                <div className="ivw-sec meaning">
                  <Field icon="📖" label="English Meaning" labelClass="lbl-meaning" text={display.meaning} textClass="gold" />
                </div>
              )}

              {display.application && (
                <div className="ivw-sec application">
                  <Field icon="🎯" label="How This Speaks to Your Situation" labelClass="lbl-app" text={display.application} />
                </div>
              )}

              {display.deeperWisdom && (
                <div className="ivw-sec wisdom">
                  <Field icon="🔮" label="Deeper Wisdom" labelClass="lbl-wisdom" text={display.deeperWisdom} textClass="italic" />
                </div>
              )}

              {display.action && (
                <div className="ivw-sec action">
                  <Field icon="⚡" label="Practical Lesson for Today" labelClass="lbl-action" text={display.action} />
                </div>
              )}

              {display.relatedVerse && (
                <div className="ivw-sec related">
                  <Field icon="🔗" label="Also See" labelClass="lbl-related" text={display.relatedVerse} textClass="small" />
                </div>
              )}

            </div>

            {/* Mantra */}
            {display.mantra && (
              <div className="ivw-mantra">
                <span className="ivw-mantra-lbl">🕉 Daily Contemplation Mantra</span>
                <div className="ivw-mantra-txt">"{display.mantra}"</div>
                {display.mantraCount && <div className="ivw-mantra-count">↳ {display.mantraCount}</div>}
              </div>
            )}

            <p style={{textAlign:"center",fontSize:13,fontStyle:"italic",color:"rgba(255,255,255,.5)",margin:"4px 0 16px"}}>
              AI-suggested verse — please verify the text and reference in an authentic edition before quoting.
            </p>

            <div className="ivw-btns">
              <button className="ivw-save" onClick={saveShloka}>✦ Save Shloka</button>
              <button className="ivw-again" onClick={()=>{ setResult(null); setViewingSaved(null); setSituation(""); }}>
                ↩ Seek Another
              </button>
            </div>

          </div>
        )}
      </div>
    </div>
  );
}