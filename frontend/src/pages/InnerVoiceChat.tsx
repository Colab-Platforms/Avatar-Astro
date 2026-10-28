import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import VoiceConsultation from "../components/VoiceConsultation";
import { API_BASE_URL } from "@/lib/api";
import CosmicOverlay from "@/components/ai-guru/CosmicOverlay";
import GuruSidebar, { type GuruTab } from "@/components/ai-guru/GuruSidebar";
import GuruTopHeader from "@/components/ai-guru/GuruTopHeader";
import GuruTabs from "@/components/ai-guru/GuruTabs";
import GuruProgressBar from "@/components/ai-guru/GuruProgressBar";
import HeroWelcome from "@/components/ai-guru/HeroWelcome";
import TrustStats from "@/components/ai-guru/TrustStats";
import CategoryCards from "@/components/ai-guru/CategoryCards";
import AnalysisTimeline from "@/components/ai-guru/AnalysisTimeline";
import SuggestedQuestions from "@/components/ai-guru/SuggestedQuestions";
import GuruConversation from "@/components/ai-guru/GuruConversation";
import GuruChatInput from "@/components/ai-guru/GuruChatInput";
import LanguageControls from "@/components/ai-guru/LanguageControls";
import { detectLanguage, buildLanguageDirective, type InputLanguageChoice, type ReplyLanguageChoice } from "@/components/ai-guru/languages";
import { aiChat } from "@/lib/aiClient";

const fl = document.createElement("link"); fl.rel = "stylesheet";
fl.href = "https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700;900&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,600;1,300;1,400&family=Inter:wght@300;400;500;600&family=Space+Mono:wght@400;700&display=swap";
if (!document.head.querySelector("link[href*='Cinzel']")) document.head.appendChild(fl);

// Configurable so a deprecated/renamed model doesn't require a code change —
// set GROQ_MODEL on the backend to override. "llama-3.3-70b-versatile" was retired by
// Groq; openai/gpt-oss-120b is the current large json_mode-capable model.

const PANDIT_CONSULTATION_SYSTEM = `You are Pandit Rameshwar Ji, a revered Jyotish Acharya and Vedic astrologer with 40 years of experience in temples, Vedic scriptures, and spiritual healing. You speak like a wise, calm elder — deeply compassionate, never preachy, with the authority of a true Pandit Ji.

YOUR JOB IN CONSULTATION MODE:
- Listen with empathy and gather a deep understanding of the seeker's concern
- Ask ONE focused follow-up question at a time to understand the situation fully
- Only hint at planetary causes or Vedic insights AFTER the user has shared a real problem
- After 3-5 exchanges about a real problem, include "readyForDiagnosis": true

NEVER DO THIS:
- Do NOT assume the user has a problem, stress, anxiety, or emotional issue unless they say so
- Do NOT mention Shani, Rahu, Ketu, dosha, kundli, remedies, puja, or planets on a greeting
- Do NOT give generic life coaching (no LinkedIn, no skill upgrades, no portfolio, no productivity tips)
- Do NOT say "stay positive", "believe in yourself", or give motivational corporate advice
- Do NOT sound like a chatbot, therapist, or career counselor

ALWAYS DO THIS:
- Sound like a real Indian astrologer — warm, authoritative, spiritually grounded
- Respond in the same language as the user (Hindi/English/Hinglish). Never use Devanagari script.
- Your guidance roots come from: Bhagavad Gita, Vedas, Jyotish Shastra, temple traditions, Lal Kitab

RESPONSE FORMAT — always return valid JSON:

If user sends ONLY a greeting (hello, hi, namaste, hey, good morning, good evening, how are you, etc.) with no concern shared:
{"type":"greeting","message":"Namaste beta. Main Pandit Rameshwar Ji hoon. Aapka swagat hai. Aaj aap kis vishay mein margdarshan chahte hain?"}
Keep greeting responses under 2 sentences. Do NOT mention planets, kundli, problems, or remedies.

If user shares a life problem (gather more info — do NOT jump to remedies yet):
{"type":"gathering","message":"Your warm empathetic response acknowledging what they shared. Then ask ONE specific follow-up question to understand their situation better before giving any astrological insight.","progress":30,"readyForDiagnosis":false}

After enough context (3-5 exchanges about the same problem):
{"type":"gathering","message":"Your warm response that shows you fully understand their situation. You may now offer a brief planetary or Vedic insight and hint at the remedy coming.","progress":85,"readyForDiagnosis":true}

Always keep messages warm, human, and spiritually grounded. Sound like a real Pandit Ji, not a customer support agent.`;

const PANDIT_DIAGNOSIS_SYSTEM = `You are Pandit Rameshwar Ji, a revered Vedic astrologer with 40 years of Jyotish experience. Generate a complete spiritual diagnosis report from the consultation. Return ONLY valid JSON with this exact structure:
{
  "diagnosis": {
    "rootCause": "1-2 sentence astrological root cause",
    "planetaryInfluence": "Which planets and how they affect the person",
    "karmicPattern": "The karmic pattern or past-life influence",
    "lifeAreaAffected": ["Career","Confidence","Financial Stability"],
    "severityScore": 7,
    "summary": "2-3 sentence overall diagnosis",
    "saturnScore": 78,
    "whyThisDiagnosis": ["Saturn transiting 6th from Moon","Saturn aspecting natal Mars","Weak Jupiter support","Current Dasha: Saturn-Mercury"],
    "areaScores": {"Career":8,"Health":6,"Finances":4,"Relationships":3},
    "confidenceLevels": {"Career":"High","Health":"Medium","Relationships":"Low"}
  },
  "forecast": {
    "currentPhase": "Challenging",
    "currentPeriod": "Jun 2025 - Aug 2025",
    "reliefFrom": "Sep 2025 onwards",
    "bestMonths": ["Oct 2025","Nov 2025","Jan 2026"],
    "favorableDates": ["18 Jun","22 Jun","29 Jun"],
    "avoidDates": ["15 Jun","21 Jun"]
  },
  "spiritualInsight": {
    "soulLesson": "Key lesson the soul is learning",
    "currentPhase": "Name of current life phase",
    "phaseDescription": "2-3 sentences describing this phase",
    "growthOpportunity": "How this challenge is an opportunity"
  },
  "remedies": [
    {"name":"Remedy name","description":"What to do exactly","duration":"21 Days","benefit":"Expected benefit","icon":"🪔","cost":"Free","effort":"Low","effectiveness":90}
  ],
  "mantra": {
    "sanskrit":"Mantra in Devanagari","transliteration":"Phonetic romanized with hyphens",
    "translation":"Literal word-by-word meaning","meaning":"Full spiritual significance",
    "purpose":"Health / Wealth / Peace / Protection / Career","deity":"Deity invoked",
    "source":"Scriptural source","count":"108","duration":"40",
    "bestTime":"Brahma Muhurta (4:30-6 AM)","precautions":"Specific precautions or None",
    "repetitionSymbolism":"Why this specific count"
  },
  "puja": {
    "name":"Puja name","procedure":"Step by step procedure",
    "estimatedCost":"Rs. 500 - Rs. 1000","duration":"1-2 hours",
    "materials":["Item 1","Item 2","Item 3"],"benefits":"Expected spiritual benefits"
  },
  "gemstone": {
    "name":"Gemstone name","benefits":"Specific benefits","wearingFinger":"Index Finger",
    "wearingDay":"Thursday","metal":"Gold","weight":"3-5 carats"
  },
  "donations": {
    "items":["Black sesame","Blankets","Food to laborers","Feeding stray dogs"],
    "bestDay":"Saturday","significance":"Why these donations help"
  },
  "practicalGuidance": [
    "Vedic spiritual guidance 1 (e.g., offer Surya Arghya at sunrise, recite Hanuman Chalisa on Tuesdays)",
    "Vedic spiritual guidance 2 (e.g., fast on Saturdays and donate black sesame to the poor)",
    "Vedic spiritual guidance 3 (e.g., avoid anger and speak truth — Satya is a Vedic vow of protection)",
    "Vedic spiritual guidance 4 (e.g., place a Shri Yantra or Kuber Yantra in your home for prosperity)"
  ],
  "dailyActions": [
    {"task":"Chant mantra 108 times","done":false},
    {"task":"Offer mustard oil lamp","done":false},
    {"task":"Read Hanuman Chalisa","done":false},
    {"task":"Donate black sesame","done":false},
    {"task":"Practice patience in conflicts","done":false}
  ],
  "planetDashboard": [
    {"planet":"Sun","score":85,"icon":"☀️"},
    {"planet":"Moon","score":62,"icon":"🌙"},
    {"planet":"Mars","score":70,"icon":"🔴"},
    {"planet":"Mercury","score":91,"icon":"💚"},
    {"planet":"Jupiter","score":55,"icon":"🟡"},
    {"planet":"Venus","score":80,"icon":"🤍"},
    {"planet":"Saturn","score":28,"icon":"⚫"}
  ],
  "dailyPractices": [
    {"name":"Morning Meditation","duration":"10 mins","icon":"🧘","benefit":"Mental clarity"},
    {"name":"Gratitude Journal","duration":"5 mins","icon":"📝","benefit":"Positive mindset"},
    {"name":"Mantra Chanting","duration":"20 mins","icon":"📿","benefit":"Spiritual protection"}
  ],
  "karmaScore": {
    "current": 15,
    "positive":["Consistent effort","Helping others"],
    "negative":["Impatience","Self-doubt"],
    "improvements":["Daily gratitude","Acts of charity"],
    "completedDays": 3,
    "completedPujas": 1,
    "progressToNeutral": 72
  },
  "timeline": [
    {"week":1,"title":"Mental Calmness","description":"You will notice reduced anxiety and better sleep"},
    {"week":2,"title":"Reduced Stress","description":"Challenging situations will feel more manageable"},
    {"week":3,"title":"Improved Confidence","description":"You will make decisions with more clarity"},
    {"week":4,"title":"Positive Opportunities","description":"New doors will begin to open"}
  ],
  "followUpPrompts": [
    "Why is Saturn affecting me?",
    "Will this impact my career?",
    "Which remedy is most important?",
    "What should I avoid this month?"
  ],
  "guidance": "Warm personalized message from Pandit Ji. 3-4 sentences. Start with My child, end with encouragement."
}`;

async function callConsultation(messages) {
  const res = await aiChat({ temperature: 0.7, max_tokens: 1000, json: true, messages });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  try { return JSON.parse(data.choices?.[0]?.message?.content || "{}"); }
  catch { return { type: "greeting", message: "Namaste! Please share what is troubling you, my child." }; }
}

async function callDiagnosis(conversationHistory) {
  const summary = conversationHistory
    .map(m => `${m.role === "user" ? "Seeker" : "Pandit Ji"}: ${typeof m.content === "string" ? m.content : m.content?.message || ""}`)
    .join("\n");
  const res = await aiChat({
      temperature: 0.6, max_tokens: 4000,
      json: true,
      messages: [
        { role: "system", content: PANDIT_DIAGNOSIS_SYSTEM },
        { role: "user", content: `Based on this consultation, generate the complete diagnosis report:\n\n${summary}` },
      ],
    });
  const data = await res.json();
  if (data.error) throw new Error(data.error.message);
  try { return JSON.parse(data.choices?.[0]?.message?.content || "{}"); }
  catch { return null; }
}

