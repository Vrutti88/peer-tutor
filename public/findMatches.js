import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-functions.js";

/* Replace with your Firebase web config */
const firebaseConfig = {
  apiKey: "AIzaSyAII2zqdoqrFV4qo0uzhy1fl23ONTxMmak",
  authDomain: "peer-tutor-c144b.firebaseapp.com",
  projectId: "peer-tutor-c144b",
  storageBucket: "peer-tutor-c144b.firebasestorage.app",
  messagingSenderId: "822349243049",
  appId: "1:822349243049:web:7a21e5d2b103493e83bfb8",
  measurementId: "G-FK5QGLJ5QL"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

let currentUser = null;
onAuthStateChanged(auth, (u) => { currentUser = u; });

const findBtn = document.getElementById("findBtn");
const matchesDiv = document.getElementById("matches");

findBtn.addEventListener("click", async () => {
  if (!currentUser) {
    matchesDiv.innerHTML = `
      <div class="small-note warning">
        ⚠️ Please login first (via Sales panel or a simple auth flow).
      </div>`;
    return;
  }

  matchesDiv.innerHTML = `<div class="loader"></div>`;

  try {
    const fn = httpsCallable(functions, "findPeerMatches");
    const res = await fn({ desiredMinutes: 120, maxKm: 30, limit: 10 });
    const matches = res.data.matches || [];

    if (matches.length === 0) {
      matchesDiv.innerHTML = `<div class="small-note">No reciprocal matches found.</div>`;
      return;
    }

    matchesDiv.innerHTML = matches.map(m => `
      <div class="match-card">
        <h4>Candidate: ${m.candidateId}</h4>
        <p><strong>Match Score:</strong> ${m.score}</p>
        <p class="subtext">Subjects: ${m.subjectScore}, Availability: ${m.availabilityScore}, Location: ${m.locationScore}</p>
      </div>
    `).join("");

  } catch (err) {
    console.error(err);
    matchesDiv.innerHTML = `<div class="small-note error">
      ❌ Error finding matches: ${err.message || err.code}
    </div>`;
  }
});
