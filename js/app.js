// ═══════════════════════════════════════════════════════════
// Game Night Planner - app.js
// ═══════════════════════════════════════════════════════════

// ─── Firebase Config ───────────────────────────────────────
// Replace with your own Firebase project config
const firebaseConfig = {
  apiKey: "AIzaSyB1q56RR0WsTjaN699_IqmggdEtUgVoVu0",
  authDomain: "gamenight-5654e.firebaseapp.com",
  databaseURL: "https://gamenight-5654e-default-rtdb.firebaseio.com",
  projectId: "gamenight-5654e",
  storageBucket: "gamenight-5654e.firebasestorage.app",
  messagingSenderId: "780677715132",
  appId: "1:780677715132:web:bc69f0ed996e3420b5acb9"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ─── Constants ─────────────────────────────────────────────
const PASSWORD = "OLE";

// ─── State ─────────────────────────────────────────────────
let currentUser = localStorage.getItem("gamenight_user") || "";
let editingSessionId = null;
const expandedSessions = new Set(); // track manually expanded/collapsed sessions
const collapsedSessions = new Set();

// Browser ID for name ownership
let browserId = localStorage.getItem("gamenight_browserid");
if (!browserId) {
  browserId = crypto.randomUUID();
  localStorage.setItem("gamenight_browserid", browserId);
}

// ─── DOM References ────────────────────────────────────────
const gate = document.getElementById("gate");
const app = document.getElementById("app");
const passwordInput = document.getElementById("passwordInput");
const enterBtn = document.getElementById("enterBtn");
const gateError = document.getElementById("gateError");
const userNameInput = document.getElementById("userName");
const tabs = document.querySelectorAll(".tab");
const sessionsTab = document.getElementById("sessionsTab");
const gamesTab = document.getElementById("gamesTab");
const sessionsList = document.getElementById("sessionsList");
const gamesList = document.getElementById("gamesList");

// Session form
const addSessionBtn = document.getElementById("addSessionBtn");
const addSessionForm = document.getElementById("addSessionForm");
const sessionDate = document.getElementById("sessionDate");
const sessionTime = document.getElementById("sessionTime");
const sessionLocation = document.getElementById("sessionLocation");
const sessionNote = document.getElementById("sessionNote");
const saveSessionBtn = document.getElementById("saveSessionBtn");
const cancelSessionBtn = document.getElementById("cancelSessionBtn");

// Game form
const addGameBtn = document.getElementById("addGameBtn");
const addGameForm = document.getElementById("addGameForm");
const gameName = document.getElementById("gameName");
const gameMinPlayers = document.getElementById("gameMinPlayers");
const gameMaxPlayers = document.getElementById("gameMaxPlayers");
const gameMinTime = document.getElementById("gameMinTime");
const gameMaxTime = document.getElementById("gameMaxTime");
const gameBggUrl = document.getElementById("gameBggUrl");
const gameOwner = document.getElementById("gameOwner");
const saveGameBtn = document.getElementById("saveGameBtn");
const cancelGameBtn = document.getElementById("cancelGameBtn");

// Edit session modal
const editSessionModal = document.getElementById("editSessionModal");
const editSessionDate = document.getElementById("editSessionDate");
const editSessionTime = document.getElementById("editSessionTime");
const editSessionLocation = document.getElementById("editSessionLocation");
const editSessionNote = document.getElementById("editSessionNote");
const updateSessionBtn = document.getElementById("updateSessionBtn");
const deleteSessionBtn = document.getElementById("deleteSessionBtn");
const cancelEditSessionBtn = document.getElementById("cancelEditSessionBtn");

// ─── Password Gate ─────────────────────────────────────────
function checkAuth() {
  if (sessionStorage.getItem("gamenight_auth") === "true") {
    showApp();
  }
}

function authenticate() {
  const val = passwordInput.value.trim().toUpperCase();
  if (val === PASSWORD) {
    sessionStorage.setItem("gamenight_auth", "true");
    gateError.classList.add("hidden");
    showApp();
  } else {
    gateError.classList.remove("hidden");
    passwordInput.value = "";
    passwordInput.focus();
  }
}

function showApp() {
  gate.classList.add("hidden");
  app.classList.remove("hidden");
  if (currentUser) claimName(currentUser);
  updateNameUI();
  loadSessions();
  loadGames();
}

enterBtn.addEventListener("click", authenticate);
passwordInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") authenticate();
});

