import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore, doc, setDoc, onSnapshot, serverTimestamp }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, site } from "./config.js";

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const $ = id => document.getElementById(id);

let seconds = Number(localStorage.getItem("milad.seconds")) || site.questionSeconds;
const DURATION = () => seconds * 1000;
const currentRef = doc(db, "live", "current");
const siteRef = doc(db, "live", "site");
const noticesRef = doc(db, "live", "notices");
const resultsRef = doc(db, "results", "posters");

/* ---------- sign in ------------------------------------------------------ */

$("sign-in").addEventListener("click", async () => {
  const note = $("gate-error");
  note.classList.add("hidden");
  try {
    await signInWithEmailAndPassword(auth, $("email").value.trim(), $("password").value);
  } catch (e) {
    note.textContent = e.code === "auth/invalid-credential"
      ? "That email and password don't match an organiser account."
      : "Couldn't sign in: " + e.code;
    note.classList.remove("hidden");
  }
});
$("password").addEventListener("keydown", e => { if (e.key === "Enter") $("sign-in").click(); });

$("sign-out").addEventListener("click", e => { e.preventDefault(); signOut(auth); });

onAuthStateChanged(auth, user => {
  $("gate").classList.toggle("hidden", !!user);
  $("dash").classList.toggle("hidden", !user);
  if (user) { $("password").value = ""; watchSite(); watchResults(); }
});

/* ---------- CSV --------------------------------------------------------- */

function parseCSV(text) {
  const rows = [];
  let row = [], field = "", quoted = false;
  text = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else quoted = false;
      } else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else field += c;
  }
  if (field || row.length) { row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ""));
}

function toObjects(rows) {
  if (!rows.length) return [];
  const head = rows[0].map(h => h.trim().toLowerCase());
  return rows.slice(1).map(r => Object.fromEntries(head.map((h, i) => [h, (r[i] ?? "").trim()])));
}

/* ---------- question bank ------------------------------------------------ */

let bank = [];
let cursor = -1;

try {
  const saved = localStorage.getItem("milad.bank");
  if (saved) { bank = JSON.parse(saved); paintBank(); }
} catch { /* nothing saved yet */ }

function loadQuestions(csvText) {
  const err = $("q-error");
  err.classList.add("hidden");

  const rows = toObjects(parseCSV(csvText));
  if (!rows.length) return fail("That file has no rows under the header.");

  const parsed = [];
  for (const [n, r] of rows.entries()) {
    const text = r.question || r.q || "";
    if (!text) return fail(`Row ${n + 2} has no question text.`);

    const options = ["option1", "option2", "option3", "option4", "option5", "option6"]
      .map(k => r[k]).filter(v => v);
    if (options.length < 2) return fail(`Row ${n + 2} needs at least two options.`);

    const raw = (r.answer || "").trim().toUpperCase();
    let idx = /^[A-F]$/.test(raw) ? raw.charCodeAt(0) - 65 : parseInt(raw, 10) - 1;
    if (!(idx >= 0 && idx < options.length)) return fail(`Row ${n + 2} has an answer that isn't one of its options.`);

    parsed.push({ id: `q${n + 1}`, text, options, answerIndex: idx, explanation: r.explanation || "" });
  }

  bank = parsed;
  cursor = -1;
  localStorage.setItem("milad.bank", JSON.stringify(bank));
  paintBank();

  function fail(msg) { err.textContent = msg; err.classList.remove("hidden"); return null; }
}

function paintBank() {
  $("q-count").textContent = bank.length;
  $("q-list").classList.toggle("hidden", !bank.length);
  $("btn-next").disabled = !bank.length;

  $("q-items").replaceChildren(...bank.map((q, i) => {
    const li = document.createElement("li");
    if (i === cursor) li.className = "is-live";
    const span = document.createElement("span");
    span.textContent = q.text;
    li.appendChild(span);
    return li;
  }));
}

