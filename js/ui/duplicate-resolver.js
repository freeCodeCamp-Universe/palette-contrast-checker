/**
 * Duplicate resolution modal — lets user choose which label to keep.
 */

import { generateId } from '../state/actions.js';
import { trapFocus } from '../lib/focus-trap.js';

export function initDuplicateResolver(store, mergeInfo) {
  const modal = document.getElementById('merge-modal');
  const desc = document.getElementById('merge-modal-desc');
  const options = document.getElementById('merge-modal-options');
  const cancelBtn = document.getElementById('merge-cancel-btn');
  const trigger = document.activeElement;

  desc.textContent = `The color ${mergeInfo.newHex} already exists in your palette. Choose which label to keep:`;

  options.innerHTML = '';
  const labelChoices = [
    { label: mergeInfo.existingLabel, desc: 'Keep existing label' },
    { label: mergeInfo.newLabel, desc: 'Use new input label' },
    { label: mergeInfo.newHex, desc: 'Use canonical hex' },
  ];

  // Deduplicate choices
  const seen = new Set();
  const uniqueChoices = labelChoices.filter((c) => {
    if (seen.has(c.label)) return false;
    seen.add(c.label);
    return true;
  });

  let removeTrap;

  function close() {
    modal.hidden = true;
    removeTrap?.();
    trigger?.focus();
  }

  for (const choice of uniqueChoices) {
    const btn = document.createElement('button');
    btn.className = 'btn btn-secondary';
    btn.style.display = 'block';
    btn.style.width = '100%';
    btn.style.marginBottom = 'var(--space-sm)';
    btn.style.textAlign = 'left';
    btn.innerHTML = `<span class="mono">${escapeHtml(choice.label)}</span> <span class="text-muted">${choice.desc}</span>`;

    btn.addEventListener('click', () => {
      store.dispatch({
        type: 'RESOLVE_MERGE',
        payload: {
          keepId: mergeInfo.existingId,
          removeId: null,
          chosenLabel: choice.label,
        },
      });
      close();
    });

    options.appendChild(btn);
  }

  cancelBtn.onclick = close;

  modal.hidden = false;
  removeTrap = trapFocus(modal, close);
  (modal.querySelector('#merge-modal-options button') ?? cancelBtn).focus();
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
