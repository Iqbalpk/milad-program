import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getFirestore, doc, onSnapshot, setDoc }
  from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import { firebaseConfig, site, text as T } from "./config.js";

const fill = (s, vals) => s.replace(/\{(\w+)\}/g, (_, k) => vals[k]);

const db = getFirestore(initializeApp(firebaseConfig));
const $ = id => document.getElementById(id);

/* ---------- static content from config ---------------------------------- */

document.title = site.eventName;
$("foot-org").textContent = site.organisation;
$("hero-title").textContent = site.eventName;
$("chip-date").textContent = site.eventDate;
$("secs-label").textContent = site.questionSeconds;
$("pdf-link").href = site.studyPdfUrl;
$("poster-link").href = site.posterFormUrl;

let wasLive = false;
const channel = site.youtubeChannelId;

// A channel's uploads playlist always mirrors its ID with UU in place of UC,
// so the videos section works without touching the YouTube Data API.
const uploadsPlaylist = "UU" + channel.slice(2);

$("channel-link").href = `https://www.youtube.com/channel/${channel}`;

// Recent uploads: always on, loaded once, lazily.
$("videos-player").src = `https://www.youtube.com/embed/videoseries?list=${uploadsPlaylist}`;

// The live player is a separate iframe. It gets a src only while the channel
// is live, and the src is cleared afterwards so nothing keeps buffering.
function setPlayer(live) {
  const el = $("player");
  const want = live ? `https://www.youtube.com/embed/live_stream?channel=${channel}` : "";
  if (el.getAttribute("src") !== want) el.setAttribute("src", want);
}

/* ---------- site state: live flag, announcement, results ----------------- */

onSnapshot(doc(db, "live", "site"), snap => {
  const d = snap.data() || {};
  const live = !!d.liveNow;

  // The whole stream block — ribbon, nav link, section, floating alert — is
  // absent unless the channel is actually live. Nothing teases it beforehand.
  $("ribbon").classList.toggle("hidden", !live);
  $("nav-stream").classList.toggle("hidden", !live);
  $("stream").classList.toggle("hidden", !live);
  setPlayer(live);

  if (live && !wasLive && sessionStorage.getItem("milad.popDismissed") !== "1") {
    $("live-pop").classList.remove("hidden");
  }
  if (!live) $("live-pop").classList.add("hidden");
  wasLive = live;

  applyEventDate(d.eventDate, d.eventLabel);
}, err => console.error("site listener:", err));

function renderNotices(notices) {
  const list = $("notif-list");
  const seen = new Set(JSON.parse(localStorage.getItem("milad.seen") || "[]"));
  const unread = notices.filter(n => !seen.has(n.id)).length;

  const badge = $("notif-count");
  badge.textContent = unread;
  badge.classList.toggle("hidden", unread === 0);

  if (!notices.length) {
    list.innerHTML = '<p class="notif-empty">' + T.noNotices + '</p>';
    return;
  }
  list.replaceChildren(...notices.slice().reverse().map(n => {
    const wrap = document.createElement("div");
    wrap.className = "notif-item";
    if (n.image && /^data:image\/(jpeg|png|webp);base64,/.test(n.image)) {
      const img = document.createElement("img");
      img.className = "notif-img";
      img.src = n.image;          // validated above; only ever an inline image
      img.alt = "";
      img.loading = "lazy";
      wrap.appendChild(img);
    }
    const p = document.createElement("p");
    p.textContent = n.text;
    wrap.appendChild(p);
    if (n.url) {
      const a = document.createElement("a");
      a.href = n.url; a.target = "_blank"; a.rel = "noopener";
      a.className = "small"; a.textContent = T.moreDetails;
      wrap.appendChild(a);
    }
    if (n.at) {
      const when = document.createElement("div");
      when.className = "when";
      when.textContent = new Date(n.at).toLocaleDateString("ml-IN", { day: "numeric", month: "long" });
      wrap.appendChild(when);
    }
    return wrap;
  }));
  currentNoticeIds = notices.map(n => n.id);
}

let currentNoticeIds = [];

/* ---------- event date and the study-material window --------------------- */

function applyEventDate(iso, label) {
  if (label) $("chip-date").textContent = label;
  if (!iso) return;

  const start = new Date(iso);
  if (isNaN(start)) return;

  if (!label) {
    $("chip-date").textContent = start.toLocaleString("ml-IN", {
      day: "numeric", month: "long", year: "numeric", hour: "numeric", minute: "2-digit"
    });
  }

  // Study material comes down 24 hours before the programme starts.
  const cutoff = start.getTime() - 24 * 60 * 60 * 1000;
  $("study-card").classList.toggle("hidden", Date.now() >= cutoff);
}

