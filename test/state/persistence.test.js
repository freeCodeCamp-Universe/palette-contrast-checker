import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock localStorage for Node environment
const storage = new Map();
const localStorageMock = {
  getItem: (key) => storage.get(key) ?? null,
  setItem: (key, value) => storage.set(key, value),
  removeItem: (key) => storage.delete(key),
  clear: () => storage.clear(),
};
vi.stubGlobal('localStorage', localStorageMock);

const {
  saveWip,
  loadWip,
  clearWip,
  saveNamedPalette,
  loadNamedPalette,
  listNamedPalettes,
  deleteNamedPalette,
  paletteNameExists,
  savePreferences,
  loadPreferences,
} = await import('../../js/state/persistence.js');

describe('persistence', () => {
  beforeEach(() => {
    storage.clear();
  });

  describe('WIP palette', () => {
    it('saves and loads WIP', () => {
      const palette = [{ id: '1', hex: '#ff0000' }];
      saveWip(palette);
      expect(loadWip()).toEqual(palette);
    });

    it('returns null when no WIP exists', () => {
      expect(loadWip()).toBeNull();
    });

    it('clears WIP', () => {
      saveWip([{ id: '1', hex: '#ff0000' }]);
      clearWip();
      expect(loadWip()).toBeNull();
    });
  });

  describe('named palettes', () => {
    it('saves and loads a named palette', () => {
      const palette = [{ id: '1', hex: '#ff0000' }];
      saveNamedPalette('test', palette);
      expect(loadNamedPalette('test')).toEqual(palette);
    });

    it('returns null for nonexistent name', () => {
      expect(loadNamedPalette('nope')).toBeNull();
    });

    it('lists saved palettes', () => {
      saveNamedPalette('a', [{ id: '1', hex: '#ff0000' }]);
      saveNamedPalette('b', [{ id: '2', hex: '#00ff00' }]);
      const list = listNamedPalettes();
      expect(list).toHaveLength(2);
      expect(list.map((p) => p.name)).toContain('a');
      expect(list.map((p) => p.name)).toContain('b');
    });

    it('includes colors and updatedAt in the list', () => {
      saveNamedPalette('a', [
        { id: '1', hex: '#ff0000' },
        { id: '2', hex: '#00ff00' },
      ]);
      const [entry] = listNamedPalettes();
      expect(entry.colorCount).toBe(2);
      expect(entry.colors.map((c) => c.hex)).toEqual(['#ff0000', '#00ff00']);
      expect(typeof entry.updatedAt).toBe('string');
    });

    it('checks if name exists', () => {
      saveNamedPalette('exists', []);
      expect(paletteNameExists('exists')).toBe(true);
      expect(paletteNameExists('nope')).toBe(false);
    });

    it('deletes a named palette', () => {
      saveNamedPalette('del', []);
      deleteNamedPalette('del');
      expect(loadNamedPalette('del')).toBeNull();
    });

    it('overwrites existing palette', () => {
      saveNamedPalette('x', [{ id: '1', hex: '#ff0000' }]);
      saveNamedPalette('x', [{ id: '2', hex: '#00ff00' }]);
      const loaded = loadNamedPalette('x');
      expect(loaded).toHaveLength(1);
      expect(loaded[0].hex).toBe('#00ff00');
    });
  });

  describe('preferences', () => {
    it('saves and loads preferences', () => {
      const prefs = { previewText: 'Hello', fontFamily: 'Georgia' };
      savePreferences(prefs);
      expect(loadPreferences()).toEqual(prefs);
    });

    it('returns null when no preferences exist', () => {
      expect(loadPreferences()).toBeNull();
    });
  });

  describe('corrupt data', () => {
    it('returns null for corrupt localStorage', () => {
      storage.set('palette-contrast-checker', 'not-json');
      expect(loadWip()).toBeNull();
    });

    it('returns null for wrong schema version', () => {
      storage.set(
        'palette-contrast-checker',
        JSON.stringify({ version: 999, wip: { palette: [] } })
      );
      expect(loadWip()).toBeNull();
    });
  });
});