// ─── Tabs ──────────────────────────────────────────────────
tabs.forEach(tab => {
  tab.addEventListener("click", () => {
    tabs.forEach(t => t.classList.remove("active"));
    tab.classList.add("active");
    const target = tab.dataset.tab;
    sessionsTab.classList.toggle("active", target === "sessions");
    gamesTab.classList.toggle("active", target === "games");
  });
});

// ─── User Name ─────────────────────────────────────────────
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");

function updateNameUI() {
  if (currentUser) {
    userNameInput.value = currentUser;
    userNameInput.disabled = true;
    loginBtn.classList.add("hidden");
    logoutBtn.classList.remove("hidden");
  } else {
    userNameInput.value = "";
    userNameInput.disabled = false;
    loginBtn.classList.remove("hidden");
    logoutBtn.classList.add("hidden");
  }
}

loginBtn.addEventListener("click", () => {
  const name = userNameInput.value.trim();
  if (!name) { alert("Please enter your name."); userNameInput.focus(); return; }
  validateName(name);
});

userNameInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") loginBtn.click();
});

logoutBtn.addEventListener("click", () => {
  currentUser = "";
  localStorage.setItem("gamenight_user", "");
  updateNameUI();
});

async function validateName(name) {
  const snap = await db.ref(`users/${name}`).once("value");
  const existing = snap.val();

  if (!existing || existing.browserId === browserId) {
    claimName(name);
  } else {
    const isSame = confirm(
      `The name "${name}" was already used by someone.\n\nAre you the same person? (Maybe on a different device?)\n\nClick OK if that's you, or Cancel to pick a different name.`
    );
    if (isSame) {
      claimName(name);
    } else {
      userNameInput.value = "";
      alert("Please pick a different name.");
      userNameInput.focus();
    }
  }
}

function claimName(name) {
  currentUser = name;
  localStorage.setItem("gamenight_user", name);
  db.ref(`users/${name}`).set({ browserId: browserId, lastSeen: Date.now() });
  updateNameUI();
}

// ─── Sessions ──────────────────────────────────────────────
addSessionBtn.addEventListener("click", () => {
  addSessionForm.classList.toggle("hidden");
  // Default to tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 7);
  sessionDate.value = tomorrow.toISOString().split("T")[0];
});

cancelSessionBtn.addEventListener("click", () => {
  addSessionForm.classList.add("hidden");
});

saveSessionBtn.addEventListener("click", () => {
  if (!sessionDate.value) return;
  const newSession = {
    date: sessionDate.value,
    time: sessionTime.value || "18:00",
    location: sessionLocation.value || "",
    note: sessionNote.value || "",
    attendees: [],
    votes: {}
  };
  db.ref("sessions").push(newSession);
  addSessionForm.classList.add("hidden");
  sessionLocation.value = "";
  sessionNote.value = "";
});

function loadSessions() {
  db.ref("sessions").orderByChild("date").on("value", (snapshot) => {
    const sessions = [];
    snapshot.forEach(child => {
      sessions.push({ id: child.key, ...child.val() });
    });
    // Sort: upcoming first
    sessions.sort((a, b) => a.date.localeCompare(b.date));
    renderSessions(sessions);
  });
}

