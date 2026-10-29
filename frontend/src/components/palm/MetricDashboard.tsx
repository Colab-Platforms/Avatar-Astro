export interface DashboardMetric {
  label: string;
  value: number; // 0..100
  icon: string;
  color?: string;
}

interface MetricDashboardProps {
  metrics: DashboardMetric[];
}

export function MetricDashboard({ metrics }: MetricDashboardProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 16 }}>
      <style>{`
        @keyframes md-bar-fill{from{width:0}}
        @keyframes md-card-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
      `}</style>
      {metrics.map((m, i) => {
        const color = m.color ?? "#592209";
        return (
          <div
            key={m.label}
            style={{
              background: "rgba(89,34,9,0.2)", border: "1px solid rgba(89,34,9,0.14)",
              borderRadius: 16, padding: "20px", animation: `md-card-in 0.5s ease ${i * 0.05}s both`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 18 }}>{m.icon}</span>
                <span style={{ color: "#301607", fontWeight: 700, fontSize: 13 }}>{m.label}</span>
              </div>
              <span style={{ color, fontWeight: 800, fontSize: 16 }}>{m.value}%</span>
            </div>
            <div style={{ height: 7, background: "rgba(89,34,9,0.2)", borderRadius: 6, overflow: "hidden" }}>
              <div
                style={{
                  height: "100%", width: `${m.value}%`, background: `linear-gradient(90deg, ${color}, #592209)`,
                  borderRadius: 6, boxShadow: `0 0 8px ${color}60`,
                  animation: `md-bar-fill 1.1s cubic-bezier(0.22,1,0.36,1) ${i * 0.05 + 0.15}s both`,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
