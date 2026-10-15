/**
 * ZenMasu: Main Application Controller
 * Manages game state, SVG rendering, touch/drag controls, undo, hints, and modals.
 */

(function () {
  'use strict';

  // State variables
  let currentLevelIdx = 0;
  let currentLevel = null;
  let boardState = null;
  let undoStack = [];
  let moveCount = 0;
  let currentMode = 'line'; // 'line' or 'cross'
  let isDragging = false;
  let dragMode = null; // what value we are painting during current drag
  let completedLevels = new Set();
  let hintEdge = null;

  // DOM Elements
  const boardSvg = document.getElementById('board-svg');
  const packNameEl = document.getElementById('pack-name');
  const levelNameEl = document.getElementById('level-name');
  const statPearlsEl = document.getElementById('stat-pearls');
  const statMovesEl = document.getElementById('stat-moves');
  const pearlProgressEl = document.getElementById('pearl-progress');
  const pearlProgressFillEl = document.getElementById('pearl-progress-fill');
  const progressLabelEl = document.getElementById('progress-label');

  const btnSound = document.getElementById('btn-sound');
  const btnRules = document.getElementById('btn-rules');
  const btnLevels = document.getElementById('btn-levels');
  const btnMode = document.getElementById('btn-mode');
  const modeIcon = document.getElementById('mode-icon');
  const modeText = document.getElementById('mode-text');
  const btnHint = document.getElementById('btn-hint');
  const btnUndo = document.getElementById('btn-undo');
  const btnReset = document.getElementById('btn-reset');

  const modalLevels = document.getElementById('modal-levels');
  const modalRules = document.getElementById('modal-rules');
  const modalVictory = document.getElementById('modal-victory');
  const btnNextLevel = document.getElementById('btn-next-level');
  const victoryMoves = document.getElementById('victory-moves');
  const victoryPack = document.getElementById('victory-pack');

  // Load progress
  try {
    const saved = localStorage.getItem('zenmasu_completed');
    if (saved) {
      completedLevels = new Set(JSON.parse(saved));
    }
    const lastLvl = localStorage.getItem('zenmasu_last_level');
    if (lastLvl !== null) {
      const idx = parseInt(lastLvl, 10);
      if (idx >= 0 && idx < ZENMASU_LEVELS.length) {
        currentLevelIdx = idx;
      }
    }
  } catch (e) {}

  function saveProgress() {
    try {
      localStorage.setItem('zenmasu_completed', JSON.stringify(Array.from(completedLevels)));
      localStorage.setItem('zenmasu_last_level', currentLevelIdx.toString());
    } catch (e) {}
  }

  function updateSoundIcon() {
    const muted = ZenAudio.isAudioMuted();
    btnSound.textContent = muted ? '🔇' : '🔊';
    btnSound.setAttribute('aria-label', muted ? 'Turn sound on' : 'Turn sound off');
    btnSound.title = muted ? 'Turn sound on' : 'Turn sound off';
  }

  function loadLevel(idx) {
    if (idx < 0 || idx >= ZENMASU_LEVELS.length) return;
    currentLevelIdx = idx;
    currentLevel = ZENMASU_LEVELS[idx];
    boardState = MasuEngine.createState(currentLevel.size, currentLevel.size);
    undoStack = [];
    moveCount = 0;
    hintEdge = null;

    saveProgress();
    updateHeader();
    renderBoard();
  }

  function updateHeader() {
    packNameEl.textContent = currentLevel.pack;
    levelNameEl.textContent = `Level ${currentLevel.levelNum} (${currentLevel.size}×${currentLevel.size})`;
    statMovesEl.textContent = moveCount;
    updatePearlCounter();
  }

  function updatePearlCounter() {
    let totalPearls = 0;
    let satisfiedPearls = 0;

    for (let r = 0; r < currentLevel.size; r++) {
      for (let c = 0; c < currentLevel.size; c++) {
        const p = currentLevel.clues[r][c];
        if (p !== MasuEngine.PEARL_NONE) {
          totalPearls++;
          if (p === MasuEngine.PEARL_WHITE) {
            const v = MasuEngine.validateWhitePearl(boardState, r, c);
            if (v.valid && MasuEngine.getCellDegree(boardState, r, c) === 2) {
              satisfiedPearls++;
            }
          } else if (p === MasuEngine.PEARL_BLACK) {
            const v = MasuEngine.validateBlackPearl(boardState, r, c);
            if (v.valid && MasuEngine.getCellDegree(boardState, r, c) === 2) {
              satisfiedPearls++;
            }
          }
        }
      }
    }

    statPearlsEl.textContent = `${satisfiedPearls} / ${totalPearls}`;
    const progressText = `${satisfiedPearls} of ${totalPearls} pearls in harmony`;
    pearlProgressEl.setAttribute('aria-valuemax', totalPearls);
    pearlProgressEl.setAttribute('aria-valuenow', satisfiedPearls);
    pearlProgressEl.setAttribute('aria-valuetext', progressText);
    pearlProgressFillEl.style.width = `${totalPearls ? (satisfiedPearls / totalPearls) * 100 : 0}%`;
    progressLabelEl.textContent = totalPearls ? `${satisfiedPearls} of ${totalPearls} pearls in harmony` : 'No pearls on this board';
  }

  function renderBoard() {
    const size = currentLevel.size;
    const viewSize = 500;
    const padding = 35;
    const cellSize = (viewSize - padding * 2) / (size - 1);

    // Build SVG content
    let svg = `<defs>
      <radialGradient id="grad-white-pearl" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#ffffff"/>
        <stop offset="70%" stop-color="#f1f5f9"/>
        <stop offset="100%" stop-color="#cbd5e1"/>
      </radialGradient>
      <radialGradient id="grad-black-pearl" cx="35%" cy="35%" r="65%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="50%" stop-color="#0f172a"/>
        <stop offset="100%" stop-color="#020617"/>
      </radialGradient>
    </defs>`;

    // Grid lines
    for (let i = 0; i < size; i++) {
      const pos = padding + i * cellSize;
      // Horizontal grid guide
      svg += `<line class="grid-line" x1="${padding}" y1="${pos}" x2="${viewSize - padding}" y2="${pos}"/>`;
      // Vertical grid guide
      svg += `<line class="grid-line" x1="${pos}" y1="${padding}" x2="${pos}" y2="${viewSize - padding}"/>`;
    }

    // Horizontal edges
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size - 1; c++) {
        const x1 = padding + c * cellSize;
        const y1 = padding + r * cellSize;
        const x2 = x1 + cellSize;
        const val = boardState.h[r][c];

        // Hitbox
        svg += `<line class="edge-hitbox" data-type="h" data-r="${r}" data-c="${c}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>`;

        // Render line or cross
        if (val === MasuEngine.EDGE_LINE) {
          svg += `<line class="edge-line" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>`;
        } else if (val === MasuEngine.EDGE_CROSS) {
          const midX = (x1 + x2) / 2;
          const crossSize = 7;
          svg += `<line class="edge-cross" x1="${midX - crossSize}" y1="${y1 - crossSize}" x2="${midX + crossSize}" y2="${y1 + crossSize}"/>`;
          svg += `<line class="edge-cross" x1="${midX + crossSize}" y1="${y1 - crossSize}" x2="${midX - crossSize}" y2="${y1 + crossSize}"/>`;
        }

        // Render hint if active
        if (hintEdge && hintEdge.type === 'h' && hintEdge.r === r && hintEdge.c === c) {
          svg += `<line class="edge-hint" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y1}"/>`;
        }
      }
    }

    // Vertical edges
    for (let r = 0; r < size - 1; r++) {
      for (let c = 0; c < size; c++) {
        const x1 = padding + c * cellSize;
        const y1 = padding + r * cellSize;
        const y2 = y1 + cellSize;
        const val = boardState.v[r][c];

        // Hitbox
        svg += `<line class="edge-hitbox" data-type="v" data-r="${r}" data-c="${c}" x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}"/>`;

        // Render line or cross
        if (val === MasuEngine.EDGE_LINE) {
          svg += `<line class="edge-line" x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}"/>`;
        } else if (val === MasuEngine.EDGE_CROSS) {
          const midY = (y1 + y2) / 2;
          const crossSize = 7;
          svg += `<line class="edge-cross" x1="${x1 - crossSize}" y1="${midY - crossSize}" x2="${x1 + crossSize}" y2="${midY + crossSize}"/>`;
          svg += `<line class="edge-cross" x1="${x1 + crossSize}" y1="${midY - crossSize}" x2="${x1 - crossSize}" y2="${midY + crossSize}"/>`;
        }

        // Render hint if active
        if (hintEdge && hintEdge.type === 'v' && hintEdge.r === r && hintEdge.c === c) {
          svg += `<line class="edge-hint" x1="${x1}" y1="${y1}" x2="${x1}" y2="${y2}"/>`;
        }
      }
    }

    // Pearls
    const pearlRadius = Math.max(12, cellSize * 0.28);
    for (let r = 0; r < size; r++) {
      for (let c = 0; c < size; c++) {
        const pearl = currentLevel.clues[r][c];
        if (pearl !== MasuEngine.PEARL_NONE) {
          const cx = padding + c * cellSize;
          const cy = padding + r * cellSize;
          let pearlClass = pearl === MasuEngine.PEARL_WHITE ? 'pearl-white' : 'pearl-black';
          const fill = pearl === MasuEngine.PEARL_WHITE ? 'url(#grad-white-pearl)' : 'url(#grad-black-pearl)';

          // Status glow check
          const deg = MasuEngine.getCellDegree(boardState, r, c);
          if (deg === 2) {
            let isValid = false;
            if (pearl === MasuEngine.PEARL_WHITE) {
              isValid = MasuEngine.validateWhitePearl(boardState, r, c).valid;
            } else {
              isValid = MasuEngine.validateBlackPearl(boardState, r, c).valid;
            }
            pearlClass += isValid ? ' pearl-satisfied' : ' pearl-violation';
          } else if (deg > 2) {
            pearlClass += ' pearl-violation';
          }

          svg += `<circle class="${pearlClass}" cx="${cx}" cy="${cy}" r="${pearlRadius}" fill="${fill}"/>`;

          // Inner gleam
          if (pearl === MasuEngine.PEARL_BLACK) {
            svg += `<circle class="pearl-shine" cx="${cx - pearlRadius * 0.3}" cy="${cy - pearlRadius * 0.3}" r="${pearlRadius * 0.25}"/>`;
          }
        }
      }
    }

    boardSvg.innerHTML = svg;
    attachBoardEvents();
  }

  function handleEdgeInteraction(type, r, c, isRightClick = false) {
    const currentVal = type === 'h' ? boardState.h[r][c] : boardState.v[r][c];
    let targetMode = currentMode;
    if (isRightClick) {
      targetMode = 'cross';
    }

    let nextVal = MasuEngine.EDGE_NONE;
    if (targetMode === 'line') {
      nextVal = currentVal === MasuEngine.EDGE_LINE ? MasuEngine.EDGE_NONE : MasuEngine.EDGE_LINE;
    } else {
      nextVal = currentVal === MasuEngine.EDGE_CROSS ? MasuEngine.EDGE_NONE : MasuEngine.EDGE_CROSS;
    }

    if (dragMode !== null) {
      nextVal = dragMode;
    }

    if (currentVal !== nextVal) {
      undoStack.push({ type, r, c, oldVal: currentVal, newVal: nextVal });
      if (type === 'h') {
        boardState.h[r][c] = nextVal;
      } else {
        boardState.v[r][c] = nextVal;
      }

      moveCount++;
      statMovesEl.textContent = moveCount;

      // Audio feedback
      if (nextVal === MasuEngine.EDGE_LINE) {
        ZenAudio.playSegment();
      } else if (nextVal === MasuEngine.EDGE_CROSS) {
        ZenAudio.playCross();
      } else {
        ZenAudio.playErase();
      }

      // Check if this move satisfied any pearl
      updatePearlCounter();
      renderBoard();

      // Check completion
      if (MasuEngine.isSolved(boardState, currentLevel.clues)) {
        handleVictory();
      }
    }
  }

  function attachBoardEvents() {
    const hitboxes = boardSvg.querySelectorAll('.edge-hitbox');

    hitboxes.forEach(hb => {
      hb.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        isDragging = true;
        const type = hb.getAttribute('data-type');
        const r = parseInt(hb.getAttribute('data-r'), 10);
        const c = parseInt(hb.getAttribute('data-c'), 10);
        const isRight = e.button === 2;

        const currentVal = type === 'h' ? boardState.h[r][c] : boardState.v[r][c];
        if (isRight || currentMode === 'cross') {
          dragMode = currentVal === MasuEngine.EDGE_CROSS ? MasuEngine.EDGE_NONE : MasuEngine.EDGE_CROSS;
        } else {
          dragMode = currentVal === MasuEngine.EDGE_LINE ? MasuEngine.EDGE_NONE : MasuEngine.EDGE_LINE;
        }

        handleEdgeInteraction(type, r, c, isRight);
      });

      hb.addEventListener('pointerenter', (e) => {
        if (isDragging) {
          const type = hb.getAttribute('data-type');
          const r = parseInt(hb.getAttribute('data-r'), 10);
          const c = parseInt(hb.getAttribute('data-c'), 10);
          handleEdgeInteraction(type, r, c, false);
        }
      });

      hb.addEventListener('contextmenu', (e) => {
        e.preventDefault();
      });
    });
  }

  window.addEventListener('pointerup', () => {
    isDragging = false;
    dragMode = null;
  });

  window.addEventListener('pointercancel', () => {
    isDragging = false;
    dragMode = null;
  });

  function handleVictory() {
    ZenAudio.playVictory();
    completedLevels.add(currentLevel.id);
    saveProgress();

    victoryMoves.textContent = moveCount;
    victoryPack.textContent = currentLevel.pack;
    modalVictory.classList.add('active');
  }

  // Button Listeners
  btnSound.addEventListener('click', () => {
    ZenAudio.toggleMute();
    updateSoundIcon();
  });

  btnRules.addEventListener('click', () => {
    modalRules.classList.add('active');
  });

  btnLevels.addEventListener('click', () => {
    renderLevelSelect();
    modalLevels.classList.add('active');
  });

  btnMode.addEventListener('click', () => {
    currentMode = currentMode === 'line' ? 'cross' : 'line';
    if (currentMode === 'line') {
      btnMode.className = 'btn-action btn-mode active-line';
      btnMode.setAttribute('aria-pressed', 'true');
      modeIcon.textContent = '✏️';
      modeText.textContent = 'Draw';
    } else {
      btnMode.className = 'btn-action btn-mode active-cross';
      btnMode.setAttribute('aria-pressed', 'false');
      modeIcon.textContent = '❌';
      modeText.textContent = 'Cross';
    }
  });

  btnHint.addEventListener('click', () => {
    const hint = MasuEngine.getHint(boardState, currentLevel.clues);
    if (hint) {
      hintEdge = hint.edge || { type: hint.type, r: hint.r, c: hint.c, val: hint.val };
      ZenAudio.playHint();
      renderBoard();
      // Auto clear hint glow after 3 seconds
      setTimeout(() => {
        hintEdge = null;
        renderBoard();
      }, 3000);
    }
  });

  btnUndo.addEventListener('click', () => {
    if (undoStack.length === 0) return;
    const last = undoStack.pop();
    if (last.type === 'h') {
      boardState.h[last.r][last.c] = last.oldVal;
    } else {
      boardState.v[last.r][last.c] = last.oldVal;
    }
    ZenAudio.playErase();
    updatePearlCounter();
    renderBoard();
  });

  btnReset.addEventListener('click', () => {
    boardState = MasuEngine.createState(currentLevel.size, currentLevel.size);
    undoStack = [];
    hintEdge = null;
    ZenAudio.playErase();
    updatePearlCounter();
    renderBoard();
  });

  btnNextLevel.addEventListener('click', () => {
    modalVictory.classList.remove('active');
    if (currentLevelIdx + 1 < ZENMASU_LEVELS.length) {
      loadLevel(currentLevelIdx + 1);
    }
  });

  // Modal Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modalId = btn.getAttribute('data-close');
      document.getElementById(modalId).classList.remove('active');
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        overlay.classList.remove('active');
      }
    });
  });

  // Render Level Selection Grid
  function renderLevelSelect() {
    const packTabsEl = document.getElementById('pack-tabs');
    const levelsGridEl = document.getElementById('levels-grid');

    const packs = [
      'Spring Garden',
      'Koi River',
      'Bamboo Forest',
      'Stone Path',
      'Zen Sanctuary'
    ];

    let currentPack = currentLevel.pack;

    function renderTabs() {
      packTabsEl.innerHTML = packs.map(p => `
        <button class="pack-tab ${p === currentPack ? 'active' : ''}" type="button" data-pack="${p}" aria-pressed="${p === currentPack}">
          ${p}
        </button>
      `).join('');

      packTabsEl.querySelectorAll('.pack-tab').forEach(tab => {
        tab.addEventListener('click', () => {
          currentPack = tab.getAttribute('data-pack');
          renderTabs();
          renderCards();
        });
      });
    }

    function renderCards() {
      const packLevels = ZENMASU_LEVELS.filter(l => l.pack === currentPack);
      levelsGridEl.innerHTML = packLevels.map(lvl => {
        const isDone = completedLevels.has(lvl.id);
        const isCurr = lvl.id === currentLevel.id;
        let cls = 'level-card';
        if (isDone) cls += ' completed';
        if (isCurr) cls += ' current';
        return `
          <button class="${cls}" type="button" data-id="${lvl.id}" aria-label="Level ${lvl.levelNum}${isDone ? ', completed' : ''}${isCurr ? ', current level' : ''}" aria-current="${isCurr ? 'step' : 'false'}">
            ${lvl.levelNum}
          </button>
        `;
      }).join('');

      levelsGridEl.querySelectorAll('.level-card').forEach(card => {
        card.addEventListener('click', () => {
          const id = parseInt(card.getAttribute('data-id'), 10);
          const idx = ZENMASU_LEVELS.findIndex(l => l.id === id);
          if (idx !== -1) {
            loadLevel(idx);
            modalLevels.classList.remove('active');
          }
        });
      });
    }

    renderTabs();
    renderCards();
  }

  // Register service worker
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').catch(() => {});
    });
  }

  // Initial load
  updateSoundIcon();
  loadLevel(currentLevelIdx);
})();