function renderSessions(sessions) {
  if (sessions.length === 0) {
    sessionsList.innerHTML = '<div class="empty-state">No sessions scheduled yet. Add one!</div>';
    return;
  }

  // Also load games for voting display
  db.ref("games").once("value", (gamesSnapshot) => {
    const games = {};
    gamesSnapshot.forEach(child => {
      games[child.key] = child.val();
    });

    const rendered = sessions.map((session, index) => {
      const dateObj = new Date(session.date + "T" + (session.time || "18:00"));
      const dateStr = dateObj.toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric"
      });
      const timeStr = dateObj.toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit"
      });

      const now = new Date();
      const isPast = dateObj < now;
      // Find the first upcoming session (not past)
      const firstUpcomingIndex = sessions.findIndex(s => new Date(s.date + "T" + (s.time || "18:00")) >= now);
      const isUpcoming = index === firstUpcomingIndex;
      // Respect manual expand/collapse, otherwise default
      let collapsed;
      if (expandedSessions.has(session.id)) collapsed = false;
      else if (collapsedSessions.has(session.id)) collapsed = true;
      else collapsed = !isUpcoming;

      const attendees = session.attendees || [];
      const isAttending = currentUser && attendees.includes(currentUser);

      // Votes
      const votes = session.votes || {};
      const gameTallies = {};
      Object.values(votes).forEach(userVotes => {
        (userVotes || []).forEach(gameId => {
          gameTallies[gameId] = (gameTallies[gameId] || 0) + 1;
        });
      });

      // Find winner(s) (most votes, could be a tie)
      let maxVotes = 0;
      Object.entries(gameTallies).forEach(([gid, count]) => {
        if (count > maxVotes) { maxVotes = count; }
      });
      const winnerIds = maxVotes > 0
        ? Object.entries(gameTallies).filter(([, count]) => count === maxVotes).map(([gid]) => gid)
        : [];
      const isTie = winnerIds.length > 1;

      // User's votes for this session
      const myVotes = (currentUser && votes[currentUser]) || [];

      // Games list for voting
      const gameKeys = Object.keys(games);
      const canVote = isAttending;
      let votingHtml = "";
      if (gameKeys.length > 0) {
        const items = gameKeys.map(gid => {
          const g = games[gid];
          const count = gameTallies[gid] || 0;
          const voted = myVotes.includes(gid);
          const isWinner = winnerIds.includes(gid);
          const badge = isWinner ? (isTie ? '<span class="winner-badge">🤝 Tie</span>' : '<span class="winner-badge">⭐ Pick</span>') : '';
          const nameHtml = g.bggUrl
            ? `<a href="${escapeHtml(g.bggUrl)}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a>`
            : escapeHtml(g.name);
          return `
            <div class="vote-game">
              <span class="game-name">${nameHtml}${badge}</span>
              <span class="vote-count">${count}</span>
              <button class="vote-btn ${voted ? 'voted' : ''} ${!canVote ? 'disabled' : ''}" onclick="toggleVote('${session.id}','${gid}')" title="${canVote ? 'Vote' : 'RSVP first to vote'}" ${!canVote ? 'disabled' : ''}>♥</button>
            </div>`;
        }).join("");
        votingHtml = `<div class="voting-grid">${items}</div>`;
      } else {
        votingHtml = '<p class="no-votes-msg">Add games to the library first to vote!</p>';
      }

      return `
        <div class="session-card ${isPast ? 'past' : ''}" data-session-id="${session.id}">
          <div class="session-header" onclick="toggleCollapse(this)" style="cursor:pointer">
            <div>
              <h3>${dateStr} · ${timeStr}${isPast ? ' <span style="font-size:.75rem;color:#888">(past)</span>' : ''}</h3>
              ${session.location ? `<p class="session-note">📍 ${escapeHtml(session.location)}</p>` : ''}
              ${session.note ? `<p class="session-note">${escapeHtml(session.note)}</p>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:.5rem">
              <span class="collapse-icon">${collapsed ? '▸' : '▾'}</span>
              <button class="edit-btn" onclick="event.stopPropagation();openEditSession('${session.id}')">✏️ Edit</button>
            </div>
          </div>
          <div class="session-body ${collapsed ? 'hidden' : ''}">
            <div class="attendees-section">
              <div class="attendees-label">Attending (${attendees.length}):</div>
              <div class="attendees-list">
                ${attendees.map(a => `<span class="attendee-tag ${a === currentUser ? 'you' : ''}">${escapeHtml(a)}</span>`).join("")}
              </div>
              ${!isPast ? `<button class="btn-attend ${isAttending ? 'attending' : ''}" onclick="toggleAttend('${session.id}')" style="margin-top:.5rem">
              ${isAttending ? '✓ Going (click to cancel)' : 'Count me in!'}
              </button>` : ''}
            </div>
            ${!isPast ? `<div class="voting-section">
              <h4>Vote for games:</h4>
              ${votingHtml}
            </div>` : `<div class="voting-section">${winnerIds.length > 0 ? (isTie
              ? `<p class="no-votes-msg">🤝 Tied: ${winnerIds.map(id => games[id] ? escapeHtml(games[id].name) : '').join(', ')}</p>`
              : `<p class="no-votes-msg">⭐ Played: <strong>${games[winnerIds[0]] ? escapeHtml(games[winnerIds[0]].name) : ''}</strong></p>`)
              : '<p class="no-votes-msg">No game was picked</p>'}</div>`}
          </div>
        </div>`;
    });

    const now = new Date();
    const upcomingSessions = rendered.filter((_, i) => {
      const s = sessions[i];
      return new Date(s.date + "T" + (s.time || "18:00")) >= now;
    });
    const pastSessions = rendered.filter((_, i) => {
      const s = sessions[i];
      return new Date(s.date + "T" + (s.time || "18:00")) < now;
    });

    let html = '';
    if (upcomingSessions.length > 0) {
      html += `<h3 class="section-label">Upcoming</h3>` + upcomingSessions.join("");
    }
    if (pastSessions.length > 0) {
      html += `<h3 class="section-label" style="margin-top:1.5rem">Past</h3>` + pastSessions.join("");
    }
    sessionsList.innerHTML = html;
  });
}

// Toggle collapse
window.toggleCollapse = function(headerEl) {
  const card = headerEl.closest('.session-card');
  const sessionId = card.dataset.sessionId;
  const body = headerEl.nextElementSibling;
  const icon = headerEl.querySelector('.collapse-icon');
  body.classList.toggle('hidden');
  const isNowCollapsed = body.classList.contains('hidden');
  icon.textContent = isNowCollapsed ? '▸' : '▾';
  if (isNowCollapsed) {
    expandedSessions.delete(sessionId);
    collapsedSessions.add(sessionId);
  } else {
    collapsedSessions.delete(sessionId);
    expandedSessions.add(sessionId);
  }
};

// Toggle attendance
window.toggleAttend = function(sessionId) {
  if (!currentUser) {
    alert("Please enter your name first!");
    userNameInput.focus();
    return;
  }
  const ref = db.ref(`sessions/${sessionId}/attendees`);
  ref.once("value", snap => {
    let attendees = snap.val() || [];
    if (attendees.includes(currentUser)) {
      attendees = attendees.filter(a => a !== currentUser);
      // Remove their votes too
      db.ref(`sessions/${sessionId}/votes/${currentUser}`).remove();
    } else {
      attendees.push(currentUser);
    }
    ref.set(attendees);
  });
};

// Toggle vote
window.toggleVote = function(sessionId, gameId) {
  if (!currentUser) {
    alert("Please enter your name first!");
    userNameInput.focus();
    return;
  }
  const ref = db.ref(`sessions/${sessionId}/votes/${currentUser}`);
  ref.once("value", snap => {
    let myVotes = snap.val() || [];
    if (myVotes.includes(gameId)) {
      myVotes = myVotes.filter(g => g !== gameId);
    } else {
      myVotes.push(gameId);
    }
    ref.set(myVotes);
  });
};

// Edit session
window.openEditSession = function(sessionId) {
  editingSessionId = sessionId;
  db.ref(`sessions/${sessionId}`).once("value", snap => {
    const s = snap.val();
    editSessionDate.value = s.date;
    editSessionTime.value = s.time || "18:00";
    editSessionLocation.value = s.location || "";
    editSessionNote.value = s.note || "";
    editSessionModal.classList.remove("hidden");
  });
};

updateSessionBtn.addEventListener("click", () => {
  if (!editingSessionId || !editSessionDate.value) return;
  db.ref(`sessions/${editingSessionId}`).update({
    date: editSessionDate.value,
    time: editSessionTime.value,
    location: editSessionLocation.value,
    note: editSessionNote.value
  });
  editSessionModal.classList.add("hidden");
});

deleteSessionBtn.addEventListener("click", () => {
  if (!editingSessionId) return;
  if (confirm("Delete this session?")) {
    db.ref(`sessions/${editingSessionId}`).remove();
    editSessionModal.classList.add("hidden");
  }
});

cancelEditSessionBtn.addEventListener("click", () => {
  editSessionModal.classList.add("hidden");
});

// ─── Games ─────────────────────────────────────────────────
const addExpansionBtn = document.getElementById("addExpansionBtn");
const expansionsList = document.getElementById("expansionsList");

addGameBtn.addEventListener("click", () => {
  addGameForm.classList.toggle("hidden");
  gameOwner.value = currentUser;
  expansionsList.innerHTML = "";
});

cancelGameBtn.addEventListener("click", () => {
  addGameForm.classList.add("hidden");
});

addExpansionBtn.addEventListener("click", () => {
  addExpansionRow(expansionsList);
});

function addExpansionRow(container, name = "", url = "") {
  const row = document.createElement("div");
  row.className = "expansion-row";
  row.innerHTML = `
    <input type="text" placeholder="Expansion name" value="${escapeHtml(name)}" maxlength="100">
    <input type="url" placeholder="BGG link (optional)" value="${escapeHtml(url)}">
    <button type="button" class="remove-expansion-btn" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
}

