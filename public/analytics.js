// Business Insights Dashboard logic with Chart.js and DSA algorithms
import { app } from './firebaseConfig.js';
import { onAuthStateChanged, signOut, getAuth } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFirestore, collection, getDocs } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-firestore.js";
import { countActiveUsersLastNDays, analyzeReferralNetworkBFS } from './utils.js';

const db = getFirestore(app);
const auth = getAuth(app);

let currentUser = null;
let allUsers = [];
let allSessions = [];
let allReferrals = [];

onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;
    document.getElementById("profileName").textContent = user.displayName ||
      user.email.split("@")[0];
  } else {
    window.location.href = "login.html";
  }
});

document.addEventListener('DOMContentLoaded', () => {
  checkAuth();
  setupLogout();
});

function checkAuth() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      await loadInsights();
    } else {
      window.location.href = '/login.html';
    }
  });
}

async function loadInsights() {
  try {
    const usersSnapshot = await getDocs(collection(db, 'users'));
    allUsers = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const sessionsSnapshot = await getDocs(collection(db, 'sessions'));
    allSessions = sessionsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    const referralsSnapshot = await getDocs(collection(db, 'referrals'));
    allReferrals = referralsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    displayStatistics();
    createCharts();
    displayStageDistribution();
    await loadBusinessMetrics();
  } catch (error) {
    console.error('Error loading insights:', error);
  }
}

function displayStatistics() {
  document.getElementById('total-users').textContent = allUsers.length;

  const activeUsers = countActiveUsersLastNDays(allUsers, 7);
  document.getElementById('active-users').textContent = activeUsers;

  document.getElementById('total-sessions').textContent = allSessions.length;

  const repeatLearners = allUsers.filter(user =>
    user.role === 'learner' && (user.completedSessions || 0) > 1
  ).length;
  const totalLearners = allUsers.filter(user => user.role === 'learner').length;
  const loyaltyRate = totalLearners > 0 ? Math.round((repeatLearners / totalLearners) * 100) : 0;
  document.getElementById('loyalty-rate').textContent = loyaltyRate + '%';

  document.getElementById('total-referrals').textContent = allReferrals.length;
}

function createCharts() {
  createFunnelChart();
  createActivityChart();
  createSessionChart();
  createSubjectChart();
}

