// app.js — NEU Library Student Web App
import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, setDoc,
  query, where, limit, serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { PURPOSES, logVisit, getMyVisits, buildQRPayload, renderQR } from "./visit.js";

// ══════════════════════════════════════════
// STATE
// ══════════════════════════════════════════
let STATE = {
  user: null, student: null,
  loans: [], history: [], books: [], events: [], visits: [],
  activeTab: "home", accountTab: "loans",
  bookFilter: "all", bookSearch: "", bookView: "grid",
  selectedBook: null, borrowBook: null,
  visitPurpose: null, visitCustom: "",
  qrTimer: null, qrSeconds: 300,
};

// ══════════════════════════════════════════
// UTILS
// ══════════════════════════════════════════
function g(id) { return document.getElementById(id); }
function esc(s) { return String(s ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;"); }

let toastTimer;
function showToast(msg, type = "") {
  const el = g("toast");
  if (!el) return;
  el.textContent = msg;
  el.className = "toast " + type;
  clearTimeout(toastTimer);
  requestAnimationFrame(() => el.classList.add("show"));
  toastTimer = setTimeout(() => el.classList.remove("show"), 3400);
}

// ══════════════════════════════════════════
// SCREEN SWITCHING
// ══════════════════════════════════════════
function showLogin() {
  g("screen-login").classList.add("active");
  g("screen-app").classList.remove("active");
  g("screen-register").classList.remove("active");
  const btn = g("login-btn");
  if (btn) { btn.innerHTML = "Sign In &nbsp;→"; btn.disabled = false; }
}

function showApp() {
  g("screen-login").classList.remove("active");
  g("screen-register").classList.remove("active");
  g("screen-app").classList.add("active");
  navTo("home");
  setTimeout(() => openVisitModal(true), 600);
}

function showRegister() {
  g("screen-login").classList.remove("active");
  g("screen-app").classList.remove("active");
  g("screen-register").classList.add("active");
  ["reg-name","reg-studentid","reg-email","reg-pass","reg-pass2"].forEach(id => {
    const el = g(id); if (el) el.value = "";
  });
  ["reg-course","reg-year"].forEach(id => { const el = g(id); if (el) el.value = ""; });
  if (g("reg-terms-box"))  g("reg-terms-box").classList.remove("on");
  if (g("reg-submit-btn")) g("reg-submit-btn").disabled = true;
  document.querySelectorAll(".field-error").forEach(e => e.classList.remove("show"));
  if (g("strength-fill"))  g("strength-fill").style.width = "0";
  if (g("strength-label")) g("strength-label").textContent = "";
}

function showLoginFromRegister() {
  g("screen-register").classList.remove("active");
  g("screen-login").classList.add("active");
}

// ══════════════════════════════════════════
// AUTH — LOGIN
// ══════════════════════════════════════════
function bindLoginForm() {
  const form      = g("login-form");
  const pwInput   = g("login-pass");
  const eyeBtn    = g("login-eye");
  const checkWrap = g("remember-wrap");
  const checkBox  = g("remember-box");
  if (!form) return;
  let rememberMe = false;

  const saved = localStorage.getItem("neu_saved_email");
  if (saved) { if (g("login-email")) g("login-email").value = saved; checkBox.classList.add("on"); rememberMe = true; }

  if (eyeBtn) eyeBtn.addEventListener("click", () => {
    const show = pwInput.type === "password";
    pwInput.type = show ? "text" : "password";
    eyeBtn.textContent = show ? "🙈" : "👁️";
  });

  if (checkWrap) checkWrap.addEventListener("click", () => {
    rememberMe = !rememberMe;
    checkBox.classList.toggle("on", rememberMe);
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email    = (g("login-email")?.value || "").trim();
    const password = g("login-pass")?.value || "";
    if (!email || !password) return;

    const btn = g("login-btn");
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled  = true;

    try {
      await setPersistence(auth, rememberMe ? browserLocalPersistence : browserSessionPersistence);
      await signInWithEmailAndPassword(auth, email, password);
      if (rememberMe) localStorage.setItem("neu_saved_email", email);
      else            localStorage.removeItem("neu_saved_email");
      // onAuthStateChanged will call showApp()
    } catch (err) {
      btn.innerHTML = "Sign In &nbsp;→";
      btn.disabled  = false;
      const msgs = {
        "auth/user-not-found":         "No account found with this email.",
        "auth/wrong-password":         "Incorrect password. Please try again.",
        "auth/invalid-email":          "Please enter a valid email address.",
        "auth/invalid-credential":     "Invalid email or password.",
        "auth/too-many-requests":      "Too many attempts. Please wait a moment.",
        "auth/user-disabled":          "This account has been disabled.",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      showToast(msgs[err.code] || "Login failed (" + (err.code || err.message) + ")", "error");
      console.error("Auth error:", err.code, err.message);
    }
  });
}

// ══════════════════════════════════════════
// AUTH — REGISTER
// ══════════════════════════════════════════
function bindRegisterForm() {
  const backBtn    = g("reg-back-btn");
  const gotoLogin  = g("goto-login-btn");
  const gotoReg    = g("goto-register-btn");
  const termsWrap  = g("reg-terms-wrap");
  const termsBox   = g("reg-terms-box");
  const regEye     = g("reg-eye");
  const submitBtn  = g("reg-submit-btn");

  if (backBtn)   backBtn.addEventListener("click",   showLoginFromRegister);
  if (gotoLogin) gotoLogin.addEventListener("click", showLoginFromRegister);
  if (gotoReg)   gotoReg.addEventListener("click",   showRegister);

  let termsAccepted = false;
  if (termsWrap) termsWrap.addEventListener("click", () => {
    termsAccepted = !termsAccepted;
    if (termsBox) termsBox.classList.toggle("on", termsAccepted);
    validateReg();
  });

  if (regEye) regEye.addEventListener("click", () => {
    const inp  = g("reg-pass");
    const show = inp.type === "password";
    inp.type = show ? "text" : "password";
    regEye.textContent = show ? "🙈" : "👁️";
  });

  ["reg-name","reg-studentid","reg-email","reg-pass","reg-pass2","reg-course","reg-year"].forEach(id => {
    const el = g(id);
    if (!el) return;
    el.addEventListener("input",  validateReg);
    el.addEventListener("change", validateReg);
  });

  function validateReg() {
    const name   = (g("reg-name")?.value       || "").trim();
    const sid    = (g("reg-studentid")?.value  || "").trim();
    const course = g("reg-course")?.value      || "";
    const year   = g("reg-year")?.value        || "";
    const email  = (g("reg-email")?.value      || "").trim();
    const pass   = g("reg-pass")?.value        || "";
    const pass2  = g("reg-pass2")?.value       || "";
    const ok = name && sid && course && year && email && pass.length >= 8 && pass === pass2 && termsAccepted;
    if (submitBtn) submitBtn.disabled = !ok;
  }

  if (!submitBtn) return;
  submitBtn.addEventListener("click", async () => {
    const name   = (g("reg-name")?.value       || "").trim();
    const sid    = (g("reg-studentid")?.value  || "").trim();
    const course = g("reg-course")?.value      || "";
    const year   = g("reg-year")?.value        || "";
    const email  = (g("reg-email")?.value      || "").trim();
    const pass   = g("reg-pass")?.value        || "";
    const pass2  = g("reg-pass2")?.value       || "";

    const chk = (errId, cond) => { g(errId)?.classList.toggle("show", !cond); return cond; };
    let valid = true;
    if (!chk("err-name",      name))              valid = false;
    if (!chk("err-studentid", sid))               valid = false;
    if (!chk("err-course",    course))            valid = false;
    if (!chk("err-year",      year))              valid = false;
    if (!chk("err-email",     email.includes("@"))) valid = false;
    if (!chk("err-pass",      pass.length >= 8))  valid = false;
    if (!chk("err-pass2",     pass === pass2))     valid = false;
    if (!valid) return;

    submitBtn.innerHTML = '<span class="spinner"></span>';
    submitBtn.disabled  = true;

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await updateProfile(cred.user, { displayName: name });
      await setDoc(doc(db, "students", cred.user.uid), {
        name, studentId: sid, course, yearLevel: year,
        email, uid: cred.user.uid,
        createdAt: new Date().toISOString(), status: "active",
      });
      showToast("Account created! Welcome, " + name.split(" ")[0] + "! 🎉", "success");
      // onAuthStateChanged fires → showApp()
    } catch (err) {
      submitBtn.innerHTML = "Create Account &nbsp;→";
      submitBtn.disabled  = false;
      const msgs = {
        "auth/email-already-in-use":   "This email is already registered. Try signing in.",
        "auth/invalid-email":          "Please enter a valid email address.",
        "auth/weak-password":          "Password too weak (min 8 characters).",
        "auth/network-request-failed": "Network error. Check your connection.",
      };
      showToast(msgs[err.code] || "Registration failed: " + (err.code || err.message), "error");
      console.error("Register error:", err.code, err.message);
    }
  });
}

async function loadStudentProfile(user) {
  try {
    const snap = await getDoc(doc(db, "students", user.uid));
    if (snap.exists()) {
      STATE.student = { id: snap.id, ...snap.data() };
      return;
    }
    const q   = query(collection(db, "students"), where("email","==",user.email));
    const res = await getDocs(q);
    STATE.student = !res.empty
      ? { id: res.docs[0].id, ...res.docs[0].data() }
      : { id: user.uid, name: user.displayName || user.email.split("@")[0], email: user.email };
  } catch (_) {
    STATE.student = { id: user.uid, name: user.displayName || user.email.split("@")[0], email: user.email };
  }
}

async function handleLogout() {
  if (STATE.qrTimer) clearInterval(STATE.qrTimer);
  await signOut(auth);
}
window.handleLogout = handleLogout;

// ══════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════
function bindNav() {
  document.querySelectorAll(".nav-item").forEach(el =>
    el.addEventListener("click", () => navTo(el.dataset.tab))
  );
  const lb = g("btn-logout");
  if (lb) lb.addEventListener("click", handleLogout);
}

function navTo(tab) {
  STATE.activeTab = tab;
  document.querySelectorAll(".tab-page").forEach(p => p.classList.remove("active"));
  document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.tab === tab));
  const page = g("page-" + tab);
  if (page) page.classList.add("active");
  const titles = { home:"Dashboard", books:"Book Catalog", visit:"Visit Library", account:"My Account" };
  const te = g("header-title"); if (te) te.textContent = titles[tab] || "NEU Library";
  if (tab === "home")    renderHome();
  if (tab === "books")   renderBooks();
  if (tab === "visit")   renderVisitPage();
  if (tab === "account") renderAccount();
}

