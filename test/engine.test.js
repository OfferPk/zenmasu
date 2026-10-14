const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const MasuEngine = require('../src/masu-engine.js');

describe('ZenMasu Engine Tests', () => {
  it('should initialize empty state with correct dimensions', () => {
    const state = MasuEngine.createState(5, 5);
    assert.equal(state.rows, 5);
    assert.equal(state.cols, 5);
    assert.equal(state.h.length, 5);
    assert.equal(state.h[0].length, 4);
    assert.equal(state.v.length, 4);
    assert.equal(state.v[0].length, 5);
    assert.equal(MasuEngine.getCellDegree(state, 0, 0), 0);
  });

  it('should calculate cell connections and degree accurately', () => {
    const state = MasuEngine.createState(3, 3);
    state.v[0][1] = MasuEngine.EDGE_LINE;
    state.h[1][1] = MasuEngine.EDGE_LINE;

    assert.equal(MasuEngine.getCellDegree(state, 1, 1), 2);
    const conns = MasuEngine.getCellConnections(state, 1, 1);
    assert.equal(conns.length, 2);
    assert.deepEqual(conns.map(c => c.dir).sort(), ['E', 'N']);
    assert.equal(MasuEngine.isStraight(conns), false);
  });

  it('should detect white pearl straight requirement and adjacent turn violation', () => {
    const state = MasuEngine.createState(3, 3);
    state.v[0][1] = MasuEngine.EDGE_LINE;
    state.h[1][1] = MasuEngine.EDGE_LINE;
    const v1 = MasuEngine.validateWhitePearl(state, 1, 1);
    assert.equal(v1.valid, false);

    state.h[1][1] = MasuEngine.EDGE_NONE;
    state.v[1][1] = MasuEngine.EDGE_LINE;
    const connsStraight = MasuEngine.getCellConnections(state, 1, 1);
    assert.equal(MasuEngine.isStraight(connsStraight), true);
  });

  it('should detect black pearl 90-degree turn and 2-cell extension requirements', () => {
    const state = MasuEngine.createState(4, 4);
    state.h[1][0] = MasuEngine.EDGE_LINE;
    state.h[1][1] = MasuEngine.EDGE_LINE;
    const v1 = MasuEngine.validateBlackPearl(state, 1, 1);
    assert.equal(v1.valid, false);

    state.h[1][0] = MasuEngine.EDGE_NONE;
    state.v[1][1] = MasuEngine.EDGE_LINE;
    state.h[1][1] = MasuEngine.EDGE_LINE;
    const v2 = MasuEngine.validateBlackPearl(state, 1, 1);
    assert.equal(v2.valid, true);

    state.h[2][0] = MasuEngine.EDGE_LINE;
    const v3 = MasuEngine.validateBlackPearl(state, 1, 1);
    assert.equal(v3.valid, false);
  });

  it('should verify single closed loop vs disjoint loops', () => {
    const state = MasuEngine.createState(3, 3);
    state.h[0][0] = MasuEngine.EDGE_LINE;
    state.h[1][0] = MasuEngine.EDGE_LINE;
    state.v[0][0] = MasuEngine.EDGE_LINE;
    state.v[0][1] = MasuEngine.EDGE_LINE;

    const res = MasuEngine.checkSingleLoop(state);
    assert.equal(res.isSingleLoop, true);
    assert.equal(res.cellCount, 4);
  });

  it('should generate deductive hints for boundary pearls', () => {
    const state = MasuEngine.createState(4, 4);
    const clues = [
      [0, MasuEngine.PEARL_BLACK, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ];
    const hint = MasuEngine.getHint(state, clues);
    assert.notEqual(hint, null);
    assert.equal(hint.type, 'v');
    assert.equal(hint.r, 0);
    assert.equal(hint.c, 1);
    assert.equal(hint.val, MasuEngine.EDGE_LINE);
  });

  it('should verify a complete solved 3x3 Masyu puzzle', () => {
    const state = MasuEngine.createState(3, 3);
    const clues = [
      [MasuEngine.PEARL_BLACK, MasuEngine.PEARL_WHITE, 0],
      [0, 0, 0],
      [0, 0, MasuEngine.PEARL_BLACK]
    ];

    state.h[0][0] = MasuEngine.EDGE_LINE;
    state.h[0][1] = MasuEngine.EDGE_LINE;
    state.h[2][0] = MasuEngine.EDGE_LINE;
    state.h[2][1] = MasuEngine.EDGE_LINE;
    state.v[0][0] = MasuEngine.EDGE_LINE;
    state.v[1][0] = MasuEngine.EDGE_LINE;
    state.v[0][2] = MasuEngine.EDGE_LINE;
    state.v[1][2] = MasuEngine.EDGE_LINE;

    assert.equal(MasuEngine.isSolved(state, clues), true);
  });

  it('should verify all 50 handcrafted levels in src/levels.js', () => {
    const levels = require('../src/levels.js');
    assert.equal(levels.length, 50);

    for (const lvl of levels) {
      assert.ok(lvl.id >= 1 && lvl.id <= 50);
      assert.ok(lvl.size >= 5 && lvl.size <= 9);
      assert.equal(lvl.clues.length, lvl.size);

      const state = {
        rows: lvl.size,
        cols: lvl.size,
        h: lvl.solution.h,
        v: lvl.solution.v
      };

      const solved = MasuEngine.isSolved(state, lvl.clues);
      assert.equal(solved, true, `Level ${lvl.id} (${lvl.pack} #${lvl.levelNum}) must be solved`);
    }
  });
});
