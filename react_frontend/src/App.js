import React, { useState, useEffect } from "react";
import "./App.css";
import { initializeApp } from "firebase/app";
import {
  getAuth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  query,
  orderBy,
  serverTimestamp,
  getDocs
} from "firebase/firestore";
import {
  getStorage,
  ref as storageRef,
  uploadString,
  getDownloadURL,
} from "firebase/storage";
import { getAnalytics, logEvent } from "firebase/analytics";
import PromptWheel from "./components/PromptWheel";
import DrawingCanvas from "./components/DrawingCanvas";
import GuessPanel from "./components/GuessPanel";
import VotingPanel from "./components/VotingPanel";
import WinnerOverlay from "./components/WinnerOverlay";
import { ClipLoader } from "react-spinners";

// ---- Firebase Config ----
const firebaseConfig = {
  apiKey: "AIzaSyBNA7xaoiynpwD8j3rE3qB9-daUnmDIbno",
  authDomain: "doodlefinder.firebaseapp.com",
  projectId: "doodlefinder",
  storageBucket: "doodlefinder.firebasestorage.app",
  messagingSenderId: "306458973633",
  appId: "1:306458973633:web:5862a96764e4bd75a6cb40",
  measurementId: "G-2H7VRGX2VY",
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
if (typeof window !== "undefined" && "measurementId" in firebaseConfig) {
  getAnalytics(app);
}

// ---- DESIGN CONSTS ----
const COLORS = {
  primary: "#70b8ff",
  secondary: "#FFC107",
  accent: "#f5eff1",
};
// Minimal animal prompt list:
const PROMPTS = [
  "Elephant", "Giraffe", "Penguin", "Lion", "Whale", "Frog", "Dog", "Cat",
  "Bird", "Zebra", "Horse", "Monkey", "Bear", "Chicken", "Rabbit", "Fox",
  "Panda", "Parrot", "Eagle", "Duck"
];

// ---- UTILS ----
function getRandomPrompt() {
  return PROMPTS[Math.floor(Math.random() * PROMPTS.length)];
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const STAGES = {
  LOGIN: "LOGIN",
  SPIN: "SPIN",   // show wheel to pick prompt
  DRAW: "DRAW",   // show canvas for 30s draw
  GUESS: "GUESS", // see other's images, submit guesses
  VOTE: "VOTE",   // voting round
  RESULT: "RESULT",
  LOADING: "LOADING",
};

// PUBLIC_INTERFACE
function App() {
  // --- Auth State ---
  const [user, setUser] = useState(null);
  const [authError, setAuthError] = useState("");
  const [loginForm, setLoginForm] = useState({ username: "", password: "", isSignUp: false });

  // --- Game State ---
  const [stage, setStage] = useState(STAGES.LOADING); // LOGIN, SPIN, DRAW, GUESS, VOTE, RESULT, LOADING
  const [prompt, setPrompt] = useState("");
  const [drawingData, setDrawingData] = useState("");
  const [timer, setTimer] = useState(30);
  const [guesses, setGuesses] = useState([]);
  const [guessInput, setGuessInput] = useState("");
  const [allDrawings, setAllDrawings] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [votes, setVotes] = useState([]);
  const [winner, setWinner] = useState(null);
  const [results, setResults] = useState(null);
  const [gameDocId, setGameDocId] = useState(null);
  const [loading, setLoading] = useState(false);

  // --- Listeners ---
  // Auth change
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // On login, join or create game
        setStage(STAGES.LOADING);
        await joinOrCreateGame(u);
      } else {
        setStage(STAGES.LOGIN);
      }
    });
    return () => unsub();
    // eslint-disable-next-line
  }, []);

  // Game sync (after joined game)
  useEffect(() => {
    if (!gameDocId) return;
    const gameRef = doc(db, "games", gameDocId);
    const unsub = onSnapshot(gameRef, (docSnap) => {
      const data = docSnap.data();
      if (!data) return;
      setPrompt(data.prompt || "");
      setStage(data.stage || STAGES.SPIN);
      setAllDrawings(data.drawings || []);
      setGuesses(data.guesses || []);
      setAllUsers(data.users || []);
      setVotes(data.votes || []);
      setWinner(data.winner || null);
      setResults(data.results || null);
      setTimer(data.timer || (stage === STAGES.DRAW ? 30 : 0));
    });
    return () => unsub();
    // eslint-disable-next-line
  }, [gameDocId]);
  
  // Timer
  useEffect(() => {
    let t;
    if (stage === STAGES.DRAW && timer > 0) {
      t = setTimeout(() => setTimer(timer - 1), 1000);
    } else if (stage === STAGES.DRAW && timer === 0) {
      // Submit drawing
      handleSubmitDrawing();
    }
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [timer, stage]);

  // ---- GAME FLOW ----
  // Create or join the single global game document.
  // PUBLIC_INTERFACE
  async function joinOrCreateGame(u) {
    setLoading(true);
    // Try to find active game (not completed)
    const gamesCol = collection(db, "games");
    const q = query(gamesCol, orderBy("created", "desc"));
    const docsSnap = await getDocs(q);
    let gameDoc = null;
    for (let d of docsSnap.docs) {
      if (
        d.exists() &&
        d.data().stage &&
        d.data().stage !== STAGES.RESULT &&
        d.data().users &&
        d.data().users.filter((us) => us.uid === u.uid).length < 1
      ) {
        // Join active game
        gameDoc = d;
        break;
      }
    }
    if (!gameDoc) {
      // Create new game doc
      const docRef = await addDoc(gamesCol, {
        stage: STAGES.SPIN,
        prompt: "",
        drawings: [],
        guesses: [],
        users: [{ uid: u.uid, username: u.displayName || u.email.split("@")[0] }],
        votes: [],
        winner: null,
        results: null,
        created: serverTimestamp(),
        timer: 30
      });
      setGameDocId(docRef.id);
      setStage(STAGES.SPIN);
    } else {
      setGameDocId(gameDoc.id);
      // Add player if not exists
      let users = gameDoc.data().users || [];
      if (!users.some((pl) => pl.uid === u.uid)) {
        users.push({ uid: u.uid, username: u.displayName || u.email.split("@")[0] });
        await updateDoc(doc(db, "games", gameDoc.id), { users });
      }
      setStage(gameDoc.data().stage || STAGES.SPIN);
    }
    setLoading(false);
  }

  // PUBLIC_INTERFACE
  function handleLogin(e) {
    e.preventDefault();
    setAuthError("");
    if (!loginForm.username || !loginForm.password) {
      setAuthError("Username and password required.");
      return;
    }
    const email = `${loginForm.username}@doodlefinder.local`;
    if (loginForm.isSignUp) {
      createUserWithEmailAndPassword(auth, email, loginForm.password)
        .then((userCred) => {
          userCred.user.displayName = loginForm.username;
          setUser(userCred.user);
        })
        .catch((err) => setAuthError(err.message));
    } else {
      signInWithEmailAndPassword(auth, email, loginForm.password)
        .then((userCred) => setUser(userCred.user))
        .catch((err) => setAuthError(err.message));
    }
  }

  // PUBLIC_INTERFACE
  async function handleLogout() {
    await signOut(auth);
  }

  // PUBLIC_INTERFACE
  async function handleSpinPrompt() {
    const p = getRandomPrompt();
    setLoading(true);
    // Set in DB for all
    await updateDoc(doc(db, "games", gameDocId), {
      prompt: p,
      stage: STAGES.DRAW,
      drawings: [],
      guesses: [],
      votes: [],
      winner: null,
      results: null,
      timer: 30
    });
    setLoading(false);
    setPrompt(p);
    setStage(STAGES.DRAW);
    setTimer(30);
  }

  // PUBLIC_INTERFACE
  async function handleSubmitDrawing(dataUrl) {
    setDrawingData(dataUrl);
    setLoading(true);
    // Upload drawing to Firebase Storage
    const drawRef = storageRef(storage, `drawings/${gameDocId}/${user.uid}`);
    await uploadString(drawRef, dataUrl, "data_url");
    const imageUrl = await getDownloadURL(drawRef);
    // Add to drawings array in game doc
    const gameRef = doc(db, "games", gameDocId);
    const gameSnap = await getDoc(gameRef);
    const drawings = gameSnap.data().drawings || [];
    if (!drawings.some((d) => d.uid === user.uid)) {
      drawings.push({
        uid: user.uid,
        username: user.displayName || user.email.split("@")[0],
        imageUrl,
      });
      await updateDoc(gameRef, { drawings, stage: STAGES.GUESS });
    }
    setLoading(false);
    setStage(STAGES.GUESS);
  }

  // PUBLIC_INTERFACE
  async function handleSubmitGuess(imageUid, guessText) {
    setLoading(true);
    // Push guess
    const gameRef = doc(db, "games", gameDocId);
    const gameSnap = await getDoc(gameRef);
    const guessesArr = gameSnap.data().guesses || [];
    if (!guessesArr.some((g) => g.imageUid === imageUid && g.guesserUid === user.uid)) {
      guessesArr.push({
        imageUid,
        guessText,
        guesserUid: user.uid,
        guesserName: user.displayName || user.email.split("@")[0],
      });
      await updateDoc(gameRef, { guesses: guessesArr });
    }
    // After submitting guess to all drawings, set stage to VOTE
    const draws = gameSnap.data().drawings || [];
    const myGuesses = guessesArr.filter((g) => g.guesserUid === user.uid);
    if (myGuesses.length + 1 >= draws.length - 1) {
      await updateDoc(gameRef, { stage: STAGES.VOTE });
    }
    setLoading(false);
    setGuessInput("");
    setStage(STAGES.VOTE);
  }

  // PUBLIC_INTERFACE
  async function handleSubmitVote(imageUid) {
    setLoading(true);
    // Vote for drawing, not for own
    const gameRef = doc(db, "games", gameDocId);
    const gameSnap = await getDoc(gameRef);
    const votesArr = gameSnap.data().votes || [];
    if (!votesArr.some((v) => v.voterUid === user.uid)) {
      votesArr.push({
        imageUid,
        voterUid: user.uid,
      });
      await updateDoc(gameRef, { votes: votesArr });
    }
    // When all have voted, compute winner and results
    const usersArr = gameSnap.data().users || [];
    if (votesArr.length + 1 >= (usersArr.length - 1) * usersArr.length) {
      // Compute winner
      const drawingVotes = {};
      votesArr.forEach((v) => {
        drawingVotes[v.imageUid] = (drawingVotes[v.imageUid] || 0) + 1;
      });
      let winUid = Object.keys(drawingVotes).reduce(
        (a, b) => (drawingVotes[a] > drawingVotes[b] ? a : b)
      );
      await updateDoc(gameRef, {
        winner: winUid,
        stage: STAGES.RESULT,
      });
    }
    setLoading(false);
    setStage(STAGES.RESULT);
  }

  // PUBLIC_INTERFACE
  function handleNextGame() {
    setGameDocId(null);
    setPrompt("");
    setDrawingData("");
    setTimer(30);
    setGuesses([]);
    setAllDrawings([]);
    setAllUsers([]);
    setVotes([]);
    setWinner(null);
    setResults(null);
    setStage(STAGES.SPIN);
    // Will trigger joinOrCreate on next render
    joinOrCreateGame(user);
  }

  // Render login page
  if (stage === STAGES.LOGIN) {
    return (
      <div className="login-bg" style={{ background: COLORS.accent, minHeight: "100vh", display: "flex", alignItems: "center", flexDirection: "column", justifyContent: "center" }}>
        <h1 style={{ fontFamily: "cursive", color: COLORS.primary, marginBottom: 10 }}>🎨 Doodle Finder</h1>
        <form className="login-form" style={{ background: "#fff", borderRadius: 14, boxShadow: "0 2px 24px #eee", padding: 26, minWidth: 320 }} onSubmit={handleLogin}>
          <input type="text" required placeholder="Username" style={{ width: "90%", margin: 8, fontSize: 18, borderRadius: 6, border: "1px solid #eee" }} value={loginForm.username} onChange={e => setLoginForm({ ...loginForm, username: e.target.value })} />
          <input type="password" required placeholder="Password" style={{ width: "90%", margin: 8, fontSize: 18, borderRadius: 6, border: "1px solid #eee" }} value={loginForm.password} onChange={e => setLoginForm({ ...loginForm, password: e.target.value })} />
          <button type="submit" style={{ background: COLORS.primary, color: "#fff", border: "none", margin: 8, fontSize: 18, borderRadius: 7, padding: 8, width: "80%" }}>{loginForm.isSignUp ? "Sign Up" : "Log In"}</button>
          <br />
          <a href="#" tabIndex="0" style={{ fontSize: 14, color: COLORS.secondary }} onClick={e => { e.preventDefault(); setLoginForm({ ...loginForm, isSignUp: !loginForm.isSignUp }); }}>{loginForm.isSignUp ? "Already have an account?" : "New user? Sign up"}</a>
          {authError && <div style={{ color: "red", marginTop: 8 }}>{authError}</div>}
        </form>
        <footer style={{marginTop:20, color:'#aaa', fontSize:'85%'}}>No real email needed – choose any username!</footer>
      </div>
    );
  }

  // Render loading spinner
  if (stage === STAGES.LOADING || loading) {
    return (
      <div className="loading-bg" style={{ height:'100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', background:COLORS.accent }}>
        <ClipLoader size={64} color={COLORS.primary} />
        <div style={{ fontFamily:'sans-serif', fontWeight:300, color:COLORS.primary, marginTop:16 }}>Just a moment...</div>
      </div>
    );
  }

  // Shared logout, header
  const header = (
    <header className="df-header" style={{
      background: COLORS.primary,
      padding: "12px 20px",
      color: "#fff",
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 18
    }}>
      <span style={{ fontFamily: "cursive", fontWeight: "bold", fontSize: 28 }}>🎨 Doodle Finder</span>
      {user ? (
        <span>
          <span style={{ borderRadius: 12, background: COLORS.accent, color: COLORS.primary, padding: "3px 16px", fontSize: 16, marginRight: 12 }}>
            {user.displayName || user.email.split("@")[0]}
          </span>
          <button onClick={handleLogout} style={{
            padding: "5px 18px", background: COLORS.secondary, border: "none", color: "#fff", fontWeight: 600, fontSize: 15, borderRadius: 8
          }}>
            Log out
          </button>
        </span>
      ) : null}
    </header>
  );


  // --- STAGE: SPIN ---
  if (stage === STAGES.SPIN) {
    return (
      <div className="App">
        {header}
        <main style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginTop:48 }}>
          <div style={{ marginBottom:18, fontSize:22, color: COLORS.primary, fontWeight:600 }}>Spin for your drawing prompt!</div>
          <PromptWheel
            prompts={PROMPTS}
            onSpin={handleSpinPrompt}
            accent={COLORS.accent}
            primary={COLORS.primary}
            secondary={COLORS.secondary}
          />
        </main>
      </div>
    );
  }

  // --- STAGE: DRAWING ---
  if (stage === STAGES.DRAW) {
    return (
      <div className="App">
        {header}
        <main style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", marginTop:30 }}>
          <div style={{ fontWeight:500, fontSize:20, color: COLORS.primary, marginBottom:10 }}>Prompt: <span style={{color:COLORS.secondary}}>{prompt}</span></div>
          <DrawingCanvas
            onSubmit={handleSubmitDrawing}
            timer={timer}
            accent={COLORS.accent}
            primary={COLORS.primary}
            secondary={COLORS.secondary}
          />
        </main>
      </div>
    );
  }

  // --- STAGE: GUESSING ---
  if (stage === STAGES.GUESS) {
    return (
      <div className="App">
        {header}
        <main style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", marginTop:24 }}>
          <GuessPanel
            drawings={allDrawings}
            prompt={prompt}
            onSubmitGuess={handleSubmitGuess}
            user={user}
            allGuesses={guesses}
            accent={COLORS.accent}
            primary={COLORS.primary}
            secondary={COLORS.secondary}
          />
        </main>
      </div>
    );
  }

  // --- STAGE: VOTING ---
  if (stage === STAGES.VOTE) {
    return (
      <div className="App">
        {header}
        <main style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", marginTop:40 }}>
          <VotingPanel
            drawings={allDrawings}
            votes={votes}
            user={user}
            onSubmitVote={handleSubmitVote}
            accent={COLORS.accent}
            primary={COLORS.primary}
            secondary={COLORS.secondary}
          />
        </main>
      </div>
    );
  }

  // --- STAGE: RESULTS ---
  if (stage === STAGES.RESULT) {
    return (
      <div className="App">
        {header}
        <main style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"flex-start", minHeight:"75vh" }}>
          <WinnerOverlay
            winner={winner}
            drawings={allDrawings}
            guesses={guesses}
            votes={votes}
            users={allUsers}
            onNext={handleNextGame}
            accent={COLORS.accent}
            primary={COLORS.primary}
            secondary={COLORS.secondary}
          />
        </main>
      </div>
    );
  }

  // fallback
  return <div style={{ margin: 50, fontWeight:700 }}>Something went wrong.</div>
}

export default App;
