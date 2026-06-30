/**
 * Reducer and action types for palette state management.
 */

let nextId = 1;
export function generateId() {
  return String(nextId++);
}
export function resetIdCounter(val = 1) {
  nextId = val;
}

// The foreground/background result filters hold specific palette hex values, so
// they become stale when the palette changes. Reset them to "Any".
function clearColorFilters(preferences) {
  return {
    ...preferences,
    activeFilters: { ...preferences.activeFilters, foreground: null, background: null },
  };
}

export function getInitialState() {
  return {
    palette: [],
    results: null,
    suggestions: null,
    preferences: {
      previewText: 'The quick brown fox jumps over the lazy dog.',
      fontFamily: 'Arial',
      fontSize: 18,
      // null = follow the OS (prefers-color-scheme); 'light'/'dark' = user choice.
      theme: null,
      activeFilters: { category: 'all', level: 'all', foreground: null, background: null },
      activeSort: 'contrast-desc',
    },
    ui: {
      pendingMerge: null,
      analysisRunning: false,
      recoveryAvailable: false,
      alerts: [],
    },
  };
}

export function reducer(state, action) {
  switch (action.type) {
    case 'ADD_COLOR': {
      const { id, hex, displayLabel, sourceType } = action.payload;
      return {
        ...state,
        palette: [
          ...state.palette,
          {
            id,
            hex,
            displayLabel,
            originalInputs: [displayLabel],
            sourceType: sourceType || 'manual',
            position: state.palette.length,
          },
        ],
        results: null,
        suggestions: null,
        ui: { ...state.ui, alerts: [] },
        preferences: clearColorFilters(state.preferences),
      };
    }

    case 'REMOVE_COLOR': {
      const filtered = state.palette
        .filter((c) => c.id !== action.payload.id)
        .map((c, i) => ({ ...c, position: i }));
      return {
        ...state,
        palette: filtered,
        results: null,
        suggestions: null,
        ui: { ...state.ui, alerts: [] },
        preferences: clearColorFilters(state.preferences),
      };
    }

    case 'REORDER_COLOR': {
      const { fromIndex, toIndex } = action.payload;
      const palette = [...state.palette];
      const [moved] = palette.splice(fromIndex, 1);
      palette.splice(toIndex, 0, moved);
      return {
        ...state,
        palette: palette.map((c, i) => ({ ...c, position: i })),
      };
    }

    case 'SET_PENDING_MERGE': {
      return {
        ...state,
        ui: { ...state.ui, pendingMerge: action.payload },
      };
    }

    case 'RESOLVE_MERGE': {
      const { keepId, removeId, chosenLabel } = action.payload;
      const palette = state.palette
        .filter((c) => c.id !== removeId)
        .map((c) => {
          if (c.id === keepId) {
            return { ...c, displayLabel: chosenLabel };
          }
          return c;
        })
        .map((c, i) => ({ ...c, position: i }));
      return {
        ...state,
        palette,
        ui: { ...state.ui, pendingMerge: null, alerts: [] },
        results: null,
        suggestions: null,
        preferences: clearColorFilters(state.preferences),
      };
    }

    case 'SET_RESULTS': {
      return { ...state, results: action.payload };
    }

    case 'SET_SUGGESTIONS': {
      return { ...state, suggestions: action.payload };
    }

    case 'CLEAR_RESULTS': {
      return { ...state, results: null, suggestions: null };
    }

    case 'SET_PREVIEW_TEXT': {
      return {
        ...state,
        preferences: { ...state.preferences, previewText: action.payload },
      };
    }

    case 'SET_FONT_FAMILY': {
      return {
        ...state,
        preferences: { ...state.preferences, fontFamily: action.payload },
      };
    }

    case 'SET_FONT_SIZE': {
      return {
        ...state,
        preferences: { ...state.preferences, fontSize: action.payload },
      };
    }

    case 'SET_FILTERS': {
      return {
        ...state,
        preferences: {
          ...state.preferences,
          activeFilters: { ...state.preferences.activeFilters, ...action.payload },
        },
      };
    }

    case 'SET_SORT': {
      return {
        ...state,
        preferences: { ...state.preferences, activeSort: action.payload },
      };
    }

    case 'SET_THEME': {
      return {
        ...state,
        preferences: { ...state.preferences, theme: action.payload },
      };
    }

    case 'SET_ANALYSIS_RUNNING': {
      return {
        ...state,
        ui: { ...state.ui, analysisRunning: action.payload },
      };
    }

    case 'SET_RECOVERY_AVAILABLE': {
      return {
        ...state,
        ui: { ...state.ui, recoveryAvailable: action.payload },
      };
    }

    case 'SET_ALERTS': {
      return {
        ...state,
        ui: { ...state.ui, alerts: action.payload },
      };
    }

    case 'LOAD_PALETTE': {
      return {
        ...state,
        palette: action.payload.map((c, i) => ({ ...c, position: i })),
        results: null,
        suggestions: null,
        ui: { ...state.ui, alerts: [] },
        preferences: clearColorFilters(state.preferences),
      };
    }

    case 'ADD_SUGGESTIONS_TO_PALETTE': {
      const newColors = action.payload.map((s, i) => ({
        id: s.id,
        hex: s.hex,
        displayLabel: s.hex,
        originalInputs: [s.hex],
        sourceType: 'suggestion-import',
        position: state.palette.length + i,
      }));
      return {
        ...state,
        palette: [...state.palette, ...newColors],
        results: null,
        suggestions: null,
        ui: { ...state.ui, alerts: [] },
        preferences: clearColorFilters(state.preferences),
      };
    }

    case 'RESTORE_STATE': {
      return { ...state, ...action.payload };
    }

    default:
      return state;
  }
}
