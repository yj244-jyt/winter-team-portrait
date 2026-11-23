# Winter House Portrait

Use [Host](https://yj244-jyt.github.io/winter-team-portrait/?role=host) on the host's original browser. Use [Player](https://yj244-jyt.github.io/winter-team-portrait/?role=player) with a room code, or share the host's **Copy player link** invitation for one-tap entry. Existing room invitations continue to work. Host controls and the full roster belong to the local host session. Opening the host URL on another device creates or resumes that device's own room.

Open the site on the host computer and copy the player invitation. Keep that tab active. Players submit from their phones. The host may submit their own card using the host form. The number shown is the count of received cards. End collection when everybody is in. Guess aloud, ask for the next clue, or confirm a correct guess. The third clue reveals the answer automatically after eight seconds.

After all rounds, download the English AI brief, JSON with all entries, and an optional labeled photo sheet for your image generator. Each room stays in the host browser's local storage. Export before clearing browser data. The source repository contains only the application.

GitHub Pages serves the static files. PeerJS 1.5.5 uses its public signaling service to establish WebRTC data channels between each player and the host. Connectivity depends on both networks. When a submission is not acknowledged, send the downloadable backup JSON privately to the host and use Import a player's backup card. If a player cannot connect during guessing, follow the host's shared screen.

For local development serve this directory with python3 -m http.server 4173 and open http://localhost:4173.

