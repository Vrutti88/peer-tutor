// =====================
// 🔹 Firebase Setup
// =====================
import { app } from "./firebaseConfig.js";
import {
  getAuth,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  query,
  where,
  onSnapshot,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import {
  getFunctions,
  httpsCallable
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-functions.js";

const auth = getAuth(app);
const db = getFirestore(app);
const functions = getFunctions(app);

let currentUser = null;
let unsubscribeDashboard = null;

// =====================
// 🔹 Utility Functions
// =====================
function showMessage(elementId, message, type = "success") {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = message;
  el.className = `form-message ${type}`;
  setTimeout(() => {
    el.textContent = "";
    el.className = "form-message";
  }, 4000);
}

function hashEmail(email) {
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    const char = email.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

// =====================
// 🔹 Auth State
// =====================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("profileName").textContent = user.displayName ||
      user.email.split("@")[0];
    startDashboardListeners();
  } else {
    window.location.href = "login.html";
  }
});

// =====================
// 🔹 Quick Match
// =====================
const matchForm = document.getElementById("matchForm");
if (matchForm) {
  matchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const subject = document.getElementById("matchSubject").value;
    const timeSlot = document.getElementById("matchTimeSlot").value;
    const resultDiv = document.getElementById("matchResult");
    resultDiv.innerHTML = "<div class='spinner'></div>";

    try {
      const findPeerMatches = httpsCallable(functions, "findPeerMatches");
      const result = await findPeerMatches({
        desiredMinutes: 120,
        maxKm: 30,
        limit: 1
      });

      if (result.data.matches.length === 0) {
        resultDiv.innerHTML = "<p>No tutors found.</p>";
        return;
      }

      const best = result.data.matches[0];
      resultDiv.innerHTML = `
        <h3>Best Match Found!</h3>
        <p><strong>${best.candidateId}</strong></p>
        <p>Match Score: ${(best.score * 100).toFixed(2)} / 100</p>
        <button class="btn" onclick="quickBook('${best.candidateId}','${subject}')">
          Book This Tutor
        </button>
      `;
    } catch (err) {
      console.error("Match error:", err);
      resultDiv.innerHTML = "<p>No tutors found.</p>";
    }
  });
}

window.quickBook = function (tutorEmail, subject) {
  document.getElementById("bookTutorEmail").value = tutorEmail;
  document.getElementById("bookSubject").value = subject;
  document
    .getElementById("bookingForm")
    .scrollIntoView({ behavior: "smooth" });
};

// =====================
// 🔹 Book Session
// =====================
const bookingForm = document.getElementById("bookingForm");
if (bookingForm) {
  bookingForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const tutorEmail = document.getElementById("bookTutorEmail").value;
    const time = document.getElementById("bookTime").value;
    const subject = document.getElementById("bookSubject").value;

    try {
      await addDoc(collection(db, "sessions"), {
        learnerEmail: currentUser.email,
        tutorEmail,
        subject,
        time,
        status: "scheduled",
        createdAt: serverTimestamp(),
      });
      showMessage("bookingMessage", "Session booked successfully!", "success");
      bookingForm.reset();
    } catch (err) {
      console.error("Booking error:", err);
      showMessage("bookingMessage", err.message, "error");
    }
  });
}

// =====================
// 🔹 Real-Time Dashboard
// =====================
function startDashboardListeners() {
  // Users
  const unsubscribeUsers = onSnapshot(collection(db, "users"), (snapshot) => {
    let total = 0,
      prospects = 0,
      qualified = 0,
      customers = 0,
      loyal = 0;

    snapshot.forEach((doc) => {
      const data = doc.data();
      total++;
      switch (data.stage) {
        case "prospect":
          prospects++;
          break;
        case "qualified":
          qualified++;
          break;
        case "customer":
          customers++;
          break;
        case "loyal":
          loyal++;
          break;
      }
    });

    document.getElementById("totalUsers").textContent = total;
    document.getElementById("prospectCount").textContent = prospects;
    document.getElementById("qualifiedCount").textContent = qualified;
    document.getElementById("customerCount").textContent = customers;
    document.getElementById("loyalCount").textContent = loyal;
  });

  // Sessions
  const unsubscribeSessions = onSnapshot(collection(db, "sessions"), (snap) => {
    document.getElementById("totalSessions").textContent = snap.size;
  });

  // Backend Metrics
  startMetricsListeners();

  unsubscribeDashboard = () => {
    unsubscribeUsers();
    unsubscribeSessions();
  };
}