// ══════════════════════════════════════════
// DATA LOADING
// ══════════════════════════════════════════
async function loadAll() {
  await Promise.allSettled([loadLoans(), loadBooks(), loadEvents(), loadVisitHistory()]);
  renderHome();
}

async function loadLoans() {
  if (!STATE.student) return;
  const sid = STATE.student.studentId || STATE.student.id;
  try {
    const aq = query(collection(db,"loans"), where("studentId","==",sid), where("returned","==",false));
    STATE.loans = (await getDocs(aq)).docs.map(d => ({ id:d.id, ...d.data() }));
    const hq = query(collection(db,"loans"), where("studentId","==",sid), where("returned","==",true));
    STATE.history = (await getDocs(hq)).docs.map(d => ({ id:d.id, ...d.data() })).sort((a,b) => {
      return (b.returnDate?.toDate?.() || new Date(0)) - (a.returnDate?.toDate?.() || new Date(0));
    });
  } catch (e) { console.warn("Loans:", e.message); }
}

async function loadBooks() {
  try {
    STATE.books = (await getDocs(collection(db,"books"))).docs
      .map(d => ({ id:d.id, ...d.data() }))
      .sort((a,b) => (a.title||"").localeCompare(b.title||""));
  } catch (e) { console.warn("Books:", e.message); }
}