/* ---------- notifications ------------------------------------------------ */

onSnapshot(doc(db, "live", "notices"), snap => {
  const d = snap.data() || {};
  renderNotices(Array.isArray(d.items) ? d.items : []);
}, err => console.error("notices listener:", err));

$("bell").addEventListener("click", () => {
  const panel = $("notif-panel");
  const open = panel.classList.toggle("hidden");
  $("bell").setAttribute("aria-expanded", String(!open));
  if (!open) {                                   // opening marks them read
    localStorage.setItem("milad.seen", JSON.stringify(currentNoticeIds));
    $("notif-count").classList.add("hidden");
  }
});
document.addEventListener("click", e => {
  if (!e.target.closest(".notif-wrap")) {
    $("notif-panel").classList.add("hidden");
    $("bell").setAttribute("aria-expanded", "false");
  }
});

$("live-pop-close").addEventListener("click", () => {
  $("live-pop").classList.add("hidden");
  sessionStorage.setItem("milad.popDismissed", "1");
});
$("live-pop-go").addEventListener("click", () => $("live-pop").classList.add("hidden"));

// --- scroll reveal --------------------------------------------------------
const io = new IntersectionObserver(entries => {
  entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } });
}, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
document.querySelectorAll(".reveal").forEach(el => io.observe(el));

onSnapshot(doc(db, "results", "quiz"), snap => {
  const d = snap.data() || {};
  const rows = (d.published && Array.isArray(d.rows)) ? d.rows : [];
  $("quiz-results").classList.toggle("hidden", rows.length === 0);
  $("quiz-rows").replaceChildren(...rows.map((r, i) => {
    const place = r.place || i + 1;
    const tr = document.createElement("tr");
    if (place <= 3) tr.className = "rank-" + place;
    [String(place), r.name || "\u2014", r.house || "\u2014"].forEach((v, n) => {
      const td = document.createElement("td");
      if (n === 0) td.className = "num";
      td.textContent = v;
      tr.appendChild(td);
    });
    return tr;
  }));
}, err => console.error("quiz results listener:", err));

onSnapshot(doc(db, "results", "posters"), snap => {
  const d = snap.data() || {};
  const rows = (d.published && Array.isArray(d.rows)) ? d.rows : [];
  $("results-pending").classList.toggle("hidden", rows.length > 0);
  $("results-table").classList.toggle("hidden", rows.length === 0);

  $("results-rows").replaceChildren(...rows
    .slice()
    .sort((a, b) => (b.marks || 0) - (a.marks || 0))
    .map((r, i) => {
      const tr = document.createElement("tr");
      if (i === 0) tr.className = "rank-1";
      const cells = [String(i + 1), r.name || "—", r.title || "—", String(r.marks ?? "—")];
      cells.forEach((text, ci) => {
        const td = document.createElement("td");
        if (ci === 0 || ci === 3) td.className = "num";
        td.textContent = text;
        tr.appendChild(td);
      });
      return tr;
    }));
}, err => console.error("results listener:", err));

/* ---------- who is playing ------------------------------------------------
   A name and phone kept in this browser, plus a random id. No login: asking
   parents to create an account would cost you most of your entries. The phone
   number is for contacting winners and is never shown publicly.
   ------------------------------------------------------------------------- */

let me = null;
try { me = JSON.parse(localStorage.getItem("milad.me") || "null"); } catch { me = null; }