// =====================
// 🔹 Metrics from Backend
// =====================
function startMetricsListeners() {
  // NPS
  onSnapshot(doc(db, "metrics", "nps"), (snap) => {
    if (snap.exists()) {
      document.getElementById("npsScore").textContent = snap.data().value;
    }
  });

  // CLV
  onSnapshot(doc(db, "metrics", "clv"), (snap) => {
    if (snap.exists()) {
      document.getElementById("avgCLV").textContent =
        "$" + snap.data().avgClv.toFixed(2);
    }
  });

  // RFM (optional: show avg recency days)
  onSnapshot(doc(db, "metrics", "rfm"), (snap) => {
    if (snap.exists()) {
      const list = snap.data().snapshot || [];
      const avgRecency =
        list.length > 0
          ? (
            list.reduce((s, r) => s + (r.recencyDays || 0), 0) / list.length
          ).toFixed(1)
          : 0;
      document.getElementById("avgRFM").textContent = avgRecency;
    }
  });
}

// =====================
// 🔹 Admin Tools
// =====================
const loadSampleDataBtn = document.getElementById("loadSampleDataBtn");
if (loadSampleDataBtn) {
  loadSampleDataBtn.addEventListener("click", async () => {
    try {
      const response = await fetch("../seed/seed-data.json");
      const seedData = await response.json();
      const batch = writeBatch(db);
      seedData.users.forEach((u) => {
        const ref = doc(collection(db, "users"));
        batch.set(ref, {
          ...u,
          emailHash: hashEmail(u.email),
          createdAt: serverTimestamp(),
          lastActive: serverTimestamp(),
        });
      });
      await batch.commit();
      showMessage(
        "sampleDataMessage",
        `${seedData.users.length} users loaded!`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showMessage("sampleDataMessage", "Error loading data", "error");
    }
  });
}

const qualifyForm = document.getElementById("qualifyForm");
if (qualifyForm) {
  qualifyForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("qualifyEmail").value;
    try {
      const qualifyLead = httpsCallable(functions, "convertLead");
      const result = await qualifyLead({ email });
      showMessage(
        "qualifyMessage",
        `Lead converted! Customer ID: ${result.data.customerId}`,
        "success"
      );
    } catch (err) {
      console.error(err);
      showMessage("qualifyMessage", err.message, "error");
    }
  });
}

const referralForm = document.getElementById("referralForm");
if (referralForm) {
  referralForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("referralEmail").value;
    const resultDiv = document.getElementById("referralResult");
    resultDiv.innerHTML = "<div class='spinner'></div>";

    try {
      const computeReferralReach = httpsCallable(functions, "computeReferralReach");
      const res = await computeReferralReach({ referrerId: email, maxDepth: 3 });
      resultDiv.innerHTML = `
        <h4>Referral Network Analysis</h4>
        <p><strong>Total Reach:</strong> ${res.data.reach}</p>
        <p><strong>Nodes:</strong> ${res.data.nodes}</p>
      `;
    } catch (err) {
      console.error(err);
      resultDiv.innerHTML = "<p>Error analyzing network.</p>";
    }
  });
}

const computeMetricsBtn = document.getElementById("computeMetricsBtn");
if (computeMetricsBtn) {
  computeMetricsBtn.addEventListener("click", async () => {
    showMessage(
      "metricsMessage",
      "Metrics will be recomputed automatically by Cloud Functions.",
      "success"
    );
  });
}

// 🔹 Redirect avatar click → profile.html
const avatarClick = document.getElementById("avatarClick");
if (avatarClick) {
  avatarClick.addEventListener("click", () => {
    window.location.href = "profile.html";
  });
}


document.getElementById("analytics-btn").addEventListener("click", function () {
  window.location.href = "analytics.html";
});
