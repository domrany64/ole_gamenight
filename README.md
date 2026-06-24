# 🎲 Game Night Planner

**Live site:** [https://domrany64.github.io/ole_gamenight/](https://domrany64.github.io/ole_gamenight/)

A simple web app for organizing board game nights. Hosted on GitHub Pages, powered by Firebase.

## Features

- **Password gate** — only people with the password ("OLE") can access
- **Session scheduling** — add upcoming game night dates, edit or remove them
- **RSVP** — click to say you're coming, see who else is attending
- **Game voting** — vote for the game you want to play; most-voted game gets picked
- **Game library** — add board games by searching BoardGameGeek (auto-fetches player count, play time, and link)
- **Real-time** — everyone sees changes instantly (Firebase Realtime Database)

## How It Works

| Action | Who can do it |
|--------|--------------|
| Add/edit/delete sessions | Anyone with the password |
| RSVP to a session | Anyone (enter your name) |
| Vote for games | Anyone (enter your name) |
| Add/remove games | Anyone with the password |

The **most-voted game** for each session is highlighted with a ⭐ badge.

Game info (players, play time) is fetched from [BoardGameGeek](https://boardgamegeek.com/) when you add a game.

## License

MIT License — see [LICENSE](LICENSE) for details.
