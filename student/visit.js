// visit.js
import { db, auth } from "./firebase-config.js";
import {
  collection, addDoc, getDocs, query, where,
  orderBy, limit, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export const PURPOSES = [
  { id: "study",    label: "Study / Reading",       emoji: "📚", color: "#3a6fd8" },
  { id: "research", label: "Research",               emoji: "🔍", color: "#8e44ad" },
  { id: "borrow",   label: "Borrow / Return Books",  emoji: "📖", color: "#2ecc71" },
  { id: "computer", label: "Computer Use",            emoji: "💻", color: "#e67e22" },
  { id: "group",    label: "Group Study",             emoji: "👥", color: "#16a085" },
  { id: "other",    label: "Other",                   emoji: "✏️",  color: "#95a5a6" },
];

export async function logVisit({ studentId, studentName, purpose, customReason = "" }) {
  const now  = new Date();
  const pad  = n => String(n).padStart(2, "0");
  const date = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const ref = await addDoc(collection(db, "visits"), {
    studentId,
    studentName,
    purpose,
    customReason,
    timestamp: serverTimestamp(),
    date,
    time,
    checkedIn: false,
  });
  return ref.id;
}

export async function getMyVisits(studentId, maxResults = 20) {
  try {
    const q = query(
      collection(db, "visits"),
      where("studentId", "==", studentId),
      orderBy("timestamp", "desc"),
      limit(maxResults)
    );
    const snap = await getDocs(q);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // Index not yet created — fallback without orderBy
    const q2 = query(collection(db, "visits"), where("studentId", "==", studentId), limit(maxResults));
    const snap = await getDocs(q2);
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => {
      const ta = a.timestamp?.toDate?.() || new Date(0);
      const tb = b.timestamp?.toDate?.() || new Date(0);
      return tb - ta;
    });
  }
}

// Build QR payload string
export function buildQRPayload(student, purpose) {
  const now = new Date();
  const pad = n => String(n).padStart(2, "0");
  const ts  = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  return JSON.stringify({
    studentId:   student.uid,
    studentName: student.displayName || student.name || "",
    purpose,
    timestamp:   ts,
    expires:     new Date(now.getTime() + 5 * 60 * 1000).toISOString(),
  });
}

// Render a QR code into a container element using qrcode.js
export function renderQR(containerId, text) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = "";
  if (window.QRCode) {
    new QRCode(el, {
      text,
      width:  200,
      height: 200,
      colorDark:  "#1a2f5e",
      colorLight: "#ffffff",
      correctLevel: QRCode.CorrectLevel.M,
    });
  }
}
