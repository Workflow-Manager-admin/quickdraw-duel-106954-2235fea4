import React, { useRef, useEffect, useState } from "react";

// PUBLIC_INTERFACE
function DrawingCanvas({ onSubmit, timer, accent, primary, secondary }) {
  const canvasRef = useRef(null);
  const [drawing, setDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [coords, setCoords] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (timer === 0) {
      handleSubmit();
    }
    // eslint-disable-next-line
  }, [timer]);

  // Mouse events
  const handleDown = (e) => {
    setDrawing(true);
    setHasDrawn(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    setCoords({ x, y });
  };
  const handleUp = () => setDrawing(false);

  const handleDraw = (e) => {
    if (!drawing) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const rect = canvas.getBoundingClientRect();
    const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
    const y = (e.touches ? e.touches[0].clientY : e.clientY) - rect.top;
    ctx.strokeStyle = "#272727";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    ctx.lineTo(x, y);
    ctx.stroke();
    setCoords({ x, y });
  };
  // Clear canvas
  const clearCanvas = () => {
    const ctx = canvasRef.current.getContext("2d");
    ctx.clearRect(0, 0, 400, 300);
    setHasDrawn(false);
  };

  // Submit
  const handleSubmit = () => {
    // Send PNG url
    if (hasDrawn && onSubmit) {
      onSubmit(canvasRef.current.toDataURL("image/png"));
    }
  };

  return (
    <div style={{
      background: accent, borderRadius: 12, boxShadow: "0 1px 18px #f0f0f0", padding: 12, marginTop: 14,
      display:"flex", flexDirection:"column", alignItems:"center"
    }}>
      <canvas
        ref={canvasRef}
        width={400}
        height={300}
        style={{ borderRadius: 8, background:"#fff", border:`2.5px solid ${primary}` }}
        onMouseDown={handleDown}
        onMouseUp={handleUp}
        onMouseMove={handleDraw}
        onTouchStart={handleDown}
        onTouchEnd={handleUp}
        onTouchMove={handleDraw}
      ></canvas>
      <div style={{ display: "flex", alignItems: "center", margin: 8 }}>
        <button onClick={clearCanvas}
          style={{margin: 3, background: secondary, border: "none", color: "#fff", borderRadius: 7, fontSize: 16, padding: "6px 16px", fontWeight:600 }}
        >Clear</button>
        <button onClick={handleSubmit}
          disabled={!hasDrawn}
          style={{ margin: 3, background: primary, border: "none", color: "#fff", borderRadius: 7, fontSize: 16, padding: "6px 16px", fontWeight:600, opacity: hasDrawn ? 1 : 0.4 }}>
          Submit
        </button>
        <div style={{ marginLeft: 18, color: primary, fontWeight:500, fontSize:20 }}>
          ⏱️ {timer}s
        </div>
      </div>
    </div>
  );
}

export default DrawingCanvas;