async function loadEvents() {
  try {
    STATE.events = (await getDocs(query(collection(db,"events"), limit(10)))).docs
      .map(d => ({ id:d.id, ...d.data() }));
  } catch (e) { console.warn("Events:", e.message); }
}

async function loadVisitHistory() {
  if (!STATE.student) return;
  const sid = STATE.student.studentId || STATE.student.id;
  STATE.visits = await getMyVisits(sid, 30).catch(() => []);
}

// ══════════════════════════════════════════
// HOME
// ══════════════════════════════════════════
function renderHome() {
  const s    = STATE.student || {};
  const name = s.name || s.email || "Student";
  const h    = new Date().getHours();
  const init = name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();

  if (g("wb-avatar"))   g("wb-avatar").textContent   = init;
  if (g("wb-greeting")) g("wb-greeting").textContent = (h<12?"Good morning":h<17?"Good afternoon":"Good evening") + ",";
  if (g("wb-name"))     g("wb-name").textContent     = name;
  if (g("wb-meta"))     g("wb-meta").textContent     = [s.course,s.yearLevel].filter(Boolean).join(" · ") || s.studentId || "";

  const now     = new Date();
  const overdue = STATE.loans.filter(l => { const d=l.dueDate?.toDate?.(); return d && d < now; }).length;
  const dueSoon = STATE.loans.filter(l => { const d=l.dueDate?.toDate?.(); if(!d) return false; const diff=Math.ceil((d-now)/86400000); return diff>=0&&diff<=3; }).length;
  if (g("stat-borrowed")) g("stat-borrowed").textContent = STATE.loans.length;
  if (g("stat-overdue"))  g("stat-overdue").textContent  = overdue;
  if (g("stat-duesoon"))  g("stat-duesoon").textContent  = dueSoon;

  renderEventsHome();
  renderLoansHome();
}

