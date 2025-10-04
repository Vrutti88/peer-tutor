import { app } from "./firebaseConfig.js";
import {
  getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, updateProfile
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const auth = getAuth(app);

const loginForm = document.getElementById("loginForm");
const signupForm = document.getElementById("signupForm");
const googleLoginBtn = document.getElementById("googleLoginBtn");
const statusEl = document.getElementById("status");

// Email login
loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("loginEmail").value.trim();
  const password = document.getElementById("loginPassword").value.trim();

  try {
    await signInWithEmailAndPassword(auth, email, password);
    statusEl.textContent = "✅ Login successful! Redirecting...";
    statusEl.style.color = "green";
    setTimeout(() => window.location.href = "lead.html", 1200);
  } catch (err) {
    if (err.code === "auth/user-not-found") {
      // auto register new user
      try {
        await createUserWithEmailAndPassword(auth, email, password);
        statusEl.textContent = "✅ Account created! Redirecting...";
        statusEl.style.color = "green";
        setTimeout(() => window.location.href = "lead.html", 1200);
      } catch (regErr) {
        statusEl.textContent = "❌ " + regErr.message;
        statusEl.style.color = "crimson";
      }
    } else {
      statusEl.textContent = "❌ " + err.message;
      statusEl.style.color = "crimson";
    }
  }
});

// ------------------ SIGNUP ------------------
signupForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("signupName").value.trim();
  const email = document.getElementById("signupEmail").value.trim();
  const password = document.getElementById("signupPassword").value.trim();

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);

    // Update display name
    await updateProfile(userCredential.user, { displayName: name });

    statusEl.textContent = "✅ Account created! Redirecting...";
    statusEl.style.color = "green";
    setTimeout(() => window.location.href = "lead.html", 1200);
  } catch (err) {
    statusEl.textContent = "❌ " + err.message;
    statusEl.style.color = "crimson";
  }
});

// Google login (optional, only if present)
if (googleLoginBtn) {
  googleLoginBtn.addEventListener("click", async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      statusEl.textContent = "✅ Google login successful! Redirecting...";
      statusEl.style.color = "green";
      setTimeout(() => window.location.href = "lead.html", 1200);
    } catch (err) {
      console.error("Google login error:", err);
      statusEl.textContent = "❌ " + err.message;
      statusEl.style.color = "crimson";
    }
  });
}
