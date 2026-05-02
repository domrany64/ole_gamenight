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
const CORS_PROXIES = [
  "https://api.allorigins.win/raw?url=",
  "https://corsproxy.io/?",
  "https://cors-anywhere.herokuapp.com/"
];
let corsProxyIndex = 0;
const BGG_SEARCH_URL = "https://boardgamegeek.com/xmlapi2/search";
const BGG_THING_URL = "https://boardgamegeek.com/xmlapi2/thing";

// ─── State ─────────────────────────────────────────────────
let currentUser = localStorage.getItem("gamenight_user") || "";
let selectedBggGame = null;
let editingSessionId = null;

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
const sessionNote = document.getElementById("sessionNote");
const saveSessionBtn = document.getElementById("saveSessionBtn");
const cancelSessionBtn = document.getElementById("cancelSessionBtn");

// Game form
const addGameBtn = document.getElementById("addGameBtn");
const addGameForm = document.getElementById("addGameForm");
const bggSearchInput = document.getElementById("bggSearchInput");
const bggSearchBtn = document.getElementById("bggSearchBtn");
const bggResults = document.getElementById("bggResults");
const gameDetails = document.getElementById("gameDetails");
const gamePreview = document.getElementById("gamePreview");
const gameOwner = document.getElementById("gameOwner");
const saveGameBtn = document.getElementById("saveGameBtn");
const cancelGameBtn = document.getElementById("cancelGameBtn");

// Edit session modal
const editSessionModal = document.getElementById("editSessionModal");
const editSessionDate = document.getElementById("editSessionDate");
const editSessionTime = document.getElementById("editSessionTime");
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
  userNameInput.value = currentUser;
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
userNameInput.addEventListener("input", () => {
  currentUser = userNameInput.value.trim();
  localStorage.setItem("gamenight_user", currentUser);
});

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
    time: sessionTime.value || "19:00",
    note: sessionNote.value || "",
    attendees: [],
    votes: {}
  };
  db.ref("sessions").push(newSession);
  addSessionForm.classList.add("hidden");
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

    sessionsList.innerHTML = sessions.map(session => {
      const dateObj = new Date(session.date + "T" + (session.time || "19:00"));
      const dateStr = dateObj.toLocaleDateString("en-US", {
        weekday: "short", month: "short", day: "numeric"
      });
      const timeStr = dateObj.toLocaleTimeString("en-US", {
        hour: "numeric", minute: "2-digit"
      });

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

      // Find winner (most votes)
      let winnerId = null;
      let maxVotes = 0;
      Object.entries(gameTallies).forEach(([gid, count]) => {
        if (count > maxVotes) { maxVotes = count; winnerId = gid; }
      });

      // User's votes for this session
      const myVotes = (currentUser && votes[currentUser]) || [];

      // Games list for voting
      const gameKeys = Object.keys(games);
      let votingHtml = "";
      if (gameKeys.length > 0) {
        votingHtml = gameKeys.map(gid => {
          const g = games[gid];
          const count = gameTallies[gid] || 0;
          const voted = myVotes.includes(gid);
          const isWinner = gid === winnerId && maxVotes > 0;
          return `
            <div class="vote-game">
              <span class="game-name">${escapeHtml(g.name)}${isWinner ? '<span class="winner-badge">⭐ Pick</span>' : ''}</span>
              <span class="vote-count">${count}</span>
              <button class="vote-btn ${voted ? 'voted' : ''}" onclick="toggleVote('${session.id}','${gid}')" title="Vote">♥</button>
            </div>`;
        }).join("");
      } else {
        votingHtml = '<p class="no-votes-msg">Add games to the library first to vote!</p>';
      }

      return `
        <div class="session-card">
          <div class="session-header">
            <div>
              <h3>${dateStr} · ${timeStr}</h3>
              ${session.note ? `<p class="session-note">${escapeHtml(session.note)}</p>` : ''}
            </div>
            <button class="edit-btn" onclick="openEditSession('${session.id}')">✏️ Edit</button>
          </div>
          <div class="attendees-section">
            <div class="attendees-label">Attending (${attendees.length}):</div>
            <div class="attendees-list">
              ${attendees.map(a => `<span class="attendee-tag ${a === currentUser ? 'you' : ''}">${escapeHtml(a)}</span>`).join("")}
            </div>
            <button class="btn-attend ${isAttending ? 'attending' : ''}" onclick="toggleAttend('${session.id}')" style="margin-top:.5rem">
              ${isAttending ? '✓ I\'m going!' : 'Count me in!'}
            </button>
          </div>
          <div class="voting-section">
            <h4>Vote for games:</h4>
            ${votingHtml}
          </div>
        </div>`;
    }).join("");
  });
}

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
    editSessionTime.value = s.time || "19:00";
    editSessionNote.value = s.note || "";
    editSessionModal.classList.remove("hidden");
  });
};