function renderEventsHome() {
  const el = g("events-list"); if (!el) return;
  if (!STATE.events.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">📭</div><div class="empty-text">No events scheduled</div></div>'; return; }
  el.innerHTML = STATE.events.slice(0,3).map(ev => {
    let day="—", mon="—";
    const evD = ev.date?new Date(ev.date):ev.startDate?new Date(ev.startDate):null;
    if (evD&&!isNaN(evD)) { day=String(evD.getDate()).padStart(2,"0"); mon=evD.toLocaleString("en",{month:"short"}).toUpperCase(); }
    return `<div class="event-item">
      <div class="event-date-box"><span class="eday">${day}</span><span class="emon">${mon}</span></div>
      <div class="event-body">
        <div class="event-title">${esc(ev.title||ev.name||"")}</div>
        <div class="event-desc">${esc(ev.description||ev.desc||"")}</div>
        ${ev.location?`<div class="event-meta">📍 ${esc(ev.location)}</div>`:""}
      </div></div>`;
  }).join("");
}

function renderLoansHome() {
  const el = g("loans-list"); if (!el) return;
  if (!STATE.loans.length) { el.innerHTML='<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-text">No books currently borrowed</div></div>'; return; }
  el.innerHTML = STATE.loans.map(loanHTML).join("");
}

function loanHTML(loan) {
  const due  = loan.dueDate?.toDate?.();
  const diff = due ? Math.ceil((due - new Date()) / 86400000) : null;
  let color="var(--green-dark)", badge="Active", bg="rgba(46,204,113,0.15)";
  if (diff !== null) {
    if (diff < 0)       { color="var(--red)";  badge=Math.abs(diff)+"d overdue"; bg="rgba(231,76,60,0.12)"; }
    else if (diff === 0){ color="var(--red)";  badge="Due today";                bg="rgba(231,76,60,0.12)"; }
    else if (diff <= 3) { color="var(--sand)"; badge="Due in "+diff+"d";         bg="rgba(184,144,42,0.12)"; }
    else                { badge="Due in "+diff+"d"; }
  }
  const ds = due?due.toLocaleDateString("en-PH",{month:"short",day:"2-digit",year:"numeric"}):"—";
  return `<div class="loan-item"><div class="loan-accent" style="background:${color}"></div>
    <div class="loan-body"><div class="loan-title">${esc(loan.bookTitle||loan.bookId||"Unknown Book")}</div>
    <div class="loan-sub">Borrowed · Due ${ds}</div></div>
    <div class="loan-badge" style="background:${bg};color:${color}">${badge}</div></div>`;
}

// ══════════════════════════════════════════
// BOOKS
// ══════════════════════════════════════════
function bindBookSearch() {
  const se = g("book-search"), cl = g("search-clear");
  if (!se) return;
  se.addEventListener("input", e => { STATE.bookSearch=e.target.value; cl?.classList.toggle("hidden",!e.target.value); renderBooks(); });
  cl?.addEventListener("click", () => { se.value=""; STATE.bookSearch=""; cl.classList.add("hidden"); renderBooks(); });
  document.querySelectorAll(".filter-chip").forEach(chip =>
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c=>c.classList.remove("active"));
      chip.classList.add("active"); STATE.bookFilter=chip.dataset.filter; renderBooks();
    })
  );
  const vt = g("view-toggle");
  if (vt) vt.addEventListener("click", () => {
    STATE.bookView = STATE.bookView==="grid"?"list":"grid";
    vt.textContent = STATE.bookView==="grid"?"☰":"⊞"; renderBooks();
  });
}

function renderBooks() {
  const q = STATE.bookSearch.toLowerCase();
  const books = STATE.books.filter(b => {
    const ms = !q || b.title?.toLowerCase().includes(q) || b.author?.toLowerCase().includes(q) || b.isbn?.includes(q);
    const av = b.available||0;
    const mf = STATE.bookFilter==="all"?true:STATE.bookFilter==="available"?av>0:av===0;
    return ms && mf;
  });
  const ce = g("book-count"); if (ce) ce.textContent = books.length+" book"+(books.length!==1?"s":"");
  const el = g("books-grid"); if (!el) return;

  if (!books.length) { el.className=""; el.innerHTML='<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">No books found</div></div>'; return; }

  if (STATE.bookView==="grid") {
    el.className = "book-grid";
    el.innerHTML = books.map(b => {
      const av=b.available||0;
      return `<div class="book-card" onclick="openBookDetail('${b.id}')">
        <div class="book-cover">${b.coverImage?`<img src="${esc(b.coverImage)}" alt="" loading="lazy">`:"📖"}
          <div class="avail-badge" style="background:${av>0?"var(--green)":"var(--red)"}">${av>0?"Available":"Out"}</div>
        </div>
        <div class="book-info"><div class="book-title">${esc(b.title||"")}</div><div class="book-author">${esc(b.author||"")}</div></div>
      </div>`;
    }).join("");
  } else {
    el.className = "";
    el.innerHTML = books.map(b => {
      const av=b.available||0, aBg=av>0?"rgba(46,204,113,0.12)":"rgba(231,76,60,0.12)", aC=av>0?"var(--green-dark)":"var(--red)";
      return `<div class="book-list-item" onclick="openBookDetail('${b.id}')">
        <div class="book-list-thumb">${b.coverImage?`<img src="${esc(b.coverImage)}" alt="" loading="lazy">`:"📖"}</div>
        <div class="book-list-info"><div class="book-list-title">${esc(b.title||"")}</div><div class="book-list-author">${esc(b.author||"")}</div>
          <div class="avail-pill" style="background:${aBg}"><div class="avail-dot" style="background:${av>0?"var(--green)":"var(--red)"}"></div>
            <span style="color:${aC};font-size:10px;font-weight:600">${av>0?av+" available":"Checked out"}</span></div>
        </div><span style="color:var(--text-light);font-size:18px">›</span>
      </div>`;
    }).join("");
  }
}

