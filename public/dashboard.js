// =====================
// 🔹 Firebase Setup
// =====================
import { app } from "./firebaseConfig.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, doc, getDoc, getDocs, deleteDoc, addDoc, updateDoc, query, where, serverTimestamp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { calculateCompatibilityScore, PriorityQueue } from './utils.js';

const auth = getAuth(app);
const db = getFirestore(app);

let currentUser = null;


// =====================
// 🔹 Auth State
// =====================
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("profileName").textContent = user.displayName ||
      user.email.split("@")[0];
    // Fetch user role from Firestore
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const userData = userSnap.data();
      const role = userData.role || "Learner"; // default role
      
      const select = document.getElementById("matchSubject");
      const subjects = (userData.wantsToLearn || [])
      if (select) {
        select.innerHTML = `<option value="">Select Subject</option>`; // reset
        if (Array.isArray(subjects) && subjects.length > 0) {
          subjects.forEach(subj => {
            const option = document.createElement("option");
            option.value = subj;
            option.textContent = subj;
            select.appendChild(option);
          });
        } else {
          select.innerHTML = `<option value="">No subjects found</option>`;
        }
      }
      // Show learner or tutor dashboard based on role
      toggleDashboard(role);
    }
    else {
      console.warn("User document not found.");
      // toggleDashboard("learner");
    }
    displayMySessions();
    displayTutorDashboard();
  } else {
    window.location.href = "login.html";
  }
});

// =====================
// 🔹 Toggle Dashboard Sections
// =====================
function toggleDashboard(role) {
  const learnerDash = document.getElementById("learner-dash");
  const tutorDash = document.getElementById("tutor-dash");

  if (!learnerDash || !tutorDash) return;

  if (role === "Tutor") {
    tutorDash.style.display = "block";
    learnerDash.style.display = "none";
  } else {
    learnerDash.style.display = "block";
    tutorDash.style.display = "none";
  }
}


// =====================
// 🔹 Quick Match Using Priority Queue
// =====================

// 🔹 Match tutors directly from Firestore
async function findTutorsBySubject(subject, timeSlot) {
  const resultDiv = document.getElementById("matchResult");
  resultDiv.innerHTML = "<div class='spinner'></div>";

  try {
    // Fetch all tutors
    const tutorsSnap = await getDocs(
      query(collection(db, "users"), where("role", "==", "Tutor"))
    );
    const tutors = tutorsSnap.docs.map(doc => doc.data());

    // Filter tutors who have the selected subject
    const filteredTutors = tutors.filter(tutor => {
      const tutorSubjects = Array.isArray(tutor.subjects) ? tutor.subjects : [tutor.subjects];
      return tutorSubjects.includes(subject);
    });

    if (filteredTutors.length === 0) {
      resultDiv.innerHTML = "<p>No tutors found for this subject.</p>";
      return;
    }

    // 🔹 Use PriorityQueue from utils.js
    const pq = new PriorityQueue();
    filteredTutors.forEach(tutor => {
      const score = calculateCompatibilityScore(tutor, {
        subjects: [subject],
        availability: [timeSlot]
      });
      pq.enqueue(tutor, score);
    });

    const sortedTutors = [];
    while (pq.size() > 0) {
      sortedTutors.push(pq.dequeue());
    }

    // 🔹 Display tutors with Book button
    resultDiv.innerHTML = sortedTutors.map(tutor => {
      const tutorSubjects = Array.isArray(tutor.subjects) ? tutor.subjects.join(", ") : tutor.subjects;
      const score = calculateCompatibilityScore(tutor, { subjects: [subject], availability: [timeSlot] });
      return `
        <div class="tutor-card">
          <p><strong>${tutor.displayName || tutor.email}</strong></p>
          <p>Subjects: ${tutorSubjects}</p>
          <p>Match Score: ${score}</p>
          <button class="btn" onclick="bookSession('${tutor.email}', '${subject}', '${timeSlot}')">
            Book Session
          </button>
        </div>
      `;
    }).join("");

  } catch (err) {
    console.error("Error matching tutors:", err);
    resultDiv.innerHTML = "<p>Error finding tutors. Try again.</p>";
  }
}

// 🔹 Form submit
const matchForm = document.getElementById("matchForm");
if (matchForm) {
  matchForm.addEventListener("submit", (e) => {
    e.preventDefault();
    const subject = document.getElementById("matchSubject").value;
    const timeSlot = document.getElementById("matchTimeSlot").value;
    if (!subject) return alert("Please select a subject.");
    findTutorsBySubject(subject, timeSlot);
  });
}

