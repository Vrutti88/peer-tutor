import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-functions.js";

/* Firebase config */
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

const loginBtn = document.getElementById('loginBtn');
const claimBtn = document.getElementById('claimBtn');
const loginStatus = document.getElementById('loginStatus');
const claimed = document.getElementById('claimed');

/* Login user */
loginBtn.addEventListener('click', async () => {
  const email = document.getElementById('email').value.trim();
  const pwd = document.getElementById('password').value;
  try {
    const cred = await signInWithEmailAndPassword(auth, email, pwd);
    loginStatus.style.color = 'green';
    loginStatus.textContent = 'Logged in as ' + cred.user.email;
  } catch (err) {
    console.error(err);
    loginStatus.style.color = 'crimson';
    loginStatus.textContent = 'Login failed: ' + (err.message || err.code);
  }
});

/* Claim top leads */
claimBtn.addEventListener('click', async () => {
  claimed.textContent = 'Claiming... (requires sales custom claim)';
  try {
    const assignFn = httpsCallable(functions, 'assignTopLeads');
    const res = await assignFn({ limit: 5 });
    claimed.style.color = 'green';
    claimed.textContent = 'Assigned leads:\n' + JSON.stringify(res.data.assigned, null, 2);
  } catch (err) {
    console.error(err);
    claimed.style.color = 'crimson';
    claimed.textContent = 'Assign failed: ' + (err.message || err.code);
  }
});
