# Game Night Planner — Design Document

## Table of Contents

- [Overview](#overview)
- [Current Architecture](#current-architecture)
- [Authentication (Current)](#authentication-current)
- [Data Model (Current)](#data-model-current)
- [Features (Current)](#features-current)
- [UI/UX (Current)](#uiux-current)
- [Hosting & Infrastructure](#hosting--infrastructure)
- [Future: Account-Based System](#future-account-based-system)

---

## Overview

Game Night Planner is a casual, single-page web app for a group of friends to coordinate board game sessions. It allows scheduling sessions, RSVPing, voting on which games to play, and maintaining a shared game library.

**Live URL:** Hosted on GitHub Pages  
**Repository:** https://github.com/domrany64/ole_gamenight.git

---

## Current Architecture

### Stack

| Layer      | Technology                                    |
|------------|-----------------------------------------------|
| Frontend   | Vanilla HTML / CSS / JavaScript (single page) |
| Backend    | Firebase Realtime Database (BaaS)             |
| Hosting    | GitHub Pages                                  |
| Font       | Google Fonts — Fredoka                        |
| Firebase   | v10.12.0 compat SDK via `<script>` tags       |

### File Structure

```
game-night-planner/
├── index.html              # Single-page app shell
├── css/
│   └── style.css           # All styling (dark theme)
├── js/
│   └── app.js              # All application logic
├── backups/                # Automated DB backups (via GitHub Actions)
├── .github/
│   └── workflows/
│       └── backup-db.yml   # Weekly Firebase DB backup workflow
├── README.md
└── DESIGN.md               # This file
```

---

## Authentication (Current)

### Password Gate

- Shared password: `OLE` (hardcoded in `app.js`)
- No user accounts — password just grants access to the app
- Password state stored in `localStorage` (`gamenight_auth`)

### Name System

- Users type a display name and click "Lock In"
- Name stored in `localStorage` (`gamenight_user`)
- **Browser ID ownership:** A `crypto.randomUUID()` is generated per browser and stored in `localStorage` (`gamenight_browserid`). When a name is claimed, the browser ID is saved to Firebase under `users/{name}/browserId`. This prevents others from using the same name from a different browser.
- Users can "Logout" to clear their name and pick a new one.

### Limitations

- No cross-device identity — name is tied to a single browser
- Anyone with the password can access the app
- Name squatting relies on browser ID, which is lost if localStorage is cleared

---

## Data Model (Current)

### Firebase Realtime Database Structure

```
gamenight-5654e-default-rtdb/
├── sessions/
│   └── {sessionId}/
│       ├── date: "2026-05-10"
│       ├── time: "18:00"
│       ├── location: "Damon's place"
│       ├── note: "Bring snacks"
│       ├── attendees: ["Alice", "Bob", "Charlie"]
│       └── votes/
│           ├── Alice: ["-gameId1", "-gameId2"]
│           └── Bob: ["-gameId1"]
├── games/
│   └── {gameId}/
│       ├── name: "Catan"
│       ├── owner: "Alice"
│       ├── minPlayers: 3
│       ├── maxPlayers: 4
│       ├── minTime: 60
│       ├── maxTime: 120
│       ├── bggUrl: "https://boardgamegeek.com/boardgame/13/catan"
│       └── expansions/
│           └── [{ name: "Seafarers", bggUrl: "..." }, ...]
└── users/
    └── {displayName}/
        ├── browserId: "uuid-string"
        └── lastSeen: 1714700000000
```

### Security Rules

Currently in **test mode** — open read/write for all. No authentication required at the database level.

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

---

## Features (Current)

### Sessions

- **Create:** Date, time, location (optional), note (optional)
- **Edit/Delete:** Via modal, any user can edit any session
- **RSVP:** "Count me in!" toggle per session
- **Collapse/Expand:** Session cards are collapsible; upcoming sessions default expanded, past sessions default collapsed
- **Past detection:** Sessions before today are dimmed (opacity 0.6) and marked "(past)"; voting is hidden for past sessions
- **Winner display:** Past sessions show the voted winner or tie result

### Game Library

- **Add games:** Name, min/max players, min/max play time, BGG link (optional), owner name, expansions
- **Edit/Delete:** Via modal
- **Expansions:** Each game can have multiple expansions, each with optional BGG link
- **Alphabetical sorting:** Games are displayed sorted A–Z
- **3-column grid layout** (responsive: 2 cols < 700px, 1 col < 500px)

### Voting

- Available only on upcoming (non-past) sessions
- **Must RSVP first** — vote buttons are disabled until the user clicks "Count me in!"
- Heart button (♥) to vote for games; toggles on/off
- Vote tally shown per game
- **Winner detection:** Game(s) with the most votes get a badge:
  - ⭐ Pick — single winner
  - 🤝 Tie — multiple games tied for most votes
- **3-column compact grid** (responsive: 2 cols < 700px, 1 col < 500px)

### Automated Backups

- GitHub Actions workflow runs every Sunday at 3 AM UTC
- Downloads the full Firebase DB as JSON
- Commits to `backups/` folder in the repo
- Retains the last 10 backups (older ones are deleted)
- Can be triggered manually from the Actions tab

---

## UI/UX (Current)

### Theme

- **Dark theme:** Background `#1a1a2e`, cards `#16213e`, accents `#e94560`
- **Softened text:** Body text `#bbb`, headings/labels `#ccc` (not pure white)
- **Font:** Fredoka (rounded, casual feel)

### Layout

- Single-page app with tab navigation (Sessions / Game Library)
- Max content width: 900px, centered
- Cards for sessions and forms
- Modals for editing sessions and games

### Responsive

- 3-column grids collapse to 2 at 700px, then 1 at 500px
- Form inputs and buttons scale for mobile

### Key UI Patterns

- Labeled rows for min/max fields (players, play time)
- Collapsible session cards with ▸/▾ icons
- Attendee tags with "you" highlight
- Game links use subtle white underline (not red, to avoid grammar-error appearance)
- Winner/tie badges in green

---

## Hosting & Infrastructure

| Service         | Details                                                      |
|-----------------|--------------------------------------------------------------|
| GitHub Pages    | Serves static files from `main` branch                      |
| Firebase RTDB   | Project `gamenight-5654e`, test mode rules                   |
| GitHub Actions  | Weekly DB backup workflow                                    |
| Domain          | Default GitHub Pages URL                                     |

---

## Future: Account-Based System

This section outlines the plan for migrating from the current shared-password model to a proper account-based system.

### Authentication

Replace the shared "OLE" password gate with **Firebase Authentication**.

**Recommended approach:** Google Sign-In

- One-click login, no forms or passwords to manage
- Firebase provides a unique `uid` per user that persists across devices
- Also returns display name and avatar from the Google account
- Free tier is more than sufficient

**Alternative:** Email/password accounts (or both options offered).

### Data Model Changes

```
users/{uid}/
  displayName
  email
  avatar

sessions/{sessionId}/
  createdBy: uid              ← who created the session
  date, time, location, note
  attendees: { uid: true }    ← keyed by uid instead of name strings
  votes: { uid: [gameIds] }   ← keyed by uid instead of name strings

games/{gameId}/
  name, minPlayers, maxPlayers, minTime, maxTime, bggUrl
  owner: uid                  ← linked to account, not a text string
  expansions: [...]
```

Key change: All references to users become `uid`-based. Display names are resolved from the `users/` node for rendering.

### Security Rules

Replace open test-mode rules with proper authentication-based rules:

```json
{
  "rules": {
    "users": {
      "$uid": {
        ".read": "auth != null",
        ".write": "auth.uid === $uid"
      }
    },
    "sessions": {
      ".read": "auth != null",
      "$sessionId": {
        ".write": "auth != null"
      }
    },
    "games": {
      ".read": "auth != null",
      "$gameId": {
        ".write": "auth != null && (!data.exists() || data.child('owner').val() === auth.uid)"
      }
    }
  }
}
```

- Only authenticated users can read/write
- Users can only edit their own profile
- Games can only be edited/deleted by their owner
- Sessions can be edited by any authenticated user (collaborative scheduling)

### JS Changes

- Replace `currentUser` (string) with `firebase.auth().currentUser` (object with `.uid`, `.displayName`)
- Add `onAuthStateChanged` listener to handle login state instead of localStorage checks
- Update all database reads/writes to use `uid` instead of name strings
- Remove browser ID ownership system (no longer needed)
- Add Google Sign-In button and sign-out flow

### Migration Path

1. Enable Google Sign-In in Firebase Console → Authentication → Sign-in method
2. Add `firebase-auth-compat.js` script tag
3. Build login UI (replace gate with Google Sign-In button)
4. Write a one-time migration script to map existing text names → new uids in the database
5. Update all app.js logic to use uid-based references
6. Deploy updated security rules
7. Test and push

### Trade-offs

| Aspect     | Current (shared password)          | Future (accounts)                      |
|------------|------------------------------------|----------------------------------------|
| Friction   | Very low — just type a name        | Requires Google account / signup       |
| Identity   | Browser-local, easily spoofed      | Persistent, cross-device, verified     |
| Security   | Anyone with password has full access | Per-user permissions, proper rules    |
| Ownership  | Text-based, fragile                | uid-based, reliable                    |
| Complexity | Minimal                           | Moderate increase                      |
| Multi-device | Not supported                   | Works anywhere user signs in           |