function getExpansionsFromContainer(container) {
  const rows = container.querySelectorAll(".expansion-row");
  const expansions = [];
  rows.forEach(row => {
    const inputs = row.querySelectorAll("input");
    const name = inputs[0].value.trim();
    if (name) {
      expansions.push({ name: name, bggUrl: inputs[1].value.trim() || "" });
    }
  });
  return expansions;
}

saveGameBtn.addEventListener("click", () => {
  const name = gameName.value.trim();
  const owner = gameOwner.value.trim();
  if (!name) { alert("Please enter a game name."); gameName.focus(); return; }
  if (!owner) { alert("Please enter the owner's name."); gameOwner.focus(); return; }

  const game = {
    name: name,
    owner: owner,
    minPlayers: gameMinPlayers.value || "?",
    maxPlayers: gameMaxPlayers.value || "?",
    minTime: gameMinTime.value || "?",
    maxTime: gameMaxTime.value || "?",
    bggUrl: gameBggUrl.value.trim() || "",
    expansions: getExpansionsFromContainer(expansionsList)
  };

  db.ref("games").push(game);
  addGameForm.classList.add("hidden");
  gameName.value = "";
  gameMinPlayers.value = "";
  gameMaxPlayers.value = "";
  gameMinTime.value = "";
  gameMaxTime.value = "";
  gameBggUrl.value = "";
  expansionsList.innerHTML = "";
});