window.openBookDetail = function(bookId) {
  const book = STATE.books.find(b=>b.id===bookId); if (!book) return;
  STATE.selectedBook = book;
  const av = book.available||0;
  g("detail-cover-inner").innerHTML = book.coverImage?`<img src="${esc(book.coverImage)}" alt="">`:"📖";
  g("detail-title").textContent  = book.title||"";
  g("detail-author").textContent = book.author?`by ${book.author}`:"";
  const chips=[];
  if (book.isbn)     chips.push(`<div class="detail-chip">🔖 ${esc(book.isbn)}</div>`);
  if (book.category) chips.push(`<div class="detail-chip">📂 ${esc(book.category)}</div>`);
  if (book.location) chips.push(`<div class="detail-chip">📍 ${esc(book.location)}</div>`);
  g("detail-meta-chips").innerHTML = chips.join("");
  g("detail-avail-num").textContent  = av;
  g("detail-total-num").textContent  = book.total||av;
  g("detail-onloan-num").textContent = (book.total||av)-av;
  const de = g("detail-desc"); de.textContent=book.description||book.desc||""; de.style.display=(book.description||book.desc)?"":"none";
  g("detail-action").innerHTML = av>0
    ? `<button class="btn-borrow" onclick="openBorrowConfirm('${book.id}')">📖 Borrow this Book</button><div class="borrow-note">ℹ️ Visit the library counter with your student ID to collect the book.</div>`
    : `<button class="btn-reserve" onclick="doReserve('${book.id}')">🔔 Reserve — Notify When Available</button>`;
  g("book-detail-overlay").classList.add("open");
  document.body.style.overflow="hidden";
};

function closeBookDetail() { g("book-detail-overlay").classList.remove("open"); document.body.style.overflow=""; }

window.openBorrowConfirm = function(bookId) {
  const book=STATE.books.find(b=>b.id===bookId); if (!book) return;
  STATE.borrowBook=book;
  const due=new Date(); due.setDate(due.getDate()+14);
  g("confirm-book-cover").innerHTML = book.coverImage?`<img src="${esc(book.coverImage)}" style="height:80px;border-radius:8px;margin:0 auto">`:"📖";
  g("confirm-book-title").textContent  = book.title;
  g("confirm-book-author").textContent = book.author?`by ${book.author}`:"";
  g("confirm-due-date").textContent    = due.toLocaleDateString("en-PH",{month:"long",day:"2-digit",year:"numeric"});
  g("borrow-confirm-overlay").classList.add("open");
};

window.doReserve = async function(bookId) {
  const book=STATE.books.find(b=>b.id===bookId); if (!book) return;
  const sid=STATE.student?.studentId||STATE.student?.id;
  try {
    const ex=await getDocs(query(collection(db,"reservations"),where("studentId","==",sid),where("bookId","==",bookId),where("status","==","pending")));
    if (!ex.empty) { showToast("You already reserved this book.","error"); return; }
    await addDoc(collection(db,"reservations"),{ studentId:sid, studentName:STATE.student?.name||"", bookId, bookTitle:book.title, status:"pending", requestedAt:serverTimestamp() });
    showToast(`Reserved! You'll be notified when "${book.title}" is available.`,"success");
    closeBookDetail();
  } catch(e) { showToast("Reservation failed. Please try again.","error"); }
};

// ══════════════════════════════════════════
// VISIT MODAL
// ══════════════════════════════════════════
function bindVisitModal() {
  const modal = g("visit-modal"); if (!modal) return;

  modal.querySelectorAll(".modal-purpose-btn").forEach(btn =>
    btn.addEventListener("click", () => {
      modal.querySelectorAll(".modal-purpose-btn").forEach(b=>b.classList.remove("selected"));
      btn.classList.add("selected");
      STATE.visitPurpose = btn.dataset.purpose;
      if (g("modal-other-section")) g("modal-other-section").style.display = STATE.visitPurpose==="other"?"block":"none";
      if (g("modal-submit-btn"))    g("modal-submit-btn").disabled = false;
    })
  );
  const ot = g("modal-other-text"); if (ot) ot.addEventListener("input", e => { STATE.visitCustom=e.target.value; });
  const sb = g("modal-submit-btn");
  if (sb) sb.addEventListener("click", async () => {
    if (!STATE.visitPurpose) return;
    if (STATE.visitPurpose==="other"&&!STATE.visitCustom.trim()) { showToast("Please describe your purpose.","error"); return; }
    sb.innerHTML='<span class="spinner"></span>'; sb.disabled=true;
    try {
      const sid     = STATE.student?.studentId||STATE.student?.id||STATE.user?.uid||"";
      const purpose = STATE.visitPurpose==="other"?(STATE.visitCustom.trim()||"Other"):PURPOSES.find(p=>p.id===STATE.visitPurpose)?.label||STATE.visitPurpose;
      await logVisit({ studentId:sid, studentName:STATE.student?.name||"", purpose, customReason:STATE.visitCustom.trim() });
      STATE.visits.unshift({ purpose, date:new Date().toISOString().slice(0,10), checkedIn:false });
      closeVisitModal();
      showToast("Visit logged: "+purpose+" ✓","success");
    } catch(e) { showToast("Could not save visit: "+e.message,"error"); sb.innerHTML="Submit →"; sb.disabled=false; }
  });
  const cb = g("modal-close-btn"); if (cb) cb.addEventListener("click", closeVisitModal);
  const qa = g("qa-visit");        if (qa) qa.addEventListener("click", ()=>openVisitModal(false));
}

