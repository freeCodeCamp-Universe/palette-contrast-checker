/**
 * Storage panel — save/load palettes, import/export CSV, share URL.
 */

import { trapFocus } from '../lib/focus-trap.js';
import {
  saveNamedPalette,
  loadNamedPalette,
  listNamedPalettes,
  paletteNameExists,
  getExistingPalette,
  deleteNamedPalette,
} from '../state/persistence.js';
import { generateId } from '../state/actions.js';
import { encodePaletteToHash } from '../lib/palette-url.js';
import { serializePaletteCsv, parsePaletteCsv } from '../lib/csv-io.js';
import { exportAsMarkdown, exportAsCsv, exportAsJson } from '../lib/export-analysis.js';
import { check } from '../lib/icons.js';

export function initStoragePanel(store) {
  const saveBtn = document.getElementById('save-palette-btn');
  const loadBtn = document.getElementById('load-palette-btn');
  const importBtn = document.getElementById('import-csv-btn');
  const exportCsvBtn = document.getElementById('export-csv-btn');
  const shareBtn = document.getElementById('share-url-btn');
  const saveDialog = document.getElementById('save-dialog');
  const saveInput = document.getElementById('save-name-input');
  const saveConfirm = document.getElementById('save-confirm-btn');
  const saveCancel = document.getElementById('save-cancel-btn');
  const saveOverwrite = document.getElementById('save-overwrite-warning');
  const loadDialog = document.getElementById('load-dialog');
  const loadList = document.getElementById('saved-palettes-list');
  const csvFileInput = document.getElementById('csv-file-input');

  const exportMdBtn = document.getElementById('export-md-btn');
  const exportAnalysisCsvBtn = document.getElementById('export-analysis-csv-btn');
  const exportJsonBtn = document.getElementById('export-json-btn');

  const overwriteModal = document.getElementById('overwrite-modal');
  const overwriteDesc = document.getElementById('overwrite-modal-desc');
  const overwritePreview = document.getElementById('overwrite-modal-preview');
  const overwriteCancel = document.getElementById('overwrite-cancel-btn');
  const overwriteConfirm = document.getElementById('overwrite-confirm-btn');

  const statusEl = document.getElementById('storage-status');

  let pendingOverwriteName = null;
  let overwriteTrigger = null;
  let removeOverwriteTrap = null;

  // Confirm an action in a polite live region so it's announced to screen
  // readers and visible to sighted users. It persists until the next storage
  // action replaces it.
  function showStatus(message) {
    statusEl.innerHTML = `${check}<span>${escapeHtml(message)}</span>`;
  }

  function closeOverwriteModal() {
    overwriteModal.hidden = true;
    removeOverwriteTrap?.();
    removeOverwriteTrap = null;
    overwriteTrigger?.focus();
  }

  // Save palette
  saveBtn.addEventListener('click', () => {
    saveDialog.hidden = !saveDialog.hidden;
    loadDialog.hidden = true;
    if (!saveDialog.hidden) saveInput.focus();
  });

  saveCancel.addEventListener('click', () => {
    saveDialog.hidden = true;
    saveOverwrite.hidden = true;
  });

  saveConfirm.addEventListener('click', () => {
    const name = saveInput.value.trim();
    if (!name) return;

    if (paletteNameExists(name)) {
      const existing = getExistingPalette(name);
      pendingOverwriteName = name;
      overwriteTrigger = document.activeElement;
      overwriteDesc.textContent = `A palette named "${name}" already exists with ${existing.colors.length} colors.`;
      overwritePreview.innerHTML = existing.colors
        .map(
          (c) =>
            `<span class="flex-center" style="margin-bottom:4px"><span class="color-swatch" style="background:${c.hex};width:16px;height:16px"></span> <span class="mono" style="font-size:0.85rem">${c.displayLabel || c.hex}</span></span>`
        )
        .join('');
      overwriteModal.hidden = false;
      removeOverwriteTrap = trapFocus(overwriteModal, closeOverwriteModal);
      overwriteCancel.focus();
      return;
    }

    doSave(name);
  });

  overwriteConfirm.addEventListener('click', () => {
    if (pendingOverwriteName) {
      doSave(pendingOverwriteName);
      pendingOverwriteName = null;
    }
    closeOverwriteModal();
  });

  overwriteCancel.addEventListener('click', () => {
    pendingOverwriteName = null;
    closeOverwriteModal();
  });

  function doSave(name) {
    const { palette } = store.getState();
    saveNamedPalette(name, palette);
    saveDialog.hidden = true;
    saveOverwrite.hidden = true;
    saveInput.value = '';
    showStatus(`Palette "${name}" saved.`);
  }

  // Load palette
  loadBtn.addEventListener('click', () => {
    loadDialog.hidden = !loadDialog.hidden;
    saveDialog.hidden = true;
    if (!loadDialog.hidden) {
      renderLoadList();
      loadList.querySelector('.load-btn')?.focus();
    }
  });

  function renderLoadList() {
    const palettes = listNamedPalettes();
    loadList.innerHTML = '';

    if (palettes.length === 0) {
      loadList.innerHTML = '<li class="text-muted">No saved palettes.</li>';
      return;
    }

    for (const p of palettes) {
      const li = document.createElement('li');
      li.className = 'saved-palette-item';
      li.innerHTML = `
        <div>
          <span class="saved-palette-name">${escapeHtml(p.name)}</span>
          <span class="saved-palette-meta">${p.colorCount} colors</span>
        </div>
        <div class="flex-center">
          <button class="btn btn-sm btn-primary load-btn">Load</button>
          <button class="btn btn-sm btn-danger delete-btn">Delete</button>
        </div>
      `;

      li.querySelector('.load-btn').addEventListener('click', () => {
        const colors = loadNamedPalette(p.name);
        if (colors) {
          store.dispatch({ type: 'LOAD_PALETTE', payload: colors });
          showStatus(`Palette "${p.name}" loaded.`);
        }
        loadDialog.hidden = true;
      });

      li.querySelector('.delete-btn').addEventListener('click', () => {
        deleteNamedPalette(p.name);
        renderLoadList();
        showStatus(`Palette "${p.name}" deleted.`);
      });

      loadList.appendChild(li);
    }
  }

  // Import CSV
  importBtn.addEventListener('click', () => csvFileInput.click());
  csvFileInput.addEventListener('change', () => {
    const file = csvFileInput.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const { colors, errors } = parsePaletteCsv(e.target.result);

      if (errors.length > 0) {
        store.dispatch({
          type: 'SET_ALERTS',
          payload: errors.map((err) => `CSV import: ${err}`),
        });
      }

      if (colors.length > 0) {
        const paletteColors = colors.map((c) => ({
          ...c,
          id: generateId(),
          originalInputs: [c.displayLabel],
          sourceType: 'csv-import',
        }));
        store.dispatch({ type: 'LOAD_PALETTE', payload: paletteColors });
      }

      csvFileInput.value = '';
    };
    reader.readAsText(file);
  });

  // Export palette CSV
  exportCsvBtn.addEventListener('click', () => {
    const { palette } = store.getState();
    if (palette.length === 0) return;
    const csv = serializePaletteCsv(palette);
    downloadFile('palette.csv', csv, 'text/csv');
  });

  // Share URL
  shareBtn.addEventListener('click', () => {
    const { palette } = store.getState();
    if (palette.length === 0) return;
    const hash = encodePaletteToHash(palette);
    const url = `${window.location.origin}${window.location.pathname}${hash}`;
    navigator.clipboard.writeText(url).then(() => {
      shareBtn.textContent = 'Copied!';
      setTimeout(() => {
        shareBtn.textContent = 'Share URL';
      }, 2000);
    });
  });

  // Export analysis
  exportMdBtn.addEventListener('click', () => {
    const { palette, results } = store.getState();
    if (!results) return;
    const md = exportAsMarkdown(palette, results);
    downloadFile('analysis.md', md, 'text/markdown');
  });

  exportAnalysisCsvBtn.addEventListener('click', () => {
    const { results } = store.getState();
    if (!results) return;
    const csv = exportAsCsv(results);
    downloadFile('analysis.csv', csv, 'text/csv');
  });

  exportJsonBtn.addEventListener('click', () => {
    const { palette, results } = store.getState();
    if (!results) return;
    const json = exportAsJson(palette, results);
    downloadFile('analysis.json', json, 'application/json');
  });

  // Actions that operate on the current palette make no sense when it's empty.
  // (Load Palette / Import CSV bring colors in, so they stay enabled.)
  function syncControls(state) {
    const empty = state.palette.length === 0;
    saveBtn.disabled = empty;
    shareBtn.disabled = empty;
    exportCsvBtn.disabled = empty;
  }
  store.subscribe(syncControls);
  syncControls(store.getState());
}

function downloadFile(filename, content, mimeType) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
