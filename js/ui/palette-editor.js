/**
 * Palette editor UI — add colors, display swatches, delete, reorder.
 */

import { parseColor, canonicalize, identifyFormat } from '../lib/color-parse.js';
import { findDuplicate } from '../lib/duplicates.js';
import { generateId } from '../state/actions.js';
import { clearWip } from '../state/persistence.js';
import { initDuplicateResolver } from './duplicate-resolver.js';
import { trapFocus } from '../lib/focus-trap.js';
import { chevronUp, chevronDown, close } from '../lib/icons.js';
import { initColorAutosuggest } from './color-autosuggest.js';

export function initPaletteEditor(store) {
  const input = document.getElementById('color-input');
  const addBtn = document.getElementById('add-color-btn');
  const colorPicker = document.getElementById('color-picker');
  const eyedropperBtn = document.getElementById('eyedropper-btn');
  const paletteList = document.getElementById('palette-list');
  const paletteCount = document.getElementById('palette-count');
  const clearBtn = document.getElementById('clear-palette-btn');
  const validation = document.getElementById('color-validation');

  // Reset confirmation modal
  const resetModal = document.getElementById('reset-modal');
  const resetDesc = document.getElementById('reset-modal-desc');
  const resetConfirm = document.getElementById('reset-confirm-btn');
  const resetCancel = document.getElementById('reset-cancel-btn');
  let removeResetTrap = null;
  let resetTrigger = null;

  // EyeDropper availability
  if (!('EyeDropper' in window)) {
    eyedropperBtn.title = 'Screen color picking is not available in this browser';
    eyedropperBtn.disabled = true;
  }

  function addColor() {
    const raw = input.value.trim();
    if (!raw) return;

    const rgb = parseColor(raw);
    if (!rgb) {
      showValidation('Invalid color. Try hex (#ff0080), rgb(255,0,128), hsl(330,100%,50%), or a color name.', true);
      return;
    }

    const hex = canonicalize(raw);
    const { format } = identifyFormat(raw);
    const palette = store.getState().palette;

    // Check exact raw duplicate
    const exactDup = palette.find(
      (c) => c.originalInputs && c.originalInputs.includes(raw)
    );
    if (exactDup) {
      showValidation('This exact color value is already in your palette.', true);
      return;
    }

    // Check canonical duplicate
    const dup = findDuplicate(hex, palette);
    if (dup.isDuplicate) {
      const existing = palette.find((c) => c.id === dup.existingId);
      initDuplicateResolver(store, {
        newHex: hex,
        newLabel: raw,
        existingId: existing.id,
        existingLabel: existing.displayLabel,
      });
      input.value = '';
      input.dispatchEvent(new Event('input'));
      showValidation('', false);
      return;
    }

    const displayLabel = format === 'hex' ? hex : raw;
    store.dispatch({
      type: 'ADD_COLOR',
      payload: {
        id: generateId(),
        hex,
        displayLabel,
        sourceType: 'manual',
      },
    });

    input.value = '';
    // Fire input so the live preview clears and the autosuggest list closes.
    input.dispatchEvent(new Event('input'));
    showValidation('', false);
    input.focus();
  }

  function showValidation(message, isError) {
    if (!message) {
      validation.textContent = '';
      validation.className = 'color-validation';
      input.removeAttribute('aria-invalid');
      return;
    }
    validation.textContent = message;
    validation.className = isError
      ? 'color-validation form-error'
      : 'color-validation color-preview-inline';
    if (isError) {
      input.setAttribute('aria-invalid', 'true');
    } else {
      input.removeAttribute('aria-invalid');
    }
  }

  // Live validation preview
  input.addEventListener('input', () => {
    const raw = input.value.trim();
    if (!raw) {
      showValidation('', false);
      return;
    }
    const hex = canonicalize(raw);
    if (hex) {
      validation.innerHTML = '';
      const container = document.createElement('div');
      container.className = 'color-preview-inline';
      const swatch = document.createElement('span');
      swatch.className = 'color-swatch';
      swatch.style.width = '20px';
      swatch.style.height = '20px';
      swatch.style.display = 'inline-block';
      swatch.style.backgroundColor = hex;
      container.appendChild(swatch);
      container.appendChild(document.createTextNode(` ${hex}`));
      validation.appendChild(container);
    } else {
      showValidation('', false);
    }
  });

  addBtn.addEventListener('click', addColor);
  // Enter-to-add is handled by the autosuggest so it can intercept Enter when a
  // suggestion is highlighted; it calls addColor otherwise.
  initColorAutosuggest(input, { onSubmit: addColor });

  // Native colour picker: on commit, feed the chosen hex through the same path
  // as a typed value so it previews and auto-adds, mirroring the eyedropper.
  colorPicker.addEventListener('change', () => {
    input.value = colorPicker.value;
    input.dispatchEvent(new Event('input'));
    addColor();
  });

  // EyeDropper
  eyedropperBtn.addEventListener('click', async () => {
    if (!('EyeDropper' in window)) {
      showValidation('Screen color picking is not available in this browser.', true);
      return;
    }
    try {
      const dropper = new EyeDropper();
      const result = await dropper.open();
      input.value = result.sRGBHex;
      input.dispatchEvent(new Event('input'));
      addColor();
    } catch {
      // User cancelled
    }
  });

  // Clear the working palette back to empty. Reuses LOAD_PALETTE (which also
  // clears results, suggestions, alerts, and color filters), then drops the
  // recovery snapshot and the shared URL so a reload/share starts fresh. Saved
  // named palettes live under a separate storage key and are left untouched.
  function resetPalette() {
    store.dispatch({ type: 'LOAD_PALETTE', payload: [] });
    clearWip();
    history.replaceState(null, '', window.location.pathname);
    input.focus();
  }

  function closeResetModal() {
    resetModal.hidden = true;
    removeResetTrap?.();
    removeResetTrap = null;
    resetTrigger?.focus();
  }

  clearBtn.addEventListener('click', () => {
    const count = store.getState().palette.length;
    resetTrigger = document.activeElement;
    resetDesc.textContent = `This removes all ${count} color${count !== 1 ? 's' : ''} from your palette. Saved palettes aren't affected.`;
    resetModal.hidden = false;
    removeResetTrap = trapFocus(resetModal, closeResetModal);
    resetCancel.focus();
  });

  resetConfirm.addEventListener('click', () => {
    closeResetModal();
    resetPalette();
  });

  resetCancel.addEventListener('click', closeResetModal);

  // Render palette list
  function render() {
    const { palette } = store.getState();
    paletteList.innerHTML = '';

    for (const color of palette) {
      const li = document.createElement('li');
      li.className = 'palette-item';
      li.dataset.id = color.id;

      li.innerHTML = `
        <span class="color-swatch" style="background-color: ${color.hex}"></span>
        <div class="palette-item-info">
          <span class="palette-item-label">${escapeHtml(color.displayLabel)}</span>
          ${color.displayLabel !== color.hex
            ? `<span class="palette-item-hex">${color.hex}</span>`
            : ''}
        </div>
        <div class="palette-item-actions">
          <button class="btn-icon move-up-btn" title="Move up" aria-label="Move ${escapeHtml(color.displayLabel)} up" ${color.position === 0 ? 'disabled' : ''}>${chevronUp}</button>
          <button class="btn-icon move-down-btn" title="Move down" aria-label="Move ${escapeHtml(color.displayLabel)} down" ${color.position === palette.length - 1 ? 'disabled' : ''}>${chevronDown}</button>
          <button class="btn-icon delete-btn" title="Remove" aria-label="Remove ${escapeHtml(color.displayLabel)}">${close}</button>
        </div>
      `;

      li.querySelector('.delete-btn').addEventListener('click', () => {
        store.dispatch({ type: 'REMOVE_COLOR', payload: { id: color.id } });
      });
      li.querySelector('.move-up-btn').addEventListener('click', () => {
        store.dispatch({
          type: 'REORDER_COLOR',
          payload: { fromIndex: color.position, toIndex: color.position - 1 },
        });
      });
      li.querySelector('.move-down-btn').addEventListener('click', () => {
        store.dispatch({
          type: 'REORDER_COLOR',
          payload: { fromIndex: color.position, toIndex: color.position + 1 },
        });
      });

      paletteList.appendChild(li);
    }

    paletteCount.textContent = palette.length > 0
      ? `${palette.length} color${palette.length !== 1 ? 's' : ''}`
      : '';
    clearBtn.hidden = palette.length === 0;

    // Enable/disable analyze button
    const analyzeBtn = document.getElementById('analyze-btn');
    analyzeBtn.setAttribute('aria-disabled', String(palette.length < 2));
  }

  store.subscribe(render);
  render();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
