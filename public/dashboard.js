import { app } from "./firebaseConfig.js";
import { 
  getFirestore, collection, onSnapshot, doc, updateDoc, query, where, getDocs 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { 
  getAuth, onAuthStateChanged, updateProfile 
} from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";

const db = getFirestore(app);
const auth = getAuth(app);

// Profile card element
const profileName = document.getElementById("profileName");
const profileModal = document.getElementById("profileModal");
const profileInputName = document.getElementById("profileInputName");
const profileInputEmail = document.getElementById("profileInputEmail");
const profileInputCity = document.getElementById("profileInputCity");
const profileInputTeach = document.getElementById("profileInputTeach");
const profileInputLearn = document.getElementById("profileInputLearn");
const saveProfileBtn = document.getElementById("saveProfileBtn");
const profileStatus = document.getElementById("profileStatus");

let currentUser = null;
let currentLeadId = null;

// 🔹 Auth listener
onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  currentUser = user;

  // Try to get the lead info from Firestore using UID
  const leadRef = doc(db, "leads", user.uid);
  const leadSnap = await getDocs(query(collection(db, "leads"), where("uid", "==", user.uid)));

  let displayName = "";

  if (!leadSnap.empty) {
    const leadDoc = leadSnap.docs[0];
    currentLeadId = leadDoc.id;
    const leadData = leadDoc.data();
    displayName = leadData.name || user.displayName || "";
    
    // Fill modal inputs
    profileInputName.value = leadData.name || "";
    profileInputEmail.value = leadData.email || "";
    profileInputCity.value = leadData.city || "";
    profileInputTeach.value = (leadData.canTeach || []).join(", ");
    profileInputLearn.value = (leadData.wantsToLearn || []).join(", ");
  }

  // Fallback if no name anywhere
  if (!displayName) {
    displayName = user.displayName || user.email.split("@")[0];
  }

  // Update the profile card
  profileName.textContent = displayName;
});


// 🔹 Show profile info in card + modal
function showProfile(data) {
  pName.textContent = data.name || "—";
  pEmail.textContent = data.email || "—";
  pCity.textContent = data.city || "—";
  pTeach.textContent = (data.canTeach || []).join(", ");
  pLearn.textContent = (data.wantsToLearn || []).join(", ");

  profileInputName.value = data.name || "";
  profileInputEmail.value = data.email || "";
  profileInputCity.value = data.city || "";
  profileInputTeach.value = (data.canTeach || []).join(", ");
  profileInputLearn.value = (data.wantsToLearn || []).join(", ");
}

// 🔹 Save profile updates
saveProfileBtn.addEventListener("click", async () => {
  if (!currentUser || !currentLeadId) return;

  try {
    // Update Firebase Auth displayName
    await updateProfile(currentUser, {
      displayName: profileInputName.value
    });

    // Update Firestore lead document
    const leadRef = doc(db, "leads", currentLeadId);
    await updateDoc(leadRef, {
      name: profileInputName.value,
      email: profileInputEmail.value,
      city: profileInputCity.value,
      canTeach: profileInputTeach.value.split(",").map(s => s.trim()).filter(Boolean),
      wantsToLearn: profileInputLearn.value.split(",").map(s => s.trim()).filter(Boolean),
    });

    // Update card immediately
    profileName.textContent = profileInputName.value;
    profileStatus.textContent = "Profile updated!";
    profileStatus.style.color = "green";
    profileModal.style.display = "none";
  } catch (err) {
    console.error(err);
    profileStatus.textContent = err.message;
    profileStatus.style.color = "crimson";
  }
});


// 🔹 Modal controls
document.getElementById("avatarClick").addEventListener("click", () => {
  profileModal.style.display = "block";
});

document.getElementById("closeProfileModal").addEventListener("click", () => {
  profileModal.style.display = "none";
});

window.onclick = (e) => {
  if (e.target === profileModal) profileModal.style.display = "none";
};

function setStageColor(selectEl) {
  // Remove any previous stage classes
  selectEl.className = 'select-stage';
  // Add the class based on current value
  selectEl.classList.add(`stage-${selectEl.value}`);
}

// 🔹 Live Leads listener
onSnapshot(collection(db, "leads"), (snap) => {
  leadsBody.innerHTML = "";
  let count = 0;
  snap.forEach((docSnap) => {
    const d = docSnap.data();
    const docId = docSnap.id;
    count++;
    leadsBody.innerHTML += `<tr>
      <td>${d.name}</td>
      <td>${d.city}</td>
      <td>${(d.canTeach || []).join(", ")}</td>
      <td>${(d.wantsToLearn || []).join(", ")}</td>
      <td>
        <select onchange="updateStage('${docId}', this.value)">
          <option value="prospect" ${d.stage === "prospect" ? "selected" : ""}>Prospect</option>
          <option value="contacted" ${d.stage === "contacted" ? "selected" : ""}>Contacted</option>
          <option value="interested" ${d.stage === "interested" ? "selected" : ""}>Interested</option>
          <option value="matched" ${d.stage === "matched" ? "selected" : ""}>Matched</option>
          <option value="completed" ${d.stage === "completed" ? "selected" : ""}>Completed</option>
        </select>
      </td>
    </tr>`;
  });
  leadsCountEl.textContent = count;
});

document.querySelectorAll('#leadsBody select').forEach(sel => setStageColor(sel));


// 🔹 Expose updateStage globally
window.updateStage = async (leadId, newStage) => {
  const leadRef = doc(db, "leads", leadId);
  await updateDoc(leadRef, { stage: newStage });
};
