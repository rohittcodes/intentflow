import { useState, useCallback, useRef } from 'react';
import { Node, Edge } from '@xyflow/react';
import type { NodeData } from '@/lib/workflow/types';

interface HistoryState {
  nodes: Node<NodeData>[];
  edges: Edge[];
}

const MAX_HISTORY_SIZE = 50;
const UNDO_REDO_RESET_DELAY_MS = 300; // Time window during which changes are ignored after undo/redo

/**
 * Hook for managing undo/redo history in the workflow editor
 */
export function useUndoRedo() {
  const [history, setHistory] = useState<HistoryState[]>([]);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [isEnabled, setIsEnabled] = useState(false);
  const isUndoRedoAction = useRef(false);
  const skipNextPushRef = useRef(false);
  const resetFlagTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Enable tracking and set initial state
   */
  const enableTracking = useCallback((initialNodes: Node<NodeData>[], initialEdges: Edge[]) => {
    const clonedState = {
      nodes: JSON.parse(JSON.stringify(initialNodes)),
      edges: JSON.parse(JSON.stringify(initialEdges)),
    };
    setHistory([clonedState]);
    setCurrentIndex(0);
    setIsEnabled(true);
    // console.log("UndoRedo: Tracking enabled", clonedState);
  }, []);

  /**
   * Push new state to history
   */
  const pushState = useCallback((nodes: Node<NodeData>[], edges: Edge[]) => {
    if (!isEnabled || isUndoRedoAction.current) {
      // console.log("UndoRedo: Push ignored", { isEnabled, isUndoRedoAction: isUndoRedoAction.current });
      return;
    }

    if (skipNextPushRef.current) {
      skipNextPushRef.current = false;
      return;
    }

    setHistory((prev) => {
      // Truncate future history if we were in the middle of history
      const newHistory = prev.slice(0, currentIndex + 1);

      // Clone the state to avoid reference issues
      const clonedState = {
        nodes: JSON.parse(JSON.stringify(nodes)),
        edges: JSON.parse(JSON.stringify(edges)),
      };

      // Don't push if the state is exactly the same as the current one (primitive check)
      // This is basic but helps prevent duplicates if pushState is called accidentally
      if (newHistory.length > 0) {
        const current = newHistory[newHistory.length - 1];
        if (JSON.stringify(current.nodes) === JSON.stringify(clonedState.nodes) &&
          JSON.stringify(current.edges) === JSON.stringify(clonedState.edges)) {
          return prev;
        }
      }

      newHistory.push(clonedState);

      // Limit history size
      if (newHistory.length > MAX_HISTORY_SIZE) {
        newHistory.shift();
      }

      // We always want to update the current index to the end after a new push
      setCurrentIndex(newHistory.length - 1);
      return newHistory;
    });
  }, [isEnabled, currentIndex]);

  /**
   * Undo to previous state
   */
  const undo = useCallback(() => {
    if (currentIndex > 0) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      const state = history[newIndex];

      return {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
    }
    return null;
  }, [currentIndex, history]);

  /**
   * Redo to next state
   */
  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      isUndoRedoAction.current = true;
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      const state = history[newIndex];

      return {
        nodes: JSON.parse(JSON.stringify(state.nodes)),
        edges: JSON.parse(JSON.stringify(state.edges)),
      };
    }
    return null;
  }, [currentIndex, history]);

  /**
   * Clear history
   */
  const clearHistory = useCallback(() => {
    if (resetFlagTimeoutRef.current) {
      clearTimeout(resetFlagTimeoutRef.current);
      resetFlagTimeoutRef.current = null;
    }
    setHistory([]);
    setCurrentIndex(-1);
    setIsEnabled(false);
    isUndoRedoAction.current = false;
  }, []);

  /**
   * Reset the flag that blocks pushState after an undo/redo action
   */
  const resetUndoRedoFlagDelayed = useCallback(() => {
    if (resetFlagTimeoutRef.current) clearTimeout(resetFlagTimeoutRef.current);
    resetFlagTimeoutRef.current = setTimeout(() => {
      resetFlagTimeoutRef.current = null;
      isUndoRedoAction.current = false;
    }, UNDO_REDO_RESET_DELAY_MS);
  }, []);

  return {
    undo,
    redo,
    pushState,
    enableTracking,
    clearHistory,
    resetUndoRedoFlag: () => { isUndoRedoAction.current = false; },
    resetUndoRedoFlagDelayed,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1,
    isEnabled,
  };
}
