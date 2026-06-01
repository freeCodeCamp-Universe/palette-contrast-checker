/**
 * Palette editor UI — add colors, display swatches, delete, reorder.
 */

import { parseColor, canonicalize, identifyFormat } from '../lib/color-parse.js';
import { findDuplicate } from '../lib/duplicates.js';
import { generateId } from '../state/actions.js';
import { initDuplicateResolver } from './duplicate-resolver.js';

export function initPaletteEditor(store) {
  const input = document.getElementById('color-input');
  const addBtn = document.getElementById('add-color-btn');
  const eyedropperBtn = document.getElementById('eyedropper-btn');
  const paletteList = document.getElementById('palette-list');
  const paletteCount = document.getElementById('palette-count');
  const validation = document.getElementById('color-validation');

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
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') addColor();
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
          <button class="btn-icon move-up-btn" title="Move up" aria-label="Move ${escapeHtml(color.displayLabel)} up" ${color.position === 0 ? 'disabled' : ''}><span aria-hidden="true">&#9650;</span></button>
          <button class="btn-icon move-down-btn" title="Move down" aria-label="Move ${escapeHtml(color.displayLabel)} down" ${color.position === palette.length - 1 ? 'disabled' : ''}><span aria-hidden="true">&#9660;</span></button>
          <button class="btn-icon delete-btn" title="Remove" aria-label="Remove ${escapeHtml(color.displayLabel)}"><span aria-hidden="true">&#10005;</span></button>
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
