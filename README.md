# Paddix 🧱🕹️

> A retro **brick-breaker** rebuilt in the browser — 8 themed stages, power-ups, combos, and an arcade-style high-score leaderboard.

[![Play the demo](https://img.shields.io/badge/▶_Play-Live_Demo-00e5ff?style=for-the-badge)](https://danmat.github.io/Paddix/)
&nbsp;
![Vanilla JS](https://img.shields.io/badge/Vanilla_JS-no_dependencies-f7df1e)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)

<p align="center">
  <img src="docs/screenshot.png" alt="Paddix gameplay — a sunrise-themed stage with rows of bricks, a paddle and a ball" width="640" />
</p>

## Features

- 🎮 **Canvas game engine** — smooth 60fps, no jQuery, no dependencies.
- 🗺️ **8 themed stages** — Sunrise Bay, Neon City, Deep Sea, Jungle Ruins, Volcano Core, Ice Cavern, Space Station and Final Circuit, each with its own palette and difficulty.
- 🧱 **Brick variety** — 1/2/3-hit bricks, unbreakable blocks, and ★ power-up bricks.
- ⚡ **Power-ups** — <kbd>W</kbd> wide paddle, <kbd>M</kbd> multiball, <kbd>S</kbd> slow-mo, <kbd>+</kbd> extra life.
- 🔥 **Combos** — chain brick hits without touching the paddle for bonus points.
- 🏆 **Retro high scores** — enter your 3-letter initials and land on the leaderboard.
- 🕹️ **Play anywhere** — mouse, arrow keys, or touch-drag; fully responsive.

## Controls

| Action | Input |
| --- | --- |
| Move paddle | Mouse · Arrow keys · Touch drag |
| Launch ball | Click · <kbd>Space</kbd> |
| Pause | <kbd>P</kbd> or <kbd>Esc</kbd> |

## High scores

High scores go to a **shared Cloudflare leaderboard** — a Worker + D1
([retroix-leaderboard](https://github.com/DanMat/retroix-leaderboard)) shared by all of
Dan's Retroix games and namespaced by `gameId`, so this game's board is its own. It
works out of the box (no account, no setup) and validates + caps scores server-side.
Blank `apiUrl` in [`js/config.js`](js/config.js) to fall back to a local
(per-browser) board.

> Any client-side leaderboard can be spoofed by a determined player — it's for fun, not competition.

## Play locally

It's a static site — no build step:

```bash
git clone https://github.com/DanMat/Paddix.git
cd Paddix
python3 -m http.server 8000   # then visit http://localhost:8000
```

## How it works

Paddix is built on **[Retroix](https://github.com/DanMat/Retroix)**, a tiny
dependency-free retro game engine loaded from a CDN (no build step). Retroix
provides the DPI-aware canvas, game loop, input, leaderboard, overlay screens
and retro high-score entry; this repo is just the brick-breaker.

| File | Responsibility |
| --- | --- |
| `js/game.js` | The brick-breaker: paddle/ball/brick physics, power-ups, stage flow. |
| `js/stages.js` | Pure-data stage definitions (add a stage = add an object). |
| `js/config.js` | Leaderboard API URL and game id, passed to `Retroix.leaderboard`. |
| Retroix (CDN) | Canvas, loop, input, leaderboard, screens, initials, gfx. |

## Credits

Rebuilt in vanilla JavaScript from the original 2011 jQuery version, on top of
the [Retroix](https://github.com/DanMat/Retroix) engine.

## License

[MIT](LICENSE) © DanMat
