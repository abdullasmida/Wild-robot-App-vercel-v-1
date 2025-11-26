// ================= GUIDE TEXT + IMAGES =================

const GUIDE_IMAGES = {
  home: "./assets/logos/robot-home.png",
  eval: "./logos/point.png",
  players: "./assets/logos/robot-players.png",
  reports: "./assets/logos/robot-reports.png",
  sessions: "./assets/logos/robot-sessions.png",
};

const GUIDE = {
  home: "Welcome! Choose your branch to start evaluating.",
  sessions: "Select a session slot or add your own.",
  roster_0: "This session is ready. Add players.",
  roster_1: "Open a player to start evaluation.",
  roster_2: "Tap a player, then rate skills.",
  eval: "Tap stars to rate skills. ≥70% shows Promotion.",
  report: "Share or export a clean player report.",
  summary: "Quick session summary: best & lowest.",
};

function setGuide(view, text) {
  const img = document.getElementById("guideImg");
  const bubble = document.getElementById("guideBubble");
  img.src = GUIDE_IMAGES[view] || GUIDE_IMAGES.home;
  bubble.textContent = text || GUIDE[view] || "Hi!";
}

function showGuide(key) {
  const g = document.getElementById("guide");
  const b = document.getElementById("guideBubble");
  b.textContent = GUIDE[key] || "Hi!";
  g.style.display = "flex";
  clearTimeout(showGuide._t);
  showGuide._t = setTimeout(() => (g.style.display = "none"), 4000);
}

// ================= HELPERS =================

