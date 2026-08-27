/**
 * Drag-and-drop reordering for the palette list.
 */

export function initDragReorder(store) {
  const list = document.getElementById('palette-list');
  let draggedItem = null;
  let draggedIndex = -1;

  list.addEventListener('dragstart', (e) => {
    const item = e.target.closest('.palette-item');
    if (!item) return;
    draggedItem = item;
    draggedIndex = getItemIndex(item);
    item.style.opacity = '0.5';
    e.dataTransfer.effectAllowed = 'move';
  });

  list.addEventListener('dragend', (e) => {
    if (draggedItem) {
      draggedItem.style.opacity = '';
      draggedItem = null;
    }
  });

  list.addEventListener('dragover', (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';

    const target = e.target.closest('.palette-item');
    if (!target || target === draggedItem) return;

    const rect = target.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    if (e.clientY < midY) {
      target.style.borderTop = '2px solid var(--selection-border)';
      target.style.borderBottom = '';
    } else {
      target.style.borderBottom = '2px solid var(--selection-border)';
      target.style.borderTop = '';
    }
  });

  list.addEventListener('dragleave', (e) => {
    const target = e.target.closest('.palette-item');
    if (target) {
      target.style.borderTop = '';
      target.style.borderBottom = '';
    }
  });

  list.addEventListener('drop', (e) => {
    e.preventDefault();
    const target = e.target.closest('.palette-item');
    if (!target || target === draggedItem) return;

    target.style.borderTop = '';
    target.style.borderBottom = '';

    const toIndex = getItemIndex(target);
    if (draggedIndex >= 0 && toIndex >= 0 && draggedIndex !== toIndex) {
      store.dispatch({
        type: 'REORDER_COLOR',
        payload: { fromIndex: draggedIndex, toIndex },
      });
    }
  });

  // Make palette items draggable after render
  store.subscribe(() => {
    const items = list.querySelectorAll('.palette-item');
    items.forEach((item) => {
      item.draggable = true;
    });
  });
}

function getItemIndex(item) {
  const parent = item.parentElement;
  return Array.from(parent.children).indexOf(item);
}