function loadGames() {
  db.ref("games").on("value", (snapshot) => {
    const games = [];
    snapshot.forEach(child => {
      games.push({ id: child.key, ...child.val() });
    });
    renderGames(games);
  });
}

function renderGames(games) {
  if (games.length === 0) {
    gamesList.innerHTML = '<div class="empty-state">No games added yet. Click "+ Add Game" to add one!</div>';
    return;
  }

  games.sort((a, b) => (a.name || "").localeCompare(b.name || ""));

  gamesList.innerHTML = games.map(g => {
    const nameHtml = g.bggUrl
      ? `<a href="${escapeHtml(g.bggUrl)}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a>`
      : escapeHtml(g.name);
    const expansions = g.expansions || [];
    const expansionsHtml = expansions.length > 0 ? `
      <div class="game-expansions">
        ${expansions.map(exp => {
          const expName = exp.bggUrl
            ? `<a href="${escapeHtml(exp.bggUrl)}" target="_blank" rel="noopener">${escapeHtml(exp.name)}</a>`
            : escapeHtml(exp.name);
          return `<div class="game-expansion-item">+ ${expName}</div>`;
        }).join("")}
      </div>` : '';
    const playersStr = g.minPlayers && g.maxPlayers ? `👥 ${g.minPlayers}–${g.maxPlayers}` : '';
    const timeStr = g.minTime && g.maxTime && g.minTime !== "?" && g.maxTime !== "?"
      ? `⏱ ${g.minTime}–${g.maxTime} min`
      : (g.playingTime && g.playingTime !== "?" ? `⏱ ${g.playingTime} min` : '');
    return `
      <div class="game-card">
        <div class="game-info">
          <h3>${nameHtml}</h3>
          ${expansionsHtml}
          <div class="game-meta">
            ${playersStr ? `<span>${playersStr}</span>` : ''}
            ${timeStr ? `<span>${timeStr}</span>` : ''}
          </div>
          <div class="game-owner">Owned by ${escapeHtml(g.owner)}</div>
        </div>
        <button class="edit-btn" onclick="openEditGame('${g.id}')" title="Edit">✏️</button>
      </div>`;
  }).join("");
}

