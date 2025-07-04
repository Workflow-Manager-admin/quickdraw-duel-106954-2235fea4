import React, { useState } from "react";

// PUBLIC_INTERFACE
function VotingPanel({ drawings, votes, user, onSubmitVote, accent, primary, secondary }) {
  const canVoteDrawings = drawings.filter(d => d.uid !== user.uid);
  const alreadyVoted = votes.find(v => v.voterUid === user.uid);

  return (
    <div style={{
      background: accent,
      borderRadius: 11,
      boxShadow: "0 1px 14px #ececec",
      padding: 24,
      minWidth: 350,
      display: "flex",
      flexDirection: "column"
    }}>
      <div style={{ fontSize: 20, color: primary, fontWeight: 500, alignSelf:"center", marginBottom: 18 }}>
        Vote for your favorite drawing (not yours)
      </div>
      {canVoteDrawings.length === 0 ? (
        <div style={{ color: "#888", fontSize: 18}}>Waiting for others...</div>
      ) : (
        <div style={{ display: "flex", gap: 34 }}>
        {canVoteDrawings.map((d, idx) => (
          <div key={d.uid} style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            <img src={d.imageUrl}
              alt="drawing"
              style={{
                width: 128,
                height: 101,
                borderRadius: 7,
                border: `1.6px solid ${secondary}`,
                objectFit: "contain",
                background: "#fff"
              }} />
            <span style={{ color: secondary, fontSize:15, fontWeight:600, marginTop:4 }}>{d.username}</span>
            <button
              onClick={() => alreadyVoted ? null : onSubmitVote(d.uid)}
              disabled={!!alreadyVoted}
              style={{
                marginTop: 12,
                background: alreadyVoted ? "#cccccc" : primary,
                color: "#fff",
                border: "none",
                borderRadius: 7,
                fontWeight: 600,
                fontSize: 16,
                padding: "6px 18px",
                cursor: alreadyVoted ? "not-allowed" : "pointer",
                opacity: alreadyVoted ? 0.65 : 1
              }}
            >
              {alreadyVoted ? "Voted" : "Vote"}
            </button>
          </div>
        ))}
        </div>
      )}
    </div>
  );
}

export default VotingPanel;