// Indian mobile: ten digits starting 6-9. Country code and spacing are
// stripped so 9876543210, +91 98765 43210 and 09876543210 are one number,
// not three — otherwise one person could rejoin simply by typing it differently.
function normalisePhone(raw) {
  let d = (raw || "").replace(/\D/g, "");
  if (d.length === 12 && d.startsWith("91")) d = d.slice(2);
  if (d.length === 11 && d.startsWith("0"))  d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

function paintJoin() {
  const joined = !!(me && me.phone);
  $("join-card").classList.toggle("hidden", joined);
  $("joined-note").classList.toggle("hidden", !joined);
  if (joined) $("joined-note").textContent = `\u2713 ${me.name}, ${me.house || ""} \u2014 ${T.joinedAs}`;
}
paintJoin();

$("join-btn").addEventListener("click", () => {
  const name = $("join-name").value.trim();
  const house = $("join-house").value.trim();
  const phone = normalisePhone($("join-phone").value);
  const err = $("join-error");
  err.classList.add("hidden");

  if (name.length < 2)  { err.textContent = T.joinNeedName;  return err.classList.remove("hidden"); }
  if (house.length < 2) { err.textContent = T.joinNeedHouse; return err.classList.remove("hidden"); }
  if (!phone)           { err.textContent = T.joinNeedPhone; return err.classList.remove("hidden"); }

  me = { name, house, phone };
  localStorage.setItem("milad.me", JSON.stringify(me));
  paintJoin();
});

/* ---------- quiz --------------------------------------------------------- */

let current = null;      // the live question document
let picked = null;       // this browser's choice for the current question
let ticker = null;

function remainingMs() {
  if (!current || !current.startedAt) return 0;
  const started = current.startedAt.toMillis();
  const total = current.durationMs || site.questionSeconds * 1000;
  // Clamp both ends: a device clock running fast or slow shouldn't produce a
  // negative timer or one longer than the question is meant to last.
  return Math.max(0, Math.min(total, total - (Date.now() - started)));
}

function paintTimer() {
  if (!current) return;
  const total = current.durationMs || site.questionSeconds * 1000;
  const left = remainingMs();
  const secs = Math.ceil(left / 1000);

  $("count").textContent = secs;
  $("timer-word").textContent = T.secondsLeft;
  $("bar-fill").style.width = (left / total * 100) + "%";
  $("timer-track").classList.toggle("low", secs <= 10);

  if (left <= 0) {
    lockOptions();
    $("timer-word").textContent = T.timesUp;
  }
}

function lockOptions() {
  document.querySelectorAll("#options .option").forEach(b => { b.disabled = true; });
}

function renderQuestion(d) {
  $("stage-idle").classList.add("hidden");
  $("stage-live").classList.remove("hidden");

  $("q-index").textContent = d.total
    ? `${T.questionLabel} ${d.index} / ${d.total}`
    : `${T.questionLabel} ${d.index}`;
  if (d.durationMs) $("secs-label").textContent = Math.round(d.durationMs / 1000);
  $("q-text").textContent = d.text || "";

  const keys = ["A", "B", "C", "D", "E", "F"];
  $("options").replaceChildren(...(d.options || []).map((opt, i) => {
    const btn = document.createElement("button");
    btn.className = "option";
    btn.type = "button";
    btn.setAttribute("aria-pressed", "false");
    btn.dataset.i = i;

    const key = document.createElement("span");
    key.className = "key";
    key.textContent = keys[i] || i + 1;
    const label = document.createElement("span");
    label.textContent = opt;

    btn.append(key, label);
    btn.addEventListener("click", () => choose(i));
    return btn;
  }));
}

function choose(i) {
  // One answer per question, and it's final. Once a choice is made every
  // button locks, so nobody can go back and switch to a different option.
  if (picked !== null || remainingMs() <= 0) return;
  if (!me) {                                  // must register before answering
    $("join-card").scrollIntoView({ behavior: "smooth", block: "center" });
    $("join-name").focus();
    return;
  }
  picked = i;
  document.querySelectorAll("#options .option").forEach(b => {
    b.setAttribute("aria-pressed", String(Number(b.dataset.i) === i));
    b.disabled = true;
  });
  $("picked-note").textContent = T.answerRecorded;
  $("picked-note").classList.remove("hidden");

  // One document per person per question. The id is fixed, and the rules only
  // permit create — so an answer can never be changed once sent.
  if (me && current && current.questionId) {
    // The document id is the phone number plus the question id. A second
    // person on the same number cannot create it twice, and the rules only
    // allow create — so one number means one answer, permanently.
    setDoc(doc(db, "answers", `${me.phone}_${current.questionId}`), {
      phone: me.phone, name: me.name, house: me.house || "",
      qid: current.questionId, choice: i, at: Date.now()
    }).catch(e => {
      console.error("answer not saved:", e);
      if (String(e.code) === "permission-denied") {
        $("picked-note").textContent = T.alreadyAnswered;
      }
    });
  }
}

function goIdle(message) {
  $("stage-live").classList.add("hidden");
  $("stage-idle").classList.remove("hidden");
  $("idle-text").textContent = message;
  clearInterval(ticker);
  ticker = null;
}

onSnapshot(doc(db, "live", "current"), snap => {
  const d = snap.data() || { state: "idle" };
  const state = d.state || "idle";

  $("chip-quiz").textContent =
    state === "running" ? T.quizRunning
    : state === "ended" ? T.quizFinished
    : T.quizNotStarted;

  if (state === "idle") { current = null; return goIdle(T.waitingForHost); }
  if (state === "ended") {
    current = null;
    goIdle(T.quizFinished);
    return;
  }

  const isNew = !current || current.questionId !== d.questionId || current.index !== d.index;
  current = d;

  if (isNew) {
    picked = null;
    $("picked-note").classList.add("hidden");
    renderQuestion(d);
    clearInterval(ticker);
    ticker = setInterval(paintTimer, 1000);
  }

  paintTimer();
}, err => {
  console.error("quiz listener:", err);
  goIdle(T.connectionLost);
});
