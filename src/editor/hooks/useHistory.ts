/**
 * useHistory Hook - Command Pattern for Undo/Redo
 * 
 * Implements history management using the Command Pattern.
 * Each action is stored as a command with undo/redo capabilities.
 * 
 * Requirements: 15.1, 15.2
 * - WHEN a user clicks "Undo" THEN the Editor SHALL revert the last annotation action
 * - WHEN a user clicks "Redo" THEN the Editor SHALL restore the last undone action
 */

import { useState, useCallback, useMemo } from 'react';

/**
 * Represents a command in the history stack.
 * Each command knows how to undo and redo itself.
 */
export interface HistoryCommand<T> {
    /** Type of action for debugging/logging */
    type: string;
    /** Timestamp when the command was created */
    timestamp: number;
    /** State before the action (for undo) */
    previousState: T;
    /** State after the action (for redo) */
    nextState: T;
}

/**
 * Result returned by the useHistory hook
 */
export interface UseHistoryResult<T> {
    /** Current state */
    state: T;
    /** Push a new state change to history */
    pushState: (newState: T, actionType?: string) => void;
    /** Undo the last action, returns true if successful */
    undo: () => boolean;
    /** Redo the last undone action, returns true if successful */
    redo: () => boolean;
    /** Whether undo is available */
    canUndo: boolean;
    /** Whether redo is available */
    canRedo: boolean;
    /** Clear all history and reset to initial state */
    clear: (initialState: T) => void;
    /** Get the current history stack (for debugging) */
    history: HistoryCommand<T>[];
    /** Current position in history */
    historyIndex: number;
}

/**
 * Custom hook for managing state with undo/redo capabilities.
 * 
 * Uses the Command Pattern where each state change is stored as a command
 * that can be undone or redone.
 * 
 * @param initialState - The initial state value
 * @returns History management functions and current state
 * 
 * @example
 * ```tsx
 * const { state, pushState, undo, redo, canUndo, canRedo } = useHistory<Annotation[]>([]);
 * 
 * // Add annotation
 * pushState([...state, newAnnotation], 'add');
 * 
 * // Undo last action
 * if (canUndo) undo();
 * 
 * // Redo undone action
 * if (canRedo) redo();
 * ```
 */
export function useHistory<T>(initialState: T): UseHistoryResult<T> {
    // Current state
    const [state, setState] = useState<T>(initialState);

    // History stack - stores all commands
    const [history, setHistory] = useState<HistoryCommand<T>[]>([]);

    // Current position in history (-1 means at initial state, no history yet)
    // Points to the last executed command
    const [historyIndex, setHistoryIndex] = useState<number>(-1);

    /**
     * Push a new state change to history.
     * This clears any redo history (commands after current index).
     */
    const pushState = useCallback((newState: T, actionType: string = 'change') => {
        setState(currentState => {
            const command: HistoryCommand<T> = {
                type: actionType,
                timestamp: Date.now(),
                previousState: currentState,
                nextState: newState,
            };

            setHistory(prevHistory => {
                // Remove any commands after current index (clear redo stack)
                const newHistory = prevHistory.slice(0, historyIndex + 1);
                return [...newHistory, command];
            });

            setHistoryIndex(prev => prev + 1);

            return newState;
        });
    }, [historyIndex]);

    /**
     * Undo the last action.
     * Restores the state before the last command.
     * 
     * Property 21: Undo removes last action
     * For any non-empty history, undo SHALL restore the state before the last action.
     * 
     * @returns true if undo was successful, false if nothing to undo
     */
    const undo = useCallback((): boolean => {
        if (historyIndex < 0) {
            return false;
        }

        const command = history[historyIndex];
        if (!command) {
            return false;
        }

        setState(command.previousState);
        setHistoryIndex(prev => prev - 1);
        return true;
    }, [history, historyIndex]);

    /**
     * Redo the last undone action.
     * Restores the state after the undone command.
     * 
     * Property 22: Redo restores undone action
     * For any state after undo, redo SHALL restore the state before the undo.
     * 
     * Property 23: Undo then redo is identity
     * For any state S, performing undo then redo SHALL result in state equivalent to S.
     * 
     * @returns true if redo was successful, false if nothing to redo
     */
    const redo = useCallback((): boolean => {
        const nextIndex = historyIndex + 1;

        if (nextIndex >= history.length) {
            return false;
        }

        const command = history[nextIndex];
        if (!command) {
            return false;
        }

        setState(command.nextState);
        setHistoryIndex(nextIndex);
        return true;
    }, [history, historyIndex]);

    /**
     * Check if undo is available.
     * Undo is available when there's at least one command in history
     * and we haven't undone all the way back.
     */
    const canUndo = useMemo(() => historyIndex >= 0, [historyIndex]);

    /**
     * Check if redo is available.
     * Redo is available when we've undone at least one command
     * and there are commands ahead of current position.
     */
    const canRedo = useMemo(() => historyIndex < history.length - 1, [historyIndex, history.length]);

    /**
     * Clear all history and reset to a new initial state.
     */
    const clear = useCallback((newInitialState: T) => {
        setState(newInitialState);
        setHistory([]);
        setHistoryIndex(-1);
    }, []);

    return {
        state,
        pushState,
        undo,
        redo,
        canUndo,
        canRedo,
        clear,
        history,
        historyIndex,
    };
}

export default useHistory;
