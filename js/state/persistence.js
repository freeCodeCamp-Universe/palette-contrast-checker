/**
 * localStorage persistence for palette state.
 */

const STORAGE_KEY = 'palette-contrast-checker';
const SCHEMA_VERSION = 1;

function getStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);
    if (data.version !== SCHEMA_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

function setStorage(data) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...data, version: SCHEMA_VERSION })
    );
    return true;
  } catch {
    return false;
  }
}

export function saveWip(palette) {
  const storage = getStorage() || { version: SCHEMA_VERSION };
  storage.wip = { palette, updatedAt: new Date().toISOString() };
  return setStorage(storage);
}

export function loadWip() {
  const storage = getStorage();
  return storage?.wip?.palette || null;
}

export function clearWip() {
  const storage = getStorage();
  if (storage) {
    delete storage.wip;
    setStorage(storage);
  }
}

export function saveNamedPalette(name, palette) {
  const storage = getStorage() || { version: SCHEMA_VERSION };
  if (!storage.palettes) storage.palettes = {};
  storage.palettes[name] = {
    colors: palette,
    updatedAt: new Date().toISOString(),
  };
  return setStorage(storage);
}

export function loadNamedPalette(name) {
  const storage = getStorage();
  return storage?.palettes?.[name]?.colors || null;
}

export function listNamedPalettes() {
  const storage = getStorage();
  if (!storage?.palettes) return [];
  return Object.entries(storage.palettes).map(([name, data]) => ({
    name,
    colorCount: data.colors?.length || 0,
    colors: data.colors || [],
    updatedAt: data.updatedAt,
  }));
}

export function deleteNamedPalette(name) {
  const storage = getStorage();
  if (storage?.palettes?.[name]) {
    delete storage.palettes[name];
    setStorage(storage);
  }
}

export function paletteNameExists(name) {
  const storage = getStorage();
  return !!storage?.palettes?.[name];
}

export function getExistingPalette(name) {
  const storage = getStorage();
  return storage?.palettes?.[name] || null;
}

export function savePreferences(prefs) {
  const storage = getStorage() || { version: SCHEMA_VERSION };
  storage.preferences = prefs;
  return setStorage(storage);
}

export function loadPreferences() {
  const storage = getStorage();
  return storage?.preferences || null;
}
