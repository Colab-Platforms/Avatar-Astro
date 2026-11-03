import { useState, useEffect, useRef } from "react";
import AskDivyaSection from "@/features/guru/AskDivyaSection";
import FeatureFaq from "@/components/FeatureFaq";
import { FEATURES } from "@/data/featureCatalog";
import { useFeatureTitle } from "@/hooks/useFeatureTitle";
import { Link } from "react-router-dom";
import { useAuthStore } from "@/store/authStore";
import { requireSignIn } from "@/lib/authedFetch";
import LocationPicker from "@/features/ratna/LocationPicker";
import type { PlaceResult } from "@/features/ratna/types";
import "@/features/ratna/ratna.css";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import { Activity, Bird, BookOpen, Bookmark, CalendarDays, Check, ChevronDown, Flame, HandHeart, Heart, HeartHandshake, Leaf, Lightbulb, MessageCircle, Moon, Music, Scale, Smile, Sparkles, Sun, Sunrise, Target, Timer, TreePine, Users, Utensils, VolumeX, Wind, type LucideIcon } from "lucide-react";
import { ACTIONS, EXTRA_ACTIONS, MAX_POINTS, bestStreak, computeDailyScore, currentStreak, lastSevenDays, localDateKey, pathToNextLevel, pointsFor, practicedDaysThisWeek, recentAverage, scoreMessage, tierFor, type ScoreEntry } from "@/lib/karmaScore";

/** An icon for each practice; purely visual. */
const ACTION_ICON: Record<string, LucideIcon> = {
  mantra: Sparkles,
  meditation: Moon,
  truth: Scale,
  feed: HeartHandshake,
  fast: Utensils,
  pooja: Sun,
  anger: Activity,
  charity: HandHeart,
  // extra practices
  surya: Sunrise, tulsi: Leaf, scripture: BookOpen, bhajan: Music, elders: Users, gratitude: Heart,
  kindword: MessageCircle, forgive: Smile, yoga: Wind, silence: VolumeX, birds: Bird, nature: TreePine,
};



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

