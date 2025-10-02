import { app } from "./firebaseConfig.js";
import { 
  getFirestore, collection, addDoc, setDoc, doc 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { 
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, GoogleAuthProvider, signInWithPopup
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

const leadForm = document.getElementById("leadForm");
const status = document.getElementById("status");
const googleLoginBtn = document.getElementById("googleLoginBtn");
googleLoginBtn.addEventListener("click", async () => {
  const provider = new GoogleAuthProvider();
  try {
    const result = await signInWithPopup(auth, provider);
    const user = result.user;

    // Optional: Set display name if missing
    if (!user.displayName) {
      await updateProfile(user, { displayName: user.email.split("@")[0] });
    }

    // Save user as a lead in Firestore (merge if already exists)
    const leadRef = doc(db, "leads", user.uid);
    await setDoc(
      leadRef,
      {
        uid: user.uid,
        name: user.displayName,
        email: user.email,
        stage: "prospect",
        createdAt: new Date(),
      },
      { merge: true }
    );

    // Redirect to dashboard
    window.location.href = "dashboard.html";

  } catch (err) {
    console.error("Google login error:", err);
    alert("Google login failed: " + err.message);
  }
});

leadForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const email = document.getElementById("email").value.trim();
  const phone = document.getElementById("phone").value.trim();
  const city = document.getElementById("city").value.trim();
  const canTeach = document.getElementById("canTeach").value.split(",").map(s => s.trim()).filter(s=>s);
  const wantsToLearn = document.getElementById("wantsToLearn").value.split(",").map(s => s.trim()).filter(s=>s);
  const board = document.getElementById("board").value.trim();
  const notes = document.getElementById("notes").value.trim();

  try {
    // Step 1: Create Auth account (if not exist, otherwise login)
    let userCred;
    try {
      userCred = await createUserWithEmailAndPassword(auth, email, "defaultPass123"); 
      // 👆 you can replace with your own password policy
    } catch (err) {
      if (err.code === "auth/email-already-in-use") {
        userCred = await signInWithEmailAndPassword(auth, email, "defaultPass123");
      } else {
        throw err;
      }
    }

    // Step 2: Update displayName
    await updateProfile(userCred.user, { displayName: name });

    // Step 3: Save/update lead in Firestore
    const leadRef = doc(db, "leads", userCred.user.uid);
    await setDoc(leadRef, {
      uid: userCred.user.uid,
      name,
      email,
      phone,
      city,
      canTeach,
      wantsToLearn,
      board,
      notes,
      stage: "prospect", // default
      createdAt: new Date()
    }, { merge: true });

    status.textContent = "✅ Submitted successfully! Redirecting...";
    status.style.color = "green";

    setTimeout(() => {
      window.location.href = "dashboard.html";
    }, 1500);

  } catch (err) {
    console.error(err);
    status.textContent = "❌ Error: " + err.message;
    status.style.color = "crimson";
  }
});
