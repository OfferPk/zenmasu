# ZenMasu ⚪⚫✨

> **ZenMasu**: A calm, meditative Japanese Masyu (Pearls / 白珠黒珠) loop logic puzzle. Connect serene white lotus pearls and obsidian stones into a single continuous flowing loop.

[![CI](https://github.com/OfferPk/zenmasu/actions/workflows/ci.yml/badge.svg)](https://github.com/OfferPk/zenmasu/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![GitHub Pages](https://img.shields.io/badge/Live_Demo-GitHub_Pages-38bdf8.svg)](https://offerpk.github.io/zenmasu/)

---

## 🎮 Play Online
Play instantly in your browser:  
👉 **[https://offerpk.github.io/zenmasu/](https://offerpk.github.io/zenmasu/)**

---

## ✨ Features

- **50 Handcrafted Puzzles**: 5 difficulty packs ranging from gentle introductory 5×5 gardens to intricate 9×9 sanctuaries:
  - 🌱 **Spring Garden** (5×5) — Levels 1–10
  - 🎏 **Koi River** (6×6) — Levels 11–20
  - 🎋 **Bamboo Forest** (7×7) — Levels 21–30
  - 🪨 **Stone Path** (8×8) — Levels 31–40
  - ⛩️ **Zen Sanctuary** (9×9) — Levels 41–50
- **Procedural Garden & Silk Acoustics**: Pure Web Audio synthesizer with crisp bamboo ticks on segment drawing, gentle water droplet chimes when a pearl constraint is satisfied, silk string koto plucks on segment connection, and a resonant zen temple victory gong upon loop closure.
- **Deductive Hints Engine**: Automatic detection of immediate Masyu deductions (e.g., black pearls on borders or near corners, adjacent black pearls, white pearls against boundaries, degree-2 vertex extension, single-loop cut prevention).
- **Fluid Controls**: Drag or tap along grid segments to draw flowing lines. Toggle X-marks on impossible paths. Unlimited undo and level selector.
- **100% Offline & Private**: Zero external network dependencies, no tracking, no ads. Built as a PWA and wrapped with Capacitor for native Android.

---

## 📜 Masyu Rules

1. **Single Loop**: Draw a single closed, non-intersecting loop through cell centers moving only horizontally and vertically.
2. **White Pearl (Lotus Circle ⚪)**: The loop must travel straight through the white pearl, and must turn 90° in the immediately preceding cell, the following cell, or both.
3. **Black Pearl (Obsidian Stone ⚫)**: The loop must make a 90° turn at the black pearl, and must travel straight for at least one cell in both directions from the turn.
4. Cells without pearls may contain straight lines, turns, or no lines at all. Branching and dead ends are forbidden.

---

## 🛠️ Development & Build

```bash
# Install dependencies
npm install

# Run engine test suite
npm test

# Build web assets to www/
npm run build
```

---

## 📱 Android App Build

Built using Capacitor:
```bash
npx cap add android
npx cap sync android
cd android && ./gradlew assembleDebug
```
The debug APK is generated and uploaded as an Actions artifact on every release build (`zenmasu-apk`).

---

## 📄 License
MIT License • Developed with care by [OfferPk](https://github.com/OfferPk).