// 🔹 Function to fetch and display sessions for the current user
async function displayMySessions() {
  if (!currentUser) return;

  const sessionsContainer = document.getElementById("mySessions");
  sessionsContainer.innerHTML = "<div class='spinner'></div>";

  try {
    const q = query(
      collection(db, "sessions"),
      where("learnerEmail", "==", currentUser.email)
    );
    const snap = await getDocs(q);

    if (snap.empty) {
      sessionsContainer.innerHTML = "<p>No sessions booked yet.</p>";
      return;
    }

    // 🔹 Sort sessions so the latest (recently booked) ones appear on top
    const sortedSessions = snap.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt).getTime();
        const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt).getTime();
        return timeB - timeA; // latest first
      });

    sessionsContainer.innerHTML = sortedSessions.map(data => {
      // const data = doc.data();
      let statusColor = "gray";

      if (data.status === "accepted") statusColor = "green";
      else if (data.status === "rejected") statusColor = "red";
      else if (data.status === "pending") statusColor = "goldenrod";

      return `
        <div class="session-card" style="display:flex; flex-direction:column; justify-content:center; align-items:center; padding:10px; background-color:#f8f9fa; margin-bottom:10px; border-radius:8px; border-left:3px solid #0e788b">
  
          <!-- First line: Tutor & Subject -->
          <div style="display:flex; justify-content: space-evenly; width:100%; margin-bottom:6px;">
            <p style="margin:0;"><strong>Tutor:</strong> ${data.tutorEmail}</p>
            <p style="margin:0;"><strong>Subject:</strong> ${data.subject}</p>
          </div>

          <!-- Second line: Time & Status -->
          <div style="display:flex; justify-content: space-evenly; width:100%; align-items:center; margin-bottom:6px;">
            <p style="margin:0;"><strong>Time:</strong> ${data.time}</p>
            <p style="margin:0; display:flex; align-items:center;">
              <strong>Status:</strong>
              <span class="status-badge" style="
                background-color: ${statusColor};
                color: white;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.9em;
                text-transform: capitalize;
                margin-left: 6px;
              ">
                ${data.status}
              </span>
            </p>
          </div>

          <!-- Centered button -->
          <div style="width:100%; display:flex; justify-content:center; margin-top:6px;">
            ${["completed", "rejected"].includes(data.status?.toLowerCase())
          ? "" // hide cancel button
          : `<button class="btn btn-cancel" onclick="cancelSession('${doc.id}')">Cancel Session</button>`
        }
          </div>

        </div>

      `;
    }).join("");

  } catch (err) {
    console.error("Error fetching sessions:", err);
    sessionsContainer.innerHTML = "<p>Failed to load sessions.</p>";
  }
}


// 🔹 Cancel session by document ID
window.cancelSession = async (sessionId) => {
  if (!currentUser) return alert("User not logged in");

  try {
    await deleteDoc(doc(db, "sessions", sessionId));
    alert("Session canceled successfully!");
    displayMySessions(); // 🔹 Refresh session list
  } catch (err) {
    console.error("Cancel session error:", err);
    alert("Failed to cancel session: " + err.message);
  }
};

// 🔹 Call this after booking a session
window.bookSession = async (tutorEmail, subject, timeSlot) => {
  if (!currentUser) return alert("User not logged in");

  try {
    await addDoc(collection(db, "sessions"), {
      learnerEmail: currentUser.email,
      tutorEmail,
      subject,
      time: timeSlot,
      status: "pending",    // ✅ Correct status
      createdAt: serverTimestamp(),
    });
    alert("Session booked successfully!");
    displayMySessions(); // refresh the session list
  } catch (err) {
    console.error("Booking error:", err);
    alert("Failed to book session: " + err.message);
  }
};


