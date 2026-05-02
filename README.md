# 🎲 Game Night Planner

A simple web app for organizing board game nights. Hosted on GitHub Pages, powered by Firebase.

## Features

- **Password gate** — only people with the password ("OLE") can access
- **Session scheduling** — add upcoming game night dates, edit or remove them
- **RSVP** — click to say you're coming, see who else is attending
- **Game voting** — vote for the game you want to play; most-voted game gets picked
- **Game library** — add board games by searching BoardGameGeek (auto-fetches player count, play time, and link)
- **Real-time** — everyone sees changes instantly (Firebase Realtime Database)

## Setup

### 1. Create a Firebase Project (free)

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **Add Project** → name it (e.g. "game-night") → create
3. Go to **Build → Realtime Database** → **Create Database** → choose a region → start in **test mode**
4. Go to **Project Settings** (gear icon) → scroll to **Your apps** → click **Web** (`</>`)
5. Register your app (no hosting needed) → copy the `firebaseConfig` object

### 2. Add Your Config

Open `js/app.js` and replace the placeholder config at the top:

```js
const firebaseConfig = {
  apiKey: "your-actual-api-key",
  authDomain: "your-project.firebaseapp.com",
  databaseURL: "https://your-project-default-rtdb.firebaseio.com",
  projectId: "your-project",
  storageBucket: "your-project.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

### 3. Set Database Rules

In Firebase Console → Realtime Database → **Rules**, set:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

> This is open access — fine for a casual friends-only app behind a password. For more security, consider adding Firebase Authentication later.

### 4. Deploy to GitHub Pages

1. Create a new GitHub repository
2. Push this `game-night-planner` folder as the repo root
3. Go to **Settings → Pages** → set source to `main` branch, root folder
4. Your site will be live at `https://yourusername.github.io/repo-name/`

Share the link + password with your friends!

## How It Works

| Action | Who can do it |
|--------|--------------|
| Add/edit/delete sessions | Anyone with the password |
| RSVP to a session | Anyone (enter your name) |
| Vote for games | Anyone (enter your name) |
| Add/remove games | Anyone with the password |

The **most-voted game** for each session is highlighted with a ⭐ badge.

Game info (players, play time) is fetched from [BoardGameGeek](https://boardgamegeek.com/) when you add a game.