const avg = (arr) =>
  (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const percentFromStars = (st) => st * 20;

function levelFromPercentGym(pct) {
  if (pct >= 90) return "Sapphire";
  if (pct >= 70) return "Gold";
  if (pct >= 50) return "Silver";
  return "Bronze";
}

function getNextLevel(currentLevel) {
  const levels = ["Recreational", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Sapphire"];
  // Normalize current level (handle case sensitivity or numbers if needed)
  // Assuming strict match for now based on Supabase data
  const idx = levels.findIndex(l => l.toLowerCase() === (currentLevel || "").toLowerCase());

  if (idx !== -1 && idx < levels.length - 1) {
    return levels[idx + 1];
  }
  return null; // Max level or unknown
}

function starSVG(fill, cls = "bg", clip = 0) {
  const style =
    cls === "fg"
      ? `style="clip-path: inset(0 ${100 - clip}% 0 0); fill:${fill}"`
      : `style="fill:${fill}"`;
  return `<svg viewBox='0 0 24 24' class='${cls}' ${style}><path d='M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z'/></svg>`;
}

function stars(value) {
  let h = "";
  for (let i = 1; i <= 5; i++) {
    let clip = 0;
    if (i <= value) clip = 100;
    else if (i - 1 < value) clip = (value - Math.floor(value)) * 100;
    h += `<span class='star'>${starSVG("#d1d5db", "bg")}${starSVG(
      "#facc15",
      "fg",
      clip
    )}</span>`;
  }
  return h;
}

// نص بسيط للنجوم في الـ PDF (مش SVG)
function starText(value) {
  const full = Math.round(value);
  return "★★★★★".slice(0, full) + "☆☆☆☆☆".slice(0, 5 - full);
}

function buildDeepLink(id) {
  const url = new URL(location.href.split("#")[0]);
  url.hash = "reportId=" + id;
  return url.toString();
}

// لون نقطة Skill Path حسب التقييم
function skillPathColorFromRating(rating) {
  if (rating >= 4) return "skills-path-dot--green";
  if (rating >= 2) return "skills-path-dot--yellow";
  if (rating > 0) return "skills-path-dot--red";
  return "skills-path-dot--grey";
}

// ============= APPARATUS SKILL PATH (لكل جهاز) =============

function buildApparatusPathHTML(device) {
  if (!device.skills || !device.skills.length) return "";

  const avgDev = avg(device.skills.map((s) => s.rating));
  const fillPercent = percentFromStars(avgDev);
  const step = 100 / (device.skills.length + 1);

  const dots = device.skills
    .map((s, index) => {
      const rating = s.rating || 0;
      const colorClass = skillPathColorFromRating(rating);
      const left = step * (index + 1);
      const titleText = `${s.name} — ${rating.toFixed
        ? rating.toFixed(1)
        : rating}/5`;
      return `
        <div
          class="skill-path-dot ${colorClass}"
          style="left:${left}%;"
          title="${titleText}">
        </div>
      `;
    })
    .join("");

  return `
    <div class="skill-path-bar">
      <div class="skill-path-bar__fill" style="width:${fillPercent}%;"></div>
      ${dots}
    </div>
    <div class="muted small">
      ${device.name} path: Green = ready, Yellow = focus, Red = needs spot, Grey = not started.
    </div>
  `;
}

// ================= DATA (LOCAL STORAGE) =================

const WR_REPORTS_KEY = "wr_reports_v5";

const getReports = () => {
  try {
    return JSON.parse(localStorage.getItem(WR_REPORTS_KEY)) || [];
  } catch {
    return [];
  }
};

const setReports = (arr) =>
  localStorage.setItem(WR_REPORTS_KEY, JSON.stringify(arr));

const makeId = () =>
  "r_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

// قاعدة بيانات بسيطة في الذاكرة
const DB = {
  branches: [
    {
      id: "VISS",
      name: "VISS (Victoria International School)",
      city: "Sharjah",
      sessions: [
        { slot: "5-6", players: [] },
        { slot: "6-7", players: [] },
        { slot: "7-8", players: [] },
      ],
    },
    {
      id: "Ajman_Academy",
      name: "Ajman Academy",
      city: "Ajman",
      sessions: [
        { slot: "5-6", players: [] },
        { slot: "6-7", players: [] },
        { slot: "7-8", players: [] },
      ],
    },
  ],
};

// Load players from Supabase
if (typeof loadPlayersFromSupabase === "function") {
  loadPlayersFromSupabase(DB, () => {
    // Re-render if we are on a view that shows players
    if (S.view === "sessions") renderSessions();
    if (S.view === "roster") renderRoster();
  });
}

// ================= STATE =================

const S = {
  view: "home",
  branchIndex: 0,
  sessionIndex: 0,
  playerIndex: 0,
  openDevices: new Set([0]),
  currentReportId: null,
};

// ================= NAVIGATION BASE =================

setGuide("home", "Pick your branch to start 👋");

const headerTitle = document.getElementById("headerTitle");
const backBtn = document.getElementById("backBtn");
const shareBtn = document.getElementById("shareBtn");
const tabs = document.querySelectorAll(".tab");

// تفعيل / تعطيل السكاشن
function showView(id) {
  document
    .querySelectorAll("section.view")
    .forEach((s) => s.classList.remove("active"));
  const el = document.getElementById("view-" + id);
  if (el) el.classList.add("active");
}

// الدالة الرئيسية للتنقل
function go(view) {
  S.view = view;
  showView(view);

  const titles = {
    home: "Branches",
    sessions: "Sessions",
    roster: "Roster",
    eval: "Evaluation",
    "report-player": "Player Report",
    "session-summary": "Session Summary",
  };
  headerTitle.textContent = titles[view] || "Wild Robot";

  backBtn.style.visibility = view === "home" ? "hidden" : "visible";
  shareBtn.style.visibility =
    view === "eval" || view === "report-player" ? "visible" : "hidden";

  // تفعيل التاب في الفوتر
  tabs.forEach((t) => t.classList.remove("active"));
  const navMap = {
    home: "home",
    sessions: "sessions",
    "session-summary": "session-summary",
    "report-player": "report-player",
  };
  const sel = document.querySelector(
    `.tab[data-nav="${navMap[view] || ""}"]`
  );
  if (sel) sel.classList.add("active");

  // الجايد
  if (view === "home") showGuide("home");
  if (view === "sessions") showGuide("sessions");
  if (view === "roster") showGuide("roster_" + S.sessionIndex);
  if (view === "eval") showGuide("eval");
  if (view === "report-player") showGuide("report");
  if (view === "session-summary") showGuide("summary");

  const imgViewMap = {
    home: "home",
    sessions: "sessions",
    roster: "players",
    eval: "eval",
    "report-player": "reports",
    "session-summary": "reports",
  };
  setGuide(imgViewMap[view] || "home");

  // رندرات
  if (view === "home") renderHome();
  else if (view === "sessions") renderSessions();
  else if (view === "roster") renderRoster();
  else if (view === "eval") renderEval();
  else if (view === "session-summary") renderSessionSummary();
  else if (view === "report-player") renderReportSection();

  // اللوجيك بتاع الزرار Share في الهيدر
  shareBtn.onclick = null;
  if (view === "report-player") {
    shareBtn.onclick = () => {
      const id = ensureCurrentReportSnapshotAndGetId();
      const url = buildDeepLink(id);
      openShare(url, id);
    };
  } else if (view === "eval") {
    shareBtn.onclick = () => {
      renderReportSectionFromCurrentPlayer();
      go("report-player");
      setTimeout(() => {
        const id = ensureCurrentReportSnapshotAndGetId();
        const url = buildDeepLink(id);
        openShare(url, id);
      }, 0);
    };
  }
}

// أزرار الباك
backBtn.onclick = () => {
  if (S.view === "sessions") go("home");
  else if (S.view === "roster") go("sessions");
  else if (S.view === "eval") go("roster");
  else if (S.view === "report-player") go("eval");
  else if (S.view === "session-summary") go("sessions");
  else go("home");
};

// أزرار التابات (الفوتر)
tabs.forEach(
  (t) =>
  (t.onclick = () => {
    const target = t.getAttribute("data-nav");
    go(target);
  })
);

// ================= RENDER: HOME =================

function renderHome() {
  const list = document.getElementById("branchesList");
  list.innerHTML = DB.branches
    .map(
      (b, i) => `
    <div class="row">
      <div class="left">
        <div class="avatar">🏢</div>
        <div>
          <div class="strong">${b.name}</div>
          <div class="muted small">${b.city || "—"}</div>
        </div>
      </div>
      <button class="btn primary small" data-branch-index="${i}" type="button">Open</button>
    </div>
  `
    )
    .join("");

  // ربط الأزرار بعد ما تتحط في الـ DOM
  list.querySelectorAll("button[data-branch-index]").forEach((btn) => {
    btn.onclick = () => {
      S.branchIndex = Number(btn.dataset.branchIndex);
      S.sessionIndex = 0;
      go("sessions");
    };
  });
}

// إضافة برانش جديد
document.getElementById("addBranchBtn").onclick = () => {
  const name = prompt("Branch name:", "New Branch");
  if (!name) return;
  const city = prompt("City:", "");
  DB.branches.push({
    id:
      name.toLowerCase().replace(/\s+/g, "-") +
      "-" +
      Math.random().toString(36).slice(2, 5),
    name: name.trim(),
    city: (city || "").trim(),
    sessions: [],
  });
  renderHome();
};

// ================= RENDER: SESSIONS =================

function renderSessions() {
  const b = DB.branches[S.branchIndex];
  const list = document.getElementById("sessionsList");
  document.getElementById(
    "sessionsBranchLabel"
  ).textContent = `Current branch: ${b.name} — ${b.city || "—"}`;

  if (!b.sessions.length) {
    list.innerHTML =
      '<div class="muted small" style="text-align:center;">No sessions yet. Add one.</div>';
    return;
  }

  list.innerHTML = b.sessions
    .map(
      (s, i) => `
    <div class="row">
      <div class="left">
        <div class="avatar">🕒</div>
        <div>
          <div class="strong">${s.slot}</div>
          <div class="muted small">${s.players.length} players</div>
        </div>
      </div>
      <div class="left">
        <button class="btn primary small" data-session-index="${i}" type="button">Open</button>
        <button class="btn small ghost" data-delete-session="${i}" type="button">Delete</button>
      </div>
    </div>
  `
    )
    .join("");

  list.querySelectorAll("button[data-session-index]").forEach((btn) => {
    btn.onclick = () => {
      S.sessionIndex = Number(btn.dataset.sessionIndex);
      go("roster");
    };
  });

  list.querySelectorAll("button[data-delete-session]").forEach((btn) => {
    btn.onclick = () => {
      const idx = Number(btn.dataset.deleteSession);
      if (confirm("Delete this session?")) {
        b.sessions.splice(idx, 1);
        renderSessions();
      }
    };
  });
}

// إضافة سيشن
document.getElementById("addSessionBtn").onclick = () => {
  const slot = prompt("Session slot (e.g. 5-6):", "");
  if (!slot) return;
  const b = DB.branches[S.branchIndex];
  b.sessions.push({
    slot: slot.trim(),
    players: [],
  });
  renderSessions();
};

// ================= RENDER: ROSTER =================

function renderRoster() {
  const b = DB.branches[S.branchIndex];
  if (!b.sessions.length) {
    document.getElementById("rosterTitle").textContent = "Roster";
    document.getElementById("rosterBranchLabel").textContent =
      "No sessions yet. Add a session first.";
    document.getElementById("rosterList").innerHTML = "";
    return;
  }

  const sess = b.sessions[S.sessionIndex];
  document.getElementById(
    "rosterBranchLabel"
  ).textContent = `Branch: ${b.name} — ${b.city || "—"}`;
  document.getElementById(
    "rosterTitle"
  ).textContent = `Roster — ${sess.slot}`;

  const list = document.getElementById("rosterList");
  list.innerHTML = "";

  if (!sess.players.length) {
    const empty = document.createElement("div");
    empty.className = "muted small";
    empty.style.textAlign = "center";
    empty.textContent = "No players yet. Add one.";
    list.appendChild(empty);
    return;
  }

  const reports = getReports();

  sess.players.forEach((p, pi) => {
    const appAvg = p.devices.map((d) => avg(d.skills.map((s) => s.rating)));
    const overall = appAvg.length ? avg(appAvg) : 0;
    const pct = percentFromStars(overall);

    const rec = reports.find(
      (r) =>
        r.playerId === p.id &&
        r.sessionSlot === sess.slot &&
        r.branchId === b.id
    );
    const sentLabel =
      rec && rec.sent ? '<div class="pill pill-sent">Sent ✔</div>' : "";

    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="left">
        <div class="avatar">👟</div>
        <div>
          <div class="strong">${p.name}</div>
          <div class="muted small">
            ${p.levelCode} · Gymnastics · Age ${p.age}
          </div>
          ${sentLabel}
        </div>
      </div>
      <div style="text-align:left">
        <div class="stars">${stars(overall)}</div>
        <div class="muted small">${pct.toFixed(0)}%</div>
        <div class="left" style="gap:6px; margin-top:6px;">
          <button class="btn small primary" data-open-player="${pi}" type="button">Open</button>
          <button class="btn small ghost" data-remove-player="${pi}" type="button">Delete</button>
        </div>
      </div>
    `;
    list.appendChild(row);
  });

  list.querySelectorAll("button[data-open-player]").forEach((btn) => {
    btn.onclick = () => {
      S.playerIndex = Number(btn.dataset.openPlayer);
      go("eval");
    };
  });

  list.querySelectorAll("button[data-remove-player]").forEach((btn) => {
    btn.onclick = () => {
      const pi = Number(btn.dataset.removePlayer);
      if (confirm("Delete this player?")) {
        sess.players.splice(pi, 1);
        renderRoster();
      }
    };
  });
}

// ================= ADD PLAYER OVERLAY =================

const playerOverlay = document.getElementById("playerOverlay");
const playerClose = document.getElementById("playerClose");
const playerForm = document.getElementById("playerForm");

document.getElementById("addPlayerBtn").onclick = () => {
  playerOverlay.classList.add("active");
};

playerClose.onclick = () => {
  playerOverlay.classList.remove("active");
};

playerOverlay.addEventListener("click", (e) => {
  if (e.target === playerOverlay) playerOverlay.classList.remove("active");
});

playerForm.onsubmit = (e) => {
  e.preventDefault();
  const name = document.getElementById("playerNameInput").value.trim();
  const age = parseInt(document.getElementById("playerAgeInput").value, 10);
  const levelCode = document.getElementById("playerLevelInput").value;
  if (!name || !age || !levelCode) return;

  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];

  const zeroSkills = () =>
    ["Skill A", "Skill B", "Skill C"].map((nm) => ({
      name: nm,
      rating: 0,
      inPath: false,
      videoUrl: "",
    }));

  const player = {
    id: "p" + Math.random().toString(36).slice(2, 8),
    name,
    age,
    levelCode,
    sport: "Gymnastics",
    devices: [
      { name: "Floor", skills: zeroSkills() },
      { name: "Bars", skills: zeroSkills() },
      { name: "Beam", skills: zeroSkills() },
      { name: "Vault", skills: zeroSkills() },
    ],
    notes: "",
  };

  sess.players.push(player);

  playerForm.reset();
  document.getElementById("playerSportInput").value = "Gymnastics";
  playerOverlay.classList.remove("active");
  renderRoster();
};

// ================= SKILL VIDEO OVERLAY =================

const videoOverlay = document.getElementById("videoOverlay");
const videoClose = document.getElementById("videoClose");
const videoSkillLabel = document.getElementById("videoSkillLabel");
const videoUrlInput = document.getElementById("videoUrlInput");
const videoSaveBtn = document.getElementById("videoSaveBtn");

let currentVideoSkill = null;

function openVideoOverlay(di, si, skillName) {
  currentVideoSkill = { di, si };
  videoSkillLabel.textContent = skillName;
  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];
  if (sess && sess.players && sess.players.length) {
    const p = sess.players[S.playerIndex];
    const skill = p.devices[di]?.skills[si];
    videoUrlInput.value = (skill && skill.videoUrl) || "";
  } else {
    videoUrlInput.value = "";
  }
  videoOverlay.classList.add("active");
}

videoClose.onclick = () => {
  videoOverlay.classList.remove("active");
  currentVideoSkill = null;
};

videoOverlay.addEventListener("click", (e) => {
  if (e.target === videoOverlay) {
    videoOverlay.classList.remove("active");
    currentVideoSkill = null;
  }
});

videoSaveBtn.onclick = () => {
  if (!currentVideoSkill) {
    videoOverlay.classList.remove("active");
    return;
  }
  const url = videoUrlInput.value.trim();
  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];
  if (!sess || !sess.players.length) {
    videoOverlay.classList.remove("active");
    return;
  }
  const p = sess.players[S.playerIndex];
  const { di, si } = currentVideoSkill;
  if (!p.devices[di] || !p.devices[di].skills[si]) {
    videoOverlay.classList.remove("active");
    return;
  }
  p.devices[di].skills[si].videoUrl = url;
  videoOverlay.classList.remove("active");
  currentVideoSkill = null;
  renderEval();
};

// ================= EVALUATION VIEW =================

function renderSkillsPath(p) {
  const container = document.getElementById("skillsPathDots");
  if (!container) return;

  const pathSkills = [];
  p.devices.forEach((d, di) => {
    d.skills.forEach((s, si) => {
      if (s.inPath) pathSkills.push({ skill: s, di, si });
    });
  });

  container.innerHTML = "";

  if (!pathSkills.length) {
    const msg = document.createElement("div");
    msg.className = "muted small";
    msg.style.textAlign = "center";
    msg.style.width = "100%";
    msg.textContent = "No skills selected for path yet.";
    container.appendChild(msg);
    return;
  }

  pathSkills.forEach((entry, index) => {
    const { skill } = entry;
    const rating = skill.rating || 0;
    const dot = document.createElement("div");
    const colorClass = skillPathColorFromRating(rating);
    dot.className = `skills-path-dot ${colorClass}`;
    dot.textContent = index + 1;
    container.appendChild(dot);
  });
}

function renderEval() {
  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];
  const p = sess.players[S.playerIndex];

  document.getElementById("playerName").textContent = p.name;
  document.getElementById(
    "playerMetaSmall"
  ).textContent = `Gymnastics · Level ${p.levelCode} · Age ${p.age}`;

  const appAvg = p.devices.map((d) => avg(d.skills.map((s) => s.rating)));
  const overall = appAvg.length ? avg(appAvg) : 0;
  document.getElementById("overallStars").innerHTML = stars(overall);
  document.getElementById(
    "overallLabel"
  ).textContent = `${overall.toFixed(2)}/5.00`;

  const root = document.getElementById("devicesRoot");
  root.innerHTML = "";

  p.devices.forEach((d, di) => {
    const avgDev = avg(d.skills.map((s) => s.rating));

    const skillsHTML = d.skills
      .map((s, si) => {
        const videoUrl = s.videoUrl || "";
        const hasVideo = !!videoUrl;
        const videoClass = hasVideo ? "has-video" : "";
        const videoIcon = hasVideo ? "▶" : "📌";
        const inPath = !!s.inPath;
        const pathClass = inPath ? "skill-path-toggle--active" : "";

        return `
          <div class="skill-row">
            <div class="skill-main">
              <div class="skill-name">${s.name}</div>
              <button
                class="skill-video-btn ${videoClass}"
                data-di="${di}"
                data-si="${si}"
                type="button"
                title="${hasVideo ? "Open video" : "Attach video"}"
              >
                ${videoIcon}
              </button>
              <button
                class="skill-path-toggle ${pathClass}"
                data-di="${di}"
                data-si="${si}"
                type="button"
                title="Toggle in skill path"
              >
                ★
              </button>
            </div>
            <div class="stars skill" data-di="${di}" data-si="${si}">
              ${[1, 2, 3, 4, 5]
            .map((i) => {
              let clip =
                i <= s.rating
                  ? 100
                  : i - 1 < s.rating
                    ? (s.rating - Math.floor(s.rating)) * 100
                    : 0;
              return `<span class='star' data-star='${i}'>
                    ${starSVG("#d1d5db", "bg")}${starSVG(
                "#facc15",
                "fg",
                clip
              )}
                  </span>`;
            })
            .join("")}
            </div>
          </div>
        `;
      })
      .join("");

    const apparatusPathHTML = buildApparatusPathHTML(d);

    const det = document.createElement("details");
    det.open = S.openDevices.has(di);
    det.innerHTML = `
      <summary>
        <div class="left">
          <div class="avatar" style="width:36px;height:36px;">🔹</div>
          <div>
            <div class="strong">${d.name}</div>
            <div class="muted small">${avgDev.toFixed(2)}/5 stars</div>
          </div>
        </div>
        <div class="stars">${stars(avgDev)}</div>
      </summary>
      <div class="card" style="padding:10px 12px; margin-top:8px;">
        ${skillsHTML}
        <button class="btn ghost small" data-add-skill="${di}" type="button">+ Add Skill</button>
        ${apparatusPathHTML}
      </div>
    `;
    root.appendChild(det);

    const sum = det.querySelector("summary");
    sum.addEventListener("click", (ev) => {
      ev.preventDefault();
      det.open = !det.open;
      if (det.open) S.openDevices.add(di);
      else S.openDevices.delete(di);
    });
  });

  // totals
  const all = p.devices.flatMap((d) => d.skills);
  const total = all.reduce((s, k) => s + k.rating, 0);
  const max = all.length * 5;
  const percent = max ? (total / max) * 100 : 0;
  document.getElementById("totalStars").textContent = total.toFixed(1);
  document.getElementById("maxStars").textContent = max.toFixed(1);
  document.getElementById("progressBar").style.width = `${percent}%`;
  document.getElementById(
    "percentLabel"
  ).textContent = `${percent.toFixed(0)}%`;

  const badge = document.getElementById("promoBadge");
  const canPromote = percent >= 70;

  if (canPromote) {
    badge.textContent = "Promotion Ready";
    badge.classList.remove("pill-warn");
    badge.classList.add("pill-success");
  } else {
    badge.textContent = "Needs Improvement";
    badge.classList.add("pill-warn");
    badge.classList.remove("pill-success");
  }

  // Inject Promote Button
  const existingPromoteBtn = document.getElementById("promotePlayerBtn");
  if (existingPromoteBtn) existingPromoteBtn.remove();

  if (canPromote) {
    const promoteBtn = document.createElement("button");
    promoteBtn.id = "promotePlayerBtn";
    promoteBtn.className = "btn small primary";
    promoteBtn.style.marginLeft = "10px";
    promoteBtn.textContent = "Promote ⬆";
    promoteBtn.onclick = () => {
      const nextLevel = getNextLevel(p.levelCode);
      if (!nextLevel) {
        alert("Max level reached!");
        return;
      }

      if (confirm(`Promote ${p.name} to ${nextLevel}? This will reset skills for the new level.`)) {
        p.levelCode = nextLevel;

        // Refresh skills for new level
        const allSkills = DB.skillLibrary || [];
        p.devices.forEach(d => {
          d.skills = window.getSkillsForDevice(d.name, nextLevel, allSkills);
        });

        alert(`Promoted to ${nextLevel}!`);
        renderEval();
      }
    };
    badge.parentNode.appendChild(promoteBtn);
  }

  // Skills Path bar (global لكل اللاعب)
  renderSkillsPath(p);

  // stars click handler
  document.querySelectorAll(".stars.skill").forEach((el) => {
    el.onclick = (e) => {
      const starEl = e.target.closest(".star");
      if (!starEl) return;
      const di = Number(el.getAttribute("data-di"));
      const si = Number(el.getAttribute("data-si"));
      const i = Number(starEl.getAttribute("data-star"));
      const cur = p.devices[di].skills[si].rating;
      const newRating = cur === i ? 0 : i;
      p.devices[di].skills[si].rating = newRating;

      // Save to Supabase
      if (window.saveEvaluation && p.supabaseId) {
        window.saveEvaluation(p.supabaseId, p.devices[di].skills[si].name, newRating);
      }

      renderEval();
    };
  });

  // add skill
  document.querySelectorAll("button[data-add-skill]").forEach((btn) => {
    btn.onclick = () => {
      const di = Number(btn.dataset.addSkill);
      p.devices[di].skills.push({
        name: "New Skill",
        rating: 0,
        inPath: false,
        videoUrl: "",
      });
      renderEval();
    };
  });

  // video buttons
  document.querySelectorAll(".skill-video-btn").forEach((btn) => {
    btn.onclick = () => {
      const di = Number(btn.getAttribute("data-di"));
      const si = Number(btn.getAttribute("data-si"));
      const skill = p.devices[di].skills[si];
      if (skill && skill.videoUrl) {
        window.open(skill.videoUrl, "_blank");
      } else {
        openVideoOverlay(di, si, skill ? skill.name : "Skill");
      }
    };
  });

  // path toggle buttons
  document.querySelectorAll(".skill-path-toggle").forEach((btn) => {
    btn.onclick = () => {
      const di = Number(btn.getAttribute("data-di"));
      const si = Number(btn.getAttribute("data-si"));
      const skill = p.devices[di].skills[si];
      if (!skill) return;
      skill.inPath = !skill.inPath;
      renderEval();
    };
  });

  // أزرار الحفظ
  document.getElementById("saveBtn").onclick = () => handleSave(false);
  document.getElementById("saveNextBtn").onclick = () => handleSave(true);
  document.getElementById("reportBtn").onclick = () => {
    renderReportSectionFromCurrentPlayer();
    go("report-player");
  };
}

// ================= REPORT RECORDS =================

function overallStarsOf(p) {
  const app = p.devices.map((d) => avg(d.skills.map((s) => s.rating)));
  return app.length ? avg(app) : 0;
}

/**
 * إنشاء / تحديث ريكورد في localStorage للاعب الحالي
 * snapshotHTML: شكل الكارت اللي بيتعرض في صفحة الـ Report (نجوم + ليفل + ..)
 */
function ensureCurrentReportRecord(snapshotHTML) {
  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];
  const p = sess.players[S.playerIndex];
  const sessionSlot = sess.slot;

  const records = getReports();
  let rec = records.find(
    (r) =>
      r.sessionSlot === sessionSlot &&
      r.playerId === p.id &&
      r.branchId === b.id
  );

  // حساب النجوم
  let totalStars = 0;
  let count = 0;
  p.devices.forEach((d) => {
    d.skills.forEach((s) => {
      totalStars += s.rating;
      count++;
    });
  });
  const maxStars = count * 5;
  const percent = maxStars ? (totalStars / maxStars) * 100 : 0;
  const now = Date.now();

  if (!rec) {
    rec = {
      id: makeId(),
      branchId: b.id,
      branchName: b.name,
      sessionSlot,
      playerId: p.id,
      playerName: p.name,
      age: p.age,
      levelCode: p.levelCode,
      sport: p.sport,
      totalStars,
      maxStars,
      percent,
      levelLabel: levelFromPercentGym(percent),
      createdAt: now,
      updatedAt: now,
      sent: false,
      html: snapshotHTML || "",
    };
    records.push(rec);
  } else {
    rec.playerName = p.name;
    rec.age = p.age;
    rec.levelCode = p.levelCode;
    rec.sport = p.sport;
    rec.totalStars = totalStars;
    rec.maxStars = maxStars;
    rec.percent = percent;
    rec.levelLabel = levelFromPercentGym(percent);
    rec.updatedAt = now;
    if (snapshotHTML) rec.html = snapshotHTML;
  }

  setReports(records);
  S.currentReportId = rec.id;
  return rec;
}

function ensureCurrentReportSnapshotAndGetId() {
  const card = document.getElementById("reportPlayerCard");
  const html = card ? card.innerHTML : "";
  const rec = ensureCurrentReportRecord(html);
  return rec.id;
}

// ================= REPORT VIEW (NAV + CARD + PDF) =================

// إنشاء كارت النـافيجـيشن لو مش موجود
function ensureReportNavCard() {
  let navCard = document.getElementById("reportNavCard");
  if (navCard) return;

  const section = document.getElementById("view-report-player");
  const card = document.getElementById("reportPlayerCard");

  navCard = document.createElement("div");
  navCard.className = "card";
  navCard.id = "reportNavCard";
  navCard.innerHTML = `
    <div class="row row-header">
      <div class="strong">Saved Reports (this session)</div>
      <button class="btn tiny" type="button" id="reportNavRefresh">Refresh</button>
    </div>
    <div class="divider"></div>
    <div class="list" id="reportNavList"></div>
  `;
  section.insertBefore(navCard, card);
}

function renderReportSectionFromCurrentPlayer() {
  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];
  const p = sess.players[S.playerIndex];

  const perDevice = p.devices.map((d) => ({
    name: d.name,
    avg: avg(d.skills.map((s) => s.rating)),
    skills: d.skills,
  }));
  const overall = overallStarsOf(p);
  const percent = percentFromStars(overall);
  const prestigeLevel = levelFromPercentGym(percent);

  const wrap = document.getElementById("reportPlayerCard");
  wrap.innerHTML = `
    <div class="left" style="justify-content:space-between;">
      <div>
        <div class="strong" style="font-size:18px;">${p.name}</div>
        <div class="muted small" style="margin-top:2px;">
          Branch: ${b.name} · Session ${sess.slot}
        </div>
        <div class="muted small">
          Gymnastics · Level ${p.levelCode} · Age ${p.age}
        </div>
        <div class="pill" style="margin-top:4px;">${prestigeLevel}</div>
      </div>
      <div class="left">
        <div class="stars">${stars(overall)}</div>
        <div class="muted small">${percent.toFixed(0)}%</div>
      </div>
    </div>
    <div class="divider"></div>
    ${perDevice
      .map(
        (a) => `
      <div class="left" style="justify-content:space-between; margin-bottom:4px;">
        <div class="strong">${a.name}</div>
        <div class="left">
          <div class="stars">${stars(a.avg)}</div>
          <div class="muted small">${(a.avg * 20).toFixed(0)}%</div>
        </div>
      </div>
    `
      )
      .join("")}
    <div class="divider"></div>
    <div class="muted small">Coach Notes</div>
    <div class="card" style="margin-top:4px;">Excellent progress in Gymnastics. Keep it up 👏</div>
  `;

  // PDF (نص بسيط)
  const pdfDiv = document.getElementById("reportPdf");
  const total = p.devices
    .flatMap((d) => d.skills)
    .reduce((s, sk) => s + sk.rating, 0);
  const max = p.devices.flatMap((d) => d.skills).length * 5;

  pdfDiv.innerHTML = `
    <div class="pdf-title">${p.name}</div>
    <div class="pdf-sub">
      Branch: ${b.name} · Session ${sess.slot}<br/>
      Gymnastics · Level ${p.levelCode} · Age ${p.age}<br/>
      Prestige Level: ${prestigeLevel}
    </div>
    <div class="pdf-section-title">Overall</div>
    <div class="pdf-line">Stars: ${starText(overall)} (${overall.toFixed(
    2
  )}/5)</div>
    <div class="pdf-line">Percent: ${percent.toFixed(0)}%</div>
    <div class="pdf-line">Total Stars: ${total.toFixed(
    1
  )} / ${max.toFixed(1)}</div>
    <div class="pdf-section-title">By Apparatus</div>
    ${perDevice
      .map(
        (a) => `
      <div class="pdf-line">
        ${a.name}: ${starText(a.avg)} (${(a.avg * 20).toFixed(0)}%)
      </div>
    `
      )
      .join("")}
    <div class="pdf-section-title">Coach Notes</div>
    <div class="pdf-line">Excellent progress in Gymnastics. Keep working on consistency and confidence.</div>
  `;

  // أزرار الكارد
  const copyBtn = document.getElementById("copyLinkBtn");
  const pdfBtn = document.getElementById("genPdfBtn");
  const shareBtnInline = document.getElementById("shareReportBtn");

  copyBtn.onclick = async () => {
    const id = ensureCurrentReportSnapshotAndGetId();
    const url = buildDeepLink(id);
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied");
      markReportSent(id);
    } catch (_) { }
  };

  pdfBtn.onclick = () => {
    const id = ensureCurrentReportSnapshotAndGetId();
    const element = document.getElementById("reportPdf");
    if (!element) {
      alert("PDF element not found");
      return;
    }
    if (typeof html2pdf === "undefined") {
      alert("PDF library (html2pdf) not loaded. Check script tag.");
      return;
    }
    const opt = {
      filename: `player-report-${p.name}.pdf`,
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().from(element).set(opt).save();
    markReportSent(id);
  };

  shareBtnInline.onclick = () => {
    const id = ensureCurrentReportSnapshotAndGetId();
    const url = buildDeepLink(id);
    openShare(url, id);
  };
}

// رندر الكارد من record جاهز (لما نضغط من الليست)
function renderReportFromRecord(rec) {
  const wrap = document.getElementById("reportPlayerCard");
  if (rec.html) {
    wrap.innerHTML = rec.html;
  } else {
    // لو ما عندوش html نخلي الـ UI يبني من الـ state الحالي
    renderReportSectionFromCurrentPlayer();
  }

  // PDF بسيط من بيانات الـ record (من غير state)
  const pdfDiv = document.getElementById("reportPdf");
  pdfDiv.innerHTML = `
    <div class="pdf-title">${rec.playerName}</div>
    <div class="pdf-sub">
      Branch: ${rec.branchName} · Session ${rec.sessionSlot}<br/>
      Gymnastics · Level ${rec.levelCode} · Age ${rec.age}<br/>
      Prestige Level: ${rec.levelLabel}
    </div>
    <div class="pdf-section-title">Overall</div>
    <div class="pdf-line">Percent: ${rec.percent.toFixed(0 || 0)}%</div>
    <div class="pdf-line">Total Stars: ${rec.totalStars.toFixed(
    1
  )} / ${rec.maxStars.toFixed(1)}</div>
  `;

  const id = rec.id;

  document.getElementById("copyLinkBtn").onclick = async () => {
    const url = buildDeepLink(id);
    try {
      await navigator.clipboard.writeText(url);
      alert("Link copied");
      markReportSent(id);
    } catch (_) { }
  };

  document.getElementById("genPdfBtn").onclick = () => {
    const element = document.getElementById("reportPdf");
    if (!element) {
      alert("PDF element not found");
      return;
    }
    if (typeof html2pdf === "undefined") {
      alert("PDF library (html2pdf) not loaded. Check script tag.");
      return;
    }
    const opt = {
      filename: `player-report-${rec.playerName || "player"}.pdf`,
      jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
    };
    html2pdf().from(element).set(opt).save();
    markReportSent(id);
  };

  document.getElementById("shareReportBtn").onclick = () => {
    const url = buildDeepLink(id);
    openShare(url, id);
  };
}

// رندر صفحة الريبورت بالكامل (نـافيجـيشن + كارد)
function renderReportSection() {
  ensureReportNavCard();

  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];
  const allReports = getReports();

  // فلترة الريكوردز الخاصة بالبرانش والسيشن الحالي
  const sessionReports = allReports.filter(
    (r) => r.branchId === b.id && r.sessionSlot === (sess && sess.slot)
  );

  const navList = document.getElementById("reportNavList");
  const refreshBtn = document.getElementById("reportNavRefresh");
  if (refreshBtn) {
    refreshBtn.onclick = () => renderReportSection();
  }

  if (!sess || !sessionReports.length) {
    navList.innerHTML =
      '<div class="muted small">No saved reports yet. Save a player from Evaluation.</div>';
  } else {
    navList.innerHTML = sessionReports
      .map(
        (r) => `
      <div class="row" data-report-id="${r.id}">
        <div>
          <div class="strong">${r.playerName}</div>
          <div class="muted small">
            Level ${r.levelCode} · Age ${r.age}
          </div>
          ${r.sent
            ? '<div class="pill pill-sent">Sent ✔</div>'
            : '<div class="muted small">Not sent</div>'
          }
        </div>
        <div class="muted small" style="text-align:right;">
          ${r.percent.toFixed ? r.percent.toFixed(0) : Math.round(r.percent)}%
        </div>
      </div>
    `
      )
      .join("");

    navList.querySelectorAll("[data-report-id]").forEach((row) => {
      row.onclick = () => {
        const id = row.dataset.reportId;
        const rec = sessionReports.find((r) => r.id === id);
        if (!rec) return;

        S.currentReportId = rec.id;

        // نحاول نحدد اللاعب في الـ DB علشان لو رجع من الريبورت للـ eval
        const branchIndex = DB.branches.findIndex(
          (bb) => bb.id === rec.branchId
        );
        if (branchIndex !== -1) {
          S.branchIndex = branchIndex;
          const bb = DB.branches[branchIndex];
          const sessIndex = bb.sessions.findIndex(
            (ss) => ss.slot === rec.sessionSlot
          );
          if (sessIndex !== -1) {
            S.sessionIndex = sessIndex;
            const ss = bb.sessions[sessIndex];
            const playerIndex = ss.players.findIndex(
              (pp) => pp.id === rec.playerId
            );
            if (playerIndex !== -1) {
              S.playerIndex = playerIndex;
            }
          }
        }

        renderReportFromRecord(rec);
      };
    });
  }

  // اختيار ريكورد للعرض في الكارد
  let toShow = null;
  if (S.currentReportId) {
    toShow = sessionReports.find((r) => r.id === S.currentReportId);
  }
  if (!toShow && sess && sess.players && sess.players.length) {
    const p = sess.players[S.playerIndex] || sess.players[0];
    toShow = sessionReports.find((r) => r.playerId === p.id);
  }
  if (!toShow && sessionReports.length) {
    toShow = sessionReports[0];
  }

  if (toShow) {
    S.currentReportId = toShow.id;
    renderReportFromRecord(toShow);
  } else if (sess && sess.players && sess.players.length) {
    // لو مفيش ريكورد خالص لكن في لاعب في السيشن → نبني من الـ state
    renderReportSectionFromCurrentPlayer();
  } else {
    document.getElementById("reportPlayerCard").innerHTML =
      '<div class="muted small">No player selected.</div>';
  }
}

// لما نحفظ من eval
function handleSave(skipNext) {
  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];
  if (!sess || !sess.players.length) return;

  const player = sess.players[S.playerIndex];

  renderReportSectionFromCurrentPlayer();
  const id = ensureCurrentReportSnapshotAndGetId();
  console.log("Saved report id:", id, "for", player.name);

  if (skipNext) {
    if (S.playerIndex < sess.players.length - 1) S.playerIndex++;
    go("eval");
  } else {
    go("report-player");
  }
}

// علامة Sent ✔
function markReportSent(id) {
  const reports = getReports();
  const rec = reports.find((r) => r.id === id);
  if (rec) {
    rec.sent = true;
    setReports(reports);
    if (S.view === "roster") renderRoster();
    if (S.view === "report-player") renderReportSection();
  }
}

// ================= SHARE OVERLAY =================

const shareOverlay = document.getElementById("shareOverlay");
const shareClose = document.getElementById("shareClose");

shareClose.onclick = () => shareOverlay.classList.remove("active");
shareOverlay.onclick = (e) => {
  if (e.target === shareOverlay) shareOverlay.classList.remove("active");
};

function openShare(url, reportId) {
  shareOverlay.classList.add("active");
  const rows = shareOverlay.querySelectorAll("[data-share]");
  rows.forEach((el) => {
    const mode = el.dataset.share;
    el.onclick = async () => {
      try {
        if (mode === "copy") {
          await navigator.clipboard.writeText(url);
          alert("Link copied");
        } else if (mode === "whatsapp") {
          window.open(
            "https://wa.me/?text=" + encodeURIComponent("Player report: " + url),
            "_blank"
          );
        } else if (mode === "email") {
          window.location.href =
            "mailto:?subject=Wild Robot — Player Report&body=" +
            encodeURIComponent(url);
        }
        if (reportId) markReportSent(reportId);
      } catch (_) { }
      shareOverlay.classList.remove("active");
    };
  });
}

// ================= SESSION SUMMARY =================

function renderSessionSummary() {
  const b = DB.branches[S.branchIndex];
  const sess = b.sessions[S.sessionIndex];
  const list = document.getElementById("sessionSummaryList");
  list.innerHTML = "";

  if (!sess || !sess.players.length) {
    list.innerHTML =
      '<div class="muted small" style="text-align:center;">No players yet.</div>';
    return;
  }

  let max = -1,
    min = 101,
    best = null,
    worst = null;
  sess.players.forEach((p) => {
    const pct = percentFromStars(overallStarsOf(p));
    if (pct > max) {
      max = pct;
      best = p;
    }
    if (pct < min) {
      min = pct;
      worst = p;
    }
  });

  sess.players.forEach((p) => {
    const pct = percentFromStars(overallStarsOf(p));
    const row = document.createElement("div");
    row.className = "row";
    row.innerHTML = `
      <div class="left">
        <div class="avatar">👟</div>
        <div>
          <div class="strong">${p.name}</div>
          <div class="muted small">Gymnastics · Level ${p.levelCode} · Age ${p.age}</div>
        </div>
      </div>
      <div>
        <div class="stars">${stars(overallStarsOf(p))}</div>
        <div class="muted small" style="text-align:center;">${pct.toFixed(
      0
    )}%</div>
      </div>
    `;
    list.appendChild(row);
  });

  const info = document.createElement("div");
  info.className = "card";
  info.innerHTML = `
    <div><strong>Highest:</strong> ${best ? best.name : "-"
    } (${Math.round(max)}%)</div>
    <div><strong>Lowest:</strong> ${worst ? worst.name : "-"
    } (${Math.round(min)}%)</div>
  `;
  list.appendChild(info);
}

// ================= DEEPLINK + TABS (Skills / Routine) =================

document.addEventListener("DOMContentLoaded", () => {
  // Tabs inside Evaluation view (Skills vs Routine)
  const tabSkills = document.getElementById("tabSkills");
  const tabRoutine = document.getElementById("tabRoutine");
  const skillsPane = document.getElementById("skillsPane");
  const routinePane = document.getElementById("routinePane");

  if (tabSkills && tabRoutine && skillsPane && routinePane) {
    const activateSkills = () => {
      tabSkills.classList.add("tab-pill-active");
      tabRoutine.classList.remove("tab-pill-active");
      skillsPane.classList.remove("hidden-pane");
      routinePane.classList.add("hidden-pane");
    };
    const activateRoutine = () => {
      tabRoutine.classList.add("tab-pill-active");
      tabSkills.classList.remove("tab-pill-active");
      routinePane.classList.remove("hidden-pane");
      skillsPane.classList.add("hidden-pane");
    };

    tabSkills.addEventListener("click", activateSkills);
    tabRoutine.addEventListener("click", activateRoutine);
    // default
    activateSkills();
  }

  const hash = location.hash || "";
  const match = hash.match(/reportId=([^&]+)/);

  if (match) {
    const id = match[1];
    const rec = getReports().find((r) => r.id === id);
    if (rec && rec.html) {
      ensureReportNavCard();
      const card = document.getElementById("reportPlayerCard");
      card.innerHTML = rec.html;
      S.currentReportId = rec.id;
      go("report-player");
      return;
    }
  }

  // بداية عادية
  go("home");
});