function openVisitModal(isAuto) {
  STATE.visitPurpose=null; STATE.visitCustom="";
  const modal=g("visit-modal"); if (!modal) return;
  modal.querySelectorAll(".modal-purpose-btn").forEach(b=>b.classList.remove("selected"));
  if (g("modal-other-section")) g("modal-other-section").style.display="none";
  if (g("modal-other-text"))    g("modal-other-text").value="";
  const sb=g("modal-submit-btn"); if(sb){sb.disabled=true;sb.innerHTML="Submit →";}
  const cb=g("modal-close-btn");  if(cb) cb.style.display=isAuto?"none":"flex";
  modal.classList.add("open");
  document.body.style.overflow="hidden";
}

function closeVisitModal() { const m=g("visit-modal"); if(m) m.classList.remove("open"); document.body.style.overflow=""; }

// ══════════════════════════════════════════
// VISIT PAGE (tab)
// ══════════════════════════════════════════
function renderVisitPage() {
  const grid=g("visit-purpose-grid"); if (!grid) return;
  if (!grid._bound) {
    grid.querySelectorAll(".purpose-card").forEach(card =>
      card.addEventListener("click", () => {
        grid.querySelectorAll(".purpose-card").forEach(c=>c.classList.remove("selected"));
        card.classList.add("selected"); STATE.visitPurpose=card.dataset.purpose;
        if (g("visit-other-section")) g("visit-other-section").style.display=STATE.visitPurpose==="other"?"block":"none";
        if (g("visit-submit-btn"))    g("visit-submit-btn").disabled=false;
      })
    );
    const ota=g("visit-other-textarea"); if(ota) ota.addEventListener("input",e=>{STATE.visitCustom=e.target.value;});
    const vsb=g("visit-submit-btn");     if(vsb) vsb.addEventListener("click",handleVisitTabSubmit);
    grid._bound=true;
  }
  grid.querySelectorAll(".purpose-card").forEach(c=>c.classList.remove("selected"));
  if (g("visit-other-section")) g("visit-other-section").style.display="none";
  if (g("visit-submit-btn"))    g("visit-submit-btn").disabled=true;
  if (g("visit-qr-section"))    g("visit-qr-section").style.display="none";
  if (g("visit-form-section"))  g("visit-form-section").style.display="block";
}

async function handleVisitTabSubmit() {
  if (!STATE.visitPurpose) return;
  const btn=g("visit-submit-btn");
  if (btn) { btn.innerHTML='<span class="spinner"></span>'; btn.disabled=true; }
  const sid     = STATE.student?.studentId||STATE.student?.id||STATE.user?.uid||"";
  const purpose = STATE.visitPurpose==="other"?(STATE.visitCustom.trim()||"Other"):PURPOSES.find(p=>p.id===STATE.visitPurpose)?.label||STATE.visitPurpose;
  try {
    await logVisit({ studentId:sid, studentName:STATE.student?.name||"", purpose, customReason:STATE.visitCustom.trim() });
    STATE.visits.unshift({ purpose, date:new Date().toISOString().slice(0,10), checkedIn:false });
    if(g("visit-form-section")) g("visit-form-section").style.display="none";
    if(g("visit-qr-section"))   g("visit-qr-section").style.display="block";
    if(g("qr-purpose-label"))   g("qr-purpose-label").textContent="Purpose: "+purpose;
    renderQR("qr-container", buildQRPayload(STATE.user, purpose));
    startQRTimer();
    if(btn){btn.innerHTML="Submit & Generate QR →";btn.disabled=false;}
  } catch(e) {
    showToast("Error: "+e.message,"error");
    if(btn){btn.innerHTML="Submit & Generate QR →";btn.disabled=false;}
  }
}

function startQRTimer() {
  if (STATE.qrTimer) clearInterval(STATE.qrTimer);
  STATE.qrSeconds=300; updateQRTimer();
  STATE.qrTimer=setInterval(()=>{ STATE.qrSeconds--; updateQRTimer(); if(STATE.qrSeconds<=0){clearInterval(STATE.qrTimer);const td=g("qr-time-display");if(td){td.textContent="Expired";td.style.color="var(--red)";}} },1000);
}

function updateQRTimer() {
  const s=STATE.qrSeconds, m=Math.floor(s/60), sc=s%60, pct=(s/300)*100;
  const color=s<=60?"var(--red)":s<=120?"var(--sand)":"var(--green)";
  const pf=g("qr-progress-fill"); if(pf){pf.style.width=pct+"%";pf.style.background=color;}
  const td=g("qr-time-display");  if(td){td.textContent=m+":"+String(sc).padStart(2,"0");td.style.color=color;}
}

// ══════════════════════════════════════════
// ACCOUNT
// ══════════════════════════════════════════
function bindAccountTabs() {
  document.querySelectorAll(".acct-tab").forEach(tab =>
    tab.addEventListener("click", () => {
      document.querySelectorAll(".acct-tab").forEach(t=>t.classList.remove("active"));
      tab.classList.add("active"); STATE.accountTab=tab.dataset.tab; renderAccountContent();
    })
  );
}