updateSessionBtn.addEventListener("click", () => {
  if (!editingSessionId || !editSessionDate.value) return;
  db.ref(`sessions/${editingSessionId}`).update({
    date: editSessionDate.value,
    time: editSessionTime.value,
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
addGameBtn.addEventListener("click", () => {
  addGameForm.classList.toggle("hidden");
  bggResults.classList.add("hidden");
  gameDetails.classList.add("hidden");
  gameOwner.value = currentUser;
});

cancelGameBtn.addEventListener("click", () => {
  addGameForm.classList.add("hidden");
  selectedBggGame = null;
});

// BGG Search
bggSearchBtn.addEventListener("click", searchBGG);
bggSearchInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") searchBGG();
});

async function fetchWithProxy(targetUrl) {
  for (let i = 0; i < CORS_PROXIES.length; i++) {
    const proxy = CORS_PROXIES[(corsProxyIndex + i) % CORS_PROXIES.length];
    try {
      const resp = await fetch(proxy + encodeURIComponent(targetUrl));
      if (resp.ok) {
        corsProxyIndex = (corsProxyIndex + i) % CORS_PROXIES.length;
        return await resp.text();
      }
    } catch (e) { /* try next */ }
  }
  throw new Error("All proxies failed");
}

async function searchBGG() {
  const query = bggSearchInput.value.trim();
  if (!query) return;

  bggResults.innerHTML = '<span class="spinner"></span> Searching...';
  bggResults.classList.remove("hidden");
  gameDetails.classList.add("hidden");

  try {
    const targetUrl = BGG_SEARCH_URL + "?query=" + encodeURIComponent(query) + "&type=boardgame";
    const text = await fetchWithProxy(targetUrl);
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const items = xml.querySelectorAll("item");

    if (items.length === 0) {
      bggResults.innerHTML = '<p style="color:#888;padding:.5rem">No results found.</p>';
      return;
    }

    // Show top 10 results
    const results = Array.from(items).slice(0, 10);
    bggResults.innerHTML = results.map(item => {
      const id = item.getAttribute("id");
      const name = item.querySelector('name[type="primary"]')?.getAttribute("value") || item.querySelector("name")?.getAttribute("value") || "Unknown";
      const year = item.querySelector("yearpublished")?.getAttribute("value") || "";
      return `
        <div class="bgg-result-item" onclick="selectBggGame('${id}')">
          <div>
            <div class="bgg-result-name">${escapeHtml(name)}</div>
            ${year ? `<div class="bgg-result-year">${year}</div>` : ''}
          </div>
        </div>`;
    }).join("");
  } catch (err) {
    bggResults.innerHTML = '<p style="color:#e94560;padding:.5rem">Search failed. Try again.</p>';
  }
}

window.selectBggGame = async function(bggId) {
  bggResults.innerHTML = '<span class="spinner"></span> Loading game details...';

  try {
    const targetUrl = BGG_THING_URL + "?id=" + bggId + "&stats=1";
    const text = await fetchWithProxy(targetUrl);
    const parser = new DOMParser();
    const xml = parser.parseFromString(text, "text/xml");
    const item = xml.querySelector("item");

    if (!item) {
      bggResults.innerHTML = '<p style="color:#e94560">Could not load game details.</p>';
      return;
    }

    const name = item.querySelector('name[type="primary"]')?.getAttribute("value") || "Unknown";
    const image = item.querySelector("thumbnail")?.textContent || "";
    const minPlayers = item.querySelector("minplayers")?.getAttribute("value") || "?";
    const maxPlayers = item.querySelector("maxplayers")?.getAttribute("value") || "?";
    const playingTime = item.querySelector("playingtime")?.getAttribute("value") || "?";
    const bggUrl = `https://boardgamegeek.com/boardgame/${bggId}`;

    selectedBggGame = { name, image, minPlayers, maxPlayers, playingTime, bggId, bggUrl };

    bggResults.classList.add("hidden");
    gameDetails.classList.remove("hidden");
    gamePreview.innerHTML = `
      <div class="game-preview-card">
        ${image ? `<img src="${image}" alt="${escapeHtml(name)}">` : ''}
        <div class="game-preview-info">
          <h4>${escapeHtml(name)}</h4>
          <p>👥 ${minPlayers}–${maxPlayers} players</p>
          <p>⏱ ${playingTime} min</p>
          <p><a href="${bggUrl}" target="_blank" style="color:#e94560">View on BGG ↗</a></p>
        </div>
      </div>`;
  } catch (err) {
    bggResults.innerHTML = '<p style="color:#e94560">Failed to load game. Try again.</p>';
  }
};

saveGameBtn.addEventListener("click", () => {
  if (!selectedBggGame) return;
  const owner = gameOwner.value.trim();
  if (!owner) {
    alert("Please enter the game owner's name.");
    gameOwner.focus();
    return;
  }

  const game = {
    name: selectedBggGame.name,
    owner: owner,
    bggId: selectedBggGame.bggId,
    bggUrl: selectedBggGame.bggUrl,
    minPlayers: selectedBggGame.minPlayers,
    maxPlayers: selectedBggGame.maxPlayers,
    playingTime: selectedBggGame.playingTime,
    imageUrl: selectedBggGame.image
  };

  db.ref("games").push(game);
  addGameForm.classList.add("hidden");
  selectedBggGame = null;
  bggSearchInput.value = "";
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
    gamesList.innerHTML = '<div class="empty-state">No games added yet. Search BGG to add some!</div>';
    return;
  }

  gamesList.innerHTML = games.map(g => {
    return `
      <div class="game-card">
        ${g.imageUrl ? `<img class="game-thumb" src="${g.imageUrl}" alt="${escapeHtml(g.name)}">` : '<div class="game-thumb"></div>'}
        <div class="game-info">
          <h3><a href="${g.bggUrl}" target="_blank" rel="noopener">${escapeHtml(g.name)}</a></h3>
          <div class="game-meta">
            <span>👥 ${g.minPlayers}–${g.maxPlayers}</span>
            <span>⏱ ${g.playingTime} min</span>
          </div>
          <div class="game-owner">Owned by ${escapeHtml(g.owner)}</div>
        </div>
        <button class="remove-btn" onclick="removeGame('${g.id}')" title="Remove">🗑</button>
      </div>`;
  }).join("");
}

window.removeGame = function(gameId) {
  if (confirm("Remove this game from the library?")) {
    db.ref(`games/${gameId}`).remove();
  }
};

// ─── Helpers ───────────────────────────────────────────────
function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str || "";
  return div.innerHTML;
}

// ─── Init ──────────────────────────────────────────────────
checkAuth();
