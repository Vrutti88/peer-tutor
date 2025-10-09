import { app } from "./firebaseConfig.js";
import {
  getFirestore, doc, getDoc, setDoc
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import {
  getAuth, onAuthStateChanged, signOut, updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// Elements
const profileForm = document.getElementById("profileForm");
const statusEl = document.getElementById("status");
const logoutBtn = document.getElementById("logoutBtn");

// Load user data when logged in
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"; // not logged in → redirect
    return;
  }

  // Load data from Firestore
  const docRef = doc(db, "users", user.uid);
  const snap = await getDoc(docRef);

  if (snap.exists()) {
    const data = snap.data();
    document.getElementById("name").value = data.name || "";
    document.getElementById("email").value = data.email || user.email;
    document.getElementById("skillLevel").value = data.skillLevel || "";
    document.getElementById("role").value = data.role || "";
    document.getElementById("city").value = data.city || "";
    document.getElementById("canTeach").value = (data.canTeach || []).join(", ");
    document.getElementById("wantsToLearn").value = (data.wantsToLearn || []).join(", ");
    document.getElementById("board").value = data.board || "";
    document.getElementById("availability").value = (data.availability || []).join(", ");
  } else {
    // Pre-fill email if no profile yet
    document.getElementById("email").value = user.email;
  }
});

// Save form updates
profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const user = auth.currentUser;
  if (!user) return;

  const updatedData = {
    uid: user.uid,
    name: document.getElementById("name").value.trim(),
    email: document.getElementById("email").value.trim(),
    skillLevel: document.getElementById("skillLevel").value.trim(),
    city: document.getElementById("city").value.trim(),
    canTeach: document.getElementById("canTeach").value.split(",").map(s => s.trim()).filter(s => s),
    wantsToLearn: document.getElementById("wantsToLearn").value.split(",").map(s => s.trim()).filter(s => s),
    board: document.getElementById("board").value.trim(),
    availability: document.getElementById("availability").value.split(",").map(s => s.trim()).filter(s => s),
    updatedAt: new Date()
  };

  try {
    await setDoc(doc(db, "users", user.uid), updatedData, { merge: true });

    // update displayName in Firebase Auth too
    if (updatedData.name) {
      await updateProfile(user, { displayName: updatedData.name });
    }

    statusEl.textContent = "✅ Profile updated successfully!";
    statusEl.style.color = "green";
  } catch (err) {
    console.error("Error updating profile:", err);
    statusEl.textContent = "❌ " + err.message;
    statusEl.style.color = "crimson";
  }
});

// Logout button
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    signOut(auth).then(() => {
      window.location.href = "index.html";
    });
  });
}


// Elements
const roleSelect = document.getElementById("role");
const canTeachRow = document.getElementById("canTeach").parentElement;
const wantsToLearnRow = document.getElementById("wantsToLearn").parentElement;

// Function to update visibility of subject fields
function updateSubjectFields() {
  const role = roleSelect.value;

  if (role === "Tutor") {
    canTeachRow.style.display = "flex";       // show "Subjects I can teach"
    wantsToLearnRow.style.display = "none";   // hide "Subjects I need help with"
    document.getElementById("wantsToLearn").value = "";
  } else if (role === "Learner") {
    canTeachRow.style.display = "none";       // hide "Subjects I can teach"
    wantsToLearnRow.style.display = "flex";   // show "Subjects I need help with"
    document.getElementById("canTeach").value = "";
  } else {
    // default if no role selected
    canTeachRow.style.display = "none";
    wantsToLearnRow.style.display = "flex";
    document.getElementById("canTeach").value = "";
  }
}

// Run on page load to set initial visibility
updateSubjectFields();

// Run whenever role changes
roleSelect.addEventListener("change", updateSubjectFields);
