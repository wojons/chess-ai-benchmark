/**
 * Base Adapter Interface
 * All provider adapters must implement this interface
 */

export class ProviderAdapter {
  constructor(config) {
    this.config = config;
    this.baseUrl = config.baseUrl;
    this.apiKey = config.apiKey;
    this.model = config.model;
    this.temperature = config.temperature;
    this.topP = config.topP || 0.9;
    this.maxTokens = config.maxTokens || 500;
  }

  /**
   * Stream a completion request
   * @param {string} prompt - The prompt to send
   * @param {function} onDelta - Callback for each chunk (delta: string)
   * @param {function} onComplete - Callback when complete (result: { content, tokens, usage })
   * @param {function} onError - Callback on error (error: Error)
   * @returns {function} Abort function to cancel the request
   */
  async stream(prompt, onDelta, onComplete, onError) {
    throw new Error('stream() must be implemented by subclass');
  }

  /**
   * Non-streaming request (fallback)
   * @param {string} prompt - The prompt to send
   * @returns {Promise<{ content: string, tokens: number, usage: object }>}
   */
  async complete(prompt) {
    throw new Error('complete() must be implemented by subclass');
  }

  /**
   * Get headers for API request
   * @returns {object} Headers object
   */
  getHeaders() {
    throw new Error('getHeaders() must be implemented by subclass');
  }

  /**
   * Build request body
   * @param {string} prompt
   * @param {boolean} stream
   * @returns {object} Request body
   */
  buildBody(prompt, stream = true) {
    throw new Error('buildBody() must be implemented by subclass');
  }

  /**
   * Parse SSE chunk
   * @param {string} line - Raw SSE line
   * @returns {string|null} Parsed content or null
   */
  parseChunk(line) {
    throw new Error('parseChunk() must be implemented by subclass');
  }

  /**
   * Validate configuration
   * @returns {object} { valid: boolean, errors: string[] }
   */
  validateConfig() {
    const errors = [];

    if (!this.baseUrl) {
      errors.push('Base URL is required');
    }
    if (!this.apiKey) {
      errors.push('API Key is required');
    }
    if (!this.model) {
      errors.push('Model is required');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Update configuration
   * @param {object} updates - Partial config to update
   */
  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    if (updates.baseUrl) this.baseUrl = updates.baseUrl;
    if (updates.apiKey) this.apiKey = updates.apiKey;
    if (updates.model) this.model = updates.model;
    if (updates.temperature !== undefined) this.temperature = updates.temperature;
    if (updates.topP !== undefined) this.topP = updates.topP;
    if (updates.maxTokens !== undefined) this.maxTokens = updates.maxTokens;
  }
}

/**
 * Parse streaming response
 * @param {Response} response - Fetch response
 * @param {function} parseChunk - Chunk parser function
 * @param {function} onDelta - Delta callback
 * @returns {Promise<object>} Final parsed result
 */
export async function parseSSE(response, parseChunk, onDelta) {
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let fullContent = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep incomplete line in buffer

    for (const line of lines) {
      const content = parseChunk(line);
      if (content) {
        fullContent += content;
        onDelta(content);
      }
    }
  }

  return { content: fullContent };
}

/**
 * Create timeout promise
 * @param {number} ms - Timeout in milliseconds
 * @returns {Promise<void>} Rejects after timeout
 */
export function createTimeout(ms) {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`Request timeout after ${ms}ms`)), ms);
  });
}
