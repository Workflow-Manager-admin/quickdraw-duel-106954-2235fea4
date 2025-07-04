import React from "react";
import Confetti from "react-confetti";

// PUBLIC_INTERFACE
function WinnerOverlay({ winner, drawings, guesses, votes, users, onNext, accent, primary, secondary }) {
  if (!winner) {
    return <div style={{
      color: secondary, fontWeight:700, fontSize:23, marginTop:100, background: accent, padding: 36, borderRadius: 21, border: `3px solid ${primary}`
    }}>Tallying votes...</div>
  }
  const winnerDrawing = drawings.find(d => d.uid === winner);
  const winnerUser = users.find(u => u.uid === winner);
  const winnerVotes = votes.filter(v => v.imageUid === winner);
  // All drawing display
  return (
    <div style={{
      background: accent,
      borderRadius: 19,
      boxShadow: "0 2px 16px #ececec",
      padding: 36,
      minWidth: 420,
      display: "flex",
      flexDirection: "column",
      alignItems: "center"
    }}>
      <Confetti width={400} height={220} />
      <div style={{ fontSize: 27, fontFamily:'cursive', color: primary, fontWeight: 800, marginBottom: 18 }}>
        🎉 Winner: {winnerUser ? winnerUser.username : "Unknown"}
      </div>
      {winnerDrawing &&
        <img src={winnerDrawing.imageUrl} alt="winner drawing"
             style={{ width: 300, height: 220, objectFit:'contain', borderRadius:12, border:`2.2px solid ${secondary}`, marginBottom:12 }}/>
      }
      <div style={{fontSize: 20, color: secondary, fontWeight: 600, margin:6}}>
        Votes: {winnerVotes.length}
      </div>
      <button
        style={{
          background: primary, color: "#fff", border: "none", borderRadius: 8,
          padding: "11px 36px", fontSize: 20, fontWeight:700, marginTop:22, boxShadow: "0 1px 8px #ddd"
        }}
        onClick={onNext}
      >Play Again</button>
      <div style={{marginTop:30}}>
        <span style={{ color: "#666", fontSize:15, fontWeight:400 }}>Other Drawings:</span>
        <div style={{display:'flex', gap:16, marginTop:8, justifyContent:'center', flexWrap:'wrap'}}>
          {drawings.filter(d => d.uid !== winner).map(d => (
            <div key={d.uid} style={{
              display: "flex", flexDirection: "column", alignItems:"center", border: `1.2px solid #eaeaea`, borderRadius: 8, padding:6
            }}>
              <img src={d.imageUrl} alt="drawing" style={{width:92, height:70, objectFit:'contain', background:'#fff', borderRadius:5}} />
              <span style={{color:secondary, fontSize:14}}>{d.username}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{marginTop:30,fontSize:16,color:primary}}>
        <strong>All Guesses</strong>:
        <ul style={{textAlign:'left'}}>
          {guesses.map(g =>
            <li key={g.imageUid+g.guesserUid}><b>{g.guesserName}</b> guessed <b>{g.guessText}</b></li>
          )}
        </ul>
      </div>
    </div>
  );
}
export default WinnerOverlay;
