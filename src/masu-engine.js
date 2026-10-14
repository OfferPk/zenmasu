/**
 * ZenMasu: Masyu (Pearls / 白珠黒珠) Engine
 * Implements full Masyu rules, validation, single loop BFS, deductive hints, and solver.
 */

(function (root, factory) {
  if (typeof module === 'object' && module.exports) {
    module.exports = factory();
  } else {
    root.MasuEngine = factory();
  }
}(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const PEARL_NONE = 0;
  const PEARL_WHITE = 1;
  const PEARL_BLACK = 2;

  const EDGE_NONE = 0;
  const EDGE_LINE = 1;
  const EDGE_CROSS = -1;

  function createState(rows, cols) {
    const h = [];
    for (let r = 0; r < rows; r++) {
      h.push(new Array(cols - 1).fill(EDGE_NONE));
    }
    const v = [];
    for (let r = 0; r < rows - 1; r++) {
      v.push(new Array(cols).fill(EDGE_NONE));
    }
    return { rows, cols, h, v };
  }

  function cloneState(state) {
    return {
      rows: state.rows,
      cols: state.cols,
      h: state.h.map(row => row.slice()),
      v: state.v.map(row => row.slice())
    };
  }

  function getH(state, r, c) {
    if (r >= 0 && r < state.rows && c >= 0 && c < state.cols - 1) {
      return state.h[r][c];
    }
    return EDGE_CROSS;
  }

  function getV(state, r, c) {
    if (r >= 0 && r < state.rows - 1 && c >= 0 && c < state.cols) {
      return state.v[r][c];
    }
    return EDGE_CROSS;
  }

  function setH(state, r, c, val) {
    if (r >= 0 && r < state.rows && c >= 0 && c < state.cols - 1) {
      state.h[r][c] = val;
    }
  }

  function setV(state, r, c, val) {
    if (r >= 0 && r < state.rows - 1 && c >= 0 && c < state.cols) {
      state.v[r][c] = val;
    }
  }

  /**
   * Returns active connections for cell (r, c)
   * directions: N, S, E, W
   */
  function getCellConnections(state, r, c) {
    const conns = [];
    if (r > 0 && state.v[r - 1][c] === EDGE_LINE) {
      conns.push({ dir: 'N', r: r - 1, c: c });
    }
    if (r < state.rows - 1 && state.v[r][c] === EDGE_LINE) {
      conns.push({ dir: 'S', r: r + 1, c: c });
    }
    if (c > 0 && state.h[r][c - 1] === EDGE_LINE) {
      conns.push({ dir: 'W', r: r, c: c - 1 });
    }
    if (c < state.cols - 1 && state.h[r][c] === EDGE_LINE) {
      conns.push({ dir: 'E', r: r, c: c + 1 });
    }
    return conns;
  }

  function getCellDegree(state, r, c) {
    return getCellConnections(state, r, c).length;
  }

  function isStraight(conns) {
    if (conns.length !== 2) return false;
    const d1 = conns[0].dir;
    const d2 = conns[1].dir;
    return (d1 === 'N' && d2 === 'S') || (d1 === 'S' && d2 === 'N') ||
           (d1 === 'E' && d2 === 'W') || (d1 === 'W' && d2 === 'E');
  }

  function checkSingleLoop(state) {
    const visitedCells = [];
    let branchFound = false;

    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const deg = getCellDegree(state, r, c);
        if (deg > 2) branchFound = true;
        if (deg > 0) visitedCells.push({ r, c, deg });
      }
    }

    if (visitedCells.length === 0) {
      return { isClosedLoop: false, hasBranches: branchFound, cellCount: 0, isSingleLoop: false };
    }

    if (branchFound) {
      return { isClosedLoop: false, hasBranches: true, cellCount: visitedCells.length, isSingleLoop: false };
    }

    const allDegree2 = visitedCells.every(c => c.deg === 2);
    if (!allDegree2) {
      return { isClosedLoop: false, hasBranches: false, cellCount: visitedCells.length, isSingleLoop: false };
    }

    const start = visitedCells[0];
    const visitedSet = new Set();
    let curr = start;
    let prev = null;

    while (curr) {
      const key = `${curr.r},${curr.c}`;
      if (visitedSet.has(key)) break;
      visitedSet.add(key);
      const conns = getCellConnections(state, curr.r, curr.c);
      const next = conns.find(n => !prev || n.r !== prev.r || n.c !== prev.c);
      prev = curr;
      curr = next;
    }

    const isClosed = visitedSet.size === visitedCells.length && visitedSet.size >= 4;
    return {
      isClosedLoop: isClosed,
      hasBranches: false,
      cellCount: visitedCells.length,
      isSingleLoop: isClosed
    };
  }

  function validateWhitePearl(state, r, c) {
    const conns = getCellConnections(state, r, c);
    if (conns.length < 2) return { complete: false, valid: true };
    if (conns.length > 2) return { complete: false, valid: false, reason: 'Branch at white pearl' };

    if (!isStraight(conns)) {
      return { complete: false, valid: false, reason: 'White pearl must travel straight' };
    }

    const n1 = conns[0];
    const n2 = conns[1];
    const deg1 = getCellDegree(state, n1.r, n1.c);
    const deg2 = getCellDegree(state, n2.r, n2.c);

    if (deg1 === 2 && deg2 === 2) {
      const c1 = getCellConnections(state, n1.r, n1.c);
      const c2 = getCellConnections(state, n2.r, n2.c);
      const straight1 = isStraight(c1);
      const straight2 = isStraight(c2);
      if (straight1 && straight2) {
        return { complete: true, valid: false, reason: 'White pearl must turn in at least one adjacent cell' };
      }
      return { complete: true, valid: true };
    }

    return { complete: false, valid: true };
  }

  function validateBlackPearl(state, r, c) {
    const conns = getCellConnections(state, r, c);
    if (conns.length < 2) return { complete: false, valid: true };
    if (conns.length > 2) return { complete: false, valid: false, reason: 'Branch at black pearl' };

    if (isStraight(conns)) {
      return { complete: false, valid: false, reason: 'Black pearl must make a 90° turn' };
    }

    for (const neighbor of conns) {
      const nr = neighbor.r;
      const nc = neighbor.c;
      const dir = neighbor.dir;

      let edgeVal = EDGE_NONE;
      if (dir === 'N') {
        edgeVal = nr > 0 ? state.v[nr - 1][nc] : EDGE_CROSS;
      } else if (dir === 'S') {
        edgeVal = nr < state.rows - 1 ? state.v[nr][nc] : EDGE_CROSS;
      } else if (dir === 'W') {
        edgeVal = nc > 0 ? state.h[nr][nc - 1] : EDGE_CROSS;
      } else if (dir === 'E') {
        edgeVal = nc < state.cols - 1 ? state.h[nr][nc] : EDGE_CROSS;
      }

      const deg = getCellDegree(state, nr, nc);
      if (deg === 2 && edgeVal !== EDGE_LINE) {
        return { complete: true, valid: false, reason: 'Loop must continue straight out of black pearl' };
      }
      if (edgeVal === EDGE_CROSS) {
        return { complete: false, valid: false, reason: 'Cannot continue straight out of black pearl' };
      }
    }

    return { complete: true, valid: true };
  }

  function isSolved(state, clues) {
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const pearl = clues[r][c];
        if (pearl === PEARL_WHITE) {
          const v = validateWhitePearl(state, r, c);
          if (!v.valid || getCellDegree(state, r, c) !== 2) return false;
        } else if (pearl === PEARL_BLACK) {
          const v = validateBlackPearl(state, r, c);
          if (!v.valid || getCellDegree(state, r, c) !== 2) return false;
        }
      }
    }

    const loopStatus = checkSingleLoop(state);
    if (!loopStatus.isSingleLoop) return false;

    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        if (clues[r][c] !== PEARL_NONE && getCellDegree(state, r, c) === 0) {
          return false;
        }
      }
    }

    return true;
  }

  function getViolations(state, clues) {
    const violations = [];
    for (let r = 0; r < state.rows; r++) {
      for (let c = 0; c < state.cols; c++) {
        const deg = getCellDegree(state, r, c);
        if (deg > 2) {
          violations.push({ r, c, type: 'branch', message: 'Three or more lines meet at cell' });
        }
        const pearl = clues[r][c];
        if (pearl === PEARL_WHITE) {
          const v = validateWhitePearl(state, r, c);
          if (!v.valid) violations.push({ r, c, type: 'white', message: v.reason });
        } else if (pearl === PEARL_BLACK) {
          const v = validateBlackPearl(state, r, c);
          if (!v.valid) violations.push({ r, c, type: 'black', message: v.reason });
        }
      }
    }
    return violations;
  }

  function getHint(state, clues) {
    const { rows, cols } = state;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (clues[r][c] === PEARL_BLACK) {
          if (r === 0 && getV(state, 0, c) === EDGE_NONE) {
            return { type: 'v', r: 0, c, val: EDGE_LINE, message: 'Black pearl on top border must extend South' };
          }
          if (r === rows - 1 && getV(state, r - 1, c) === EDGE_NONE) {
            return { type: 'v', r: r - 1, c, val: EDGE_LINE, message: 'Black pearl on bottom border must extend North' };
          }
          if (c === 0 && getH(state, r, 0) === EDGE_NONE) {
            return { type: 'h', r, c: 0, val: EDGE_LINE, message: 'Black pearl on left border must extend East' };
          }
          if (c === cols - 1 && getH(state, r, c - 1) === EDGE_NONE) {
            return { type: 'h', r, c: c - 1, val: EDGE_LINE, message: 'Black pearl on right border must extend West' };
          }
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (clues[r][c] === PEARL_WHITE) {
          if (r === 0 || r === rows - 1) {
            if (c > 0 && getH(state, r, c - 1) === EDGE_NONE) {
              return { type: 'h', r, c: c - 1, val: EDGE_LINE, message: 'White pearl on border must run horizontally' };
            }
            if (c < cols - 1 && getH(state, r, c) === EDGE_NONE) {
              return { type: 'h', r, c, val: EDGE_LINE, message: 'White pearl on border must run horizontally' };
            }
          }
          if (c === 0 || c === cols - 1) {
            if (r > 0 && getV(state, r - 1, c) === EDGE_NONE) {
              return { type: 'v', r: r - 1, c, val: EDGE_LINE, message: 'White pearl on border must run vertically' };
            }
            if (r < rows - 1 && getV(state, r, c) === EDGE_NONE) {
              return { type: 'v', r, c, val: EDGE_LINE, message: 'White pearl on border must run vertically' };
            }
          }
        }
      }
    }

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (getCellDegree(state, r, c) === 2) {
          if (r > 0 && state.v[r - 1][c] === EDGE_NONE) return { type: 'v', r: r - 1, c, val: EDGE_CROSS };
          if (r < rows - 1 && state.v[r][c] === EDGE_NONE) return { type: 'v', r, c, val: EDGE_CROSS };
          if (c > 0 && state.h[r][c - 1] === EDGE_NONE) return { type: 'h', r, c: c - 1, val: EDGE_CROSS };
          if (c < cols - 1 && state.h[r][c] === EDGE_NONE) return { type: 'h', r, c, val: EDGE_CROSS };
        }
      }
    }

    return null;
  }

  function solve(clues, rows, cols, maxSolutions = 2) {
    const solutions = [];
    const state = createState(rows, cols);

    const allEdges = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols - 1; c++) allEdges.push({ type: 'h', r, c });
    }
    for (let r = 0; r < rows - 1; r++) {
      for (let c = 0; c < cols; c++) allEdges.push({ type: 'v', r, c });
    }

    function canPrune(currState) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const deg = getCellDegree(currState, r, c);
          if (deg > 2) return true;
          const pearl = clues[r][c];
          if (pearl !== PEARL_NONE) {
            let possible = deg;
            if (r > 0 && currState.v[r - 1][c] === EDGE_NONE) possible++;
            if (r < rows - 1 && currState.v[r][c] === EDGE_NONE) possible++;
            if (c > 0 && currState.h[r][c - 1] === EDGE_NONE) possible++;
            if (c < cols - 1 && currState.h[r][c] === EDGE_NONE) possible++;
            if (possible < 2) return true;
            if (deg === 2) {
              const conns = getCellConnections(currState, r, c);
              if (pearl === PEARL_WHITE && !isStraight(conns)) return true;
              if (pearl === PEARL_BLACK && isStraight(conns)) return true;
            }
          }
        }
      }
      return false;
    }

    function search(index) {
      if (solutions.length >= maxSolutions) return;
      if (canPrune(state)) return;
      if (index === allEdges.length) {
        if (isSolved(state, clues)) solutions.push(cloneState(state));
        return;
      }
      const edge = allEdges[index];
      if (edge.type === 'h') state.h[edge.r][edge.c] = EDGE_LINE;
      else state.v[edge.r][edge.c] = EDGE_LINE;
      search(index + 1);
      if (solutions.length >= maxSolutions) return;
      if (edge.type === 'h') state.h[edge.r][edge.c] = EDGE_NONE;
      else state.v[edge.r][edge.c] = EDGE_NONE;
      search(index + 1);
      if (edge.type === 'h') state.h[edge.r][edge.c] = EDGE_NONE;
      else state.v[edge.r][edge.c] = EDGE_NONE;
    }

    search(0);
    return solutions;
  }

  return {
    PEARL_NONE,
    PEARL_WHITE,
    PEARL_BLACK,
    EDGE_NONE,
    EDGE_LINE,
    EDGE_CROSS,
    createState,
    cloneState,
    getH,
    getV,
    setH,
    setV,
    getCellConnections,
    getCellDegree,
    isStraight,
    checkSingleLoop,
    validateWhitePearl,
    validateBlackPearl,
    isSolved,
    getViolations,
    getHint,
    solve
  };
}));
