import React, { useState } from "react";

// PUBLIC_INTERFACE
function PromptWheel({ prompts, onSpin, accent, primary, secondary }) {
  const [spinning, setSpinning] = useState(false);
  const [selected, setSelected] = useState(null);

  // Spin effect
  const handleSpin = () => {
    setSpinning(true);
    setTimeout(() => {
      setSpinning(false);
      setSelected(Math.floor(Math.random() * prompts.length));
      onSpin && onSpin();
    }, 2200);
  };

  return (
    <div style={{ background: accent, borderRadius: 18, padding: 28, boxShadow:'0 2px 18px #ececec', display: "flex", flexDirection:"column", alignItems:"center", minWidth:320 }}>
      <div style={{ fontSize: 17, color: primary, fontWeight: 500, marginBottom: 16 }}>Animal/Bird Prompt</div>
      <div style={{
        width: 200, height: 200, borderRadius: "100%", border: `5px solid ${primary}`,
        display: "flex", alignItems: "center", justifyContent: "center",
        background: spinning ? secondary : "#fff",
        boxShadow: spinning ? `0 0 32px 0 ${secondary}` : "0 1px 4px #ddd",
        marginBottom: 18,
        transition: "background 0.4s"
      }}>
        <span style={{
          fontFamily: "cursive", fontSize:42, color: secondary, lineHeight:1
        }}>
          {spinning ? "🔥" : selected === null ? "🎯" : prompts[selected]}
        </span>
      </div>
      <button
        style={{
          background: primary,
          color: "#fff",
          fontWeight: 600,
          fontSize: 18,
          border: "none",
          borderRadius: 8,
          padding: "10px 40px",
          marginTop: 8,
          cursor: "pointer",
          transition: "all 0.2s"
        }}
        disabled={spinning}
        onClick={handleSpin}
      >
        {spinning ? "Spinning..." : "Spin"}
      </button>
    </div>
  );
}

export default PromptWheel;
