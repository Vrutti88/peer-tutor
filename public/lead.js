import { app } from "./firebaseConfig.js";
import { getFirestore, doc, setDoc,getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const leadForm = document.getElementById("leadForm");
const status = document.getElementById("status");
const emailInput = document.getElementById("email");
const nameInput = document.getElementById("name");

let currentUser = null;

// Make sure user is logged in
onAuthStateChanged(auth, async(user) => {
  if (!user) {
    window.location.href = "index.html"; // redirect if not logged in
    return;
  }
  currentUser = user;
  // Pre-fill email field
  if (emailInput) {
    emailInput.value = user.email || "";
  }

    if (nameInput) {
      nameInput.value = user.displayName || user.email.split("@")[0];
    }

    try {
      // Load existing lead data from Firestore
      const docRef = doc(db, "leads", currentUser.uid);
      const docSnap = await getDoc(docRef);
  
      if (docSnap.exists()) {
        const data = docSnap.data();
        nameInput.value = data.name || nameInput.value;
        emailInput.value = data.email || emailInput.value;
        document.getElementById("skillLevel").value = data.skillLevel || "";
        document.getElementById("city").value = data.city || "";
        document.getElementById("canTeach").value = (data.canTeach || []).join(", ");
        document.getElementById("wantsToLearn").value = (data.wantsToLearn || []).join(", ");
        document.getElementById("board").value = data.board || "";
        document.getElementById("notes").value = data.notes || "";
      }
    } catch (err) {
      console.error("Error loading lead data:", err);
    }
});

leadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentUser) {
    status.textContent = "❌ You must be logged in";
    status.style.color = "crimson";
    return;
  }

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const skillLevel = document.getElementById("skillLevel").value.trim();
  const city = document.getElementById("city").value.trim();
  const canTeach = document.getElementById("canTeach").value.split(",").map(s => s.trim()).filter(s=>s);
  const wantsToLearn = document.getElementById("wantsToLearn").value.split(",").map(s => s.trim()).filter(s=>s);
  const board = document.getElementById("board").value.trim();
  const notes = document.getElementById("notes").value.trim();

  try {
    // Save lead using UID as document ID
    await setDoc(doc(db, "leads", currentUser.uid), {
      uid: currentUser.uid,
      name,
      email,
      skillLevel,
      city,
      canTeach,
      wantsToLearn,
      board,
      notes,
      stage: "prospect",
      createdAt: serverTimestamp()
    });

    status.textContent = "✅ Submitted successfully! Redirecting...";
    status.style.color = "green";
    setTimeout(() => window.location.href = "dashboard.html", 1500);
  } catch (err) {
    console.error("Lead submit error:", err);
    status.textContent = "❌ " + err.message;
    status.style.color = "crimson";
  }
});