function renderAccount() {
  const s=STATE.student||{}, name=s.name||STATE.user?.email?.split("@")[0]||"Student";
  const init=name.split(" ").map(w=>w[0]||"").join("").slice(0,2).toUpperCase();
  if(g("acct-avatar")) g("acct-avatar").textContent=init;
  if(g("acct-name"))   g("acct-name").textContent=name;
  if(g("acct-meta"))   g("acct-meta").textContent=[s.course,s.yearLevel,s.studentId].filter(Boolean).join(" · ");
  renderAccountContent();
}

function renderAccountContent() {
  const tab=STATE.accountTab;
  document.querySelectorAll(".acct-panel").forEach(p=>p.classList.toggle("hidden",p.dataset.panel!==tab));
  if(tab==="loans")   renderAccountLoans();
  if(tab==="history") renderAccountHistory();
  if(tab==="visits")  renderAccountVisits();
  if(tab==="profile") renderAccountProfile();
}

function renderAccountLoans() {
  const el=g("acct-loans"); if(!el) return;
  const FINE=5, now=new Date();
  const fines=STATE.loans.reduce((s,l)=>{ const d=l.dueDate?.toDate?.(); if(!d||d>=now) return s; return s+Math.floor((now-d)/86400000)*FINE; },0);
  let html="";
  if(fines>0) html+=`<div class="fine-alert mb-14"><div class="fine-alert-ico">⚠️</div><div class="fine-alert-txt">Outstanding fines: <strong>₱${fines}</strong>. Please settle at the library counter.</div></div>`;
  html+=!STATE.loans.length
    ?'<div class="empty-state"><div class="empty-icon">📚</div><div class="empty-text">No books currently borrowed</div></div>'
    :`<div class="card"><div class="card-body" style="padding:0 16px">${STATE.loans.map(loanHTML).join("")}</div></div>`;
  el.innerHTML=html;
}