// 🔹 Tutor: Display pending requests and approved sessions
async function displayTutorDashboard() {
  if (!currentUser) return;

  const pendingContainer = document.getElementById("pendingRequest");
  const sessionsContainer = document.getElementById("tutorSession");

  // Clear previous content
  pendingContainer.innerHTML = "<div class='spinner'></div>";
  sessionsContainer.innerHTML = "<div class='spinner'></div>";

  try {
    const q = query(
      collection(db, "sessions"),
      where("tutorEmail", "==", currentUser.email)
    );
    const snap = await getDocs(q);

    const pending = [];
    const sessions = [];

    snap.forEach(docSnap => {
      const data = docSnap.data();
      const id = docSnap.id;

      if (data.status === "pending") pending.push({ id, ...data });
      else sessions.push({ id, ...data }); // includes accepted & completed
    });

    // 🔹 Display pending requests
    if (pending.length === 0) {
      pendingContainer.innerHTML = "<p>No pending requests.</p>";
    } else {
      pendingContainer.innerHTML = pending.map(req => `
        <div class="session-card" style="padding:10px; background-color:#f8f9fa; margin-bottom:10px; border-radius:8px; border-left:3px solid #0e788b">
          <p><strong>Learner:</strong> ${req.learnerEmail}</p>
          <p><strong>Subject:</strong> ${req.subject}</p>
          <p><strong>Time:</strong> ${req.time}</p>
          <button class="btn btn-accept" style="background-color: green; color: #fff;" onclick="approveRequest('${req.id}')">Accept</button>
          <button class="btn btn-reject" style="background-color: red; color: #fff;" onclick="rejectRequest('${req.id}')">Reject</button>
        </div>
      `).join("");
    }

    // 🔹 Sort sessions: accepted first, then completed
    const acceptedFirst = sessions.sort((a, b) => {
      if (a.status === "accepted" && b.status !== "accepted") return -1;
      if (a.status !== "accepted" && b.status === "accepted") return 1;
      return 0;
    });

    // 🔹 Display sessions (accepted + completed)
    if (acceptedFirst.length === 0) {
      sessionsContainer.innerHTML = "<p>No sessions yet.</p>";
    } else {

      sessionsContainer.innerHTML = acceptedFirst.map(sess => `
        
        <div class="session-card" style="display:flex; flex-direction:column; justify-content:center; align-items:center; padding:10px; background-color:#f8f9fa; margin-bottom:10px; border-radius:8px; border-left:3px solid #0e788b">
  
          <!-- First line: Tutor & Subject -->
          <div style="display:flex; justify-content: space-evenly; width:100%; margin-bottom:6px;">
            <p style="margin:0;"><strong>Learner:</strong> ${sess.learnerEmail}</p>
            <p style="margin:0;"><strong>Subject:</strong> ${sess.subject}</p>
          </div>

          <!-- Second line: Time & Status -->
          <div style="display:flex; justify-content: space-evenly; width:100%; align-items:center; margin-bottom:6px;">
            <p style="margin:0;"><strong>Time:</strong> ${sess.time}</p>
            <p style="margin:0; display:flex; align-items:center;">
              <strong>Status:</strong>
              <span class="badge ${sess.status}" style="
                
                color: white;
                padding: 3px 8px;
                border-radius: 12px;
                font-size: 0.9em;
                text-transform: capitalize;
                margin-left: 6px;
              ">
                ${sess.status}
              </span>
            </p>
          </div>

          <!-- Centered button -->
          <div style="width:100%; display:flex; justify-content:center; margin-top:6px;">
            ${sess.status === "accepted" ? `<button class="btn btn-complete" onclick="markComplete('${sess.id}')">Mark as Complete</button>` : ""}
          </div>

        </div>



      `).join("");
    }

  } catch (err) {
    console.error("Error loading tutor dashboard:", err);
    pendingContainer.innerHTML = "<p>Failed to load pending requests.</p>";
    sessionsContainer.innerHTML = "<p>Failed to load sessions.</p>";
  }
}

// 🔹 Mark session as completed
window.markComplete = async (sessionId) => {
  if (!currentUser) return alert("User not logged in");

  try {
    await updateDoc(doc(db, "sessions", sessionId), {
      status: "completed",
      updatedAt: serverTimestamp()
    });

    displayTutorDashboard(); // refresh to show updated status

    // 🔹 Recalculate statistics if this page shows analytics
    if (typeof displayStatistics === "function") {
      await fetchAllSessions();  // make sure this repopulates allSessions
      displayStatistics();
    }

    alert("Session marked as completed!");
  } catch (err) {
    console.error("Error marking session complete:", err);
    alert("Failed to mark session as complete: " + err.message);
  }
};


// 🔹 Approve pending request
window.approveRequest = async (sessionId) => {
  try {
    await updateDoc(doc(db, "sessions", sessionId), { status: "accepted" });
    displayTutorDashboard();
    alert("Request accepted!");
  } catch (err) {
    console.error("Error approving request:", err);
    alert("Failed to approve request: " + err.message);
  }
}

// 🔹 Reject pending request
window.rejectRequest = async (sessionId) => {
  try {
    await updateDoc(doc(db, "sessions", sessionId), { status: "rejected" });
    displayTutorDashboard();
    alert("Request rejected!");
  } catch (err) {
    console.error("Error rejecting request:", err);
    alert("Failed to reject request: " + err.message);
  }
}

// 🔹 Redirect avatar click → profile.html
const avatarClick = document.getElementById("avatarClick");
if (avatarClick) {
  avatarClick.addEventListener("click", () => {
    window.location.href = "profile.html";
  });
}


document.querySelectorAll(".analytics-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    window.location.href = "analytics.html";
  });
});