/* ── Refreshed look: same chocolate / parchment / gold palette ── */
.ivd-hero{position:relative;display:flex;align-items:center;justify-content:center;gap:40px;flex-wrap:wrap;padding:34px 30px;margin-bottom:22px;border-radius:28px;background:linear-gradient(165deg,#FFFBF3 0%,#F8EBD6 100%);border:1px solid rgba(229,138,69,.55);box-shadow:0 22px 50px -28px rgba(89,34,9,.45),inset 0 0 0 6px rgba(255,251,243,.9),inset 0 0 0 7px rgba(229,138,69,.22);}
.ivd-hero .ivd-score-section{margin-bottom:0;gap:34px;}
.ivd-ring-bg{stroke:rgba(89,34,9,.12);}
.ivd-tier{display:inline-flex;align-items:center;gap:6px;font-size:11px;font-weight:600;letter-spacing:2px;text-transform:uppercase;color:#592209;background:#F5E9D6;border:1px solid rgba(229,138,69,.6);border-radius:50px;padding:5px 14px;margin-bottom:10px;}
.ivd-progress{margin-top:14px;max-width:320px;}
.ivd-progress-bar{height:8px;border-radius:6px;background:rgba(89,34,9,.12);overflow:hidden;}
.ivd-progress-fill{height:100%;border-radius:6px;background:linear-gradient(90deg,#E58A45,#592209);transition:width .8s ease;}
.ivd-progress-lbl{font-size:12px;color:#6B4A37;margin-top:6px;line-height:1.5;}
.ivd-stats{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:14px;margin-bottom:22px;}
@media(max-width:700px){.ivd-stats{grid-template-columns:repeat(2,minmax(0,1fr));}}
.ivd-stat{background:#FFFBF3;border:1px solid rgba(229,138,69,.4);border-radius:18px;padding:16px 14px;text-align:center;box-shadow:0 8px 22px -18px rgba(89,34,9,.5);transition:transform .25s,box-shadow .25s;}
.ivd-stat:hover{transform:translateY(-3px);box-shadow:0 14px 28px -18px rgba(89,34,9,.55);}
.ivd-stat-ico{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#F5E9D6;color:#592209;margin-bottom:8px;box-shadow:inset 0 0 0 1px rgba(89,34,9,.12);}
.ivd-stat-val{font-size:28px;font-weight:600;color:#592209;line-height:1.1;}
.ivd-stat-lbl{font-size:10px;letter-spacing:2px;text-transform:uppercase;color:#6B4A37;margin-top:4px;}
.ivd-stat-note{font-size:11px;color:#6B4A37;margin-top:3px;}

.ivd-week{background:#FFFBF3;border:1px solid rgba(229,138,69,.4);border-radius:20px;padding:20px 22px;margin-bottom:22px;}
.ivd-week-row{display:grid;grid-template-columns:repeat(7,1fr);gap:8px;margin-top:14px;}
.ivd-day{display:flex;flex-direction:column;align-items:center;gap:6px;}
.ivd-day-dot{width:100%;max-width:46px;aspect-ratio:1;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;border:1.5px dashed rgba(89,34,9,.25);color:#6B4A37;background:transparent;}
.ivd-day-dot.on{border:none;color:#FBF5EC;background:linear-gradient(135deg,#E58A45,#592209);}
.ivd-day.today .ivd-day-dot{box-shadow:0 0 0 3px rgba(229,138,69,.45);}
.ivd-day-lbl{font-size:10px;letter-spacing:1.5px;text-transform:uppercase;color:#6B4A37;}

.ivd-actions-card{background:#FFFBF3;border:1px solid rgba(229,138,69,.4);box-shadow:0 12px 30px -24px rgba(89,34,9,.5);}
.ivd-actions-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px;}
@media(max-width:700px){.ivd-actions-list{grid-template-columns:1fr;}}
.ivd-action-row{background:#FBF5EC;border:1px solid rgba(89,34,9,.16);border-radius:16px;padding:14px 16px;gap:12px;cursor:pointer;transition:transform .2s,border-color .2s,background .2s;}
.ivd-action-row:hover{transform:translateY(-2px);border-color:rgba(229,138,69,.7);}
.ivd-action-row.done{background:#F2EAD7;border-color:rgba(79,122,69,.55);}
.ivd-action-ico{display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:#F5E9D6;color:#592209;flex:none;}
.ivd-action-row.done .ivd-action-ico{background:#E1EBD8;color:#4F7A45;}
.ivd-action-check{width:26px;height:26px;color:#fff;}
.ivd-action-check.done{background:#4F7A45;border-color:#4F7A45;color:#fff;}
.ivd-action-name{font-size:15px;line-height:1.4;}
.ivd-action-meta{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px;align-items:center;}
.ivd-chip{display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:600;color:#592209;background:#F5E9D6;border:1px solid rgba(229,138,69,.5);border-radius:50px;padding:2px 10px;}
.ivd-chip.soft{font-weight:500;color:#6B4A37;background:transparent;border-color:rgba(89,34,9,.2);}
.ivd-save-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-top:18px;}
.ivd-save-btn{width:auto;flex:1 1 220px;margin-top:0;display:inline-flex;align-items:center;justify-content:center;gap:8px;}
.ivd-save-state{font-size:12px;color:#6B4A37;}
.ivd-save-state.ok{color:#4F7A45;font-weight:600;}

.ivd-advice{background:linear-gradient(160deg,#FFF6E6 0%,#F8EBD6 100%);border:1px solid rgba(229,138,69,.6);border-radius:24px;padding:26px 26px 22px;margin-bottom:22px;box-shadow:0 16px 40px -26px rgba(89,34,9,.5);}
.ivd-advice-head{display:flex;align-items:center;gap:12px;margin-bottom:6px;}
.ivd-advice-head .ivd-stat-ico{margin:0;}
.ivd-goal{background:#FFFBF3;border:1px dashed rgba(229,138,69,.8);border-radius:16px;padding:14px 16px;margin:14px 0;font-size:15px;line-height:1.6;color:#301607;}
.ivd-goal strong{color:#592209;}
.ivd-sugg{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-top:6px;}
@media(max-width:800px){.ivd-sugg{grid-template-columns:1fr;}}
.ivd-sg{display:flex;flex-direction:column;gap:8px;background:#FFFBF3;border:1px solid rgba(89,34,9,.16);border-radius:16px;padding:14px 16px;}
.ivd-sg-name{font-size:14px;font-weight:600;color:#301607;line-height:1.4;}
.ivd-sg-why{font-size:12px;color:#6B4A37;line-height:1.5;flex:1;}
.ivd-sg-gain{font-size:12px;color:#4F7A45;font-weight:600;}
.ivd-sg-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;border:1px solid #592209;background:#592209;color:#F5E9D6;border-radius:50px;padding:7px 14px;font-size:12px;font-weight:600;cursor:pointer;transition:transform .2s;}
.ivd-sg-btn:hover{transform:translateY(-1px);}
.ivd-tips{list-style:none;margin:14px 0 0;padding:0;display:flex;flex-direction:column;gap:8px;}
.ivd-tips li{display:flex;gap:10px;align-items:flex-start;font-size:14px;line-height:1.6;color:#4A2E1F;}
.ivd-tips svg{flex:none;margin-top:3px;color:#B9722F;}

.ivd-chart,.ivd-history{background:#FFFBF3;border:1px solid rgba(229,138,69,.4);box-shadow:0 12px 30px -24px rgba(89,34,9,.5);}
.ivd-chart{margin-bottom:22px;}
.ivd-h-bar{background:rgba(89,34,9,.12);height:7px;}
.ivd-h-fill{background:linear-gradient(90deg,#E58A45,#592209);}
.ivd-h-date{color:#6B4A37;}
.ivd-h-acts{color:#6B4A37;}
.ivd-empty{color:#6B4A37;}

/* ── Premium look: warm parchment page, deep-brown hero, two-column layout, soft entrance ── */
.ivd-app{background:radial-gradient(900px 520px at 0% 0%,rgba(233,196,106,.30),transparent 62%),radial-gradient(820px 520px at 100% 8%,rgba(217,137,95,.20),transparent 62%),radial-gradient(900px 620px at 50% 100%,rgba(233,196,106,.24),transparent 62%),#FBF5EC;}
.ivd-wrap{max-width:1180px;padding:84px 32px 110px;}
@media(max-width:600px){.ivd-wrap{padding:76px 16px 90px;}}
.ivd-hdr{margin-bottom:34px;}
.ivd-eyebrow{display:inline-flex;align-items:center;gap:12px;color:#8A6414;font-weight:600;}
.ivd-eyebrow::before,.ivd-eyebrow::after{content:"";width:34px;height:1px;background:linear-gradient(90deg,transparent,#B8892B);}
.ivd-eyebrow::after{transform:scaleX(-1);}
.ivd-title{text-shadow:none;letter-spacing:.5px;}
.ivd-orn{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px auto 14px;}
.ivd-orn span{width:70px;height:1px;background:linear-gradient(90deg,transparent,#B8892B);}
.ivd-orn span:last-child{transform:scaleX(-1);}
.ivd-orn i{width:9px;height:9px;transform:rotate(45deg);background:linear-gradient(135deg,#E9C46A,#B8892B);box-shadow:0 0 0 3px rgba(233,196,106,.28);}
.ivd-avatar{display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;margin-right:10px;border-radius:50%;font-style:normal;font-size:14px;font-weight:700;color:#FBF1DC;background:linear-gradient(135deg,#7A3515,#592209);box-shadow:0 0 0 2px #fff,0 0 0 3px rgba(184,137,43,.6);vertical-align:middle;}

/* setup / profile card */
.ivd-setup{max-width:820px;margin:0 auto 32px;background:linear-gradient(165deg,#FFFBF3 0%,#F8EBD6 100%);border:1px solid rgba(184,137,43,.45);border-radius:28px;box-shadow:0 24px 54px -32px rgba(89,34,9,.5),inset 0 0 0 6px rgba(255,251,243,.9),inset 0 0 0 7px rgba(229,138,69,.2);}
.ivd-setup-sub{color:#6B4A37;letter-spacing:1.5px;}
.ivd-input,.ivd-select{background:#fff;border:1px solid rgba(89,34,9,.18);font-size:17px;box-shadow:0 1px 0 rgba(89,34,9,.04);}
.ivd-input:focus,.ivd-select:focus{border-color:#B8892B;box-shadow:0 0 0 3px rgba(184,137,43,.22);}
.ivd-setup-btn,.ivd-save-btn{background:linear-gradient(90deg,#592209,#7A3515);box-shadow:0 12px 26px -14px rgba(89,34,9,.7);}

/* hero */
.ivd-hero{padding:36px 40px;border-radius:30px;overflow:hidden;color:#F5E9D6;background:radial-gradient(120% 150% at 0% 0%,#8A3F18 0%,#592209 46%,#3A1406 100%);border:1px solid rgba(233,196,106,.5);box-shadow:0 34px 64px -34px rgba(58,20,6,.85),inset 0 0 0 1px rgba(255,255,255,.07);}
.ivd-hero::before{content:"";position:absolute;right:-90px;top:-90px;width:300px;height:300px;border-radius:50%;border:1px solid rgba(233,196,106,.28);box-shadow:0 0 0 40px rgba(233,196,106,.05),0 0 0 80px rgba(233,196,106,.04);pointer-events:none;}
.ivd-hero::after{content:"";position:absolute;left:-70px;bottom:-110px;width:260px;height:260px;border-radius:50%;background:radial-gradient(circle,rgba(233,196,106,.28),transparent 70%);pointer-events:none;}
.ivd-hero .ivd-score-section{position:relative;z-index:1;gap:44px;}
.ivd-ring-wrap,.ivd-ring-svg{width:196px;height:196px;}
.ivd-hero .ivd-ring-bg{stroke:rgba(255,255,255,.16);}
.ivd-hero .ivd-ring-fill{filter:drop-shadow(0 0 8px rgba(233,196,106,.5));}
.ivd-hero .ivd-ring-num{font-size:52px;font-weight:600;color:#FFF3D6;}
.ivd-hero .ivd-ring-den{color:rgba(245,233,214,.75);}
.ivd-hero-date{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#E9C46A;margin-bottom:10px;}
.ivd-hero .ivd-score-meta{max-width:420px;}
.ivd-hero .ivd-tier{background:rgba(255,255,255,.12);border-color:rgba(233,196,106,.6);color:#FFE9B8;}
.ivd-hero .ivd-score-name{font-size:22px;color:#FFF7E3;}
.ivd-hero .ivd-score-msg{color:rgba(255,247,227,.92);font-size:17px;}
.ivd-hero .ivd-score-dasha{color:#F1D9A0;font-size:12px;letter-spacing:1px;}
.ivd-hero .ivd-progress{max-width:100%;}
.ivd-hero .ivd-progress-bar{background:rgba(255,255,255,.16);height:9px;}
.ivd-hero .ivd-progress-fill{background:linear-gradient(90deg,#F7DC8A,#E58A45);box-shadow:0 0 12px rgba(233,196,106,.6);}
.ivd-hero .ivd-progress-lbl{color:rgba(245,233,214,.85);}
@media(max-width:600px){.ivd-hero{padding:28px 20px;}.ivd-ring-wrap,.ivd-ring-svg{width:170px;height:170px;}}

/* stats */
.ivd-stat{position:relative;overflow:hidden;}
.ivd-stat::before{content:"";position:absolute;inset:0 0 auto 0;height:3px;background:linear-gradient(90deg,#E9C46A,#D9895F);}
.ivd-stat-ico{background:linear-gradient(135deg,#FFF1CC,#F3D68E);color:#592209;box-shadow:inset 0 0 0 1px rgba(184,137,43,.35);}

/* two columns on wide screens */
.ivd-main{display:grid;grid-template-columns:minmax(0,1.15fr) minmax(0,1fr);gap:22px;align-items:start;margin-bottom:22px;}
.ivd-col{display:flex;flex-direction:column;gap:22px;min-width:0;}
.ivd-col>*{margin-bottom:0 !important;}
.ivd-main .ivd-actions-list{grid-template-columns:1fr;}
.ivd-main .ivd-sugg{grid-template-columns:1fr;}
@media(max-width:980px){.ivd-main{grid-template-columns:1fr;}}
.ivd-lower{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:22px;margin-bottom:22px;}
.ivd-lower>*{margin-bottom:0 !important;}
.ivd-lower>*:only-child{grid-column:1/-1;}
@media(max-width:860px){.ivd-lower{grid-template-columns:1fr;}}

/* section headers with an icon */
.ivd-sec{display:flex;align-items:center;gap:12px;margin-bottom:18px;}
.ivd-sec .ivd-card-title,.ivd-sec .ivd-card-sub{margin:0 !important;}
.ivd-sec-ico{display:inline-flex;align-items:center;justify-content:center;width:38px;height:38px;border-radius:12px;flex:none;color:#592209;background:linear-gradient(135deg,#FFF1CC,#F3D68E);box-shadow:inset 0 0 0 1px rgba(184,137,43,.4);}
.ivd-actions-card,.ivd-week,.ivd-chart,.ivd-history{border-radius:24px;}
.ivd-actions-card{background:linear-gradient(180deg,#FFFDF8,#FFF8EA);}
.ivd-action-row{padding:15px 16px;}
.ivd-action-row:hover{box-shadow:0 12px 24px -18px rgba(89,34,9,.6);}
.ivd-action-check{border:2px solid #B9722F;background:#fff;}
.ivd-action-check:not(.done){color:transparent;}
.ivd-action-row.done{background:linear-gradient(135deg,#F3F7EC,#E9F1DE);}
.ivd-action-name{font-size:15px;font-weight:500;}
.ivd-day-dot{border-color:rgba(184,137,43,.5);}
.ivd-day-dot.on{background:linear-gradient(135deg,#F2B35E,#7A3515);box-shadow:0 6px 14px -8px rgba(89,34,9,.8);}
.ivd-advice{background:linear-gradient(160deg,#FFF6E0 0%,#F7E2B4 100%);border-color:rgba(184,137,43,.65);}
.ivd-goal{border-style:solid;border-color:rgba(184,137,43,.5);background:#FFFDF7;}
.ivd-sg{transition:transform .2s,box-shadow .2s;}
.ivd-sg:hover{transform:translateY(-2px);box-shadow:0 12px 22px -18px rgba(89,34,9,.7);}
.ivd-sg-btn{background:linear-gradient(90deg,#592209,#7A3515);}
.ivd-h-row:hover{background:rgba(233,196,106,.12);border-radius:10px;}

/* extra practices and the suggested tag */
.ivd-more-btn{display:flex;width:100%;align-items:center;justify-content:center;gap:8px;margin-top:14px;padding:11px 14px;border-radius:14px;border:1px dashed rgba(184,137,43,.7);background:#FFF8E6;color:#592209;font-size:13px;font-weight:600;cursor:pointer;transition:background .2s,border-color .2s;}
.ivd-more-btn:hover{background:#FFF1CC;border-color:#B8892B;}
.ivd-more-btn svg{transition:transform .25s;}
.ivd-more-btn svg.open{transform:rotate(180deg);}
.ivd-more-count{margin-left:4px;padding:1px 9px;border-radius:50px;background:#E1EBD8;color:#3F6636;font-size:11px;}
.ivd-extra{margin-top:16px;animation:ivd-rise .35s ease both;}
/* the optional practices are shown two across and a little more compact, so the list stays short */
.ivd-main .ivd-extra .ivd-actions-list{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
.ivd-extra .ivd-action-row{padding:11px 12px;gap:9px;}
.ivd-extra .ivd-action-ico{display:none;}
.ivd-extra .ivd-action-name{font-size:14px;}
.ivd-extra .ivd-action-check{width:24px;height:24px;}
@media(max-width:520px){.ivd-main .ivd-extra .ivd-actions-list{grid-template-columns:1fr;}}
.ivd-action-row.suggested{border-color:#B8892B;background:linear-gradient(135deg,#FFF8E2,#FDEFC6);box-shadow:0 10px 22px -18px rgba(138,100,20,.8);}
.ivd-chip.suggested{background:linear-gradient(90deg,#F7DC8A,#EBB660);border-color:#B8892B;color:#592209;}
@media(prefers-reduced-motion:reduce){.ivd-extra{animation:none;}.ivd-more-btn svg{transition:none;}}

/* soft entrance; nothing waits on it */
@keyframes ivd-rise{from{opacity:0;transform:translateY(14px);}to{opacity:1;transform:none;}}
.ivd-wrap>*{animation:ivd-rise .6s ease both;}
.ivd-wrap>*:nth-child(2){animation-delay:.05s;}.ivd-wrap>*:nth-child(3){animation-delay:.1s;}.ivd-wrap>*:nth-child(4){animation-delay:.15s;}
.ivd-wrap>*:nth-child(5){animation-delay:.2s;}.ivd-wrap>*:nth-child(6){animation-delay:.25s;}.ivd-wrap>*:nth-child(7){animation-delay:.3s;}
@media(prefers-reduced-motion:reduce){.ivd-wrap>*{animation:none;}.ivd-sg,.ivd-stat,.ivd-action-row{transition:none;}}

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

function ScoreRing({ score }: { score: number }) {
  const r=68, circ=2*Math.PI*r;
  const offset=circ-(score/100)*circ;
  return (
    <div className="ivd-ring-wrap" role="img" aria-label={`Today's score ${score} out of 100`}>
      <svg className="ivd-ring-svg" viewBox="0 0 168 168">
        <defs>
          <linearGradient id="ivd-ring-grad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#F7DC8A"/><stop offset="100%" stopColor="#E58A45"/></linearGradient>
        </defs>
        <circle className="ivd-ring-bg" cx="84" cy="84" r={r}/>
        <circle className="ivd-ring-fill" cx="84" cy="84" r={r} stroke="url(#ivd-ring-grad)" strokeDasharray={circ} strokeDashoffset={offset}/>
      </svg>
      <div className="ivd-ring-center">
        <div className="ivd-ring-num">{score}</div>
        <div className="ivd-ring-den">/ 100</div>
      </div>
    </div>
  );
}

export default function InnerVoiceDashboard() {
  useFeatureTitle(FEATURES.karmaScore);
  const signedIn = useAuthStore((s) => s.isAuthenticated);
  const [profile, setProfile] = useState(()=>{ try{return JSON.parse(localStorage.getItem("iv_profile")||"null")}catch{return null} });
  // `place` is the real place chosen from the searchable list; `pob` keeps its name (and any older typed text).
  const [form, setForm] = useState<{name:string;dob:string;pob:string;place:PlaceResult|null;reason:string;sign:string;nakshatra:string;dasha:string}>({name:"",dob:"",pob:"",place:null,reason:"",sign:"",nakshatra:"",dasha:""});
  const [editing, setEditing] = useState(false); // reopen the profile form after it has been saved once
  const [history, setHistory] = useState<ScoreEntry[]>(()=>{ try{return JSON.parse(localStorage.getItem("iv_karma_v2")||"[]")}catch{return[]} });
  const [today,setToday]=useState(()=>localDateKey());
  const [done, setDone] = useState<string[]>(()=>{ try{return JSON.parse(localStorage.getItem(`iv_done_${localDateKey()}`)||"[]")}catch{return[]} });
  const [saved, setSaved] = useState(false);
  const [showMore, setShowMore] = useState(()=>{ try{ const d=JSON.parse(localStorage.getItem(`iv_done_${localDateKey()}`)||"[]") as string[]; return EXTRA_ACTIONS.some(a=>d.includes(a.id)); }catch{ return false; } });

  // The page can stay open past midnight: when the date changes, start the new day with that day's own ticks
  // instead of carrying yesterday's over.
  useEffect(()=>{
    const id=setInterval(()=>{ const k=localDateKey(); setToday(prev=>{ if(prev===k) return prev; try{ setDone(JSON.parse(localStorage.getItem(`iv_done_${k}`)||"[]")); }catch{ setDone([]); } setSaved(false); return k; }); },30_000);
    return()=>clearInterval(id);
  },[]);

  useEffect(()=>{ const s=document.createElement("style"); s.textContent=CSS; document.head.appendChild(s); return()=>{ document.head.removeChild(s); }; },[]);

  const saveProfile=()=>{ if(!form.name.trim()) return; const p={...form,name:form.name.trim(),pob:(form.place?form.place.label:form.pob).trim(),reason:form.reason.trim()}; try{localStorage.setItem("iv_profile",JSON.stringify(p));}catch{/* storage unavailable */} setProfile(p); setEditing(false); };
  const openEditor=()=>{ setForm({name:"",dob:"",pob:"",place:null,reason:"",sign:"",nakshatra:"",dasha:"",...(profile||{})}); setEditing(true); };

  const toggleAction=(id:string)=>{ if(!requireSignIn()) return; const key=localDateKey(); const next=done.includes(id)?done.filter(d=>d!==id):[...done,id]; setDone(next); setSaved(false); try{localStorage.setItem(`iv_done_${key}`,JSON.stringify(next));}catch{/* storage unavailable */} };

  const behaviorPts=pointsFor(done);
  const composite=computeDailyScore(done);
  const weekAvg=recentAverage(history,7);
  const savedToday=history.find(e=>e.date===today);
  const unsaved=!savedToday||savedToday.composite!==composite;
  const streak=currentStreak(history);
  const best=bestStreak(history);
  const week=lastSevenDays(history);
  const practiced=practicedDaysThisWeek(history);
  const weekSaved=week.filter(d=>d.score!==null).length;
  const tier=tierFor(composite);
  const path=pathToNextLevel(done);
  const longDate=new Date(today+"T00:00:00").toLocaleDateString("en-IN",{weekday:"long",day:"numeric",month:"long"});
  // The practices named in the goal are tagged in the list itself, so there is one place to tick them.
  const suggestedIds=new Set(path?path.steps.map(x=>x.id):[]);
  const extrasDone=EXTRA_ACTIONS.filter(a=>done.includes(a.id)).length;
  const tierProgress=tier.next?Math.round(((composite-tier.min)/(tier.next.min-tier.min))*100):100;

  const saveToday=()=>{ if(!requireSignIn()) return; const entry={date:localDateKey(),composite,behaviorPts,actionsCompleted:done.length}; const updated=[entry,...history.filter(e=>e.date!==entry.date)].slice(0,60); setHistory(updated); try{localStorage.setItem("iv_karma_v2",JSON.stringify(updated));}catch{/* storage unavailable */} setSaved(true); };

  const renderRow=(a:(typeof ACTIONS)[number])=>{ const Icon=ACTION_ICON[a.id]??Sparkles; const on=done.includes(a.id); const sug=!on&&suggestedIds.has(a.id); return (
              <div key={a.id} className={`ivd-action-row${on?" done":""}${sug?" suggested":""}`} onClick={()=>toggleAction(a.id)}>
                <span className="ivd-action-ico"><Icon size={18} aria-hidden="true" /></span>
                <div style={{flex:1,minWidth:0}}>
                  <div className="ivd-action-name">{a.name}</div>
                  <div className="ivd-action-meta">
                    <span className="ivd-chip">+{a.pts} pts</span>
                    <span className="ivd-chip soft"><Timer size={11} aria-hidden="true" /> {a.minutes===0?"through the day":`~${a.minutes} min`}</span>
                    {sug&&<span className="ivd-chip suggested"><Sparkles size={11} aria-hidden="true" /> Suggested</span>}
                  </div>
                </div>
                <div role="checkbox" aria-checked={on} aria-label={a.name} tabIndex={0} className={`ivd-action-check${on?" done":""}`} onClick={e=>{ e.stopPropagation(); toggleAction(a.id); }} onKeyDown={e=>{ if(e.key===" "||e.key==="Enter"){ e.preventDefault(); toggleAction(a.id); } }}>{on&&<Check size={14} aria-hidden="true" />}</div>
              </div>
  ); };

  const lineData=[...history].reverse().slice(-14).map(e=>({date:e.date.slice(5),score:e.composite}));

  if(!signedIn) return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap">
        <div className="ivd-hdr"><div className="ivd-eyebrow">Daily Karma Sankhya</div><h1 className="ivd-title">{FEATURES.karmaScore.name}</h1><div className="ivd-orn" aria-hidden="true"><span/><i/><span/></div><p className="ivd-sub">A simple daily score based on the mindful practices you complete. It is symbolic, meant to encourage consistency.</p></div>
        <div className="ivd-setup">
          <div className="ivd-setup-title">Sign in to track your score</div>
          <div className="ivd-setup-sub">Your practices and score history are personal, so they are kept for signed-in members only.</div>
          <button className="ivd-setup-btn" onClick={()=>requireSignIn()}>Sign in to continue →</button>
        </div>
      </div>
    </div>
  );

  if(!profile||editing) return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap">
        <div className="ivd-hdr"><div className="ivd-eyebrow">One-time Setup</div><h1 className="ivd-title">{FEATURES.karmaScore.name}</h1><div className="ivd-orn" aria-hidden="true"><span/><i/><span/></div><p className="ivd-sub">A simple daily score based on the mindful practices you complete. It is symbolic, meant to encourage consistency.</p></div>
        <div className="ivd-setup">
          <div className="ivd-setup-title">Your Profile</div>
          <div className="ivd-setup-sub">Only your name is needed. The other details are optional, are kept on this device, and are not used in the score.</div>
          <div className="ivd-grid2">
            <div className="ivd-field"><label>Your Name</label><input className="ivd-input" placeholder="Enter your name" maxLength={60} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))}/></div>
            <div className="ivd-field"><label>Date of Birth (optional)</label><input className="ivd-input" type="date" value={form.dob} onChange={e=>setForm(f=>({...f,dob:e.target.value}))}/></div>
            <div className="ivd-field"><label id="ivd-pob-label">Place of Birth (optional)</label>
              <LocationPicker value={form.place} onSelect={(place)=>setForm(f=>({...f,place,pob:place?place.label:f.pob}))}/>
              {!form.place&&form.pob&&<p style={{fontSize:12,color:"#6B4A37",margin:"6px 2px 0"}}>Saved as: {form.pob}. Search and choose your place from the list to update it.</p>}
            </div>
            <div className="ivd-field"><label>Chandra Rashi (Moon sign, optional)</label><select className="ivd-select" value={form.sign} onChange={e=>setForm(f=>({...f,sign:e.target.value}))}><option value="">Select...</option>{ZODIAC.map(s=><option key={s} value={s}>{s}</option>)}</select></div>
            <div className="ivd-field"><label>Nakshatra (optional)</label><select className="ivd-select" value={form.nakshatra} onChange={e=>setForm(f=>({...f,nakshatra:e.target.value}))}><option value="">Select...</option>{NAKSHATRA.map(n=><option key={n} value={n}>{n}</option>)}</select></div>
          </div>
          <div className="ivd-field" style={{marginBottom:18}}><label>Why are you tracking your karma? (optional)</label><textarea className="ivd-input" rows={3} maxLength={200} placeholder="For example: to stay consistent with my daily prayers" value={form.reason} onChange={e=>setForm(f=>({...f,reason:e.target.value}))} style={{resize:"vertical",fontSize:16}}/></div>
          <button className="ivd-setup-btn" onClick={saveProfile} disabled={!form.name.trim()}>{profile?"Save Profile →":"Start Tracking →"}</button>
          {profile&&<button type="button" className="ivd-setup-btn" style={{background:"transparent",color:"#592209",border:"1px solid rgba(89,34,9,.3)",marginTop:10}} onClick={()=>setEditing(false)}>Cancel</button>}
        </div>
      </div>
    </div>
  );

  return (
    <div className="ivd-app"><style>{CSS}</style><StarCanvas />
      <div className="ivd-wrap">
        <div className="ivd-hdr"><div className="ivd-eyebrow">Daily Karma Sankhya</div><h1 className="ivd-title">{FEATURES.karmaScore.name}</h1><div className="ivd-orn" aria-hidden="true"><span/><i/><span/></div><p className="ivd-sub"><span className="ivd-avatar" aria-hidden="true">{profile.name.trim().charAt(0).toUpperCase()}</span>{profile.name}{profile.sign ? ` · ${profile.sign}`:""}</p>
          {profile.reason&&<p className="ivd-sub" style={{fontSize:15,marginTop:4}}>Intention: {profile.reason}</p>}
          <button type="button" className="ivd-chip" style={{marginTop:12,cursor:"pointer"}} onClick={openEditor}>Edit profile</button></div>

        <div className="ivd-hero">
          <div className="ivd-score-section">
            <ScoreRing score={composite}/>
            <div className="ivd-score-meta">
              <div className="ivd-hero-date">{longDate}</div>
              <span className="ivd-tier"><Sparkles size={13} aria-hidden="true" /> {tier.label}</span>
              <div className="ivd-score-name">Today's Practice Score</div>
              <div className="ivd-score-msg">{scoreMessage(composite,done.length)}</div>
              <div className="ivd-score-dasha">{behaviorPts} of {MAX_POINTS} points for a full score · {done.length} {done.length===1?"practice":"practices"} done</div>
              {tier.next ? (
                <div className="ivd-progress">
                  <div className="ivd-progress-bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={tierProgress} aria-label={`Progress to ${tier.next.label}`}><div className="ivd-progress-fill" style={{width:`${tierProgress}%`}}/></div>
                  <div className="ivd-progress-lbl">{tier.next.min-composite} more {tier.next.min-composite===1?"point":"points"} of score to reach “{tier.next.label}” ({tier.next.min})</div>
                </div>
              ) : (
                <div className="ivd-progress"><div className="ivd-progress-lbl">You are at the highest level today. The aim now is to keep it steady.</div></div>
              )}
            </div>
          </div>
        </div>

        <div className="ivd-stats">
          <div className="ivd-stat"><span className="ivd-stat-ico"><Target size={18} aria-hidden="true" /></span><div className="ivd-stat-val">{behaviorPts}</div><div className="ivd-stat-lbl">Points Today</div></div>
          <div className="ivd-stat"><span className="ivd-stat-ico"><Flame size={18} aria-hidden="true" /></span><div className="ivd-stat-val">{streak}</div><div className="ivd-stat-lbl">Day Streak</div><div className="ivd-stat-note">Best: {best}</div></div>
          <div className="ivd-stat"><span className="ivd-stat-ico"><CalendarDays size={18} aria-hidden="true" /></span><div className="ivd-stat-val">{weekAvg===null?"–":weekAvg}</div><div className="ivd-stat-lbl">7-Day Average</div><div className="ivd-stat-note">{weekSaved} saved {weekSaved===1?"day":"days"}</div></div>
          <div className="ivd-stat"><span className="ivd-stat-ico"><Bookmark size={18} aria-hidden="true" /></span><div className="ivd-stat-val">{history.length}</div><div className="ivd-stat-lbl">Days Saved</div></div>
        </div>

        <div className="ivd-main">
          <div className="ivd-col">
        <div className="ivd-actions-card">
          <div className="ivd-sec"><span className="ivd-sec-ico"><Sparkles size={18} aria-hidden="true" /></span><div><div className="ivd-card-title">Today's Practices</div>
          <div className="ivd-card-sub">Tick what you have done today. Each practice carries the points shown.</div></div></div>
          <div className="ivd-actions-list">
            {ACTIONS.map(renderRow)}
          </div>

          <button type="button" className="ivd-more-btn" aria-expanded={showMore} aria-controls="ivd-extra" onClick={()=>setShowMore(v=>!v)}>
            <ChevronDown size={16} aria-hidden="true" className={showMore?"open":""} />
            {showMore?"Show fewer practices":`Show ${EXTRA_ACTIONS.length} more practices`}
            {!showMore&&extrasDone>0&&<span className="ivd-more-count">{extrasDone} done</span>}
          </button>
          {showMore&&(
            <div id="ivd-extra" className="ivd-extra">
              <div className="ivd-card-sub" style={{margin:"4px 0 10px"}}>More good deeds · optional, they add to the same score</div>
              <div className="ivd-actions-list">
                {EXTRA_ACTIONS.map(renderRow)}
              </div>
            </div>
          )}
          <div className="ivd-save-row">
            <button className="ivd-save-btn" onClick={saveToday}><Bookmark size={15} aria-hidden="true" /> Save Today's Score</button>
            {saved||!unsaved
              ? <span className="ivd-save-state ok" role="status">Saved: {savedToday?.composite ?? composite}/100</span>
              : <span className="ivd-save-state" role="status">{savedToday?`Changed since you saved (${savedToday.composite}/100). Save to update.`:"Not saved yet. Save to add today to your history and streak."}</span>}
          </div>
        </div>

          </div>
          <div className="ivd-col">
        <div className="ivd-week" aria-label="Your last seven days">
          <div className="ivd-sec" style={{marginBottom:4}}><span className="ivd-sec-ico"><CalendarDays size={18} aria-hidden="true" /></span><div><div className="ivd-card-title">Your Week</div>
          <div className="ivd-card-sub">{practiced} of the last 7 days practiced · only saved days are counted</div></div></div>
          <div className="ivd-week-row">
            {week.map(d=>(
              <div key={d.date} className={`ivd-day${d.isToday?" today":""}`}>
                <div className={`ivd-day-dot${(d.score??0)>0?" on":""}`} title={d.score===null?"Not saved":`Score ${d.score}`}>{d.score===null?"":d.score}</div>
                <div className="ivd-day-lbl">{new Date(d.date+"T00:00:00").toLocaleDateString("en-IN",{weekday:"short"})}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="ivd-advice" data-testid="karma-advice">
          <div className="ivd-advice-head">
            <span className="ivd-stat-ico"><Lightbulb size={18} aria-hidden="true" /></span>
            <div><div className="ivd-card-title" style={{marginBottom:0}}>How to raise your score</div><div className="ivd-card-sub" style={{marginBottom:0}}>Worked out from what you have ticked today</div></div>
          </div>

          {path ? (
            <div className="ivd-goal" data-testid="karma-goal">
              To reach <strong>{path.target.label}</strong> ({path.target.min}+) today, add {path.steps.map((s,i)=>(<span key={s.id}>{i>0?(i===path.steps.length-1?" and ":", "):""}<strong>{s.name}</strong> (+{s.gain})</span>))}. That brings you to <strong>{path.scoreAfter}</strong>. They are tagged <strong>Suggested</strong> in your list.
            </div>
          ) : composite>=85 ? (
            <div className="ivd-goal">You have done almost everything today. Keep the same routine tomorrow: steadiness counts for more than one perfect day.</div>
          ) : null}

          <ul className="ivd-tips">
            {done.length===0 && <li><Sparkles size={15} aria-hidden="true" /><span>Start with one small practice. A single tick already moves the score, and the aim is a habit, not a perfect day.</span></li>}
            {streak===0 && done.length>0 && <li><Flame size={15} aria-hidden="true" /><span>A streak counts every day with at least one saved practice.</span></li>}
            {streak>0 && <li><Flame size={15} aria-hidden="true" /><span>You are on a {streak}-day streak{streak<best?` (your best is ${best})`:""}.</span></li>}
            {practiced<7 && weekSaved>0 && <li><CalendarDays size={15} aria-hidden="true" /><span>You practiced on {practiced} of the last 7 days. Even a short mantra on the other days keeps your weekly average up.</span></li>}
          </ul>
        </div>

          </div>
        </div>

        <div className="ivd-lower">
        {lineData.length>1 && (
          <div className="ivd-chart">
            <div className="ivd-sec"><span className="ivd-sec-ico"><Activity size={18} aria-hidden="true" /></span><div><div className="ivd-card-title">Trend</div>
            <div className="ivd-card-sub">Your saved scores over the last 14 entries</div></div></div>
            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={lineData}>
                <XAxis dataKey="date" tick={{fill:"#6B4A37",fontSize:11,fontFamily:"'DM Sans', system-ui, sans-serif"}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,100]} tick={{fill:"#6B4A37",fontSize:11}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:"#FBF5EC",border:"1px solid rgba(89,34,9,.3)",borderRadius:12,fontFamily:"'DM Sans', system-ui, sans-serif",fontSize:11}}/>
                <Line type="monotone" dataKey="score" stroke="#592209" strokeWidth={2} dot={{fill:"#592209",r:3}}/>
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="ivd-history">
          <div className="ivd-sec"><span className="ivd-sec-ico"><Bookmark size={18} aria-hidden="true" /></span><div><div className="ivd-card-title">Score History</div>
          <div className="ivd-card-sub">Your most recent saved days</div></div></div>
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
      <AskDivyaSection feature="karmaScore" context={`Today's Karma Sankhya: ${composite}/100 from ${done.length} practices (${behaviorPts} points; ${MAX_POINTS} is a full score).`} />
      <FeatureFaq feature="karmaScore" />
      </div>
    </div>
  );
}
