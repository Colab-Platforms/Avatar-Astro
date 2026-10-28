import { useState } from "react";
import NameDestinyReport from "@/components/NameDestinyReport";
import CelebrityCarousel from "@/components/NameDestinyReport/sections/CelebrityCarousel";
import FeatureIntro from "@/components/FeatureIntro";
import PremiumHero from "@/components/NameDestinyReport/sections/PremiumHero";
import StatsRow from "@/components/NameDestinyReport/sections/StatsRow";
import { zodiacFromDob, lifePathNumber } from "@/lib/numerology";

interface FormState {
  firstName: string;
  lastName: string;
  dob: string;
}

const emptyForm = (): FormState => ({ firstName: "", lastName: "", dob: "" });

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "rgba(20,28,58,0.7)",
  border: "1px solid rgba(255,255,255,0.08)",
  borderBottom: "2px solid rgba(255,126,71,0.5)",
  borderRadius: 10,
  padding: "14px 18px",
  color: "#fff",
  fontSize: 16,
  outline: "none",
};

export default function NameDestinyReportPage() {
  const [form, setForm] = useState<FormState>(emptyForm());
  const [submitted, setSubmitted] = useState<{ name: string; dob: string; zodiac: string; lifePath: number } | null>(null);
  const [error, setError] = useState("");

  function up<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function handleSubmit() {
    if (!form.firstName.trim() || !form.dob) {
      setError("Please enter your first name and date of birth.");
      return;
    }
    setError("");
    const name = [form.firstName, form.lastName].filter(Boolean).join(" ");
    setSubmitted({
      name,
      dob: form.dob,
      zodiac: zodiacFromDob(form.dob),
      lifePath: lifePathNumber(form.dob),
    });
  }

  function scrollToId(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto", padding: "20px 24px 100px" }}>
      {!submitted && (
        <>
          <PremiumHero
            onStart={() => scrollToId("destiny-form")}
            onViewSample={() => scrollToId("celebrity-name-changes")}
          />

          <FeatureIntro
            className="mb-4"
            description="Discover the cosmic influences that may shape your personality, strengths, challenges, and life journey. Cosmic Blueprint uses your name and date of birth to generate a personalized numerology and astrological interpretation."
            steps={[
              { title: "Enter Your Details", text: "Provide your name and date of birth. Your last name is optional." },
              { title: "Generate Your Reading", text: "Your name and birth date are analysed using the tool's numerology and planetary-ruler logic." },
              { title: "Explore Your Insights", text: "Review the personalized interpretation and the themes highlighted in your reading." },
            ]}
            disclaimer="Readings are interpretive guidance for reflection, not scientific fact or a guarantee of outcomes."
          />

          <StatsRow />

          <div id="destiny-form" style={{ maxWidth: 600, margin: "0 auto", padding: "32px 0 20px", scrollMarginTop: 100 }}>
            <div style={{ textAlign: "center", marginBottom: 36 }}>
              <h2 style={{ fontFamily: "'Astra','Cinzel',serif", fontSize: "clamp(24px,3.5vw,34px)", fontWeight: 700, color: "#fff", textTransform: "uppercase", letterSpacing: "0.03em", lineHeight: 1.2, marginBottom: 12 }}>
                Your Cosmic Blueprint
              </h2>
              <p style={{ color: "rgba(255,255,255,0.55)", fontStyle: "italic", fontSize: 16 }}>
                Enter your details below to begin your free name analysis
              </p>
            </div>

            {error && (
              <div style={{ background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 10, padding: "12px 16px", color: "#f87171", fontSize: 14, marginBottom: 24, textAlign: "center" }}>
                ⚠ {error}
              </div>
            )}

            <div style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "32px 28px", backdropFilter: "blur(16px)" }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                <div>
                  <label htmlFor="nd-first" style={{ display: "block", color: "#ff7e47", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>First Name *</label>
                  <input id="nd-first" style={inputStyle} value={form.firstName} onChange={(e) => up("firstName", e.target.value)} placeholder="e.g. Rohan" />
                </div>
                <div>
                  <label htmlFor="nd-last" style={{ display: "block", color: "#ff7e47", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Last Name</label>
                  <input id="nd-last" style={inputStyle} value={form.lastName} onChange={(e) => up("lastName", e.target.value)} placeholder="e.g. Mehta" />
                </div>
              </div>

              <div style={{ marginBottom: 28 }}>
                <label htmlFor="nd-dob" style={{ display: "block", color: "#ff7e47", fontWeight: 700, fontSize: 15, marginBottom: 10 }}>Date of Birth *</label>
                <input id="nd-dob" type="date" style={inputStyle} value={form.dob} onChange={(e) => up("dob", e.target.value)} />
              </div>

              <button
                onClick={handleSubmit}
                style={{
                  width: "100%", padding: "20px", background: "#ff7e47", border: "none", borderRadius: 40,
                  color: "#fff", fontWeight: 800, fontSize: 18, letterSpacing: "0.05em", textTransform: "uppercase",
                  cursor: "pointer", transition: "transform 0.2s ease, box-shadow 0.2s ease",
                  boxShadow: "0 0 30px rgba(255,126,71,0.35)",
                }}
                onMouseOver={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 0 40px rgba(255,126,71,0.5)"; }}
                onMouseOut={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "0 0 30px rgba(255,126,71,0.35)"; }}
              >
                ✦ Reveal My Cosmic Blueprint ✦
              </button>
            </div>
          </div>
        </>
      )}

      {/*
        Landing-page component — always rendered regardless of report
        generation/unlock/API state, per product requirement. Sits
        immediately after the Hero + Input Form and before any report
        content (which internally contains its own "Everything Included"
        section further down once generated).
      */}
      <div id="celebrity-name-changes" style={{ scrollMarginTop: 90 }}>
        <CelebrityCarousel />
      </div>

      {submitted && (
        <>
          <NameDestinyReport name={submitted.name} dob={submitted.dob} zodiac={submitted.zodiac} lifePath={submitted.lifePath} />
          <button
            onClick={() => {
              setSubmitted(null);
              setForm(emptyForm());
            }}
            style={{
              display: "block", margin: "0 auto", padding: "14px 40px", background: "transparent",
              border: "1px solid rgba(255,255,255,0.15)", borderRadius: 50, color: "rgba(255,255,255,0.5)",
              fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase", cursor: "pointer",
            }}
          >
            ✦ Analyze Another Name
          </button>
        </>
      )}
    </div>
  );
}