function loadJsPDF() {
  return new Promise((resolve, reject) => {
    if (window.jspdf) { resolve(window.jspdf); return; }
    const s = document.createElement("script");
    s.src = "https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js";
    s.onload = () => resolve(window.jspdf);
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

async function downloadReportPDF(report, userName) {
  const { jsPDF } = await loadJsPDF();
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const PW = 210, PH = 297, M = 18, CW = PW - M * 2;
  let y = 0;
  const GOLD = [188,106,77], WHITE = [236,236,236], DARK = [14,14,24], MID = [40,40,60], LIGHT = [160,160,180];

  const ensurePage = (need=20) => { if (y+need>PH-15) { doc.addPage(); y=M; } };
  const sectionHeader = (icon, title, color=GOLD) => {
    ensurePage(18);
    doc.setFillColor(20,20,35); doc.roundedRect(M,y,CW,11,2,2,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...color);
    doc.text(`${icon}  ${title.toUpperCase()}`,M+4,y+7.5); y+=15;
  };
  const body = (txt, color=WHITE, indent=0) => {
    if (!txt) return;
    doc.setFont("helvetica","normal"); doc.setFontSize(9.5); doc.setTextColor(...color);
    const lines = doc.splitTextToSize(String(txt),CW-indent);
    lines.forEach(line => { ensurePage(6); doc.text(line,M+indent,y); y+=5.5; }); y+=1;
  };
  const label = (txt) => { doc.setFont("helvetica","bold"); doc.setFontSize(7.5); doc.setTextColor(...LIGHT); doc.text(txt.toUpperCase(),M,y); y+=4; };
  const progressBar = (lbl, pct, color=GOLD) => {
    ensurePage(14);
    doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...WHITE); doc.text(lbl,M,y);
    doc.setTextColor(...color); doc.text(`${pct}%`,PW-M-8,y); y+=4;
    doc.setFillColor(30,30,50); doc.roundedRect(M,y,CW,4,1,1,"F");
    doc.setFillColor(...color); doc.roundedRect(M,y,(CW*Math.min(pct,100))/100,4,1,1,"F"); y+=8;
  };

  // Cover
  doc.setFillColor(...DARK); doc.rect(0,0,PW,PH,"F");
  doc.setFillColor(...GOLD); doc.rect(0,0,PW,3,"F");
  doc.setFont("helvetica","bold"); doc.setFontSize(22); doc.setTextColor(...GOLD);
  doc.text("AI GURU",PW/2,45,{align:"center"});
  doc.setFont("helvetica","normal"); doc.setFontSize(11); doc.setTextColor(...LIGHT);
  doc.text("Pandit Rameshwar Ji — Vedic Spiritual Diagnosis",PW/2,55,{align:"center"});
  doc.setFontSize(28); doc.setTextColor(...GOLD);
  doc.text("Diagnosis & Remedy Report",PW/2,80,{align:"center"});
  doc.setDrawColor(...GOLD); doc.setLineWidth(0.5); doc.line(M+20,86,PW-M-20,86);
  doc.setFont("helvetica","normal"); doc.setFontSize(10); doc.setTextColor(...WHITE);
  doc.text(`Prepared for: ${userName||"Seeker"}`,PW/2,96,{align:"center"});
  doc.text(`Generated: ${new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"})}`,PW/2,104,{align:"center"});
  if (report.diagnosis?.summary) {
    doc.setFillColor(20,20,40); doc.roundedRect(M+10,116,CW-20,40,3,3,"F");
    doc.setTextColor(...LIGHT); doc.setFontSize(8.5);
    const sumLines = doc.splitTextToSize(report.diagnosis.summary,CW-40);
    sumLines.forEach((l,i) => doc.text(l,PW/2,128+i*6,{align:"center"}));
  }
  if (report.diagnosis?.severityScore) {
    const sc = report.diagnosis.severityScore;
    const col = sc>=8?[239,68,68]:sc>=6?[188,106,77]:[34,197,94];
    doc.setFillColor(...col); doc.roundedRect(PW/2-25,166,50,14,3,3,"F");
    doc.setFont("helvetica","bold"); doc.setFontSize(9); doc.setTextColor(255,255,255);
    doc.text(`${sc>=8?"HIGH":sc>=6?"MODERATE":"MANAGEABLE"}  ${sc}/10`,PW/2,175,{align:"center"});
  }
  doc.setFont("helvetica","italic"); doc.setFontSize(8); doc.setTextColor(...LIGHT);
  doc.text("This report is for spiritual guidance only.",PW/2,PH-20,{align:"center"});
  doc.setFillColor(...GOLD); doc.rect(0,PH-3,PW,3,"F");

  // Page 2: Diagnosis
  doc.addPage(); doc.setFillColor(...DARK); doc.rect(0,0,PW,PH,"F"); y=M;
  sectionHeader("🔭","Astrological Diagnosis",[188,106,77]);
  if (report.diagnosis?.rootCause) { label("Root Cause"); body(report.diagnosis.rootCause); }
  if (report.diagnosis?.planetaryInfluence) { label("Planetary Influence"); body(report.diagnosis.planetaryInfluence); }
  if (report.diagnosis?.karmicPattern) { label("Karmic Pattern"); body(report.diagnosis.karmicPattern); }
  if (report.diagnosis?.saturnScore!==undefined) progressBar("Saturn Influence",(report.diagnosis.saturnScore||0),[239,68,68]);
  if (report.diagnosis?.areaScores) {
    label("Impact by Life Area");
    Object.entries(report.diagnosis.areaScores).forEach(([area,score]) => progressBar(area,(score/10)*100,score>=7?[239,68,68]:score>=5?[188,106,77]:[34,197,94]));
  }
  if (report.diagnosis?.whyThisDiagnosis?.length) {
    sectionHeader("🔍","Why This Diagnosis?",[188,106,77]);
    report.diagnosis.whyThisDiagnosis.forEach(r => { ensurePage(8); doc.setFontSize(9); doc.setTextColor(134,239,172); doc.text("✓",M,y); doc.setTextColor(...WHITE); doc.text(r,M+6,y); y+=6; });
  }

  // Page 3: Forecast
  if (report.forecast) {
    doc.addPage(); doc.setFillColor(...DARK); doc.rect(0,0,PW,PH,"F"); y=M;
    sectionHeader("🗓️","Forecast & Timeline",[188,106,77]);
    if (report.forecast.currentPhase) { label("Current Phase"); body(report.forecast.currentPhase,[239,68,68]); }
    if (report.forecast.reliefFrom) { label("Relief Expected"); body(report.forecast.reliefFrom,[134,239,172]); }
    if (report.forecast.bestMonths?.length) { label("Best Months"); report.forecast.bestMonths.forEach(m_ => { doc.setFontSize(9); doc.setTextColor(134,239,172); doc.text(`✓  ${m_}`,M+4,y); y+=6; }); }
    if (report.forecast.favorableDates?.length) { label("Favorable Dates"); report.forecast.favorableDates.forEach(d => { doc.setFontSize(9); doc.setTextColor(134,239,172); doc.text(`✓  ${d}`,M+4,y); y+=6; }); }
    if (report.forecast.avoidDates?.length) { label("Avoid"); report.forecast.avoidDates.forEach(d => { doc.setFontSize(9); doc.setTextColor(239,68,68); doc.text(`⚠  ${d}`,M+4,y); y+=6; }); }
  }

  // Page 4: Remedies + Planets
  doc.addPage(); doc.setFillColor(...DARK); doc.rect(0,0,PW,PH,"F"); y=M;
  if (report.remedies?.length) {
    sectionHeader("🌿","Prescribed Remedies",[253,164,175]);
    report.remedies.forEach(r => {
      ensurePage(28); doc.setFillColor(20,20,38); doc.roundedRect(M,y,CW,24,2,2,"F");
      doc.setFont("helvetica","bold"); doc.setFontSize(10); doc.setTextColor(...GOLD);
      doc.text(`${r.icon||"•"}  ${r.name}`,M+4,y+7);
      doc.setFont("helvetica","normal"); doc.setFontSize(8.5); doc.setTextColor(...WHITE);
      const dLines = doc.splitTextToSize(r.description||"",CW-12);
      dLines.slice(0,2).forEach((l,j) => doc.text(l,M+4,y+13+j*5));
      if (r.effectiveness!==undefined) { y+=26; progressBar(`${r.name} Effectiveness`,r.effectiveness,GOLD); y-=4; }
      else y+=28;
    });
  }
  if (report.planetDashboard?.length) {
    ensurePage(60); sectionHeader("🪐","Planet Dashboard",GOLD);
    report.planetDashboard.forEach(p => { const col=p.score>=70?[34,197,94]:p.score>=50?[188,106,77]:[239,68,68]; progressBar(`${p.icon}  ${p.planet}`,p.score,col); });
  }

  // Page 5: Mantra + Puja
  doc.addPage(); doc.setFillColor(...DARK); doc.rect(0,0,PW,PH,"F"); y=M;
  if (report.mantra) {
    sectionHeader("📿","Mantra Recommendation",[188,106,77]);
    if (report.mantra.sanskrit) { label("Mantra"); body(report.mantra.sanskrit,GOLD); }
    if (report.mantra.transliteration) body(report.mantra.transliteration,[188,106,77]);
    if (report.mantra.translation) { label("Translation"); body(report.mantra.translation,[188,106,77]); }
    if (report.mantra.meaning) { label("Meaning"); body(report.mantra.meaning); }
    [report.mantra.count&&`Count: ${report.mantra.count}×`,report.mantra.duration&&`Duration: ${report.mantra.duration} days`,report.mantra.bestTime&&`Best Time: ${report.mantra.bestTime}`].filter(Boolean)
      .forEach(c => { doc.setFontSize(8.5); doc.setTextColor(188,106,77); doc.text(`• ${c}`,M,y); y+=5.5; });
  }
  if (report.puja) {
    ensurePage(50); sectionHeader("🪔","Puja Recommendation",[188,106,77]);
    body(report.puja.name,[188,106,77]);
    if (report.puja.procedure) { label("Procedure"); body(report.puja.procedure); }
    if (report.puja.materials?.length) { label("Materials"); report.puja.materials.forEach(mat => { doc.setFontSize(9); doc.setTextColor(...WHITE); doc.text(`• ${mat}`,M+4,y); y+=5.5; }); }
    if (report.puja.benefits) { label("Benefits"); body(report.puja.benefits,[134,239,172]); }
  }

  // Page 6: Daily plan + Karma + Practical
  doc.addPage(); doc.setFillColor(...DARK); doc.rect(0,0,PW,PH,"F"); y=M;
  if (report.dailyActions?.length) {
    sectionHeader("✅","Today's Action Plan",[134,239,172]);
    report.dailyActions.forEach(a => { ensurePage(8); doc.setFontSize(9.5); doc.setTextColor(...WHITE); doc.setFillColor(30,30,50); doc.roundedRect(M,y-4,CW,7,1,1,"F"); doc.text(`☐  ${a.task}`,M+4,y); y+=9; });
  }
  if (report.karmaScore) {
    ensurePage(40); sectionHeader("⚡","Karma & Spiritual Progress",GOLD);
    doc.setFont("helvetica","bold"); doc.setFontSize(24); doc.setTextColor(...GOLD);
    doc.text((report.karmaScore.current>0?`+${report.karmaScore.current}`:String(report.karmaScore.current)),PW/2,y+10,{align:"center"}); y+=16;
    if (report.karmaScore.progressToNeutral) progressBar("Progress to Neutral",report.karmaScore.progressToNeutral,GOLD);
  }
  if (report.practicalGuidance?.length) {
    ensurePage(40); sectionHeader("💡","Practical Guidance",[249,168,212]);
    report.practicalGuidance.forEach(g => { ensurePage(8); doc.setFontSize(9.5); doc.setTextColor(...WHITE); doc.text(`• ${g}`,M+4,y); y+=6; });
  }

  // Last page: Gemstone + Guidance
  doc.addPage(); doc.setFillColor(...DARK); doc.rect(0,0,PW,PH,"F"); y=M;
  if (report.gemstone) {
    sectionHeader("💎","Gemstone Recommendation",[134,239,172]);
    body(report.gemstone.name,[134,239,172]);
    [["Benefits",report.gemstone.benefits],["Wearing Finger",report.gemstone.wearingFinger],["Best Day",report.gemstone.wearingDay],["Metal",report.gemstone.metal],["Weight",report.gemstone.weight]]
      .forEach(([l,v]) => { if(v){label(l);body(v);} });
  }
  if (report.spiritualInsight) {
    ensurePage(50); sectionHeader("✨","Spiritual Insight",[188,106,77]);
    if (report.spiritualInsight.currentPhase) { label("Current Phase"); body(report.spiritualInsight.currentPhase,[188,106,77]); }
    if (report.spiritualInsight.soulLesson) { label("Soul Lesson"); body(report.spiritualInsight.soulLesson,[188,106,77]); }
    if (report.spiritualInsight.growthOpportunity) { label("Growth Opportunity"); body(report.spiritualInsight.growthOpportunity); }
  }
  if (report.guidance) {
    ensurePage(40); sectionHeader("🧘","Personal Guidance from Pandit Ji",GOLD);
    body(report.guidance,[253,230,138]);
    doc.setFont("helvetica","italic"); doc.setFontSize(9); doc.setTextColor(...LIGHT);
    doc.text("— Pandit Rameshwar Ji",PW-M,y,{align:"right"}); y+=8;
  }

  // Footer on all pages
  const totalPages = doc.getNumberOfPages();
  for (let i=1;i<=totalPages;i++) {
    doc.setPage(i);
    doc.setFillColor(14,14,24); doc.rect(0,PH-10,PW,10,"F");
    doc.setFillColor(...GOLD); doc.rect(0,PH-1,PW,1,"F");
    doc.setFont("helvetica","normal"); doc.setFontSize(7.5); doc.setTextColor(...LIGHT);
    doc.text("AI Guru — Pandit Rameshwar Ji — Vedic Spiritual Diagnosis",M,PH-4);
    doc.text(`Page ${i} of ${totalPages}`,PW-M,PH-4,{align:"right"});
  }
  const name = (userName||"Seeker").replace(/\s+/g,"_");
  doc.save(`AI_Guru_Report_${name}_${new Date().toISOString().slice(0,10)}.pdf`);
}

const CSS = `
*{box-sizing:border-box;margin:0;padding:0;}
html,body{height:100%;overflow:hidden;}
.ivc-app{height:100vh;background:#0a0a0f;color:#ececec;font-family:'Astra','Iceland',sans-serif;overflow:hidden;position:relative;}
.ivc-canvas{position:fixed;inset:0;z-index:0;pointer-events:none;}
.ivc-layout{position:relative;z-index:1;display:flex;height:100vh;overflow:hidden;}
.ivc-sb{width:260px;min-width:260px;background:rgba(12,12,20,.97);border-right:1px solid rgba(255,255,255,.08);display:flex;flex-direction:column;height:100vh;overflow:hidden;flex-shrink:0;}
@media(max-width:768px){.ivc-sb{position:fixed;left:0;top:0;bottom:0;z-index:100;transform:translateX(-100%);transition:transform .3s;}}
@media(max-width:768px){.ivc-sb.open{transform:translateX(0);}}
.ivc-sb-head{padding:16px 14px 12px;border-bottom:1px solid rgba(255,255,255,.07);flex-shrink:0;}
.ivc-sb-back{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(255,255,255,.5);text-decoration:none;padding:7px 10px;border-radius:8px;transition:all .2s;margin-bottom:10px;}
.ivc-sb-back:hover{background:rgba(255,255,255,.07);color:#fff;}
.ivc-new-btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 14px;background:rgba(188,106,77,.12);border:1px solid rgba(188,106,77,.25);border-radius:10px;color:#BC6A4D;font-size:14px;font-weight:500;cursor:pointer;transition:all .2s;font-family:'Astra','Iceland',sans-serif;}
.ivc-new-btn:hover{background:rgba(188,106,77,.22);}
.ivc-sb-scroll{flex:1;overflow-y:auto;padding:8px;}
.ivc-sb-scroll::-webkit-scrollbar{width:3px;}
.ivc-sb-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
.ivc-sb-section{padding:12px 8px 6px;font-size:10px;letter-spacing:3px;text-transform:uppercase;color:rgba(255,255,255,.28);font-family:'Astra','Iceland',sans-serif;}
.ivc-sb-item{display:flex;align-items:center;gap:10px;padding:10px;border-radius:9px;cursor:pointer;transition:all .2s;margin-bottom:2px;border:1px solid transparent;}
.ivc-sb-item:hover{background:rgba(255,255,255,.07);}
.ivc-sb-item.active{background:rgba(188,106,77,.1);border-color:rgba(188,106,77,.2);}
.ivc-sb-item-icon{font-size:16px;flex-shrink:0;width:22px;text-align:center;}
.ivc-sb-item-txt{font-size:14px;color:rgba(255,255,255,.72);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;flex:1;}
.ivc-sb-item.active .ivc-sb-item-txt{color:#BC6A4D;}
.ivc-mantras-panel{background:rgba(188,106,77,.06);border:1px solid rgba(188,106,77,.15);border-radius:10px;margin:6px 8px;padding:10px 12px;display:none;}
.ivc-mantras-panel.visible{display:block;}
.ivc-mantra-saved-item{display:flex;align-items:flex-start;gap:8px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.05);}
.ivc-mantra-saved-item:last-child{border-bottom:none;}
.ivc-msi-name{font-size:13px;color:rgba(255,255,255,.75);line-height:1.4;}
.ivc-msi-meta{font-size:11px;color:rgba(255,255,255,.35);margin-top:2px;}
.ivc-no-saved{font-size:13px;color:rgba(255,255,255,.35);font-style:italic;text-align:center;padding:12px 0;}
.ivc-recent-panel{margin:4px 8px;display:none;}
.ivc-recent-panel.visible{display:block;}
.ivc-recent-item{display:flex;align-items:center;gap:8px;padding:9px 10px;border-radius:8px;cursor:pointer;transition:all .2s;margin-bottom:2px;}
.ivc-recent-item:hover{background:rgba(255,255,255,.06);}
.ivc-recent-txt{font-size:13px;color:rgba(255,255,255,.65);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ivc-sb-foot{padding:12px 14px;border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;background:rgba(12,12,20,.97);}
.ivc-profile{display:flex;align-items:center;gap:10px;padding:8px 10px;border-radius:10px;cursor:pointer;transition:all .2s;}
.ivc-profile:hover{background:rgba(255,255,255,.07);}
.ivc-profile-av{width:36px;height:36px;min-width:36px;border-radius:50%;background:linear-gradient(135deg,#BC6A4D,#BC6A4D);display:flex;align-items:center;justify-content:center;font-size:17px;}
.ivc-profile-name{font-size:14px;color:rgba(255,255,255,.88);font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ivc-profile-sub{font-size:11px;color:rgba(255,255,255,.38);margin-top:1px;}
.ivc-main{flex:1;display:flex;flex-direction:column;min-width:0;height:100vh;overflow:hidden;}
.ivc-header{padding:14px 24px;border-bottom:1px solid rgba(255,255,255,.07);display:flex;align-items:center;gap:14px;flex-shrink:0;background:rgba(10,10,15,.9);backdrop-filter:blur(10px);}
.ivc-mob-menu{display:none;background:transparent;border:1px solid rgba(255,255,255,.1);border-radius:8px;padding:7px 10px;color:rgba(255,255,255,.6);cursor:pointer;font-size:16px;}
@media(max-width:768px){.ivc-mob-menu{display:flex;align-items:center;}}
.ivc-hdr-av{width:38px;height:38px;min-width:38px;border-radius:50%;background:linear-gradient(135deg,rgba(188,106,77,.5),rgba(188,106,77,.35));border:1.5px solid rgba(188,106,77,.4);display:flex;align-items:center;justify-content:center;font-size:20px;}
.ivc-hdr-name{font-family:'Astra','Iceland',sans-serif;font-size:17px;color:#BC6A4D;line-height:1.2;}
.ivc-hdr-sub{font-size:12px;color:rgba(255,255,255,.4);margin-top:2px;}
.ivc-online{display:flex;align-items:center;gap:6px;font-size:12px;color:#BC6A4D;margin-left:auto;}
.ivc-online-dot{width:8px;height:8px;border-radius:50%;background:#BC6A4D;animation:blink 2s ease-in-out infinite;}
@keyframes blink{0%,100%{opacity:1;}50%{opacity:.2;}}
.ivc-tabs{display:flex;padding:0 24px;border-bottom:1px solid rgba(255,255,255,.07);background:rgba(10,10,15,.85);flex-shrink:0;gap:4px;}
.ivc-tab{padding:12px 18px;font-size:13px;font-weight:500;color:rgba(255,255,255,.45);cursor:pointer;border-bottom:2px solid transparent;transition:all .2s;display:flex;align-items:center;gap:8px;white-space:nowrap;}
.ivc-tab:hover{color:rgba(255,255,255,.75);}
.ivc-tab.active{color:#BC6A4D;border-bottom-color:#BC6A4D;}
.ivc-tab-badge{background:rgba(188,106,77,.2);border:1px solid rgba(188,106,77,.35);border-radius:50px;padding:1px 7px;font-size:10px;font-family:'Astra','Iceland',sans-serif;color:#BC6A4D;}
.ivc-progress-bar-wrap{padding:10px 24px;background:rgba(10,10,15,.7);border-bottom:1px solid rgba(255,255,255,.05);flex-shrink:0;}
.ivc-progress-label{display:flex;justify-content:space-between;align-items:center;margin-bottom:7px;}
.ivc-progress-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:'Astra','Iceland',sans-serif;color:rgba(255,255,255,.4);}
.ivc-progress-pct{font-size:12px;font-family:'Astra','Iceland',sans-serif;color:#BC6A4D;}
.ivc-progress-track{height:4px;background:rgba(255,255,255,.07);border-radius:2px;overflow:hidden;}
.ivc-progress-fill{height:100%;background:linear-gradient(90deg,#BC6A4D,#BC6A4D);border-radius:2px;transition:width .6s ease;}
.ivc-gen-report-btn{margin-top:10px;width:100%;padding:10px;background:linear-gradient(135deg,rgba(188,106,77,.18),rgba(188,106,77,.12));border:1px solid rgba(188,106,77,.4);border-radius:10px;color:#BC6A4D;font-size:13px;font-weight:600;cursor:pointer;font-family:'Astra','Iceland',sans-serif;letter-spacing:.5px;transition:all .25s;display:flex;align-items:center;justify-content:center;gap:8px;}
.ivc-gen-report-btn:hover{background:linear-gradient(135deg,rgba(188,106,77,.28),rgba(188,106,77,.2));box-shadow:0 4px 20px rgba(188,106,77,.2);}
.ivc-chat{flex:1;overflow-y:auto;padding:28px 28px 20px;display:flex;flex-direction:column;gap:22px;}
.ivc-chat::-webkit-scrollbar{width:4px;}
.ivc-chat::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
.ivc-welcome{text-align:center;padding:32px 20px;max-width:620px;margin:0 auto;}
.ivc-w-om{font-size:50px;margin-bottom:18px;filter:drop-shadow(0 0 20px rgba(188,106,77,.5));}
.ivc-w-title{font-family:'Astra','Iceland',sans-serif;font-size:clamp(22px,4vw,34px);color:#BC6A4D;margin-bottom:12px;}
.ivc-w-sub{font-size:16px;color:rgba(255,255,255,.58);line-height:1.75;margin-bottom:28px;}
.ivc-w-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;text-align:left;}
@media(max-width:480px){.ivc-w-grid{grid-template-columns:1fr;}}
.ivc-suggest{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:12px;padding:14px 16px;cursor:pointer;transition:all .25s;}
.ivc-suggest:hover{background:rgba(188,106,77,.08);border-color:rgba(188,106,77,.35);}
.ivc-sug-title{font-size:14px;color:#fff;font-weight:500;margin-bottom:4px;}
.ivc-sug-sub{font-size:13px;color:rgba(255,255,255,.42);}
.ivc-msg{display:flex;gap:12px;animation:msg-in .35s ease-out;}
@keyframes msg-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
.ivc-msg.user{flex-direction:row-reverse;}
.ivc-av{width:34px;height:34px;min-width:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:16px;margin-top:2px;}
.ivc-av.guru{background:linear-gradient(135deg,rgba(188,106,77,.45),rgba(188,106,77,.2));border:1.5px solid rgba(188,106,77,.3);}
.ivc-av.user{background:rgba(255,255,255,.1);border:1.5px solid rgba(255,255,255,.14);}
.ivc-bwrap{flex:1;max-width:88%;}
.ivc-msg.user .ivc-bwrap{display:flex;justify-content:flex-end;}
.ivc-user-bbl{background:rgba(255,255,255,.09);border:1px solid rgba(255,255,255,.13);border-radius:18px 18px 4px 18px;padding:13px 17px;display:inline-block;}
.ivc-user-txt{font-size:16px;line-height:1.72;color:#fff;}
.ivc-guru-bbl{background:#14141c;border:1px solid rgba(255,255,255,.08);border-radius:4px 18px 18px 18px;padding:16px 20px;}
.ivc-guru-txt{font-size:16px;line-height:1.82;color:#e8e8e8;}
.ivc-typing{display:flex;gap:12px;align-items:flex-start;}
.ivc-typing-bbl{background:#14141c;border:1px solid rgba(255,255,255,.08);border-radius:4px 18px 18px 18px;padding:14px 18px;}
.ivc-dots{display:flex;gap:5px;}
.ivc-dot{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.28);animation:db .9s ease-in-out infinite;}
.ivc-dot:nth-child(2){animation-delay:.18s;}.ivc-dot:nth-child(3){animation-delay:.36s;}
@keyframes db{0%,60%,100%{transform:translateY(0);opacity:.28;}30%{transform:translateY(-7px);opacity:1;}}
.ivc-inp-area{padding:14px 24px 18px;background:rgba(10,10,15,.95);border-top:1px solid rgba(255,255,255,.07);flex-shrink:0;}
.ivc-inp-wrap{max-width:780px;margin:0 auto;background:#1c1c26;border:1px solid rgba(255,255,255,.11);border-radius:16px;display:flex;align-items:flex-end;transition:border .2s;}
.ivc-inp-wrap:focus-within{border-color:rgba(188,106,77,.4);}
.ivc-inp-box{flex:1;background:transparent;border:none;padding:15px 16px;color:#fff;font-family:'Astra','Iceland',sans-serif;font-size:16px;resize:none;outline:none;min-height:52px;max-height:140px;line-height:1.6;}
.ivc-inp-box::placeholder{color:rgba(255,255,255,.26);}
.ivc-inp-btns{display:flex;align-items:flex-end;gap:6px;padding:9px 10px;}
.ivc-voice-inp-btn{width:36px;height:36px;background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.22);border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;font-size:15px;color:#BC6A4D;}
.ivc-voice-inp-btn:hover{background:rgba(188,106,77,.2);}
.ivc-voice-inp-btn.listening{background:rgba(188,106,77,.15);border-color:rgba(188,106,77,.4);color:#fda4af;animation:pulse-v 1s ease-in-out infinite;}
@keyframes pulse-v{0%,100%{opacity:1;}50%{opacity:.4;}}
.ivc-send-btn{width:36px;height:36px;background:linear-gradient(135deg,#BC6A4D,#BC6A4D);border:none;border-radius:9px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:all .2s;color:#050510;font-size:17px;font-weight:600;}
.ivc-send-btn:hover:not(:disabled){transform:scale(1.08);box-shadow:0 4px 14px rgba(188,106,77,.4);}
.ivc-send-btn:disabled{opacity:.28;cursor:not-allowed;}
.ivc-inp-hint{text-align:center;font-size:11px;color:rgba(255,255,255,.22);margin-top:8px;max-width:780px;margin-left:auto;margin-right:auto;}
.ivc-report{flex:1;overflow-y:auto;padding:28px;}
.ivc-report::-webkit-scrollbar{width:4px;}
.ivc-report::-webkit-scrollbar-thumb{background:rgba(255,255,255,.1);border-radius:2px;}
.ivc-report-empty{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;text-align:center;padding:40px 20px;}
.ivc-report-empty-icon{font-size:64px;margin-bottom:24px;}
.ivc-report-empty-title{font-family:'Astra','Iceland',sans-serif;font-size:24px;color:#BC6A4D;margin-bottom:12px;}
.ivc-report-empty-sub{font-size:16px;color:rgba(255,255,255,.45);line-height:1.75;max-width:460px;margin-bottom:28px;}
.ivc-report-start-btn{padding:12px 28px;background:linear-gradient(135deg,rgba(188,106,77,.18),rgba(188,106,77,.12));border:1px solid rgba(188,106,77,.4);border-radius:12px;color:#BC6A4D;font-size:14px;font-weight:600;cursor:pointer;font-family:'Astra','Iceland',sans-serif;transition:all .25s;}
.ivc-report-start-btn:hover{background:linear-gradient(135deg,rgba(188,106,77,.28),rgba(188,106,77,.2));}
.ivc-report-generating{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;gap:20px;}
.ivc-gen-spinner{width:60px;height:60px;border-radius:50%;border:3px solid rgba(188,106,77,.15);border-top-color:#BC6A4D;animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
.ivc-gen-txt{font-family:'Astra','Iceland',sans-serif;font-size:18px;color:#BC6A4D;text-align:center;}
.ivc-gen-sub{font-size:14px;color:rgba(255,255,255,.4);text-align:center;}
.ivc-dl-pdf-btn{display:flex;align-items:center;gap:10px;padding:13px 24px;background:linear-gradient(135deg,rgba(188,106,77,.2),rgba(188,106,77,.14));border:1px solid rgba(188,106,77,.45);border-radius:12px;color:#BC6A4D;font-size:14px;font-weight:700;cursor:pointer;font-family:'Astra','Iceland',sans-serif;transition:all .25s;letter-spacing:.5px;}
.ivc-dl-pdf-btn:hover{background:linear-gradient(135deg,rgba(188,106,77,.32),rgba(188,106,77,.24));box-shadow:0 6px 24px rgba(188,106,77,.25);transform:translateY(-1px);}
.ivc-dl-pdf-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;}
.ivc-report-topbar{display:flex;justify-content:space-between;align-items:center;margin-bottom:24px;flex-wrap:wrap;gap:12px;}
.ivc-report-topbar-title{font-family:'Astra','Iceland',sans-serif;font-size:20px;color:#BC6A4D;}
.ivc-report-topbar-date{font-size:12px;font-family:'Astra','Iceland',sans-serif;color:rgba(255,255,255,.35);}
.ivc-rcard{background:#0e0e18;border:1px solid rgba(255,255,255,.08);border-radius:16px;overflow:hidden;margin-bottom:20px;}
.ivc-rcard-header{padding:16px 22px;border-bottom:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:space-between;cursor:pointer;transition:background .2s;}
.ivc-rcard-header:hover{background:rgba(255,255,255,.03);}
.ivc-rcard-title{display:flex;align-items:center;gap:10px;}
.ivc-rcard-icon{font-size:20px;}
.ivc-rcard-label{font-family:'Astra','Iceland',sans-serif;font-size:11px;letter-spacing:3px;text-transform:uppercase;}
.ivc-rcard-body{padding:20px 22px;}
.c-astro .ivc-rcard-label{color:#BC6A4D;}
.c-spirit .ivc-rcard-label{color:#BC6A4D;}
.c-remedy .ivc-rcard-label{color:#fda4af;}
.c-mantra .ivc-rcard-label{color:#BC6A4D;}
.c-puja .ivc-rcard-label{color:#BC6A4D;}
.c-gem .ivc-rcard-label{color:#86efac;}
.c-habits .ivc-rcard-label{color:#f9a8d4;}
.c-karma .ivc-rcard-label{color:#BC6A4D;}
.c-timeline .ivc-rcard-label{color:#BC6A4D;}
.c-guidance .ivc-rcard-label{color:#BC6A4D;}
.c-forecast .ivc-rcard-label{color:#BC6A4D;}
.c-planet .ivc-rcard-label{color:#BC6A4D;}
.c-daily .ivc-rcard-label{color:#86efac;}
.c-donate .ivc-rcard-label{color:#86efac;}
.c-practical .ivc-rcard-label{color:#f9a8d4;}
.c-followup .ivc-rcard-label{color:#BC6A4D;}
.ivc-diag-summary{font-size:16px;line-height:1.8;color:#e8e8e8;margin-bottom:18px;}
.ivc-diag-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
@media(max-width:600px){.ivc-diag-grid{grid-template-columns:1fr;}}
.ivc-diag-item{background:rgba(188,106,77,.04);border:1px solid rgba(188,106,77,.1);border-radius:10px;padding:12px 14px;}
.ivc-diag-item-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'Astra','Iceland',sans-serif;color:rgba(188,106,77,.6);margin-bottom:6px;}
.ivc-diag-item-val{font-size:15px;color:#e8e8e8;line-height:1.5;}
.ivc-affected-tags{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px;}
.ivc-affected-tag{background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.2);border-radius:50px;padding:4px 12px;font-size:13px;color:#fda4af;}
.ivc-severity-row{display:flex;align-items:center;gap:14px;margin-bottom:16px;}
.ivc-severity-lbl{font-size:12px;font-family:'Astra','Iceland',sans-serif;color:rgba(255,255,255,.38);text-transform:uppercase;letter-spacing:1px;white-space:nowrap;}
.ivc-severity-track{flex:1;height:8px;background:rgba(255,255,255,.07);border-radius:4px;overflow:hidden;}
.ivc-severity-fill{height:100%;border-radius:4px;background:linear-gradient(90deg,#22c55e,#BC6A4D,#ef4444);transition:width 1s ease;}
.ivc-severity-score{font-size:14px;font-family:'Astra','Iceland',sans-serif;color:#BC6A4D;font-weight:700;white-space:nowrap;}
.ivc-saturn-row{display:flex;align-items:center;gap:16px;background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);border-radius:10px;padding:12px 16px;margin-bottom:14px;}
.ivc-saturn-score{font-family:'Astra','Iceland',sans-serif;font-size:26px;font-weight:700;color:#ef4444;white-space:nowrap;}
.ivc-saturn-label{font-size:12px;color:rgba(255,255,255,.45);}
.ivc-saturn-bar-wrap{flex:1;}
.ivc-why-list{display:flex;flex-direction:column;gap:8px;}
.ivc-why-item{display:flex;align-items:flex-start;gap:10px;padding:9px 12px;background:rgba(134,239,172,.04);border:1px solid rgba(134,239,172,.12);border-radius:8px;}
.ivc-why-check{color:#86efac;font-size:14px;flex-shrink:0;margin-top:1px;}
.ivc-why-txt{font-size:14px;color:#e8e8e8;line-height:1.5;}
.ivc-area-scores{display:flex;flex-direction:column;gap:8px;margin-bottom:16px;}
.ivc-area-row{display:flex;align-items:center;gap:12px;}
.ivc-area-name{font-size:13px;color:rgba(255,255,255,.7);width:120px;flex-shrink:0;font-family:'Astra','Iceland',sans-serif;}
.ivc-area-track{flex:1;height:8px;background:rgba(255,255,255,.07);border-radius:4px;overflow:hidden;}
.ivc-area-fill{height:100%;border-radius:4px;transition:width 1.2s ease;}
.ivc-area-score{font-size:13px;font-family:'Astra','Iceland',sans-serif;color:#BC6A4D;width:32px;text-align:right;flex-shrink:0;}
.ivc-confidence-row{display:flex;flex-wrap:wrap;gap:10px;}
.ivc-conf-badge{padding:6px 14px;border-radius:50px;font-size:12px;font-family:'Astra','Iceland',sans-serif;}
.conf-High{background:rgba(34,197,94,.1);border:1px solid rgba(34,197,94,.3);color:#86efac;}
.conf-Medium{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.3);color:#BC6A4D;}
.conf-Low{background:rgba(239,68,68,.08);border:1px solid rgba(239,68,68,.2);color:#fda4af;}
.ivc-forecast-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px;}
@media(max-width:600px){.ivc-forecast-grid{grid-template-columns:1fr;}}
.ivc-forecast-item{border-radius:10px;padding:12px 14px;}
.fi-red{background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);}
.fi-green{background:rgba(134,239,172,.05);border:1px solid rgba(134,239,172,.15);}
.fi-gold{background:rgba(188,106,77,.06);border:1px solid rgba(188,106,77,.15);}
.ivc-fi-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'Astra','Iceland',sans-serif;margin-bottom:6px;}
.fi-red .ivc-fi-lbl{color:rgba(239,68,68,.7);}
.fi-green .ivc-fi-lbl{color:rgba(134,239,172,.7);}
.fi-gold .ivc-fi-lbl{color:rgba(188,106,77,.7);}
.ivc-fi-val{font-size:14px;color:#e8e8e8;line-height:1.5;}
.ivc-date-tags{display:flex;flex-wrap:wrap;gap:8px;}
.ivc-fav-date{background:rgba(134,239,172,.08);border:1px solid rgba(134,239,172,.2);border-radius:6px;padding:4px 10px;font-size:12px;color:#86efac;font-family:'Astra','Iceland',sans-serif;}
.ivc-avoid-date{background:rgba(239,68,68,.07);border:1px solid rgba(239,68,68,.18);border-radius:6px;padding:4px 10px;font-size:12px;color:#fda4af;font-family:'Astra','Iceland',sans-serif;}
.ivc-planet-grid{display:flex;flex-direction:column;gap:10px;}
.ivc-planet-row{display:flex;align-items:center;gap:12px;}
.ivc-planet-icon{font-size:20px;width:28px;text-align:center;flex-shrink:0;}
.ivc-planet-name{font-size:13px;color:rgba(255,255,255,.7);width:80px;flex-shrink:0;}
.ivc-planet-bar{flex:1;height:10px;background:rgba(255,255,255,.07);border-radius:5px;overflow:hidden;}
.ivc-planet-fill{height:100%;border-radius:5px;transition:width 1.2s ease;}
.ivc-planet-score{font-size:13px;font-family:'Astra','Iceland',sans-serif;width:36px;text-align:right;flex-shrink:0;}
.ivc-remedy-grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:600px){.ivc-remedy-grid{grid-template-columns:1fr;}}
.ivc-remedy-card{background:rgba(253,164,175,.04);border:1px solid rgba(253,164,175,.12);border-radius:12px;padding:16px;}
.ivc-remedy-icon{font-size:24px;margin-bottom:10px;}
.ivc-remedy-name{font-size:15px;font-weight:600;color:#fff;margin-bottom:6px;}
.ivc-remedy-desc{font-size:14px;color:rgba(255,255,255,.65);line-height:1.65;margin-bottom:10px;}
.ivc-remedy-chips{display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;}
.ivc-remedy-chip{font-size:11px;font-family:'Astra','Iceland',sans-serif;border-radius:50px;padding:3px 9px;}
.rc-dur{background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.2);color:#BC6A4D;}
.rc-cost{background:rgba(134,239,172,.06);border:1px solid rgba(134,239,172,.18);color:#86efac;}
.rc-effort{background:rgba(188,106,77,.06);border:1px solid rgba(188,106,77,.18);color:#BC6A4D;}
.ivc-eff-bar-wrap{margin-top:6px;}
.ivc-eff-label{font-size:10px;font-family:'Astra','Iceland',sans-serif;color:rgba(255,255,255,.35);margin-bottom:4px;letter-spacing:1px;text-transform:uppercase;}
.ivc-eff-track{height:6px;background:rgba(255,255,255,.07);border-radius:3px;overflow:hidden;}
.ivc-eff-fill{height:100%;background:linear-gradient(90deg,#BC6A4D,#BC6A4D);border-radius:3px;transition:width 1.4s ease;}
.ivc-mc{background:linear-gradient(135deg,rgba(188,106,77,.08),rgba(188,106,77,.04));border:1px solid rgba(188,106,77,.2);border-radius:14px;overflow:hidden;}
.ivc-mc-top{padding:18px 20px;border-bottom:1px solid rgba(188,106,77,.12);}
.ivc-mc-san{font-family:'Astra','Iceland',sans-serif;font-size:clamp(18px,3vw,26px);color:#BC6A4D;line-height:2;letter-spacing:.5px;margin-bottom:8px;}
.ivc-mc-rom{font-family:'Astra','Iceland',sans-serif;font-size:13px;color:rgba(255,255,255,.62);line-height:1.9;letter-spacing:.5px;}
.ivc-audio-row{display:flex;gap:7px;align-items:center;padding:10px 20px;background:rgba(0,0,0,.25);border-bottom:1px solid rgba(188,106,77,.1);flex-wrap:wrap;}
.ivc-audio-lbl{font-size:10px;font-family:'Astra','Iceland',sans-serif;letter-spacing:2px;color:rgba(255,255,255,.35);text-transform:uppercase;}
.ivc-abtn{display:flex;align-items:center;gap:5px;background:rgba(188,106,77,.13);border:1px solid rgba(188,106,77,.28);border-radius:7px;padding:6px 12px;font-size:12px;color:#BC6A4D;cursor:pointer;transition:all .2s;font-family:'Astra','Iceland',sans-serif;}
.ivc-abtn:hover{background:rgba(188,106,77,.26);}
.ivc-abtn.on{background:rgba(188,106,77,.14);border-color:rgba(188,106,77,.32);color:#BC6A4D;}
.ivc-astop{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.22);border-radius:7px;padding:6px 10px;font-size:12px;color:#fda4af;cursor:pointer;font-family:'Astra','Iceland',sans-serif;}
.ivc-chant-row{display:flex;align-items:center;gap:10px;padding:10px 20px;background:rgba(188,106,77,.05);border-bottom:1px solid rgba(188,106,77,.1);flex-wrap:wrap;}
.ivc-chant-btn{background:rgba(188,106,77,.15);border:1px solid rgba(188,106,77,.35);border-radius:8px;padding:6px 14px;font-size:13px;color:#BC6A4D;cursor:pointer;font-family:'Astra','Iceland',sans-serif;font-weight:600;}
.ivc-chant-count{font-family:'Astra','Iceland',sans-serif;font-size:20px;color:#BC6A4D;min-width:40px;text-align:center;}
.ivc-chant-target{font-size:12px;color:rgba(255,255,255,.35);font-family:'Astra','Iceland',sans-serif;}
.ivc-chant-reset{background:transparent;border:1px solid rgba(255,255,255,.12);border-radius:7px;padding:5px 10px;font-size:11px;color:rgba(255,255,255,.35);cursor:pointer;font-family:'Astra','Iceland',sans-serif;}
.ivc-chips{display:flex;gap:7px;flex-wrap:wrap;padding:10px 20px;}
.ivc-chip{display:inline-flex;align-items:center;gap:4px;border-radius:50px;padding:5px 12px;font-size:11px;font-family:'Astra','Iceland',sans-serif;}
.c-count{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.25);color:#BC6A4D;}
.c-dur{background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.2);color:#BC6A4D;}
.c-time{background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.2);color:#BC6A4D;}
.c-purp{background:rgba(188,106,77,.09);border:1px solid rgba(188,106,77,.25);color:#BC6A4D;}
.ivc-mc-body{padding:12px 20px 14px;}
.ivc-dl{margin-bottom:14px;}
.ivc-dl-lbl{font-size:10px;font-family:'Astra','Iceland',sans-serif;letter-spacing:2px;text-transform:uppercase;color:rgba(255,255,255,.32);margin-bottom:5px;}
.ivc-dl-val{font-size:15px;line-height:1.65;color:#e8e8e8;}
.ivc-dl-val.gold{color:#BC6A4D;font-weight:500;}
.ivc-expand-btn{width:100%;background:transparent;border:none;border-top:1px solid rgba(188,106,77,.1);padding:9px 20px;font-size:12px;color:rgba(255,255,255,.38);cursor:pointer;text-align:left;font-family:'Astra','Iceland',sans-serif;transition:color .2s;}
.ivc-expand-btn:hover{color:rgba(255,255,255,.7);}
.ivc-expandable{padding:12px 20px 14px;display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:480px){.ivc-expandable{grid-template-columns:1fr;}}
.ivc-exp-full{grid-column:1/-1;}
.ivc-mantra-save-row{padding:10px 20px;border-top:1px solid rgba(188,106,77,.1);display:flex;gap:8px;}
.ivc-msave-btn{flex:1;padding:8px;background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.2);border-radius:8px;color:#BC6A4D;font-size:13px;cursor:pointer;font-family:'Astra','Iceland',sans-serif;transition:all .2s;}
.ivc-mcopy-btn{flex:1;padding:8px;background:rgba(188,106,77,.08);border:1px solid rgba(188,106,77,.2);border-radius:8px;color:#BC6A4D;font-size:13px;cursor:pointer;font-family:'Astra','Iceland',sans-serif;transition:all .2s;}
.ivc-msave-btn:hover{background:rgba(188,106,77,.14);}
.ivc-mcopy-btn:hover{background:rgba(188,106,77,.18);}
.ivc-puja-name{font-family:'Astra','Iceland',sans-serif;font-size:18px;color:#BC6A4D;margin-bottom:12px;}
.ivc-puja-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:14px;}
@media(max-width:600px){.ivc-puja-grid{grid-template-columns:1fr;}}
.ivc-puja-item{background:rgba(188,106,77,.04);border:1px solid rgba(188,106,77,.1);border-radius:8px;padding:10px 12px;}
.ivc-puja-item-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'Astra','Iceland',sans-serif;color:rgba(188,106,77,.6);margin-bottom:4px;}
.ivc-puja-item-val{font-size:14px;color:#e8e8e8;}
.ivc-puja-materials{display:flex;flex-wrap:wrap;gap:7px;margin-bottom:14px;}
.ivc-mat-tag{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:6px;padding:4px 10px;font-size:13px;color:rgba(255,255,255,.7);}
.ivc-puja-procedure{font-size:15px;line-height:1.78;color:rgba(255,255,255,.7);margin-bottom:14px;}
.ivc-puja-benefit{background:rgba(134,239,172,.05);border:1px solid rgba(134,239,172,.15);border-radius:10px;padding:12px 14px;font-size:15px;color:#86efac;line-height:1.65;margin-bottom:14px;}
.ivc-book-puja-btn{width:100%;padding:11px;background:linear-gradient(135deg,rgba(188,106,77,.15),rgba(188,106,77,.08));border:1px solid rgba(188,106,77,.35);border-radius:10px;color:#BC6A4D;font-size:14px;font-weight:600;cursor:pointer;font-family:'Astra','Iceland',sans-serif;transition:all .25s;}
.ivc-book-puja-btn:hover{background:linear-gradient(135deg,rgba(188,106,77,.25),rgba(188,106,77,.15));}
.ivc-gem-name{font-family:'Astra','Iceland',sans-serif;font-size:20px;color:#86efac;margin-bottom:14px;}
.ivc-gem-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:600px){.ivc-gem-grid{grid-template-columns:1fr;}}
.ivc-gem-item{background:rgba(134,239,172,.04);border:1px solid rgba(134,239,172,.12);border-radius:8px;padding:10px 12px;}
.ivc-gem-item-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'Astra','Iceland',sans-serif;color:rgba(134,239,172,.55);margin-bottom:4px;}
.ivc-gem-item-val{font-size:14px;color:#e8e8e8;}
.ivc-action-list{display:flex;flex-direction:column;gap:8px;}
.ivc-action-item{display:flex;align-items:center;gap:12px;padding:11px 14px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07);border-radius:10px;cursor:pointer;transition:all .2s;}
.ivc-action-item.done{background:rgba(188,106,77,.05);border-color:rgba(188,106,77,.2);}
.ivc-action-check{width:22px;height:22px;min-width:22px;border-radius:50%;border:2px solid rgba(255,255,255,.2);display:flex;align-items:center;justify-content:center;font-size:12px;transition:all .2s;flex-shrink:0;}
.ivc-action-item.done .ivc-action-check{background:#BC6A4D;border-color:#BC6A4D;color:#000;}
.ivc-action-txt{font-size:14px;color:#e8e8e8;}
.ivc-action-item.done .ivc-action-txt{color:rgba(255,255,255,.5);text-decoration:line-through;}
.ivc-habits-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:600px){.ivc-habits-grid{grid-template-columns:1fr;}}
.ivc-habit-card{background:rgba(249,168,212,.04);border:1px solid rgba(249,168,212,.12);border-radius:12px;padding:14px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;transition:all .2s;}
.ivc-habit-card.done{background:rgba(188,106,77,.06);border-color:rgba(188,106,77,.2);}
.ivc-habit-icon{font-size:24px;line-height:1;}
.ivc-habit-name{font-size:14px;font-weight:600;color:#fff;margin-bottom:3px;}
.ivc-habit-dur{font-size:12px;color:rgba(255,255,255,.45);}
.ivc-habit-ben{font-size:12px;color:rgba(249,168,212,.7);margin-top:4px;}
.ivc-habit-check{width:20px;height:20px;min-width:20px;border-radius:50%;border:2px solid rgba(255,255,255,.2);margin-left:auto;display:flex;align-items:center;justify-content:center;font-size:11px;}
.ivc-habit-card.done .ivc-habit-check{background:#BC6A4D;border-color:#BC6A4D;color:#000;}
.ivc-karma-score-big{font-family:'Astra','Iceland',sans-serif;font-size:48px;color:#BC6A4D;text-align:center;margin-bottom:8px;}
.ivc-karma-sub{text-align:center;font-size:13px;color:rgba(255,255,255,.38);margin-bottom:16px;}
.ivc-karma-progress-wrap{margin-bottom:20px;}
.ivc-karma-progress-label{display:flex;justify-content:space-between;margin-bottom:6px;font-size:12px;font-family:'Astra','Iceland',sans-serif;}
.ivc-karma-progress-lbl{color:rgba(255,255,255,.4);}
.ivc-karma-progress-pct{color:#BC6A4D;}
.ivc-karma-meter{height:10px;background:rgba(255,255,255,.07);border-radius:5px;overflow:hidden;margin-bottom:14px;}
.ivc-karma-fill{height:100%;border-radius:5px;background:linear-gradient(90deg,#ef4444,#BC6A4D,#22c55e);transition:width 1.2s ease;}
.ivc-karma-completed{display:flex;flex-direction:column;gap:6px;margin-bottom:16px;}
.ivc-karma-done{display:flex;align-items:center;gap:8px;font-size:14px;color:rgba(255,255,255,.7);}
.ivc-karma-done-check{color:#BC6A4D;font-size:15px;}
.ivc-karma-cols{display:grid;grid-template-columns:1fr 1fr;gap:14px;}
@media(max-width:600px){.ivc-karma-cols{grid-template-columns:1fr;}}
.ivc-karma-col-title{font-size:11px;letter-spacing:2px;text-transform:uppercase;font-family:'Astra','Iceland',sans-serif;margin-bottom:10px;}
.ivc-karma-col-title.pos{color:#86efac;}.ivc-karma-col-title.neg{color:#fda4af;}
.ivc-karma-item{display:flex;align-items:center;gap:8px;padding:8px 10px;background:rgba(255,255,255,.03);border-radius:8px;margin-bottom:6px;font-size:14px;color:rgba(255,255,255,.7);}
.ivc-karma-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
.dot-pos{background:#86efac;}.dot-neg{background:#fda4af;}
.ivc-calendar{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);border-radius:14px;padding:18px;}
.ivc-cal-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;}
.ivc-cal-title{font-family:'Astra','Iceland',sans-serif;font-size:15px;color:#BC6A4D;}
.ivc-cal-streak{background:rgba(188,106,77,.12);border:1px solid rgba(188,106,77,.25);border-radius:50px;padding:4px 12px;font-size:11px;font-family:'Astra','Iceland',sans-serif;color:#BC6A4D;}
.ivc-cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:6px;text-align:center;}
.ivc-cal-dow{font-size:10px;font-family:'Astra','Iceland',sans-serif;color:rgba(255,255,255,.3);padding-bottom:4px;}
.ivc-cal-day{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;cursor:pointer;transition:all .2s;margin:0 auto;}
.ivc-cal-day.done{background:linear-gradient(135deg,#BC6A4D,#BC6A4D);color:#fff;font-weight:700;}
.ivc-cal-day.today{border:2px solid rgba(188,106,77,.5);color:#BC6A4D;}
.ivc-cal-day.empty{opacity:0;}
.ivc-cal-day:not(.done):not(.empty){background:rgba(255,255,255,.05);color:rgba(255,255,255,.5);}
.ivc-timeline{position:relative;padding-left:30px;}
.ivc-timeline::before{content:'';position:absolute;left:10px;top:0;bottom:0;width:1px;background:linear-gradient(180deg,rgba(188,106,77,.5),rgba(188,106,77,.3),rgba(188,106,77,.1));}
.ivc-tl-item{position:relative;margin-bottom:24px;}
.ivc-tl-dot{position:absolute;left:-24px;top:4px;width:12px;height:12px;border-radius:50%;background:linear-gradient(135deg,#BC6A4D,#BC6A4D);border:2px solid #0e0e18;box-shadow:0 0 10px rgba(188,106,77,.4);}
.ivc-tl-week{font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'Astra','Iceland',sans-serif;color:#BC6A4D;margin-bottom:4px;}
.ivc-tl-title{font-size:15px;font-weight:600;color:#fff;margin-bottom:4px;}
.ivc-tl-desc{font-size:14px;color:rgba(255,255,255,.55);line-height:1.6;}
.ivc-guidance-box{background:linear-gradient(135deg,rgba(188,106,77,.06),rgba(188,106,77,.04));border:1px solid rgba(188,106,77,.2);border-radius:14px;padding:22px 24px;position:relative;overflow:hidden;}
.ivc-guidance-box::before{content:'"';position:absolute;top:-20px;left:10px;font-family:'Astra','Iceland',sans-serif;font-size:120px;color:rgba(188,106,77,.06);line-height:1;}
.ivc-guidance-txt{font-family:'Astra','Iceland',sans-serif;font-size:18px;line-height:1.9;color:#e8e8e8;font-style:italic;position:relative;}
.ivc-guidance-sig{margin-top:14px;font-size:13px;color:rgba(188,106,77,.7);font-family:'Astra','Iceland',sans-serif;text-align:right;}
.ivc-insight-phase{font-family:'Astra','Iceland',sans-serif;font-size:18px;color:#BC6A4D;margin-bottom:12px;}
.ivc-insight-desc{font-size:16px;line-height:1.8;color:#e8e8e8;margin-bottom:14px;}
.ivc-insight-items{display:grid;grid-template-columns:1fr;gap:10px;}
.ivc-insight-item{background:rgba(188,106,77,.05);border:1px solid rgba(188,106,77,.15);border-radius:10px;padding:12px 14px;}
.ivc-insight-item-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;font-family:'Astra','Iceland',sans-serif;color:rgba(188,106,77,.55);margin-bottom:5px;}
.ivc-insight-item-val{font-size:15px;color:#e8e8e8;line-height:1.55;}
.ivc-donate-list{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;}
.ivc-donate-item{background:rgba(134,239,172,.06);border:1px solid rgba(134,239,172,.15);border-radius:8px;padding:6px 14px;font-size:14px;color:#86efac;}
.ivc-donate-day{background:rgba(188,106,77,.1);border:1px solid rgba(188,106,77,.25);border-radius:50px;padding:5px 14px;font-family:'Astra','Iceland',sans-serif;font-size:12px;color:#BC6A4D;display:inline-block;}
.ivc-practical-list{display:flex;flex-direction:column;gap:8px;}
.ivc-practical-item{display:flex;align-items:flex-start;gap:10px;padding:10px 14px;background:rgba(249,168,212,.04);border:1px solid rgba(249,168,212,.1);border-radius:10px;}
.ivc-practical-dot{width:8px;height:8px;min-width:8px;border-radius:50%;background:#f9a8d4;margin-top:5px;}
.ivc-practical-txt{font-size:14px;color:#e8e8e8;line-height:1.6;}
.ivc-followup-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
@media(max-width:600px){.ivc-followup-grid{grid-template-columns:1fr;}}
.ivc-followup-btn{background:rgba(188,106,77,.07);border:1px solid rgba(188,106,77,.18);border-radius:10px;padding:12px 14px;font-size:14px;color:rgba(255,255,255,.75);cursor:pointer;text-align:left;font-family:'Astra','Iceland',sans-serif;transition:all .2s;line-height:1.4;}
.ivc-followup-btn:hover{background:rgba(188,106,77,.14);border-color:rgba(188,106,77,.35);color:#fff;}
body > [class*="planet-widget"],body > [class*="mercury-widget"],body > canvas:not(.ivc-canvas)[id*="constellation"],body > div[class*="constellation"]{display:none!important;}
`;

const SUGGESTIONS = [
  { title: "Career & Finance", sub: "I am facing problems in my career and financial life" },
  { title: "Relationships", sub: "I am having problems in my relationship or marriage" },
  { title: "Health & Wellness", sub: "I am dealing with recurring health issues" },
  { title: "Spiritual Growth", sub: "I want to find my life purpose and inner peace" },
];

function StarCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    let W = window.innerWidth, H = window.innerHeight;
    canvas.width = W; canvas.height = H;
    let mx = W/2, my = H/2, isMoving = false, moveTimer = null;
    const stars = Array.from({length:200},()=>({ x:Math.random()*W, y:Math.random()*H, vx:(Math.random()-.5)*0.12, vy:(Math.random()-.5)*0.12, r:Math.random()*1.4+0.2, opacity:Math.random()*0.5+0.1, baseOpacity:0, phase:Math.random()*Math.PI*2 }));
    stars.forEach(s=>{s.baseOpacity=s.opacity;});
    const shoots=[]; const spawnShoot=(sx,sy,forced)=>{ const angle=forced?Math.atan2(sy-H/2,sx-W/2)+(Math.random()-.5)*0.8:Math.PI/5+Math.random()*0.4; shoots.push({x:forced?sx:Math.random()*W*0.8,y:forced?sy:Math.random()*H*0.35,len:Math.random()*180+80,speed:forced?Math.random()*8+5:Math.random()*3+2,angle,life:1}); };
    let t=0,shootTimer=0,raf;
    const frame=()=>{
      ctx.clearRect(0,0,W,H); t+=0.016; shootTimer+=0.016;
      if(shootTimer>(isMoving?1.2:3.5)+Math.random()*2){spawnShoot(mx,my,isMoving);shootTimer=0;}
      stars.forEach(s=>{
        if(isMoving){const dx=mx-s.x,dy=my-s.y,dist=Math.sqrt(dx*dx+dy*dy),force=Math.min(80/dist,1.5);s.vx+=(dx/dist)*force*0.015;s.vy+=(dy/dist)*force*0.015;}
        s.vx*=0.97;s.vy*=0.97;s.vx+=(Math.random()-.5)*0.008;s.vy+=(Math.random()-.5)*0.008;
        s.x+=s.vx;s.y+=s.vy;
        if(s.x<0)s.x=W;if(s.x>W)s.x=0;if(s.y<0)s.y=H;if(s.y>H)s.y=0;
        const op=s.baseOpacity*(0.6+0.4*Math.sin(t*30*s.vx+s.phase));
        ctx.beginPath();ctx.arc(s.x,s.y,s.r,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${Math.max(0.05,Math.min(0.8,op))})`;ctx.fill();
      });
      for(let i=shoots.length-1;i>=0;i--){
        const s=shoots[i];s.x+=Math.cos(s.angle)*s.speed;s.y+=Math.sin(s.angle)*s.speed;s.life-=s.speed>4?0.018:0.008;
        if(s.life<=0){shoots.splice(i,1);continue;}
        const tx=s.x-Math.cos(s.angle)*s.len,ty=s.y-Math.sin(s.angle)*s.len;
        const g=ctx.createLinearGradient(tx,ty,s.x,s.y);
        g.addColorStop(0,`rgba(188,106,77,0)`);g.addColorStop(0.5,`rgba(188,106,77,${s.life*0.55})`);g.addColorStop(1,`rgba(255,255,255,${s.life*0.95})`);
        ctx.beginPath();ctx.moveTo(tx,ty);ctx.lineTo(s.x,s.y);ctx.strokeStyle=g;ctx.lineWidth=s.speed>4?2:1.5;ctx.stroke();
        ctx.beginPath();ctx.arc(s.x,s.y,s.speed>4?3:2,0,Math.PI*2);ctx.fillStyle=`rgba(255,255,255,${s.life*0.85})`;ctx.fill();
      }
      raf=requestAnimationFrame(frame);
    };
    raf=requestAnimationFrame(frame);
    const onMouseMove=(e)=>{mx=e.clientX;my=e.clientY;isMoving=true;clearTimeout(moveTimer);moveTimer=setTimeout(()=>isMoving=false,200);};
    const onTouchMove=(e)=>{mx=e.touches[0].clientX;my=e.touches[0].clientY;isMoving=true;clearTimeout(moveTimer);moveTimer=setTimeout(()=>isMoving=false,300);};
    const resize=()=>{W=window.innerWidth;H=window.innerHeight;canvas.width=W;canvas.height=H;};
    window.addEventListener("mousemove",onMouseMove);window.addEventListener("touchmove",onTouchMove,{passive:true});window.addEventListener("resize",resize);
    return()=>{cancelAnimationFrame(raf);window.removeEventListener("mousemove",onMouseMove);window.removeEventListener("touchmove",onTouchMove);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={canvasRef} className="ivc-canvas"/>;
}

function MantraCard({m,onSave}){
  const [playing,setPlaying]=useState(false);
  const [expanded,setExpanded]=useState(false);
  const [chantCount,setChantCount]=useState(0);
  if(!m) return null;
  const target=parseInt(m.count)||108;
  const speak=async(rate)=>{
    const text=m.transliteration||m.sanskrit||"";if(!text)return;
    if(playing)return;
    setPlaying(true);
    try{
      console.log("[Sarvam TTS] Mantra request — speaker: manan, rate:", rate);
      const res=await fetch(`${API_BASE_URL}/tts`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({text:text.slice(0,500),language:"hi-IN"})});
      if(!res.ok){console.error("[Sarvam TTS] Mantra HTTP error",res.status);setPlaying(false);return;}
      const data=await res.json();
      const b64=data.audio;if(!b64){setPlaying(false);return;}
      const binary=atob(b64);const bytes=new Uint8Array(binary.length);
      for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);
      const blob=new Blob([bytes],{type:"audio/wav"});
      const url=URL.createObjectURL(blob);
      const audio=new Audio(url);
      audio.playbackRate=rate;
      audio.onended=()=>{URL.revokeObjectURL(url);setPlaying(false);};
      audio.onerror=()=>{URL.revokeObjectURL(url);setPlaying(false);};
      await audio.play();
    }catch(e){console.error("[Sarvam TTS] Mantra error:",e);setPlaying(false);}
  };
  const stop=()=>{setPlaying(false);};
  const copyMantra=()=>{navigator.clipboard?.writeText(`${m.sanskrit}\n${m.transliteration}`);};
  const pct=Math.min(100,(chantCount/target)*100);
  return(
    <div className="ivc-mc">
      <div className="ivc-mc-top">
        {m.sanskrit&&<div className="ivc-mc-san">{m.sanskrit}</div>}
        {m.transliteration&&<div className="ivc-mc-rom">{m.transliteration}</div>}
      </div>
      <div className="ivc-audio-row">
        <span className="ivc-audio-lbl">🔊</span>
        <button className={`ivc-abtn${playing?" on":""}`} onClick={()=>speak(0.6)}>🐢 Slow</button>
        <button className={`ivc-abtn${playing?" on":""}`} onClick={()=>speak(1)}>▶ Normal</button>
        <button className="ivc-abtn" onClick={()=>speak(1.25)}>⏩ Fast</button>
        {playing&&<button className="ivc-astop" onClick={stop}>⏹ Stop</button>}
      </div>
      <div className="ivc-chant-row">
        <span style={{fontSize:13,color:"rgba(255,255,255,.45)",fontFamily:"'Astra','Iceland',sans-serif"}}>📿 Chant Counter</span>
        <button className="ivc-chant-btn" onClick={()=>setChantCount(c=>Math.min(c+1,target))}>+1</button>
        <span className="ivc-chant-count" style={{color:chantCount>=target?"#BC6A4D":"#BC6A4D"}}>{chantCount}</span>
        <span className="ivc-chant-target">/ {target}</span>
        <div style={{flex:1,height:6,background:"rgba(255,255,255,.07)",borderRadius:3,overflow:"hidden"}}>
          <div style={{height:"100%",width:`${pct}%`,background:chantCount>=target?"#BC6A4D":"linear-gradient(90deg,#BC6A4D,#BC6A4D)",borderRadius:3,transition:"width .3s"}}/>
        </div>
        {chantCount>=target&&<span style={{fontSize:12,color:"#BC6A4D"}}>✓ Done!</span>}
        <button className="ivc-chant-reset" onClick={()=>setChantCount(0)}>Reset</button>
      </div>
      <div className="ivc-chips">
        {m.count&&<span className="ivc-chip c-count">📿 {m.count}×</span>}
        {m.duration&&<span className="ivc-chip c-dur">📅 {m.duration} days</span>}
        {m.bestTime&&<span className="ivc-chip c-time">⏰ {m.bestTime}</span>}
        {m.purpose&&<span className="ivc-chip c-purp">🎯 {m.purpose}</span>}
      </div>
      <div className="ivc-mc-body">
        {m.translation&&<div className="ivc-dl"><div className="ivc-dl-lbl">Translation</div><div className="ivc-dl-val gold">{m.translation}</div></div>}
        {m.meaning&&<div className="ivc-dl"><div className="ivc-dl-lbl">Meaning & Significance</div><div className="ivc-dl-val">{m.meaning}</div></div>}
      </div>
      <button className="ivc-expand-btn" onClick={()=>setExpanded(!expanded)}>
        {expanded?"▲ Hide details":"▼ Deity · Source · Symbolism · Precautions"}
      </button>
      {expanded&&(
        <div className="ivc-expandable">
          {m.deity&&<div className="ivc-dl"><div className="ivc-dl-lbl">Deity</div><div className="ivc-dl-val" style={{color:"#BC6A4D"}}>{m.deity}</div></div>}
          {m.source&&<div className="ivc-dl"><div className="ivc-dl-lbl">Source</div><div className="ivc-dl-val">{m.source}</div></div>}
          {m.repetitionSymbolism&&<div className="ivc-dl ivc-exp-full"><div className="ivc-dl-lbl">Why this count?</div><div className="ivc-dl-val">{m.repetitionSymbolism}</div></div>}
          {m.precautions&&m.precautions!=="None"&&<div className="ivc-dl ivc-exp-full"><div className="ivc-dl-lbl">Precautions</div><div className="ivc-dl-val" style={{color:"#fda4af"}}>{m.precautions}</div></div>}
        </div>
      )}
      <div className="ivc-mantra-save-row">
        <button className="ivc-msave-btn" onClick={()=>onSave&&onSave(m)}>🔖 Save Mantra</button>
        <button className="ivc-mcopy-btn" onClick={copyMantra}>📋 Copy</button>
      </div>
    </div>
  );
}

function ReportCard({color,icon,label,children,defaultOpen=true}){
  const [open,setOpen]=useState(defaultOpen);
  return(
    <div className={`ivc-rcard ${color}`}>
      <div className="ivc-rcard-header" onClick={()=>setOpen(o=>!o)}>
        <div className="ivc-rcard-title"><span className="ivc-rcard-icon">{icon}</span><span className="ivc-rcard-label">{label}</span></div>
        <span style={{fontSize:12,color:"rgba(255,255,255,.3)"}}>{open?"▲":"▼"}</span>
      </div>
      {open&&<div className="ivc-rcard-body">{children}</div>}
    </div>
  );
}

function ProgressBar({value,max=100,color="#BC6A4D",height=8}){
  const pct=Math.min(100,(value/max)*100);
  return(<div style={{height,background:"rgba(255,255,255,.07)",borderRadius:height/2,overflow:"hidden"}}><div style={{height:"100%",width:`${pct}%`,background:color,borderRadius:height/2,transition:"width 1.2s ease"}}/></div>);
}

function ProgressCalendar(){
  const [checked,setChecked]=useState(()=>{try{return JSON.parse(localStorage.getItem("iv_cal_checked")||"{}");}catch{return{};}});
  const now=new Date(),year=now.getFullYear(),month=now.getMonth();
  const monthName=now.toLocaleString("default",{month:"long",year:"numeric"});
  const firstDay=new Date(year,month,1).getDay();
  const daysInMonth=new Date(year,month+1,0).getDate();
  const today=now.getDate();
  const streak=(()=>{let s=0;for(let d=today;d>=1;d--){if(checked[`${year}-${month}-${d}`])s++;else break;}return s;})();
  const toggle=(d)=>{const key=`${year}-${month}-${d}`;const updated={...checked,[key]:!checked[key]};setChecked(updated);localStorage.setItem("iv_cal_checked",JSON.stringify(updated));};
  const DOWS=["M","T","W","T","F","S","S"];
  return(
    <div className="ivc-calendar">
      <div className="ivc-cal-header"><div className="ivc-cal-title">{monthName}</div><div className="ivc-cal-streak">🔥 {streak} day streak</div></div>
      <div className="ivc-cal-grid">
        {DOWS.map((d,i)=><div key={i} className="ivc-cal-dow">{d}</div>)}
        {Array.from({length:(firstDay+6)%7},(_,i)=><div key={`e${i}`} className="ivc-cal-day empty"/>)}
        {Array.from({length:daysInMonth},(_,i)=>{
          const d=i+1,key=`${year}-${month}-${d}`,isDone=!!checked[key],isToday=d===today;
          return(<div key={d} className={`ivc-cal-day${isDone?" done":""}${isToday&&!isDone?" today":""}`} onClick={()=>toggle(d)}>{isDone?"✓":d}</div>);
        })}
      </div>
    </div>
  );
}

function DiagnosisReport({report,onSaveMantra,onBookPuja,userName,onAskFollowUp,onDownload,downloading}){
  const [actions,setActions]=useState({});
  const [habits,setHabits]=useState({});
  if(!report) return null;
  const toggleAction=(i)=>setActions(a=>({...a,[i]:!a[i]}));
  const toggleHabit=(i)=>setHabits(h=>({...h,[i]:!h[i]}));
  const planetColor=(s)=>s>=70?"#22c55e":s>=50?"#BC6A4D":"#ef4444";
  const areaColor=(s)=>s>=7?"#ef4444":s>=5?"#BC6A4D":"#22c55e";
  const severityPct=(report.diagnosis?.severityScore||0)*10;
  const generatedDate=new Date().toLocaleDateString("en-IN",{day:"numeric",month:"long",year:"numeric"});
  return(
    <div style={{maxWidth:860,margin:"0 auto"}}>
      <div className="ivc-report-topbar">
        <div><div className="ivc-report-topbar-title">Diagnosis & Remedy Report</div><div className="ivc-report-topbar-date">Generated: {generatedDate} · Pandit Rameshwar Ji</div></div>
        <button className="ivc-dl-pdf-btn" onClick={onDownload} disabled={downloading}>{downloading?"⏳ Preparing PDF...":"⬇ Download PDF Report"}</button>
      </div>

      {report.diagnosis&&(
        <ReportCard color="c-astro" icon="🔭" label="Astrological Diagnosis">
          <p className="ivc-diag-summary">{report.diagnosis.summary}</p>
          {report.diagnosis.saturnScore!==undefined&&(
            <div className="ivc-saturn-row">
              <div><div className="ivc-saturn-score">{report.diagnosis.saturnScore}<span style={{fontSize:14,color:"rgba(255,255,255,.4)"}}>/100</span></div><div className="ivc-saturn-label">Saturn Influence Score</div></div>
              <div className="ivc-saturn-bar-wrap"><ProgressBar value={report.diagnosis.saturnScore} color={report.diagnosis.saturnScore>=70?"#ef4444":"#BC6A4D"} height={10}/></div>
            </div>
          )}
          {report.diagnosis.areaScores&&(
            <div style={{marginBottom:18}}>
              <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Astra','Iceland',sans-serif",color:"rgba(188,106,77,.6)",marginBottom:12}}>Severity by Life Area</div>
              <div className="ivc-area-scores">{Object.entries(report.diagnosis.areaScores).map(([area,score])=>(
                <div key={area} className="ivc-area-row"><span className="ivc-area-name">{area}</span><div className="ivc-area-track"><div className="ivc-area-fill" style={{width:`${(score/10)*100}%`,background:areaColor(score)}}/></div><span className="ivc-area-score">{score}/10</span></div>
              ))}</div>
            </div>
          )}
          <div className="ivc-diag-grid">
            {report.diagnosis.rootCause&&<div className="ivc-diag-item"><div className="ivc-diag-item-lbl">Root Cause</div><div className="ivc-diag-item-val">{report.diagnosis.rootCause}</div></div>}
            {report.diagnosis.planetaryInfluence&&<div className="ivc-diag-item"><div className="ivc-diag-item-lbl">Planetary Influence</div><div className="ivc-diag-item-val">{report.diagnosis.planetaryInfluence}</div></div>}
            {report.diagnosis.karmicPattern&&<div className="ivc-diag-item" style={{gridColumn:"1/-1"}}><div className="ivc-diag-item-lbl">Karmic Pattern</div><div className="ivc-diag-item-val">{report.diagnosis.karmicPattern}</div></div>}
          </div>
          {report.diagnosis.lifeAreaAffected?.length>0&&<div className="ivc-affected-tags">{report.diagnosis.lifeAreaAffected.map((a,i)=><span key={i} className="ivc-affected-tag">{a}</span>)}</div>}
          <div className="ivc-severity-row"><span className="ivc-severity-lbl">Severity</span><div className="ivc-severity-track"><div className="ivc-severity-fill" style={{width:`${severityPct}%`}}/></div><span className="ivc-severity-score">{report.diagnosis.severityScore}/10</span></div>
          {report.diagnosis.whyThisDiagnosis?.length>0&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Astra','Iceland',sans-serif",color:"rgba(134,239,172,.7)",marginBottom:10}}>Why This Diagnosis?</div>
              <div className="ivc-why-list">{report.diagnosis.whyThisDiagnosis.map((r,i)=><div key={i} className="ivc-why-item"><span className="ivc-why-check">✓</span><span className="ivc-why-txt">{r}</span></div>)}</div>
            </div>
          )}
          {report.diagnosis.confidenceLevels&&(
            <div style={{marginTop:16}}>
              <div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Astra','Iceland',sans-serif",color:"rgba(249,168,212,.7)",marginBottom:10}}>Prediction Confidence</div>
              <div className="ivc-confidence-row">{Object.entries(report.diagnosis.confidenceLevels).map(([area,level])=><span key={area} className={`ivc-conf-badge conf-${level}`}>{area}: {level}</span>)}</div>
            </div>
          )}
        </ReportCard>
      )}

      {report.forecast&&(
        <ReportCard color="c-forecast" icon="🗓️" label="Forecast & Auspicious Dates">
          <div className="ivc-forecast-grid">
            {report.forecast.currentPhase&&<div className="ivc-forecast-item fi-red"><div className="ivc-fi-lbl">Current Phase</div><div className="ivc-fi-val" style={{color:"#ef4444",fontWeight:600}}>{report.forecast.currentPhase}</div>{report.forecast.currentPeriod&&<div className="ivc-fi-val" style={{marginTop:4,fontSize:13}}>{report.forecast.currentPeriod}</div>}</div>}
            {report.forecast.reliefFrom&&<div className="ivc-forecast-item fi-green"><div className="ivc-fi-lbl">Relief Expected</div><div className="ivc-fi-val" style={{color:"#86efac",fontWeight:600}}>{report.forecast.reliefFrom}</div></div>}
            {report.forecast.bestMonths?.length>0&&<div className="ivc-forecast-item fi-gold" style={{gridColumn:"1/-1"}}><div className="ivc-fi-lbl">Best Months Ahead</div><div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:6}}>{report.forecast.bestMonths.map((m,i)=><span key={i} className="ivc-fav-date">✓ {m}</span>)}</div></div>}
          </div>
          {(report.forecast.favorableDates?.length>0||report.forecast.avoidDates?.length>0)&&(
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16}}>
              {report.forecast.favorableDates?.length>0&&<div><div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Astra','Iceland',sans-serif",color:"rgba(134,239,172,.6)",marginBottom:8}}>✓ Favorable Days</div><div className="ivc-date-tags">{report.forecast.favorableDates.map((d,i)=><span key={i} className="ivc-fav-date">{d}</span>)}</div></div>}
              {report.forecast.avoidDates?.length>0&&<div><div style={{fontSize:10,letterSpacing:2,textTransform:"uppercase",fontFamily:"'Astra','Iceland',sans-serif",color:"rgba(239,68,68,.6)",marginBottom:8}}>⚠ Avoid Decisions</div><div className="ivc-date-tags">{report.forecast.avoidDates.map((d,i)=><span key={i} className="ivc-avoid-date">{d}</span>)}</div></div>}
            </div>
          )}
        </ReportCard>
      )}

      {report.planetDashboard?.length>0&&(
        <ReportCard color="c-planet" icon="🪐" label="Planet Health Dashboard">
          <div className="ivc-planet-grid">{report.planetDashboard.map((p,i)=>(
            <div key={i} className="ivc-planet-row"><span className="ivc-planet-icon">{p.icon}</span><span className="ivc-planet-name">{p.planet}</span><div className="ivc-planet-bar"><div className="ivc-planet-fill" style={{width:`${p.score}%`,background:planetColor(p.score)}}/></div><span className="ivc-planet-score" style={{color:planetColor(p.score)}}>{p.score}%</span></div>
          ))}</div>
        </ReportCard>
      )}

      {report.spiritualInsight&&(
        <ReportCard color="c-spirit" icon="✨" label="Spiritual Insight">
          {report.spiritualInsight.currentPhase&&<div className="ivc-insight-phase">{report.spiritualInsight.currentPhase}</div>}
          {report.spiritualInsight.phaseDescription&&<p className="ivc-insight-desc">{report.spiritualInsight.phaseDescription}</p>}
          <div className="ivc-insight-items">
            {report.spiritualInsight.soulLesson&&<div className="ivc-insight-item"><div className="ivc-insight-item-lbl">Soul Lesson</div><div className="ivc-insight-item-val">{report.spiritualInsight.soulLesson}</div></div>}
            {report.spiritualInsight.growthOpportunity&&<div className="ivc-insight-item"><div className="ivc-insight-item-lbl">Growth Opportunity</div><div className="ivc-insight-item-val">{report.spiritualInsight.growthOpportunity}</div></div>}
          </div>
        </ReportCard>
      )}

      {report.remedies?.length>0&&(
        <ReportCard color="c-remedy" icon="🌿" label="Prescribed Remedies">
          <div className="ivc-remedy-grid">{report.remedies.map((r,i)=>(
            <div key={i} className="ivc-remedy-card">
              <div className="ivc-remedy-icon">{r.icon||"🪔"}</div>
              <div className="ivc-remedy-name">{r.name}</div>
              <div className="ivc-remedy-desc">{r.description}</div>
              <div className="ivc-remedy-chips">
                {r.duration&&<span className="ivc-remedy-chip rc-dur">📅 {r.duration}</span>}
                {r.cost!==undefined&&<span className="ivc-remedy-chip rc-cost">💰 {r.cost}</span>}
                {r.effort&&<span className="ivc-remedy-chip rc-effort">⚡ {r.effort} effort</span>}
              </div>
              {r.effectiveness!==undefined&&<div className="ivc-eff-bar-wrap"><div className="ivc-eff-label">Effectiveness · {r.effectiveness}%</div><div className="ivc-eff-track"><div className="ivc-eff-fill" style={{width:`${r.effectiveness}%`}}/></div></div>}
            </div>
          ))}</div>
        </ReportCard>
      )}

      {report.dailyActions?.length>0&&(
        <ReportCard color="c-daily" icon="✅" label="Today's Action Plan">
          <div className="ivc-action-list">{report.dailyActions.map((a,i)=>(
            <div key={i} className={`ivc-action-item${actions[i]?" done":""}`} onClick={()=>toggleAction(i)}>
              <div className="ivc-action-check">{actions[i]?"✓":""}</div>
              <span className="ivc-action-txt">{a.task}</span>
            </div>
          ))}</div>
          <div style={{marginTop:14,fontSize:12,color:"rgba(255,255,255,.3)",fontFamily:"'Astra','Iceland',sans-serif"}}>{Object.values(actions).filter(Boolean).length}/{report.dailyActions.length} completed today</div>
        </ReportCard>
      )}

      {report.mantra&&(<ReportCard color="c-mantra" icon="📿" label="Mantra Recommendation"><MantraCard m={report.mantra} onSave={onSaveMantra}/></ReportCard>)}

      {report.puja&&(
        <ReportCard color="c-puja" icon="🪔" label="Puja Recommendation">
          <div className="ivc-puja-name">{report.puja.name}</div>
          <div className="ivc-puja-grid">
            {report.puja.estimatedCost&&<div className="ivc-puja-item"><div className="ivc-puja-item-lbl">Estimated Cost</div><div className="ivc-puja-item-val">{report.puja.estimatedCost}</div></div>}
            {report.puja.duration&&<div className="ivc-puja-item"><div className="ivc-puja-item-lbl">Duration</div><div className="ivc-puja-item-val">{report.puja.duration}</div></div>}
          </div>
          {report.puja.materials?.length>0&&<div className="ivc-puja-materials">{report.puja.materials.map((m,i)=><span key={i} className="ivc-mat-tag">🌸 {m}</span>)}</div>}
          {report.puja.procedure&&<div className="ivc-puja-procedure">{report.puja.procedure}</div>}
          {report.puja.benefits&&<div className="ivc-puja-benefit">✨ {report.puja.benefits}</div>}
          <button className="ivc-book-puja-btn" onClick={onBookPuja}>🙏 Book This Puja</button>
        </ReportCard>
      )}

      {report.gemstone&&(
        <ReportCard color="c-gem" icon="💎" label="Gemstone Recommendation">
          <div className="ivc-gem-name">{report.gemstone.name}</div>
          <div className="ivc-gem-grid">
            {report.gemstone.benefits&&<div className="ivc-gem-item" style={{gridColumn:"1/-1"}}><div className="ivc-gem-item-lbl">Benefits</div><div className="ivc-gem-item-val">{report.gemstone.benefits}</div></div>}
            {[["Wearing Finger",report.gemstone.wearingFinger],["Best Day",report.gemstone.wearingDay],["Metal",report.gemstone.metal],["Weight",report.gemstone.weight]].map(([l,v])=>v&&(<div key={l} className="ivc-gem-item"><div className="ivc-gem-item-lbl">{l}</div><div className="ivc-gem-item-val">{v}</div></div>))}
          </div>
        </ReportCard>
      )}

      {report.donations&&(
        <ReportCard color="c-donate" icon="🤲" label="Personalized Donation Suggestions">
          <div className="ivc-donate-list">{report.donations.items?.map((d,i)=><span key={i} className="ivc-donate-item">• {d}</span>)}</div>
          {report.donations.bestDay&&<div style={{marginBottom:10}}><span style={{fontSize:13,color:"rgba(255,255,255,.45)",fontFamily:"'Astra','Iceland',sans-serif",marginRight:8}}>Best Day:</span><span className="ivc-donate-day">{report.donations.bestDay}</span></div>}
          {report.donations.significance&&<div style={{fontSize:14,color:"rgba(255,255,255,.6)",lineHeight:1.65}}>{report.donations.significance}</div>}
        </ReportCard>
      )}

      {report.dailyPractices?.length>0&&(
        <ReportCard color="c-habits" icon="🌅" label="Daily Spiritual Practices">
          <div className="ivc-habits-grid">{report.dailyPractices.map((p,i)=>(
            <div key={i} className={`ivc-habit-card${habits[i]?" done":""}`} onClick={()=>toggleHabit(i)}>
              <span className="ivc-habit-icon">{p.icon||"⭐"}</span>
              <div style={{flex:1}}><div className="ivc-habit-name">{p.name}</div><div className="ivc-habit-dur">{p.duration}</div><div className="ivc-habit-ben">{p.benefit}</div></div>
              <div className="ivc-habit-check">{habits[i]?"✓":""}</div>
            </div>
          ))}</div>
        </ReportCard>
      )}

      {report.karmaScore&&(
        <ReportCard color="c-karma" icon="⚡" label="Karma & Spiritual Progress">
          <div className="ivc-karma-score-big">{report.karmaScore.current>0?`+${report.karmaScore.current}`:report.karmaScore.current}</div>
          <div className="ivc-karma-sub">Current Karma Score</div>
          {report.karmaScore.progressToNeutral!==undefined&&(
            <div className="ivc-karma-progress-wrap">
              <div className="ivc-karma-progress-label"><span className="ivc-karma-progress-lbl">Progress to Neutral Karma</span><span className="ivc-karma-progress-pct">{report.karmaScore.progressToNeutral}%</span></div>
              <div className="ivc-karma-meter"><div className="ivc-karma-fill" style={{width:`${report.karmaScore.progressToNeutral}%`}}/></div>
            </div>
          )}
          {(report.karmaScore.completedDays!==undefined||report.karmaScore.completedPujas!==undefined)&&(
            <div className="ivc-karma-completed">
              {report.karmaScore.completedDays!==undefined&&<div className="ivc-karma-done"><span className="ivc-karma-done-check">✓</span>{report.karmaScore.completedDays} days of mantra completed</div>}
              {report.karmaScore.completedPujas!==undefined&&<div className="ivc-karma-done"><span className="ivc-karma-done-check">✓</span>{report.karmaScore.completedPujas} Hanuman puja completed</div>}
            </div>
          )}
          <div className="ivc-karma-cols">
            <div><div className="ivc-karma-col-title pos">✅ Positive Influences</div>{report.karmaScore.positive?.map((p,i)=><div key={i} className="ivc-karma-item"><span className="ivc-karma-dot dot-pos"/>{p}</div>)}</div>
            <div><div className="ivc-karma-col-title neg">⚠️ Areas to Improve</div>{report.karmaScore.negative?.map((n,i)=><div key={i} className="ivc-karma-item"><span className="ivc-karma-dot dot-neg"/>{n}</div>)}</div>
          </div>
        </ReportCard>
      )}

      <ReportCard color="c-karma" icon="📅" label="Progress Calendar" defaultOpen={true}><ProgressCalendar/></ReportCard>

      {report.timeline?.length>0&&(
        <ReportCard color="c-timeline" icon="🗺️" label="Spiritual Progress Timeline">
          <div className="ivc-timeline">{report.timeline.map((t,i)=>(
            <div key={i} className="ivc-tl-item"><div className="ivc-tl-dot"/><div className="ivc-tl-week">Week {t.week}</div><div className="ivc-tl-title">{t.title}</div><div className="ivc-tl-desc">{t.description}</div></div>
          ))}</div>
        </ReportCard>
      )}

      {report.practicalGuidance?.length>0&&(
        <ReportCard color="c-practical" icon="💡" label="Practical Guidance">
          <div className="ivc-practical-list">{report.practicalGuidance.map((g,i)=><div key={i} className="ivc-practical-item"><span className="ivc-practical-dot"/><span className="ivc-practical-txt">{g}</span></div>)}</div>
        </ReportCard>
      )}

      {report.guidance&&(
        <ReportCard color="c-guidance" icon="🧘" label="Personal Guidance from Pandit Ji">
          <div className="ivc-guidance-box"><div className="ivc-guidance-txt">{report.guidance}</div><div className="ivc-guidance-sig">— Pandit Rameshwar Ji</div></div>
        </ReportCard>
      )}

      {report.followUpPrompts?.length>0&&(
        <ReportCard color="c-followup" icon="💬" label="Ask About This Diagnosis">
          <div style={{fontSize:14,color:"rgba(255,255,255,.45)",marginBottom:14}}>One-tap questions about your report:</div>
          <div className="ivc-followup-grid">{report.followUpPrompts.map((p,i)=><button key={i} className="ivc-followup-btn" onClick={()=>onAskFollowUp&&onAskFollowUp(p)}>💬 {p}</button>)}</div>
        </ReportCard>
      )}

      <div style={{textAlign:"center",padding:"20px 0 40px"}}>
        <button className="ivc-dl-pdf-btn" style={{margin:"0 auto"}} onClick={onDownload} disabled={downloading}>{downloading?"⏳ Preparing PDF...":"⬇ Download Full PDF Report"}</button>
      </div>
    </div>
  );
}

export default function InnerVoiceChat(){
  const [activeTab,setActiveTab]=useState("consultation");
  const [messages,setMessages]=useState([]);
  const [input,setInput]=useState("");
  const [loading,setLoading]=useState(false);
  const [listening,setListening]=useState(false);
  const [progress,setProgress]=useState(0);
  const [readyForDiagnosis,setReadyForDiagnosis]=useState(false);
  const [generatingReport,setGeneratingReport]=useState(false);
  const [report,setReport]=useState(null);
  const [downloading,setDownloading]=useState(false);
  const [activePanel,setActivePanel]=useState(null);
  const [sidebarOpen,setSidebarOpen]=useState(false);
  const [suggestionPulse,setSuggestionPulse]=useState(false);
  const [inputLanguage,setInputLanguage]=useState<InputLanguageChoice>("auto");
  const [replyLanguage,setReplyLanguage]=useState<ReplyLanguageChoice>("same");
  const [savedMantras,setSavedMantras]=useState(()=>{try{return JSON.parse(localStorage.getItem("iv_saved_mantras")||"[]");}catch{return [];}});
  const [chatSessions,setChatSessions]=useState(()=>{try{return JSON.parse(localStorage.getItem("iv_chat_sessions")||"[]");}catch{return [];}});
  const bottomRef=useRef(null),textareaRef=useRef(null),recognitionRef=useRef(null),mainScrollRef=useRef(null);
  const profile=(()=>{try{return JSON.parse(localStorage.getItem("iv_profile")||"null");}catch{return null;}})();

  useEffect(()=>{const s=document.createElement("style");s.textContent=CSS;document.head.appendChild(s);return()=>document.head.removeChild(s);},[]);
  useEffect(()=>{bottomRef.current?.scrollIntoView({behavior:"smooth",block:"end"});},[messages,loading]);

  useEffect(()=>{
    const SELECTORS=["footer","[class*='footer' i]","[class*='Footer']","[id*='footer' i]","[class*='navbar' i]","[class*='NavBar']","[class*='nav-bar' i]","[id*='navbar' i]","nav:not(.ivc-sb nav)"];
    const hidden=[];
    SELECTORS.forEach(sel=>{try{document.querySelectorAll(sel).forEach(el=>{if(!el.closest(".ivc-app")){hidden.push({el,prev:el.style.display});el.style.setProperty("display","none","important");}});}catch{}});
    const prevOverflow=document.body.style.overflow;
    document.body.style.overflow="hidden";
    return()=>{hidden.forEach(({el,prev})=>el.style.display=prev);document.body.style.overflow=prevOverflow;};
  },[]);

  useEffect(()=>{
    if(messages.length>0){
      const firstUserMsg=messages.find(m=>m.role==="user");
      if(firstUserMsg){
        const session={id:Date.now(),text:firstUserMsg.content.slice(0,40)+"...",date:new Date().toLocaleDateString("en-IN")};
        const updated=[session,...chatSessions.filter(s=>s.text!==session.text)].slice(0,10);
        setChatSessions(updated);localStorage.setItem("iv_chat_sessions",JSON.stringify(updated));
      }
    }
  },[messages.length]);

  const saveMantra=(m)=>{
    const entry={id:Date.now(),sanskrit:m.sanskrit,transliteration:m.transliteration,purpose:m.purpose,date:new Date().toLocaleDateString("en-IN"),mantra:m};
    const updated=[entry,...savedMantras].slice(0,20);
    setSavedMantras(updated);localStorage.setItem("iv_saved_mantras",JSON.stringify(updated));
  };

  const autoResize=()=>{const ta=textareaRef.current;if(!ta)return;ta.style.height="auto";ta.style.height=Math.min(ta.scrollHeight,140)+"px";};
  const buildHistory=()=>messages.map(m=>({role:m.role==="user"?"user":"assistant",content:typeof m.content==="string"?m.content:(m.content?.message||"[response]")}));

  const send=async(text)=>{
    const msg=text.trim();if(!msg||loading)return;
    setInput("");if(textareaRef.current)textareaRef.current.style.height="24px";
    setMessages(prev=>[...prev,{role:"user",content:msg}]);
    setLoading(true);
    try{
      const history=buildHistory();
      const detected=detectLanguage(msg);
      const languageDirective=buildLanguageDirective(inputLanguage,replyLanguage,detected);
      const data=await callConsultation([{role:"system",content:PANDIT_CONSULTATION_SYSTEM},{role:"system",content:languageDirective},...history,{role:"user",content:msg}]);
      setMessages(prev=>[...prev,{role:"guru",content:data}]);
      if(data.progress)setProgress(data.progress);
      if(data.readyForDiagnosis)setReadyForDiagnosis(true);
    }catch(e){
      console.error("[AI Guru] Consultation request failed:",e);
      setMessages(prev=>[...prev,{role:"guru",content:{type:"gathering",message:"Sorry, Guru Ji is temporarily unavailable. Please try again in a moment."}}]);
    }finally{setLoading(false);}
  };

  const generateReport=async()=>{
    setGeneratingReport(true);setActiveTab("report");
    try{const data=await callDiagnosis(messages);setReport(data);}
    catch(e){console.error("Diagnosis error:",e);}
    finally{setGeneratingReport(false);}
  };

  const handleDownloadPDF=async()=>{
    if(!report)return;
    setDownloading(true);
    try{await downloadReportPDF(report,profile?.name||"Seeker");}
    catch(e){console.error("PDF error:",e);alert("PDF download failed. Please try again.");}
    finally{setDownloading(false);}
  };

  const handleFollowUp=(prompt)=>{setActiveTab("consultation");setTimeout(()=>send(prompt),100);};
  const onKeyDown=(e)=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();send(input);}};

  // ChatGPT-style suggestion pick: populate the composer, focus it, put the
  // caret at the end — never auto-send. User still decides when to send.
  const handleSuggestionSelect=(text)=>{
    setInput(text);
    requestAnimationFrame(()=>{
      const ta=textareaRef.current;
      if(!ta)return;
      autoResize();
      ta.focus();
      const len=text.length;
      ta.setSelectionRange(len,len);
      ta.scrollIntoView({behavior:"smooth",block:"nearest"});
    });
    setSuggestionPulse(true);
    setTimeout(()=>setSuggestionPulse(false),300);
  };

  const toggleVoice=()=>{
    const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
    if(!SR){alert("Voice input requires Chrome or Edge browser.");return;}
    if(listening){recognitionRef.current?.stop();setListening(false);return;}
    const rec=new SR();
    rec.continuous=true;rec.interimResults=true;rec.lang="hi-IN";
    rec.onresult=(e)=>{const transcript=Array.from(e.results).map(r=>r[0].transcript).join(" ");setInput(transcript);setTimeout(autoResize,10);};
    rec.onerror=()=>setListening(false);rec.onend=()=>setListening(false);
    rec.start();recognitionRef.current=rec;setListening(true);
  };

  const togglePanel=(name)=>setActivePanel(prev=>prev===name?null:name);

  // Starts a clean consultation in place — no reload, no navigation. The
  // conversation that's ending is already tracked in chatSessions (the
  // effect below keeps that in sync as messages arrive), so nothing extra
  // needs saving here. The active tab is left as-is per spec: if the user
  // triggers this from the sidebar while on Voice/Report, we don't yank
  // them into Consultation Mode.
  const newConversation=()=>{
    setMessages([]);
    setInput("");
    setProgress(0);
    setReadyForDiagnosis(false);
    setReport(null);
    setSuggestionPulse(false);
    setSidebarOpen(false);
    setInputLanguage("auto");
    setReplyLanguage("same");
    if(textareaRef.current)textareaRef.current.style.height="24px";
    requestAnimationFrame(()=>{
      mainScrollRef.current?.scrollTo({top:0,behavior:"smooth"});
      textareaRef.current?.focus();
    });
  };

  const handleTabChange=(tab)=>{
    setActiveTab(tab);
    setSidebarOpen(false);
    if(tab==="report" && !report && !generatingReport && readyForDiagnosis){
      generateReport();
    }
  };

  return(
    <div className="relative flex h-screen w-full overflow-hidden bg-[#09090B] font-['Inter'] text-white">
      <style>{CSS}</style>
      <div className="pointer-events-none absolute inset-0">
        <StarCanvas/>
        <CosmicOverlay/>
      </div>

      <GuruSidebar
        activeTab={activeTab as GuruTab}
        onTabChange={handleTabChange}
        onNewConsultation={newConversation}
        chatSessions={chatSessions}
        savedMantras={savedMantras}
        activePanel={activePanel}
        onTogglePanel={togglePanel}
        profile={profile}
        open={sidebarOpen}
        onClose={()=>setSidebarOpen(false)}
      />

      <main className="relative z-10 flex min-w-0 flex-1 flex-col">
        <GuruTopHeader onOpenSidebar={()=>setSidebarOpen(true)} />
        <GuruTabs
          activeTab={activeTab as GuruTab}
          onChange={handleTabChange}
          reportReady={!!report}
          reportGenerating={generatingReport}
        />

        {activeTab==="consultation"&&(
          <>
            {progress>0&&(
              <GuruProgressBar progress={progress} readyForDiagnosis={readyForDiagnosis} onGenerateReport={generateReport} />
            )}
            {/* Single-column conversation, ChatGPT/Claude-style: welcome
                content OR the message thread, never both, never split
                across a side panel. */}
            <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
              <div ref={mainScrollRef} className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
                <div className="mx-auto flex max-w-3xl flex-col gap-8">
                  <AnimatePresence mode="wait">
                    {messages.length===0 ? (
                      <motion.div key="welcome" className="flex flex-col gap-8">
                        <motion.div
                          className="flex flex-col gap-8"
                          initial={{opacity:0,y:-20,scale:0.98}}
                          animate={{opacity:1,y:0,scale:1}}
                          exit={{opacity:0,y:-20,scale:0.98}}
                          transition={{duration:0.3,ease:"easeInOut"}}
                        >
                          <TrustStats/>
                          <HeroWelcome name={profile?.name||"Seeker"} />
                        </motion.div>
                        <CategoryCards suggestions={SUGGESTIONS} onSelect={handleSuggestionSelect} />
                        <motion.div
                          initial={{opacity:0,y:-15}}
                          animate={{opacity:1,y:0}}
                          exit={{opacity:0,y:-15}}
                          transition={{duration:0.25,delay:0.15,ease:"easeInOut"}}
                        >
                          <AnalysisTimeline/>
                        </motion.div>
                        <motion.div
                          initial={{opacity:0,y:-10}}
                          animate={{opacity:1,y:0}}
                          exit={{opacity:0,y:-10}}
                          transition={{duration:0.25,delay:0.2,ease:"easeInOut"}}
                        >
                          <SuggestedQuestions onSelectSuggestion={handleSuggestionSelect} />
                        </motion.div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="conversation"
                        initial={{opacity:0,y:30,scale:0.98,filter:"blur(4px)"}}
                        animate={{opacity:1,y:0,scale:1,filter:"blur(0px)"}}
                        exit={{opacity:0}}
                        transition={{duration:0.3,ease:"easeInOut"}}
                      >
                        <GuruConversation ref={bottomRef} messages={messages} loading={loading} />
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
              <div className="border-t border-white/[0.08] bg-[#09090B]/95 px-4 py-4 backdrop-blur-xl md:px-8">
                <div className="mx-auto max-w-3xl">
                  <LanguageControls
                    inputLanguage={inputLanguage}
                    onInputLanguageChange={setInputLanguage}
                    replyLanguage={replyLanguage}
                    onReplyLanguageChange={setReplyLanguage}
                  />
                  <GuruChatInput
                    ref={textareaRef}
                    value={input}
                    onChange={(v)=>{setInput(v);autoResize();}}
                    onSend={()=>send(input)}
                    onKeyDown={onKeyDown}
                    listening={listening}
                    onToggleVoice={toggleVoice}
                    loading={loading}
                    glowPulse={suggestionPulse}
                  />
                </div>
              </div>
            </div>
          </>
        )}

        {activeTab==="voice"&&(
          <div className="flex-1 overflow-y-auto">
            <VoiceConsultation />
          </div>
        )}

        {activeTab==="report"&&(
          <div className="ivc-report">
            {generatingReport?(
              <div className="ivc-report-generating">
                <div className="ivc-gen-spinner"/>
                <div className="ivc-gen-txt">Preparing Your Diagnosis</div>
                <div className="ivc-gen-sub">Analysing planetary influences, karmic patterns, and prescribing remedies...</div>
              </div>
            ):report?(
              <DiagnosisReport report={report} onSaveMantra={saveMantra} onBookPuja={()=>alert("Puja booking coming soon!")} userName={profile?.name} onAskFollowUp={handleFollowUp} onDownload={handleDownloadPDF} downloading={downloading}/>
            ):(
              <div className="ivc-report-empty">
                <div className="ivc-report-empty-icon" style={{fontSize:72,marginBottom:20,filter:"drop-shadow(0 0 30px rgba(188,106,77,.4))"}}>🕉</div>
                <div className="ivc-report-empty-title">Begin Your Consultation</div>
                <div className="ivc-report-empty-sub">Share your life challenge with Pandit Ji in the Consultation tab. After a few exchanges, your complete Vedic Diagnosis Report — with remedies, mantras, planetary analysis, and a PDF — will be generated automatically.</div>
                <div style={{display:"flex",gap:12,flexWrap:"wrap",justifyContent:"center",marginTop:8}}>
                  <button className="ivc-report-start-btn" onClick={()=>setActiveTab("consultation")}>💬 Start Consultation</button>
                  {readyForDiagnosis&&<button className="ivc-report-start-btn" style={{background:"linear-gradient(135deg,rgba(188,106,77,.25),rgba(188,106,77,.18))",borderColor:"rgba(188,106,77,.5)"}} onClick={generateReport}>✨ Generate Report Now</button>}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
