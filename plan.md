# Cybercrime Awareness Exhibition — Implementation Plan

## Scope and approach

Build a single-page, static-first awareness exhibition in semantic HTML, CSS, and vanilla JavaScript. The page is organized as ten full-screen learning sections followed by an isolated feedback section. It uses no image assets: the visual language comes from CSS, inline SVG, a lightweight canvas particle field, and restrained HUD/terminal motifs.

The experience is designed for phone-first scanning and laptop exploration. Every dynamic action is optimistic and non-blocking: the browser calls small same-origin API endpoints when available, then falls back to localStorage and a useful inline state if the backend is unavailable. The backend is a tiny Node HTTP server with JSON persistence for visit, pledge, quiz, and native fallback feedback data. That gives the site a real dynamic surface during local preview and a deterministic static fallback for offline or static hosting.

The QR layer uses pinned `qrcode-generator` 1.4.4 from cdnjs, produces inline SVG at runtime, supports download buttons, derives the website destination from `window.location.origin`, and targets the native fallback feedback anchor because a Google Form cannot be created from the disabled browser in this session. The form itself stays visually and behaviorally isolated under the `fb-` prefix.

## Design direction

### Candidate styles

- **Terminal editorial** (0.07): a high-contrast briefing wall with mono labels and diagnostic accents.
- **Soft cyber HUD** (0.06): glass panels, scan lines, calm neon markers, and a guided orbit through content.
- **Night-gallery signal** (0.04): cinematic negative space, lime/cyan light, and museum-label precision.

**Chosen direction: Soft cyber HUD.**

### Design movement

A calm, editorial cyber-security HUD: the atmosphere is cinematic and technical, but the content reads like clear museum signage rather than a command center.

### Core principles

1. **Clarity before spectacle:** each section has one question, one strong statement, and a short set of actionable cues.
2. **Signal hierarchy:** lime means the next useful move, cyan means context, and muted grey is structural chrome.
3. **Confidence without fear:** warnings are framed as recognizable patterns and reversible habits.
4. **Motion as orientation:** animation reveals relationships and progress, never delays reading or scrolls the user for them.

### Color philosophy

Near-black surfaces create quiet focus. Neon lime is the ownable signature color for agency and “pause / verify” moments. Cyan marks supporting evidence and wayfinding. Soft grey cards keep the dark theme readable on small screens without making the exhibition feel like a dashboard.

### Layout paradigm

A vertical signal path: full-screen sections sit like large exhibition panels, with an offset content rail, thin rules, and asymmetrical cards. The dot navigator makes the page feel spatial without turning it into a carousel.

### Signature elements

- A lime “signal line” that travels from the fixed progress bar into section markers.
- Glass cards with tiny monospace labels and inline shield / lock / hook / bug motifs.
- A low-contrast particle wave in the hero that pauses when it is not visible.

### Interaction philosophy

Every interactive item states what it does. Tap targets are at least 44px, keyboard focus is visible, and demos explain their own result. Hover lift is limited to hover-capable devices; mobile gets a small ripple and clear active state instead.

### Animation

Use `anime.js` 3.2.2 when available, with a local opacity/transform fallback. IntersectionObserver reveals fire once. The canvas uses a capped DPR of 2, a reduced particle count on small screens, and pauses on hidden tabs or when the hero is offscreen. `prefers-reduced-motion` shows all content immediately and disables the canvas loop.

### Typography system

Headings use Space Grotesk with a system fallback; body copy uses Inter with a system fallback. Large titles use fluid `clamp()` sizing. Eyebrows and metadata use a compact monospace fallback with letter spacing. The hierarchy is intentionally short: label → headline → explanation → action.

### Brand essence

A plain-language cyber safety briefing for people who use the internet every day, built to replace vague anxiety with recognizable signals and simple next steps. **Calm, direct, practical.**

### Brand voice

Short, specific, and human. Example lines: “Pause before the story rushes you.” and “If something feels off, act fast.”

### Wordmark and logo

A compact inline SVG mark made from a rounded shield, a split signal line, and a small lime aperture. The wordmark is set in Space Grotesk and paired with the eyebrow “DIGITAL SAFETY BRIEFING”.

### Signature brand color

`#C6F135` — Signal Lime.

## Project structure

- `index.html`: semantic page shell, all ten learning sections, quiz, pledge, and isolated feedback fallback.
- `styles.css`: responsive visual system, HUD motifs, reduced-motion and print rules, and `fb-` scoped feedback styles.
- `app.js`: interaction layer, IntersectionObserver reveals, canvas lifecycle, quiz, pledge/stats API calls, QR generation/downloads, and feedback form fallback.
- `anime-fallback.js`: tiny transform/opacity-compatible fallback for the pinned anime.js CDN dependency.
- `server.mjs`: local/published Node server, static file serving, health endpoint, and non-blocking JSON-backed API routes.
- `data/cybersafe-stats.json`: small runtime store for local development; the UI remains usable if it cannot be read or written.
- `public/manus-routes.json`: route manifest for the single-page `/` route.
- `Dockerfile`, `package.json`: reproducible server runtime and managed publish entrypoints.
- `app.config.ts`: project logo metadata using a durable inline data URL.
