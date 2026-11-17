# CyberSafe Exhibition & Galaxy 1

A digital cybercrime awareness briefing and interactive 3D GPU particle simulation.

## 🚀 Features

- **10-Section Interactive Exhibition:** Plain-language guides on Phishing, Identity Theft, Malware, Prevention, and Incident Response.
- **Interactive Threats & Instincts:**
  - *Spot the Phish:* Tap-to-inspect interactive phone SMS alert.
  - *Malware Diagnostic Tabs:* Viruses, Trojans, Spyware, and Ransomware.
  - *Field Test Quiz:* 5-question cyber instincts quiz with instant scoring.
  - *Pledge Habit:* Real-time live counter.
- **Galaxy 1 GPU Simulation:**
  - Real-time 500,000 GPU particle galaxy (*Variation 7859*).
  - Procedural spiral arms, twisting central smoke plume, and camera-facing quad sprites.
  - Interactive mouse drag orbit and cursor gravity pull.
  - Dual color palettes: CyberSafe HUD (Lime / Cyan) & Cosmic Blue.
- **Feedback & QR System:**
  - Direct integration with Online Feedback Form & custom QR code.
  - Dedicated **Organizer Dashboard** (`/admin`) with real-time analytics and CSV export.
  - Fully offline and resilient with local storage synchronization.

## 🌐 Routes

- `/` — Main CyberSafe Awareness Exhibition
- `/galaxy` — Standalone Fullscreen Galaxy 1 (500k GPU Particles)
- `/admin` — Feedback Dashboard & Metrics

## ⚡ Deployment to Vercel

This repository is pre-configured for one-click deployment on **Vercel**:

1. Push or import this repository to your Vercel account.
2. Select **Other** as the framework preset (or leave as Default).
3. Root Directory: `./`
4. Click **Deploy**.

Vercel automatically handles clean routes and serverless API endpoints via `vercel.json` and `/api`.

## 🛠 Local Development

```bash
# Start local development server
npm start
# or
node server.mjs
```

Visit `http://localhost:3000` in your browser.
