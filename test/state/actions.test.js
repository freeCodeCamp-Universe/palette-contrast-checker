import { describe, it, expect, beforeEach } from 'vitest';
import { reducer, getInitialState, resetIdCounter } from '../../js/state/actions.js';

describe('reducer', () => {
  let state;

  beforeEach(() => {
    state = getInitialState();
    resetIdCounter();
  });

  describe('ADD_COLOR', () => {
    it('adds a color to the palette', () => {
      const next = reducer(state, {
        type: 'ADD_COLOR',
        payload: { id: '1', hex: '#ff0000', displayLabel: 'red', sourceType: 'manual' },
      });
      expect(next.palette).toHaveLength(1);
      expect(next.palette[0].hex).toBe('#ff0000');
      expect(next.palette[0].displayLabel).toBe('red');
      expect(next.palette[0].position).toBe(0);
    });

    it('clears results when adding a color', () => {
      state.results = [{ mock: true }];
      const next = reducer(state, {
        type: 'ADD_COLOR',
        payload: { id: '1', hex: '#ff0000', displayLabel: 'red' },
      });
      expect(next.results).toBeNull();
    });
  });

  describe('REMOVE_COLOR', () => {
    it('removes a color and reindexes positions', () => {
      state.palette = [
        { id: '1', hex: '#ff0000', position: 0 },
        { id: '2', hex: '#00ff00', position: 1 },
        { id: '3', hex: '#0000ff', position: 2 },
      ];
      const next = reducer(state, { type: 'REMOVE_COLOR', payload: { id: '2' } });
      expect(next.palette).toHaveLength(2);
      expect(next.palette[0].id).toBe('1');
      expect(next.palette[0].position).toBe(0);
      expect(next.palette[1].id).toBe('3');
      expect(next.palette[1].position).toBe(1);
    });
  });

  describe('REORDER_COLOR', () => {
    it('moves a color from one position to another', () => {
      state.palette = [
        { id: '1', hex: '#ff0000', position: 0 },
        { id: '2', hex: '#00ff00', position: 1 },
        { id: '3', hex: '#0000ff', position: 2 },
      ];
      const next = reducer(state, {
        type: 'REORDER_COLOR',
        payload: { fromIndex: 0, toIndex: 2 },
      });
      expect(next.palette[0].id).toBe('2');
      expect(next.palette[1].id).toBe('3');
      expect(next.palette[2].id).toBe('1');
    });
  });

  describe('RESOLVE_MERGE', () => {
    it('keeps chosen label and removes duplicate', () => {
      state.palette = [
        { id: '1', hex: '#ff0000', displayLabel: 'red', position: 0 },
        { id: '2', hex: '#ff0000', displayLabel: 'rgb(255,0,0)', position: 1 },
      ];
      state.ui.pendingMerge = { keepId: '1', removeId: '2' };
      const next = reducer(state, {
        type: 'RESOLVE_MERGE',
        payload: { keepId: '1', removeId: '2', chosenLabel: 'red' },
      });
      expect(next.palette).toHaveLength(1);
      expect(next.palette[0].displayLabel).toBe('red');
      expect(next.ui.pendingMerge).toBeNull();
    });
  });

  describe('SET_RESULTS', () => {
    it('sets results', () => {
      const results = [{ contrastRatio: 21 }];
      const next = reducer(state, { type: 'SET_RESULTS', payload: results });
      expect(next.results).toEqual(results);
    });
  });

  describe('preferences', () => {
    it('updates preview text', () => {
      const next = reducer(state, { type: 'SET_PREVIEW_TEXT', payload: 'Hello' });
      expect(next.preferences.previewText).toBe('Hello');
    });

    it('updates font family', () => {
      const next = reducer(state, { type: 'SET_FONT_FAMILY', payload: 'Georgia' });
      expect(next.preferences.fontFamily).toBe('Georgia');
    });

    it('updates font size', () => {
      const next = reducer(state, { type: 'SET_FONT_SIZE', payload: 24 });
      expect(next.preferences.fontSize).toBe(24);
    });

    it('updates filters', () => {
      const next = reducer(state, {
        type: 'SET_FILTERS',
        payload: { level: 'AAA' },
      });
      expect(next.preferences.activeFilters.level).toBe('AAA');
      expect(next.preferences.activeFilters.category).toBe('all');
    });

    it('updates sort', () => {
      const next = reducer(state, { type: 'SET_SORT', payload: 'contrast-asc' });
      expect(next.preferences.activeSort).toBe('contrast-asc');
    });
  });

  describe('LOAD_PALETTE', () => {
    it('replaces palette and clears results', () => {
      state.results = [{ mock: true }];
      const colors = [
        { id: '1', hex: '#ff0000', displayLabel: 'red' },
        { id: '2', hex: '#00ff00', displayLabel: 'green' },
      ];
      const next = reducer(state, { type: 'LOAD_PALETTE', payload: colors });
      expect(next.palette).toHaveLength(2);
      expect(next.palette[0].position).toBe(0);
      expect(next.palette[1].position).toBe(1);
      expect(next.results).toBeNull();
    });
  });

  describe('ADD_SUGGESTIONS_TO_PALETTE', () => {
    it('appends suggestions to existing palette', () => {
      state.palette = [{ id: '1', hex: '#ff0000', position: 0 }];
      const suggestions = [
        { id: '2', hex: '#000000' },
        { id: '3', hex: '#ffffff' },
      ];
      const next = reducer(state, {
        type: 'ADD_SUGGESTIONS_TO_PALETTE',
        payload: suggestions,
      });
      expect(next.palette).toHaveLength(3);
      expect(next.palette[1].sourceType).toBe('suggestion-import');
      expect(next.palette[2].position).toBe(2);
    });
  });

  describe('clears stale alerts on palette changes', () => {
    const cases = [
      ['ADD_COLOR', { type: 'ADD_COLOR', payload: { id: '9', hex: '#123456', displayLabel: 'x' } }],
      ['REMOVE_COLOR', { type: 'REMOVE_COLOR', payload: { id: '1' } }],
      ['LOAD_PALETTE', { type: 'LOAD_PALETTE', payload: [{ id: '1', hex: '#000000' }] }],
      [
        'ADD_SUGGESTIONS_TO_PALETTE',
        { type: 'ADD_SUGGESTIONS_TO_PALETTE', payload: [{ id: '5', hex: '#abcdef' }] },
      ],
    ];

    for (const [name, action] of cases) {
      it(`${name} empties ui.alerts`, () => {
        state.ui.alerts = ['No color pair passes for normal text.'];
        state.palette = [{ id: '1', hex: '#ff0000', position: 0 }];
        const next = reducer(state, action);
        expect(next.ui.alerts).toEqual([]);
      });
    }

    it('RESOLVE_MERGE empties ui.alerts', () => {
      state.ui.alerts = ['stale'];
      state.palette = [
        { id: '1', hex: '#ff0000', displayLabel: 'red', position: 0 },
        { id: '2', hex: '#ff0000', displayLabel: 'rgb(255,0,0)', position: 1 },
      ];
      const next = reducer(state, {
        type: 'RESOLVE_MERGE',
        payload: { keepId: '1', removeId: '2', chosenLabel: 'red' },
      });
      expect(next.ui.alerts).toEqual([]);
    });
  });

  describe('unknown action', () => {
    it('returns state unchanged', () => {
      const next = reducer(state, { type: 'UNKNOWN' });
      expect(next).toEqual(state);
    });
  });
});