// Edit game
let editingGameId = null;
const editGameModal = document.getElementById("editGameModal");
const editGameName = document.getElementById("editGameName");
const editGameMinPlayers = document.getElementById("editGameMinPlayers");
const editGameMaxPlayers = document.getElementById("editGameMaxPlayers");
const editGameMinTime = document.getElementById("editGameMinTime");
const editGameMaxTime = document.getElementById("editGameMaxTime");
const editGameBggUrl = document.getElementById("editGameBggUrl");
const editGameOwner = document.getElementById("editGameOwner");
const editAddExpansionBtn = document.getElementById("editAddExpansionBtn");
const editExpansionsList = document.getElementById("editExpansionsList");
const updateGameBtn = document.getElementById("updateGameBtn");
const deleteGameBtn = document.getElementById("deleteGameBtn");
const cancelEditGameBtn = document.getElementById("cancelEditGameBtn");

editAddExpansionBtn.addEventListener("click", () => {
  addExpansionRow(editExpansionsList);
});

window.openEditGame = function(gameId) {
  editingGameId = gameId;
  db.ref(`games/${gameId}`).once("value", snap => {
    const g = snap.val();
    editGameName.value = g.name || "";
    editGameMinPlayers.value = g.minPlayers !== "?" ? g.minPlayers : "";
    editGameMaxPlayers.value = g.maxPlayers !== "?" ? g.maxPlayers : "";
    editGameMinTime.value = g.minTime && g.minTime !== "?" ? g.minTime : (g.playingTime && g.playingTime !== "?" ? g.playingTime : "");
    editGameMaxTime.value = g.maxTime && g.maxTime !== "?" ? g.maxTime : "";
    editGameBggUrl.value = g.bggUrl || "";
    editGameOwner.value = g.owner || "";
    editExpansionsList.innerHTML = "";
    (g.expansions || []).forEach(exp => {
      addExpansionRow(editExpansionsList, exp.name, exp.bggUrl);
    });
    editGameModal.classList.remove("hidden");
  });
};

updateGameBtn.addEventListener("click", () => {
  if (!editingGameId) return;
  const name = editGameName.value.trim();
  const owner = editGameOwner.value.trim();
  if (!name) { alert("Please enter a game name."); editGameName.focus(); return; }
  if (!owner) { alert("Please enter the owner's name."); editGameOwner.focus(); return; }
  db.ref(`games/${editingGameId}`).update({
    name: name,
    owner: owner,
    minPlayers: editGameMinPlayers.value || "?",
    maxPlayers: editGameMaxPlayers.value || "?",
    minTime: editGameMinTime.value || "?",
    maxTime: editGameMaxTime.value || "?",
    bggUrl: editGameBggUrl.value.trim() || "",
    expansions: getExpansionsFromContainer(editExpansionsList)
  });
  editGameModal.classList.add("hidden");
});

deleteGameBtn.addEventListener("click", () => {
  if (!editingGameId) return;
  if (confirm("Remove this game from the library?")) {
    db.ref(`games/${editingGameId}`).remove();
    editGameModal.classList.add("hidden");
  }
});

cancelEditGameBtn.addEventListener("click", () => {
  editGameModal.classList.add("hidden");
});

// ─── Helpers ───────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ─── Init ──────────────────────────────────────────────────
checkAuth();
