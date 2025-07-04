import React, { useState } from "react";

// PUBLIC_INTERFACE
function GuessPanel({ drawings, prompt, onSubmitGuess, user, allGuesses, accent, primary, secondary }) {
  const othersDrawings = drawings.filter(d => d.uid !== user.uid);
  const [guessStates, setGuessStates] = useState({});

  function getGuess(uid) {
    return allGuesses.find(g => g.imageUid === uid && g.guesserUid === user.uid);
  }

  const onSubmit = (uid, guess) => {
    if (!guess) return;
    setGuessStates({ ...guessStates, [uid]: "" });
    onSubmitGuess(uid, guess);
  };

  return (
    <div style={{
      background: accent,
      borderRadius: 14,
      boxShadow: "0 1px 14px #ececec",
      padding: 18,
      minWidth: 370,
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ fontSize: 19, color: primary, fontWeight: 500, marginBottom: 10, alignSelf:"center" }}>Guess what your friends drew!</div>
      {othersDrawings.length === 0 ? (
        <div style={{ color: "#888", marginTop: 24, fontSize: 20 }}>Waiting for others to draw...</div>
      ) : (
        othersDrawings.map((d) => (
          <div key={d.uid} style={{ marginBottom: 20, display: "flex", alignItems: "center", flexDirection:"column", borderBottom: "1px solid #ddd", paddingBottom: 10 }}>
            <span style={{ marginBottom:4, color:secondary, fontWeight:600 }}>{d.username || "Player"}</span>
            <img src={d.imageUrl} alt="drawing" style={{ width: 250, height: 200, borderRadius: 9, background: "#fafafa", border: `1.5px solid ${primary}`, objectFit:'contain', marginBottom: 5 }} />
            <form onSubmit={e => {e.preventDefault(); onSubmit(d.uid, guessStates[d.uid]);}} style={{display:'flex', gap:10, alignItems:'center'}}>
              <input
                type="text"
                style={{ fontSize: 16, padding: "7px 13px", borderRadius: 7, border: `1.6px solid ${secondary}` }}
                placeholder="Enter your guess"
                value={guessStates[d.uid] || ""}
                onChange={e => setGuessStates({ ...guessStates, [d.uid]: e.target.value })}
                disabled={!!getGuess(d.uid)}
                required
              />
              <button
                style={{
                  background: primary,
                  color: "#fff",
                  fontWeight: 600,
                  fontSize: 16,
                  border: "none",
                  borderRadius: 7,
                  padding: "7px 26px",
                  opacity: getGuess(d.uid) ? 0.5 : 1,
                  cursor: getGuess(d.uid) ? "not-allowed" : "pointer"
                }}
                type="submit"
                disabled={!!getGuess(d.uid)}
              >Guess</button>
            </form>
            {getGuess(d.uid) && (
              <div style={{color:primary, marginTop:5, fontSize:15}}>You guessed: <b>{getGuess(d.uid).guessText}</b></div>
            )}
          </div>
        ))
      )}
    </div>
  );
}

export default GuessPanel;
