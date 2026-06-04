export function AppScreens() {
  const screens = [
    {
      label: "Discovery",
      tag: "Culture Compass",
      img: "/screens/discovery.png",
      accent: "#FF6B00",
    },
    {
      label: "For You",
      tag: "AI Recommendations",
      img: "/screens/ai.png",
      accent: "#9C27B0",
    },
    {
      label: "Social Hub",
      tag: "Friends & Events",
      img: "/screens/social.png",
      accent: "#00C853",
    },
    {
      label: "Creator Studio",
      tag: "Dashboard",
      img: "/screens/creator.png",
      accent: "#FF6B00",
    },
  ];

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #0A0A0A 0%, #111111 50%, #0D0D0D 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "48px 40px",
        fontFamily: "'Inter', 'SF Pro Display', system-ui, sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background pattern */}
      <div style={{ position: "absolute", inset: 0, opacity: 0.03, backgroundImage: "repeating-linear-gradient(45deg, #FF6B00 0px, #FF6B00 1px, transparent 1px, transparent 20px)", pointerEvents: "none" }} />

      {/* Glow orbs */}
      <div style={{ position: "absolute", top: -120, left: "15%", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, rgba(255,107,0,0.12) 0%, transparent 70%)", pointerEvents: "none" }} />
      <div style={{ position: "absolute", bottom: -100, right: "10%", width: 350, height: 350, borderRadius: "50%", background: "radial-gradient(circle, rgba(156,39,176,0.08) 0%, transparent 70%)", pointerEvents: "none" }} />

      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: 52, position: "relative", zIndex: 1 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 14, marginBottom: 16 }}>
          <img src="/screens/logo-icon.png" alt="Kultr" style={{ width: 52, height: 52, borderRadius: 12 }} />
          <img src="/screens/logo-wordmark.png" alt="Kultr" style={{ width: 130, height: 40, objectFit: "contain" }} />
        </div>
        <p style={{ color: "#A0A0A0", fontSize: 15, margin: 0, letterSpacing: "0.12em", textTransform: "uppercase", fontWeight: 600 }}>
          East Africa's Cultural Events Platform
        </p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 12 }}>
          {["7 Countries", "Local Payments", "Instant Tickets", "Creator Tools"].map((pill) => (
            <span key={pill} style={{ background: "rgba(255,107,0,0.12)", border: "1px solid rgba(255,107,0,0.25)", color: "#FF6B00", fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: 20, letterSpacing: "0.04em" }}>{pill}</span>
          ))}
        </div>
      </div>

      {/* Phone grid */}
      <div style={{ display: "flex", gap: 28, alignItems: "flex-start", position: "relative", zIndex: 1, flexWrap: "wrap", justifyContent: "center" }}>
        {screens.map((screen, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            {/* Phone shell */}
            <div
              style={{
                width: 220,
                height: 468,
                borderRadius: 36,
                background: "#0E0E0E",
                border: "2px solid #2A2A2A",
                padding: 10,
                boxShadow: `0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px #1A1A1A, 0 8px 32px ${screen.accent}22`,
                position: "relative",
                flexShrink: 0,
              }}
            >
              {/* Notch */}
              <div style={{ position: "absolute", top: 14, left: "50%", transform: "translateX(-50%)", width: 70, height: 22, background: "#0E0E0E", borderRadius: 12, zIndex: 10, border: "1px solid #1E1E1E" }} />

              {/* Screen */}
              <div style={{ width: "100%", height: "100%", borderRadius: 28, overflow: "hidden", background: "#111111", position: "relative" }}>
                <img
                  src={screen.img}
                  alt={screen.label}
                  style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }}
                />
                {/* Accent glow at bottom */}
                <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: 60, background: `linear-gradient(to top, ${screen.accent}18, transparent)` }} />
              </div>

              {/* Home indicator */}
              <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", width: 80, height: 4, background: "#333", borderRadius: 2 }} />
            </div>

            {/* Label */}
            <div style={{ textAlign: "center" }}>
              <div style={{ color: "#FFFFFF", fontSize: 13, fontWeight: 700, letterSpacing: "0.02em", marginBottom: 4 }}>{screen.label}</div>
              <div style={{ display: "inline-block", background: `${screen.accent}18`, border: `1px solid ${screen.accent}33`, color: screen.accent, fontSize: 10, fontWeight: 600, padding: "3px 8px", borderRadius: 8, letterSpacing: "0.06em" }}>{screen.tag}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Footer stats */}
      <div style={{ display: "flex", gap: 48, marginTop: 52, position: "relative", zIndex: 1 }}>
        {[
          { value: "7", label: "Countries" },
          { value: "50+", label: "Event Types" },
          { value: "M-Pesa & More", label: "Local Payments" },
          { value: "Instant", label: "QR Tickets" },
        ].map((stat) => (
          <div key={stat.label} style={{ textAlign: "center" }}>
            <div style={{ color: "#FF6B00", fontSize: 22, fontWeight: 900, letterSpacing: "-0.02em" }}>{stat.value}</div>
            <div style={{ color: "#555", fontSize: 11, fontWeight: 500, marginTop: 2, letterSpacing: "0.06em", textTransform: "uppercase" }}>{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
