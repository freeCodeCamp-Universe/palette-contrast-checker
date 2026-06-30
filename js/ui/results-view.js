/**
 * Results view — renders result cards with live text previews.
 */

export function initResultsView(store) {
  const section = document.getElementById('results-section');
  const grid = document.getElementById('results-grid');
  const countEl = document.getElementById('results-count');
  const exportGroup = document.getElementById('analysis-export-group');
  // Preview Settings only affect result cards, so they share the results' visibility.
  const previewControls = document.getElementById('preview-controls');

  function render() {
    const { results, preferences } = store.getState();

    if (!results || results.length === 0) {
      section.hidden = true;
      exportGroup.hidden = true;
      previewControls.hidden = true;
      return;
    }

    section.hidden = false;
    exportGroup.hidden = false;
    previewControls.hidden = false;

    const filtered = applyFilters(results, preferences.activeFilters);
    const sorted = applySort(filtered, preferences.activeSort);

    countEl.textContent = `${sorted.length} of ${results.length} combinations`;
    grid.innerHTML = '';

    for (const result of sorted) {
      grid.appendChild(createResultCard(result, preferences));
    }
  }

  store.subscribe(render);
}

function createResultCard(result, preferences) {
  const card = document.createElement('div');
  card.className = 'result-card';

  const header = document.createElement('div');
  header.className = 'result-card-header';
  header.innerHTML = `
    <span class="color-swatch" style="background-color: ${result.foregroundHex}; width:20px; height:20px;"></span>
    <span class="mono">${escapeHtml(result.foregroundLabel)}</span>
    <span class="result-card-arrow">on</span>
    <span class="color-swatch" style="background-color: ${result.backgroundHex}; width:20px; height:20px;"></span>
    <span class="mono">${escapeHtml(result.backgroundLabel)}</span>
  `;

  const preview = document.createElement('div');
  preview.className = 'result-card-preview';
  preview.style.backgroundColor = result.backgroundHex;
  preview.style.color = result.foregroundHex;
  preview.style.fontFamily = preferences.fontFamily;
  preview.style.fontSize = `${preferences.fontSize}px`;
  preview.textContent = preferences.previewText;

  const ratio = document.createElement('div');
  ratio.className = 'result-card-ratio';
  ratio.textContent = `${result.contrastRatio}:1`;

  // Split each text criterion into its own AA and AAA pass/fail badge so the
  // level reached is explicit. Non-text contrast (WCAG 1.4.11) only defines a
  // single 3:1 level, so it stays as one badge.
  const badges = document.createElement('ul');
  badges.className = 'result-card-badges';
  badges.appendChild(makeBadge('Normal text AA', result.normalText !== 'fail'));
  badges.appendChild(makeBadge('Normal text AAA', result.normalText === 'AAA'));
  badges.appendChild(makeBadge('Large text AA', result.largeText !== 'fail'));
  badges.appendChild(makeBadge('Large text AAA', result.largeText === 'AAA'));
  badges.appendChild(makeBadge('Non-text', result.nonText !== 'fail'));

  card.appendChild(header);
  card.appendChild(preview);
  card.appendChild(ratio);
  card.appendChild(badges);

  return card;
}

// One binary pass/fail list item per criterion+level. Pass is green, fail is
// red, with a check/cross icon and an explicit "Pass"/"Fail" word so the state
// is never signalled by color alone.
function makeBadge(label, pass) {
  const li = document.createElement('li');
  const icon = pass ? '\u2713' : '\u2717';
  li.className = `badge ${pass ? 'badge-pass' : 'badge-fail'}`;
  li.textContent = `${icon} ${label}: ${pass ? 'Pass' : 'Fail'}`;
  return li;
}



export function applyFilters(results, filters) {
  return results.filter((r) => {
    // Level filter
    if (filters.level === 'fail') {
      if (r.normalText !== 'fail' || r.largeText !== 'fail' || r.nonText !== 'fail') return false;
    } else if (filters.level === 'AA') {
      if (r.normalText === 'fail' && r.largeText === 'fail' && r.nonText === 'fail') return false;
    } else if (filters.level === 'AAA') {
      if (r.normalText !== 'AAA' && r.largeText !== 'AAA') return false;
    }

    // Category filter
    if (filters.category === 'normalText' && r.normalText === 'fail') return false;
    if (filters.category === 'largeText' && r.largeText === 'fail') return false;
    if (filters.category === 'nonText' && r.nonText === 'fail') return false;

    // Color filters
    if (filters.foreground && r.foregroundHex !== filters.foreground) return false;
    if (filters.background && r.backgroundHex !== filters.background) return false;

    return true;
  });
}

export function applySort(results, sortKey) {
  const sorted = [...results];
  switch (sortKey) {
    case 'contrast-desc':
      sorted.sort((a, b) => b.contrastRatio - a.contrastRatio);
      break;
    case 'contrast-asc':
      sorted.sort((a, b) => a.contrastRatio - b.contrastRatio);
      break;
    case 'pass-status': {
      const rank = (r) => {
        if (r.normalText === 'AAA') return 0;
        if (r.normalText === 'AA') return 1;
        if (r.largeText === 'AAA') return 2;
        if (r.largeText === 'AA') return 3;
        if (r.nonText === 'AA') return 4;
        return 5;
      };
      sorted.sort((a, b) => rank(a) - rank(b));
      break;
    }
    case 'foreground':
      sorted.sort((a, b) => a.foregroundHex.localeCompare(b.foregroundHex));
      break;
    case 'background':
      sorted.sort((a, b) => a.backgroundHex.localeCompare(b.backgroundHex));
      break;
  }
  return sorted;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