function createFunnelChart() {
  const stages = {
    prospect: 0,
    qualified: 0,
    customer: 0,
    loyal: 0
  };

  allUsers.forEach(user => {
    const stage = user.stage || 'prospect';
    if (stages.hasOwnProperty(stage)) {
      stages[stage]++;
    }
  });

  const ctx = document.getElementById('funnelChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: ['Prospect', 'Qualified', 'Customer', 'Loyal'],
      datasets: [{
        label: 'Users in Stage',
        data: [stages.prospect, stages.qualified, stages.customer, stages.loyal],
        backgroundColor: [
          'rgba(102, 126, 234, 0.8)',
          'rgba(118, 75, 162, 0.8)',
          'rgba(25, 135, 84, 0.8)',
          'rgba(255, 193, 7, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function createActivityChart() {
  const last30Days = [];
  const activityData = [];
  const now = new Date();

  for (let i = 29; i >= 0; i--) {
    const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    last30Days.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));

    const activeCount = countActiveUsersLastNDays(
      allUsers.filter(user => {
        if (!user.lastActive || !user.lastActive.toDate) return false;
        const lastActive = user.lastActive.toDate();
        return lastActive.toDateString() === date.toDateString();
      }),
      1
    );
    activityData.push(activeCount);
  }

  const ctx = document.getElementById('activityChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: last30Days,
      datasets: [{
        label: 'Active Users',
        data: activityData,
        borderColor: 'rgba(102, 126, 234, 1)',
        backgroundColor: 'rgba(102, 126, 234, 0.2)',
        tension: 0.4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function createSessionChart() {
  const statusCounts = {
    pending: 0,
    accepted: 0,
    completed: 0,
    rejected: 0
  };

  allSessions.forEach(session => {
    const status = session.status || 'pending';
    if (statusCounts.hasOwnProperty(status)) {
      statusCounts[status]++;
    }
  });

  const ctx = document.getElementById('sessionChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Pending', 'Accepted', 'Completed', 'Rejected'],
      datasets: [{
        data: [statusCounts.pending, statusCounts.accepted, statusCounts.completed, statusCounts.rejected],
        backgroundColor: [
          'rgba(255, 193, 7, 0.8)',
          'rgba(25, 135, 84, 0.8)',
          'rgba(108, 117, 125, 0.8)',
          'rgba(220, 53, 69, 0.8)'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false
    }
  });
}

function createSubjectChart() {
  const subjectCounts = {};

  allUsers.forEach(user => {
    if (user.subjects && Array.isArray(user.subjects)) {
      user.subjects.forEach(subject => {
        subjectCounts[subject] = (subjectCounts[subject] || 0) + 1;
      });
    }
  });

  const sortedSubjects = Object.entries(subjectCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const ctx = document.getElementById('subjectChart');
  if (!ctx) return;

  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sortedSubjects.map(s => s[0]),
      datasets: [{
        label: 'Number of Users',
        data: sortedSubjects.map(s => s[1]),
        backgroundColor: 'rgba(118, 75, 162, 0.8)'
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      indexAxis: 'y',
      scales: {
        x: {
          beginAtZero: true
        }
      }
    }
  });
}

function displayStageDistribution() {
  const stages = {
    prospect: { count: 0, description: 'New signups, not yet active' },
    qualified: { count: 0, description: 'Users with at least 1 session booked' },
    customer: { count: 0, description: 'Users with completed sessions' },
    loyal: { count: 0, description: 'Users with 3+ completed sessions' }
  };

  allUsers.forEach(user => {
    const stage = user.stage || 'prospect';
    if (stages[stage]) {
      stages[stage].count++;
    }
  });

  const stageDiv = document.getElementById('stage-distribution');
  let html = '';

  for (const [stage, data] of Object.entries(stages)) {
    const percentage = allUsers.length > 0 ? Math.round((data.count / allUsers.length) * 100) : 0;
    html += `
      <div class="mb-3">
        <div class="d-flex justify-content-between mb-1">
          <strong>${stage.charAt(0).toUpperCase() + stage.slice(1)}</strong>
          <span>${data.count} (${percentage}%)</span>
        </div>
        <div class="progress" style="height: 25px;">
          <div class="progress-bar" role="progressbar" style="width: ${percentage}%">
            ${percentage}%
          </div>
        </div>
        <small class="text-muted">${data.description}</small>
      </div>
    `;
  }

  stageDiv.innerHTML = html;
}

// 🔹 Business Metrics Computation (RFM, CLV, NPS)

// 🔹 Business Metrics with DSA

async function computeRFMwithDSA() {
  const now = Date.now();
  const userMap = new Map(); // HashMap: userId -> { lastTs, freq, monetary }

  // Two-pointer style accumulation
  allSessions.sort((a, b) => a.createdAt.toDate() - b.createdAt.toDate());
  for (let i = 0; i < allSessions.length; i++) {
    const s = allSessions[i];
    const uid = s.userId;
    const ts = s.createdAt ? s.createdAt.toDate().getTime() : now;
    if (!userMap.has(uid)) userMap.set(uid, { lastTs: 0, freq: 0, monetary: 0 });
    const entry = userMap.get(uid);
    entry.freq += 1;
    entry.monetary += s.amount || 10; // default $10 if no amount
    if (ts > entry.lastTs) entry.lastTs = ts;
    userMap.set(uid, entry);
  }

  const rfmList = [];
  for (const [uid, val] of userMap.entries()) {
    const recencyDays = Math.round((now - val.lastTs) / (1000 * 60 * 60 * 24));
    rfmList.push({ userId: uid, recencyDays, frequency: val.freq, monetary: val.monetary });
  }

  // Compute average RFM (proxy)
  const avgRFM = rfmList.length
    ? (rfmList.reduce((sum, r) => sum + (5 - Math.min(r.recencyDays / 30, 5)), 0) / rfmList.length).toFixed(2)
    : 0;

  document.getElementById("avgRFM").textContent = avgRFM;
  return rfmList;
}

async function computeCLVwithDSA() {
  const rfmList = await computeRFMwithDSA();

  // MaxHeap to find top CLV users (DSA usage)
  const clvHeap = [];
  for (let i = 0; i < rfmList.length; i++) {
    const r = rfmList[i];
    const avgValue = r.frequency > 0 ? r.monetary / r.frequency : 10;
    const clv = avgValue * r.frequency * 1.2;
    clvHeap.push({ userId: r.userId, clv });
  }
  clvHeap.sort((a, b) => b.clv - a.clv); // MaxHeap simulated via sorting

  const avgCLV = clvHeap.length ? (clvHeap.reduce((sum, c) => sum + c.clv, 0) / clvHeap.length).toFixed(2) : 0;
  document.getElementById("avgCLV").textContent = avgCLV;
  return clvHeap;
}

async function computeNPSwithDSA() {
  const metricsSnap = await getDocs(collection(db, 'metrics'));
  const counts = { promoters: 0, detractors: 0, passive: 0 };

  metricsSnap.forEach(doc => {
    const data = doc.data();
    if (!data.nps || !Array.isArray(data.nps)) return;

    for (const feedback of data.nps) {
      const score = feedback.score || 0;
      if (score >= 9) counts.promoters++;
      else if (score <= 6) counts.detractors++;
      else counts.passive++;
    }
  });

  const total = counts.promoters + counts.detractors + counts.passive || 1;
  const npsScore = Math.round(((counts.promoters - counts.detractors) / total) * 100);

  document.getElementById("npsScore").textContent = npsScore;
  return npsScore;
}


// Wrapper to load all business metrics
async function loadBusinessMetrics() {
  try {
    await computeCLVwithDSA(); // internally calls computeRFMwithDSA
    await computeNPSwithDSA();
  } catch (err) {
    console.error("Error computing business metrics:", err);
  }
}




window.analyzeReferralNetwork = function () {
  if (allReferrals.length === 0) {
    document.getElementById('referral-details').innerHTML = '<p class="text-muted">No referral data available</p>';
    return;
  }

  const startUserId = allReferrals[0].userId;
  const analysis = analyzeReferralNetworkBFS(allReferrals, startUserId);

  document.getElementById('network-depth').textContent = analysis.maxDepth;

  let detailsHtml = '<h6 class="mt-3">Network Analysis:</h6>';
  detailsHtml += `<p>Total referrals from user: ${analysis.totalReferrals}</p>`;
  detailsHtml += '<p>Level Distribution:</p><ul>';

  for (const [level, count] of Object.entries(analysis.levelDistribution)) {
    detailsHtml += `<li>Level ${level}: ${count} user(s)</li>`;
  }

  detailsHtml += '</ul>';

  document.getElementById('referral-details').innerHTML = detailsHtml;
};

function setupLogout() {
  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async (e) => {
      e.preventDefault();
      try {
        await signOut(auth);
        window.location.href = '/';
      } catch (error) {
        console.error('Logout error:', error);
      }
    });
  }
}



// 🔹 Redirect avatar click → profile.html
const avatarClick = document.getElementById("avatarClick");
if (avatarClick) {
  avatarClick.addEventListener("click", () => {
    window.location.href = "profile.html";
  });
}