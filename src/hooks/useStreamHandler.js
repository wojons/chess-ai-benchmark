import { useState, useCallback, useRef } from 'react';
import { providerRegistry } from '../providers/registry.js';
import { useBattleLogStore, LOG_TYPES } from '../store/battleLogStore.js';

/**
 * Stream Handler Hook
 * Handles SSE parsing and real-time thinking display
 */
export function useStreamHandler() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [currentStream, setCurrentStream] = useState(null);
  const [streamBuffer, setStreamBuffer] = useState('');
  const [abortController, setAbortController] = useState(null);

  const { addLog } = useBattleLogStore();

  const accumulatedContentRef = useRef('');
  const streamParseRef = useRef(null);

  /**
   * Parse stream content in real-time
   * Identifies MOVE, THOUGHT, and TRASH sections
   */
  const parseStreamContent = useCallback((delta) => {
    accumulatedContentRef.current += delta;
    const content = accumulatedContentRef.current;

    // Look for sections in the streaming content
    const sections = {
      move: null,
      thought: null,
      trash: null
    };

    // Extract MOVE section
    const moveMatch = content.match(/MOVE:\s*([^\n]+)/i);
    if (moveMatch) {
      sections.move = moveMatch[1].trim();
    }

    // Extract THOUGHT section
    const thoughtMatch = content.match(/THOUGHT:\s*([^\n]+)/i);
    if (thoughtMatch) {
      sections.thought = thoughtMatch[1].trim();
    }

    // Extract TRASH section
    const trashMatch = content.match(/TRASH:\s*([^\n]+)/i);
    if (trashMatch) {
      sections.trash = trashMatch[1].trim();
    }

    return sections;
  }, []);

  /**
   * Stream a request with real-time updates
   */
  const streamRequest = useCallback(async (playerConfig, prompt, playerId, playerName) => {
    if (isStreaming && abortController) {
      // Abort existing stream
      abortController.abort();
    }

    setIsStreaming(true);
    setCurrentStream({ playerId, playerName });
    accumulatedContentRef.current = '';
    setStreamBuffer('');

    const controller = new AbortController();
    setAbortController(controller);

    let adapter;
    try {
      adapter = providerRegistry.createAdapter(playerConfig);
    } catch (error) {
      addLog(LOG_TYPES.ERROR, `Failed to create adapter: ${error.message}`, playerName);
      setIsStreaming(false);
      setCurrentStream(null);
      return null;
    }

    let fullContent = '';
    let thoughtLogged = false;
    let trashLogged = false;

    try {
      await new Promise((resolve, reject) => {
        const onDelta = (delta) => {
          setStreamBuffer(prev => prev + delta);
          fullContent += delta;

          // Parse and log sections as they become available
          const sections = parseStreamContent(delta);

          if (sections.thought && !thoughtLogged) {
            addLog(LOG_TYPES.THOUGHT, sections.thought, playerName);
            thoughtLogged = true;
          }

          if (sections.trash && !trashLogged) {
            addLog(LOG_TYPES.TRASH, sections.trash, playerName);
            trashLogged = true;
          }
        };

        const onComplete = (result) => {
          addLog(LOG_TYPES.SYSTEM, `Stream completed for ${playerName}`, playerName);
          resolve(result);
        };

        const onError = (error) => {
          reject(error);
        };

        const cleanup = adapter.stream(prompt, onDelta, onComplete, onError);

        // Store cleanup function
        streamParseRef.current = cleanup;
      });

      setIsStreaming(false);
      setCurrentStream(null);

      return {
        success: true,
        content: fullContent,
        parsed: parseStreamContent('')
      };

    } catch (error) {
      if (error.name === 'AbortError') {
        addLog(LOG_TYPES.SYSTEM, `Stream aborted for ${playerName}`, playerName);
      } else {
        addLog(LOG_TYPES.ERROR, `Stream error: ${error.message}`, playerName);
      }

      setIsStreaming(false);
      setCurrentStream(null);

      return {
        success: false,
        error: error.message
      };
    }
  }, [isStreaming, abortController, parseStreamContent, addLog]);

  /**
   * Abort current stream
   */
  const abortStream = useCallback(() => {
    if (abortController) {
      abortController.abort();
      setAbortController(null);
      setIsStreaming(false);
      setCurrentStream(null);
      accumulatedContentRef.current = '';
      setStreamBuffer('');
    }
  }, [abortController]);

  /**
   * Get current thinking in real-time
   */
  const getCurrentThinking = useCallback(() => {
    if (!currentStream || !streamBuffer) {
      return null;
    }

    const sections = parseStreamContent(streamBuffer);

    return {
      player: currentStream.playerName,
      playerId: currentStream.playerId,
      move: sections.move,
      thought: sections.thought,
      trash: sections.trash,
      rawBuffer: streamBuffer
    };
  }, [currentStream, streamBuffer, parseStreamContent]);

  /**
   * Stream with visual updates for each character
   * Creates "typing" effect
   */
  const streamWithVisualUpdates = useCallback(async (playerConfig, prompt, playerId, playerName, onUpdate) => {
    setIsStreaming(true);
    setCurrentStream({ playerId, playerName });
    accumulatedContentRef.current = '';

    let adapter;
    try {
      adapter = providerRegistry.createAdapter(playerConfig);
    } catch (error) {
      addLog(LOG_TYPES.ERROR, `Failed to create adapter: ${error.message}`, playerName);
      setIsStreaming(false);
      setCurrentStream(null);
      return null;
    }

    let fullContent = '';

    try {
      const result = await new Promise((resolve, reject) => {
        const onDelta = (delta) => {
          fullContent += delta;
          accumulatedContentRef.current = fullContent;

          // Call visual update callback if provided
          if (onUpdate) {
            onUpdate({
              delta,
              fullContent,
              sections: parseStreamContent(delta)
            });
          }
        };

        const onComplete = (result) => {
          resolve(result);
        };

        const onError = (error) => {
          reject(error);
        };

        adapter.stream(prompt, onDelta, onComplete, onError);
      });

      setIsStreaming(false);
      setCurrentStream(null);

      return {
        success: true,
        content: fullContent,
        parsed: parseStreamContent(fullContent)
      };

    } catch (error) {
      addLog(LOG_TYPES.ERROR, `Stream error: ${error.message}`, playerName);
      setIsStreaming(false);
      setCurrentStream(null);

      return {
        success: false,
        error: error.message
      };
    }
  }, [addLog, parseStreamContent]);

  /**
   * Stream with thought aggregation
   * Collects all "thoughts" and displays them together
   */
  const streamWithThoughtAggregation = useCallback(async (playerConfig, prompt, playerId, playerName) => {
    const result = await streamRequest(playerConfig, prompt, playerId, playerName);

    if (!result?.success) {
      return result;
    }

    // Extract and aggregate thoughts
    const content = result.content;
    const thoughts = [];

    let thoughtIndex = content.indexOf('THOUGHT:');
    while (thoughtIndex !== -1) {
      const thoughtEnd = content.indexOf('\n', thoughtIndex);
      if (thoughtEnd !== -1) {
        const thought = content.slice(thoughtIndex + 7, thoughtEnd).trim();
        thoughts.push(thought);
      }
      thoughtIndex = content.indexOf('THOUGHT:', thoughtEnd + 1);
    }

    if (thoughts.length > 0) {
      const aggregatedThought = thoughts.join(' ');
      addLog(LOG_TYPES.THOUGHT, aggregatedThought, playerName);
    }

    return result;
  }, [streamRequest, addLog]);

  /**
   * Stream with real-time validation
   * Validates move as soon as it's received
   */
  const streamWithRealtimeValidation = useCallback(async (playerConfig, prompt, playerId, playerName, validator) => {
    setIsStreaming(true);
    setCurrentStream({ playerId, playerName });

    let adapter;
    try {
      adapter = providerRegistry.createAdapter(playerConfig);
    } catch (error) {
      addLog(LOG_TYPES.ERROR, `Failed to create adapter: ${error.message}`, playerName);
      setIsStreaming(false);
      setCurrentStream(null);
      return null;
    }

    let fullContent = '';
    let moveValidated = false;

    try {
      const result = await new Promise((resolve, reject) => {
        const onDelta = (delta) => {
          fullContent += delta;
          accumulatedContentRef.current = fullContent;

          // Check if move is available and not yet validated
          if (!moveValidated) {
            const sections = parseStreamContent(delta);

            if (sections.move) {
              // Validate move immediately
              try {
                const validation = validator.validateMove(sections.move);

                if (validation.valid) {
                  addLog(LOG_TYPES.SYSTEM, `Move ${sections.move} is valid`, playerName);
                  moveValidated = true;
                } else {
                  addLog(LOG_TYPES.WARNING, `Move ${sections.move} might be invalid: ${validation.error}`, playerName);
                }
              } catch (error) {
                // Validator might fail if move is incomplete
              }
            }
          }
        };

        const onComplete = (result) => {
          resolve(result);
        };

        const onError = (error) => {
          reject(error);
        };

        adapter.stream(prompt, onDelta, onComplete, onError);
      });

      setIsStreaming(false);
      setCurrentStream(null);

      return {
        success: true,
        content: fullContent,
        parsed: parseStreamContent(fullContent)
      };

    } catch (error) {
      addLog(LOG_TYPES.ERROR, `Stream error: ${error.message}`, playerName);
      setIsStreaming(false);
      setCurrentStream(null);

      return {
        success: false,
        error: error.message
      };
    }
  }, [addLog, parseStreamContent]);

  return {
    // State
    isStreaming,
    currentStream,
    streamBuffer,

    // Actions
    streamRequest,
    abortStream,
    getCurrentThinking,
    streamWithVisualUpdates,
    streamWithThoughtAggregation,
    streamWithRealtimeValidation
  };
}