const secsInput = $("secs");
secsInput.value = seconds;
secsInput.addEventListener("change", () => {
  const v = Math.min(180, Math.max(10, Number(secsInput.value) || site.questionSeconds));
  seconds = v;
  secsInput.value = v;
  localStorage.setItem("milad.seconds", String(v));
  $("secs-note").textContent = "Applies from the next question.";
});

$("q-file").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (file) loadQuestions(await file.text());
  e.target.value = "";
});

$("q-fetch").addEventListener("click", async () => {
  const url = $("q-url").value.trim();
  const err = $("q-error");
  if (!url) return;
  err.classList.add("hidden");
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(res.status);
    loadQuestions(await res.text());
  } catch {
    err.textContent = "Couldn't fetch that link. Make sure the sheet is published to the web as CSV, or upload the file instead.";
    err.classList.remove("hidden");
  }
});

/* ---------- controller --------------------------------------------------- */

async function push(state, q, index) {
  const payload = { state, updatedAt: serverTimestamp() };

  if (q) {
    Object.assign(payload, {
      questionId: q.id,
      index: index + 1,
      total: bank.length,
      text: q.text,
      options: q.options,
      durationMs: DURATION()
    });
    if (state === "running") payload.startedAt = serverTimestamp();
    // The correct answer is never written to the public document at all.
  }
  await setDoc(currentRef, payload);
}

let liveStartedAt = null;
let startWatcher = null;

$("btn-next").addEventListener("click", async () => {
  if (cursor + 1 >= bank.length) return;
  cursor++;
  const q = bank[cursor];

  await push("running", q, cursor);
  // Track the server-stamped start so the host countdown matches the public one.
  liveStartedAt = null;
  startWatcher?.();                     // drop any previous watcher first
  startWatcher = onSnapshot(currentRef, s => {
    const t = s.data()?.startedAt;
    if (t) { liveStartedAt = t; startWatcher?.(); startWatcher = null; }
  });

  paintBank();
});

$("btn-end").addEventListener("click", async () => {
  cursor = bank.length;
  await setDoc(currentRef, { state: "ended", updatedAt: serverTimestamp() });
  paintBank();
});

$("btn-reset").addEventListener("click", async () => {
  cursor = -1;
  await setDoc(currentRef, { state: "idle", updatedAt: serverTimestamp() });
  paintBank();
});

// Mirror whatever the public page is seeing, so the host has one source of truth.
onSnapshot(currentRef, snap => {
  const d = snap.data() || { state: "idle" };

  // If the dashboard was reloaded mid-quiz, pick the position back up from
  // whatever is currently on screen instead of restarting at question one.
  if (cursor < 0 && d.questionId && bank.length) {
    const found = bank.findIndex(q => q.id === d.questionId);
    if (found >= 0) { cursor = found; liveStartedAt = d.startedAt || null; paintBank(); }
  }

  const tag = $("q-state");
  tag.textContent = d.state;
  tag.className = "state-tag " + (d.state === "running" ? "running" : "");

  $("q-preview").textContent = d.text || "Nothing on screen. Load your questions, then press start.";
  $("q-position").textContent = d.index ? `question ${d.index} of ${d.total}` : "";

  const q = bank[cursor];
  // shown to the host only, never written to Firestore
  $("q-answer").textContent = (q && d.state === "running")
    ? `Answer (your eyes only): ${String.fromCharCode(65 + q.answerIndex)} — ${q.options[q.answerIndex]}`
    : "";

  secsInput.disabled = d.state === "running";
  $("btn-end").disabled = d.state === "idle" || d.state === "ended";
  $("btn-next").disabled = !bank.length || cursor + 1 >= bank.length || d.state === "running";
  $("btn-next").textContent = cursor < 0 ? "Start quiz" : "Next question";
});

// Countdown readout for the host.
const RING = 2 * Math.PI * 52;
setInterval(() => {
  const el = $("q-clock"), fill = $("ring-fill");
  if (!liveStartedAt || $("q-state").textContent !== "running") {
    el.textContent = "\u2014";
    fill.style.strokeDashoffset = RING;
    fill.classList.remove("low");
    return;
  }
  const total = DURATION();
  const left = Math.max(0, total - (Date.now() - liveStartedAt.toMillis()));
  const secs = Math.ceil(left / 1000);
  el.textContent = secs;
  fill.style.strokeDashoffset = RING * (1 - left / total);
  fill.classList.toggle("low", secs <= 10);
}, 500);

