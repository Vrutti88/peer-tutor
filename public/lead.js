import { app } from "./firebaseConfig.js";
import { getFirestore, doc, setDoc, getDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);
const leadForm = document.getElementById("leadForm");
const status = document.getElementById("status");
const emailInput = document.getElementById("email");
const nameInput = document.getElementById("name");
const roleSelect = document.getElementById("role");
const canTeachRow = document.getElementById("canTeach").parentElement;
const wantsToLearnRow = document.getElementById("wantsToLearn").parentElement;

let currentUser = null;

// Function to update visibility of subject fields based on role
function updateSubjectFields() {
  const role = roleSelect.value;

  if (role === "Tutor") {
    canTeachRow.style.display = "flex";
    wantsToLearnRow.style.display = "none";
    document.getElementById("wantsToLearn").value = "";
  } else if (role === "Learner") {
    canTeachRow.style.display = "none";
    wantsToLearnRow.style.display = "flex";
    document.getElementById("canTeach").value = "";
  } else {
    canTeachRow.style.display = "none";
    wantsToLearnRow.style.display = "flex";
  }
}

// Initialize visibility on page load
updateSubjectFields();
roleSelect.addEventListener("change", updateSubjectFields);

// Ensure user is logged in and pre-fill form
onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.href = "index.html"; // redirect if not logged in
    return;
  }
  currentUser = user;

  if (emailInput) {
    emailInput.value = user.email || "";
  }

  if (nameInput) {
    nameInput.value = user.displayName || user.email.split("@")[0];
  }

  try {
    const docRef = doc(db, "users", currentUser.uid);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      nameInput.value = data.name || nameInput.value;
      emailInput.value = data.email || emailInput.value;
      document.getElementById("skillLevel").value = data.skillLevel || "";
      document.getElementById("city").value = data.city || "";
      document.getElementById("role").value = data.role || "";
      document.getElementById("canTeach").value = (data.canTeach || [])
      document.getElementById("wantsToLearn").value = (data.wantsToLearn || [])
      document.getElementById("board").value = data.board || "";
      document.getElementById("availability").value = data.availability || "";

      // Update visibility after loading saved role
      updateSubjectFields();
    }
  } catch (err) {
    console.error("Error loading lead data:", err);
  }
});

// Handle form submission
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
  const role = document.getElementById("role").value;
  const canTeach = document.getElementById("canTeach").value
    .split(",").map(s => s.trim()).filter(s => s);
  const wantsToLearn = document.getElementById("wantsToLearn").value
    .split(",").map(s => s.trim()).filter(s => s);
  const board = document.getElementById("board").value.trim();
  const availability = document.getElementById("availability").value.trim();

  let subjects = [];
  if (role === "Tutor") {
    subjects = canTeach;
  } else if (role === "Learner") {
    subjects = wantsToLearn;
  } else {
    subjects = [...new Set([...canTeach, ...wantsToLearn])];
  }

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      uid: currentUser.uid,
      name,
      email,
      role,
      canTeach,
      wantsToLearn,
      subjects,
      availability,
      skillLevel,
      stage: "prospect",
      city,
      board,
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