function renderAccountHistory() {
  const el=g("acct-history"); if(!el) return;
  if(!STATE.history.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">📋</div><div class="empty-text">No borrowing history yet</div></div>';return;}
  el.innerHTML=`<div class="card"><div class="card-body" style="padding:0 16px">${STATE.history.map(h=>`<div class="history-item">
    <div class="hist-icon" style="background:rgba(46,204,113,0.12)">✅</div>
    <div class="hist-body"><div class="hist-title">${esc(h.bookTitle||h.bookId||"Unknown")}</div>
    <div class="hist-meta">${h.borrowDate?.toDate?.()?.toLocaleDateString("en-PH",{month:"short",day:"2-digit",year:"numeric"})||"—"} → ${h.returnDate?.toDate?.()?.toLocaleDateString("en-PH",{month:"short",day:"2-digit",year:"numeric"})||"—"}</div></div>
    <div class="hist-badge" style="background:rgba(46,204,113,0.12);color:var(--green-dark)">Returned</div>
  </div>`).join("")}</div></div>`;
}

function renderAccountVisits() {
  const el=g("acct-visits"); if(!el) return;
  if(!STATE.visits.length){el.innerHTML='<div class="empty-state"><div class="empty-icon">📅</div><div class="empty-text">No visit history yet</div></div>';return;}
  const EM={study:"📚",research:"🔍",borrow:"📖",computer:"💻",group:"👥",other:"✏️"};
  el.innerHTML=`<div class="card"><div class="card-body" style="padding:0 16px">${STATE.visits.slice(0,20).map(v=>{
    const ts=v.timestamp?.toDate?.()?.toLocaleString("en-PH",{month:"short",day:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})||v.date||"—";
    const ek=Object.keys(EM).find(k=>(v.purpose||"").toLowerCase().includes(k))||"other";
    return `<div class="history-item">
      <div class="hist-icon" style="background:rgba(58,111,216,0.10)">${EM[ek]}</div>
      <div class="hist-body"><div class="hist-title">${esc(v.purpose||"Library Visit")}</div><div class="hist-meta">${esc(ts)}</div></div>
      <div class="hist-badge" style="background:${v.checkedIn?"rgba(46,204,113,0.12)":"rgba(184,144,42,0.12)"};color:${v.checkedIn?"var(--green-dark)":"var(--sand)"}">
        ${v.checkedIn?"Checked in":"Logged"}</div></div>`;
  }).join("")}</div></div>`;
}

function renderAccountProfile() {
  const el=g("acct-profile"); if(!el) return;
  const s=STATE.student||{};
  el.innerHTML=`<div class="card mb-14"><div class="card-body" style="padding:0 16px">
    ${[["Student ID",s.studentId||s.id||"—"],["Name",s.name||"—"],["Email",s.email||STATE.user?.email||"—"],["Course",s.course||"—"],["Year Level",s.yearLevel||"—"]]
      .map(([l,v])=>`<div class="profile-row"><div class="profile-lbl">${l}</div><div class="profile-val">${esc(String(v))}</div></div>`).join("")}
  </div></div>
  <button class="btn-primary" onclick="handleLogout()" style="background:var(--red)">🔓 Sign Out</button>`;
}

// ══════════════════════════════════════════
// PASSWORD STRENGTH
// ══════════════════════════════════════════
window.checkPasswordStrength = function(pass) {
  const fill=g("strength-fill"), label=g("strength-label"); if(!fill||!label) return;
  let score=0;
  if(pass.length>=8) score++; if(pass.length>=12) score++;
  if(/[A-Z]/.test(pass)&&/[a-z]/.test(pass)) score++;
  if(/[0-9]/.test(pass)) score++; if(/[^A-Za-z0-9]/.test(pass)) score++;
  const levels=[{w:"0%",color:"var(--beige-dark)",text:""},{w:"25%",color:"var(--red)",text:"Weak"},{w:"50%",color:"var(--sand)",text:"Fair"},{w:"75%",color:"#f1c40f",text:"Good"},{w:"100%",color:"var(--green)",text:"Strong"}];
  const lvl=levels[Math.min(score,4)];
  fill.style.width=lvl.w; fill.style.background=lvl.color; label.textContent=lvl.text; label.style.color=lvl.color;
};

// ══════════════════════════════════════════
// INLINE WIRING HELPERS
// ══════════════════════════════════════════
function bindDetailSheet() {
  const ov=g("book-detail-overlay");
  if(ov) ov.addEventListener("click",e=>{if(e.target===ov) closeBookDetail();});
  const cb=g("detail-close"); if(cb) cb.addEventListener("click",closeBookDetail);
}

function bindBorrowConfirm() {
  const ov=g("borrow-confirm-overlay");
  if(ov) ov.addEventListener("click",e=>{if(e.target===ov) ov.classList.remove("open");});
  const cancel=g("borrow-cancel"); if(cancel) cancel.addEventListener("click",()=>g("borrow-confirm-overlay").classList.remove("open"));
  const confirm=g("borrow-confirm-btn");
  if(!confirm) return;
  confirm.addEventListener("click", async () => {
    const book=STATE.borrowBook, student=STATE.student;
    if(!book||!student) return;
    const sid=student.studentId||student.id;
    if(STATE.loans.length>=5){showToast("5-book borrow limit reached.","error");return;}
    if(STATE.loans.some(l=>{const d=l.dueDate?.toDate?.();return d&&d<new Date();})){showToast("Return overdue books first.","error");return;}
    confirm.innerHTML='<span class="spinner"></span>'; confirm.disabled=true;
    try {
      const due=new Date(); due.setDate(due.getDate()+14);
      await addDoc(collection(db,"loans"),{studentId:sid,studentName:student.name||"",bookId:book.id,bookTitle:book.title,borrowDate:serverTimestamp(),dueDate:due,returned:false,status:"borrowed"});
      if((book.available||0)>0){await updateDoc(doc(db,"books",book.id),{available:book.available-1});book.available--;}
      await loadLoans();
      g("borrow-confirm-overlay").classList.remove("open"); closeBookDetail();
      showToast(`"${book.title}" borrowed! Due ${due.toLocaleDateString("en-PH",{month:"short",day:"2-digit"})}`,"success");
      renderHome();
    } catch(e){showToast("Borrow failed: "+e.message,"error");}
    finally{confirm.innerHTML="✅ Confirm Borrow";confirm.disabled=false;}
  });
}

function bindQRButtons() {
  const regen=g("btn-regen");
  if(regen) regen.addEventListener("click",()=>{
    const lbl=g("qr-purpose-label"), purpose=lbl?lbl.textContent.replace("Purpose: ",""):"";
    renderQR("qr-container",buildQRPayload(STATE.user,purpose)); startQRTimer(); showToast("New QR code generated","success");
  });
  const nv=g("btn-new-visit");
  if(nv) nv.addEventListener("click",()=>{
    if(g("visit-qr-section")) g("visit-qr-section").style.display="none";
    if(g("visit-form-section")) g("visit-form-section").style.display="block";
    renderVisitPage();
  });
}

// ══════════════════════════════════════════
// BOOT — ONE DOMContentLoaded, AFTER ALL FUNCTIONS
// ══════════════════════════════════════════
document.addEventListener("DOMContentLoaded", () => {
  // Bind all UI handlers
  bindLoginForm();
  bindRegisterForm();
  bindNav();
  bindVisitModal();
  bindBookSearch();
  bindAccountTabs();
  bindBorrowConfirm();
  bindDetailSheet();
  bindQRButtons();

  // Quick action buttons
  const qa = (id, fn) => { const el=g(id); if(el) el.addEventListener("click",fn); };
  qa("qa-search",   () => { navTo("books"); setTimeout(()=>g("book-search")?.focus(),200); });
  qa("qa-browse",   () => navTo("books"));
  qa("qa-arrivals", () => { navTo("books"); document.querySelectorAll(".filter-chip").forEach(c=>c.classList.toggle("active",c.dataset.filter==="available")); STATE.bookFilter="available"; renderBooks(); });

  // Firebase auth — registered last so every handler is wired up first
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      STATE.user = user;
      await loadStudentProfile(user);
      showApp();
      loadAll();
    } else {
      STATE.user    = null;
      STATE.student = null;
      showLogin();
    }
  });
});