/* ---------- site settings ------------------------------------------------ */

let siteLoaded = false;
let notices = [];
let pendingImage = null;

function watchSite() {
  if (siteLoaded) return;
  siteLoaded = true;

  onSnapshot(siteRef, snap => {
    const d = snap.data() || {};
    $("live-toggle").checked = !!d.liveNow;
    $("auto-live").checked = !!d.autoDetect;
    if (document.activeElement !== $("event-date") && d.eventDate) {
      $("event-date").value = d.eventDate.slice(0, 16);
    }
    if (document.activeElement !== $("event-label")) $("event-label").value = d.eventLabel || "";
    setAutoPolling(!!d.autoDetect);
  });

  // Notices sit in their own document. They carry images, and the live toggle
  // changes often — keeping them apart means flipping the banner doesn't
  // re-send every attached image to all 300 phones.
  onSnapshot(noticesRef, snap => {
    notices = Array.isArray(snap.data()?.items) ? snap.data().items : [];
    paintNotices();
  });
}

function paintNotices() {
  const box = $("notice-list");
  if (!notices.length) {
    box.innerHTML = '<p class="small muted" style="margin:0">No notifications posted.</p>';
    return;
  }
  box.replaceChildren(...notices.slice().reverse().map(n => {
    const row = document.createElement("div");
    row.className = "notice-row";
    if (n.image) {
      const th = document.createElement("img");
      th.src = n.image; th.alt = ""; th.className = "notice-thumb";
      row.appendChild(th);
    }
    const span = document.createElement("span");
    span.style.flex = "1";
    span.textContent = n.text;
    const del = document.createElement("button");
    del.type = "button"; del.textContent = "\u00d7"; del.title = "Delete";
    del.onclick = async () => {
      await setDoc(noticesRef, { items: notices.filter(x => x.id !== n.id) }, { merge: true });
    };
    row.append(span, del);
    return row;
  }));
}

/* ---------- image: resized and cropped to 16:9 before it ever leaves ------ */

const IMG_W = 1200, IMG_H = 675;

function processImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      canvas.width = IMG_W; canvas.height = IMG_H;
      const ctx = canvas.getContext("2d");

      // centre-crop to 16:9, then scale — never squashed
      const scale = Math.max(IMG_W / img.width, IMG_H / img.height);
      const w = img.width * scale, h = img.height * scale;
      ctx.drawImage(img, (IMG_W - w) / 2, (IMG_H - h) / 2, w, h);

      // step the quality down until it comfortably fits a Firestore document
      let q = 0.82, out = canvas.toDataURL("image/jpeg", q);
      while (out.length > 140000 && q > 0.4) {
        q -= 0.1;
        out = canvas.toDataURL("image/jpeg", q);
      }
      resolve(out);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("not an image")); };
    img.src = url;
  });
}

$("notice-img").addEventListener("change", async e => {
  const file = e.target.files[0];
  const box = $("notice-preview");
  box.replaceChildren();
  pendingImage = null;
  if (!file) return;
  try {
    pendingImage = await processImage(file);
    const prev = document.createElement("img");
    prev.src = pendingImage; prev.alt = ""; prev.className = "notice-preview-img";
    const size = document.createElement("p");
    size.className = "small muted";
    size.style.margin = ".4rem 0 0";
    size.textContent = `Ready — ${IMG_W}\u00d7${IMG_H}, about ${Math.round(pendingImage.length / 1400)} KB.`;
    box.append(prev, size);
  } catch {
    toast("That file could not be read as an image.", true);
  }
});

$("add-notice").addEventListener("click", async () => {
  const text = $("notice-text").value.trim();
  if (!text) return toast("Write the notification text first.", true);

  const item = { id: "n" + Date.now(), text, url: $("notice-url").value.trim(), at: Date.now() };
  if (pendingImage) item.image = pendingImage;

  // keep the newest six, so the document can never grow without bound
  const next = [...notices, item].slice(-6);
  await setDoc(noticesRef, { items: next }, { merge: true });

  $("notice-text").value = ""; $("notice-url").value = "";
  $("notice-img").value = ""; $("notice-preview").replaceChildren();
  pendingImage = null;
  flashSite("Posted.");
});

/* ---------- programme date ----------------------------------------------- */

$("save-date").addEventListener("click", async () => {
  const v = $("event-date").value;
  if (!v) return toast("Pick a date and time first.", true);
  await setDoc(siteRef, {
    eventDate: new Date(v).toISOString(),
    eventLabel: $("event-label").value.trim()
  }, { merge: true });
  flashSite("Date saved. Study material hides 24 hours before it.");
});

/* ---------- live: manual switch, or automatic detection ------------------ */

$("live-toggle").addEventListener("change", async () => {
  await setDoc(siteRef, { liveNow: $("live-toggle").checked }, { merge: true });
  flashSite($("live-toggle").checked ? "Live banner is on." : "Live banner is off.");
});

$("auto-live").addEventListener("change", async () => {
  const on = $("auto-live").checked;
  if (on && !site.youtubeApiKey) {
    $("auto-live").checked = false;
    return toast("Add youtubeApiKey to config.js first — see the README.", true);
  }
  await setDoc(siteRef, { autoDetect: on }, { merge: true });
});

let pollTimer = null;

function setAutoPolling(on) {
  if (on && !pollTimer && site.youtubeApiKey) {
    checkLive();
    pollTimer = setInterval(checkLive, 60000);
  } else if (!on && pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
}

// Two cheap calls instead of one expensive one: search.list costs 100 quota
// units, while playlistItems.list + videos.list cost 1 each. At once a minute
// that is under 3,000 units a day against a 10,000 budget. Only this dashboard
// polls — the public pages read the result from Firestore for free.
async function checkLive() {
  const key = site.youtubeApiKey;
  const uploads = "UU" + site.youtubeChannelId.slice(2);
  try {
    const r1 = await fetch("https://www.googleapis.com/youtube/v3/playlistItems"
      + `?part=contentDetails&maxResults=5&playlistId=${uploads}&key=${key}`);
    if (!r1.ok) throw new Error("playlistItems " + r1.status);
    const ids = (await r1.json()).items.map(i => i.contentDetails.videoId).join(",");
    if (!ids) return;

    const r2 = await fetch("https://www.googleapis.com/youtube/v3/videos"
      + `?part=snippet&id=${ids}&key=${key}`);
    if (!r2.ok) throw new Error("videos " + r2.status);
    const live = (await r2.json()).items.some(v => v.snippet.liveBroadcastContent === "live");

    if (live !== $("live-toggle").checked) {
      await setDoc(siteRef, { liveNow: live }, { merge: true });
      flashSite(live ? "Live stream detected — banner on." : "Stream ended — banner off.");
    }
    $("auto-live-note").textContent = "Checked at " + new Date().toLocaleTimeString();
  } catch (e) {
    $("auto-live-note").textContent = "Automatic check failed (" + e.message + "). Use the manual switch.";
  }
}

function toast(msg, bad) {
  const el = document.createElement("div");
  el.className = "toast" + (bad ? " bad" : "");
  el.textContent = msg;
  $("toast-host").appendChild(el);
  setTimeout(() => el.remove(), 3800);
}
const flashSite = toast;

/* ---------- poster judging ----------------------------------------------- */

let entries = [];
let headers = [];

$("p-file").addEventListener("change", async e => {
  const file = e.target.files[0];
  if (!file) return;
  const rows = parseCSV(await file.text());
  e.target.value = "";
  if (rows.length < 2) return;

  headers = rows[0].map(h => h.trim());
  const body = rows.slice(1);

  const guess = (...words) =>
    headers.findIndex(h => words.some(w => h.toLowerCase().includes(w)));
  const nameCol = Math.max(0, guess("name"));
  const titleCol = Math.max(0, guess("title", "entry", "poster"));

  [["p-col-name", nameCol], ["p-col-title", titleCol]].forEach(([id, sel]) => {
    const el = $(id);
    el.replaceChildren(...headers.map((h, i) => new Option(h || `Column ${i + 1}`, i)));
    el.value = sel;
    el.onchange = () => rebuild(body);
  });

  $("p-mapping").classList.remove("hidden");
  $("p-hint").classList.add("hidden");
  rebuild(body);
});

function rebuild(body) {
  const n = Number($("p-col-name").value);
  const t = Number($("p-col-title").value);
  const previous = new Map(entries.map(e => [e.name + "|" + e.title, e.marks]));

  entries = body.map(r => {
    const name = (r[n] || "").trim() || "—";
    const title = (r[t] || "").trim() || "—";
    return { name, title, marks: previous.get(name + "|" + title) ?? "" };
  });

  $("p-rows").replaceChildren(...entries.map((row, i) => {
    const tr = document.createElement("tr");
    [row.name, row.title].forEach(v => {
      const td = document.createElement("td");
      td.textContent = v;
      tr.appendChild(td);
    });
    const td = document.createElement("td");
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.max = "100";
    input.value = row.marks;
    input.addEventListener("input", () => { entries[i].marks = input.value; });
    td.appendChild(input);
    tr.appendChild(td);
    return tr;
  }));

  $("p-table-wrap").classList.remove("hidden");
  $("p-actions").classList.remove("hidden");
}

$("p-publish").addEventListener("click", async () => {
  const rows = entries
    .filter(e => e.marks !== "")
    .map(e => ({ name: e.name, title: e.title, marks: Number(e.marks) }));

  if (!rows.length) return toast("Give at least one entry a mark before publishing.", true);
  await setDoc(resultsRef, { published: true, rows, updatedAt: serverTimestamp() });
  flash(`Published ${rows.length} results to the public page.`);
});

$("p-unpublish").addEventListener("click", async () => {
  await setDoc(resultsRef, { published: false }, { merge: true });
  flash("Results hidden from the public page.");
});

const flash = toast;

function watchResults() {
  onSnapshot(resultsRef, snap => {
    const d = snap.data();
    if (d?.published && d.rows?.length && !entries.length) {
      entries = d.rows.map(r => ({ ...r, marks: String(r.marks) }));
    }
  });
}


/* ---------- tabs ---------------------------------------------------------- */

const TABS = ["quiz", "page", "judge"];
function showTab(name) {
  TABS.forEach(n => {
    $("tab-" + n).classList.toggle("hidden", n !== name);
    $("tab-btn-" + n).setAttribute("aria-selected", String(n === name));
  });
  localStorage.setItem("milad.tab", name);
}
TABS.forEach(n => $("tab-btn-" + n).addEventListener("click", () => showTab(n)));
showTab(localStorage.getItem("milad.tab") || "quiz");

/* ---------- keyboard: the host shouldn't have to aim at a button ---------- */

document.addEventListener("keydown", e => {
  if (/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName)) return;
  if ($("dash").classList.contains("hidden")) return;
  if ($("tab-quiz").classList.contains("hidden")) return;

  if (e.key === " " || e.key === "ArrowRight" || e.key === "Enter") {
    if (!$("btn-next").disabled) { e.preventDefault(); $("btn-next").click(); }
  }
});

/* ---------- guard the two irreversible buttons --------------------------- */

function confirmFirst(id, message) {
  const btn = $(id);
  let armed = false, timer = null;
  const label = btn.textContent;
  btn.addEventListener("click", e => {
    if (armed) { armed = false; clearTimeout(timer); btn.textContent = label; return; }
    e.stopImmediatePropagation();
    armed = true;
    btn.textContent = message;
    timer = setTimeout(() => { armed = false; btn.textContent = label; }, 4000);
  }, true);
}
confirmFirst("btn-end", "Tap again to end");
confirmFirst("btn-reset", "Tap again to clear");
