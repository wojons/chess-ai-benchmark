import { ProviderAdapter, parseSSE, createTimeout } from './baseAdapter.js';

/**
 * Ollama Adapter
 * For running local LLMs via Ollama
 */
export class OllamaAdapter extends ProviderAdapter {
  constructor(config) {
    super(config);
    // Ollama typically runs on localhost:11434
    this.endpoint = config.baseUrl || 'http://localhost:11434';
    this.generateEndpoint = `${this.endpoint}/api/generate`;
    this.chatEndpoint = `${this.endpoint}/api/chat`;
    this.stream = config.streamEnabled !== false;
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json'
    };
  }

  buildBody(prompt, stream = true) {
    // Ollama uses chat API for conversation-style prompts
    return {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      stream: stream && this.stream,
      options: {
        temperature: this.temperature,
        top_p: this.topP,
        num_predict: this.maxTokens
      }
    };
  }

  parseChunk(line) {
    if (line.trim() === '') return null;

    try {
      const data = JSON.parse(line);

      // Ollama sends the full message in each chunk (not delta)
      if (data.message?.content) {
        return data.message.content;
      }

      if (data.done) {
        return null;
      }
    } catch (e) {
      // Invalid JSON, skip
    }

    return null;
  }

  /**
   * Ollama streaming with delta extraction
   * Ollama sends full content in each chunk, so we need to extract new text
   */
  async stream(prompt, onDelta, onComplete, onError) {
    const validation = this.validateConfig();
    if (!validation.valid) {
      onError(new Error(`Invalid configuration: ${validation.errors.join(', ')}`));
      return () => {};
    }

    const controller = new AbortController();
    const timeoutMs = 120000; // 120 second timeout (local models can be slower)

    let previousContent = '';

    try {
      const response = await Promise.race([
        fetch(this.chatEndpoint, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(this.buildBody(true)),
          signal: controller.signal
        }),
        createTimeout(timeoutMs)
      ]);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          try {
            const data = JSON.parse(line);
            if (data.message?.content) {
              const currentContent = data.message.content;
              const delta = currentContent.slice(previousContent.length);
              if (delta) {
                onDelta(delta);
                previousContent = currentContent;
              }
            }

            if (data.done) {
              onComplete({
                content: previousContent,
                tokens: data.eval_count || this.estimateTokens(previousContent),
                usage: data
              });
              return;
            }
          } catch (e) {
            // Invalid JSON, skip
          }
        }
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        // Request was cancelled by user
        return;
      }
      onError(error);
    }

    return () => controller.abort();
  }

  async complete(prompt) {
    const validation = this.validateConfig();
    if (!validation.valid) {
      throw new Error(`Invalid configuration: ${validation.errors.join(', ')}`);
    }

    const response = await fetch(this.generateEndpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        options: {
          temperature: this.temperature,
          top_p: this.topP,
          num_predict: this.maxTokens
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.response || '';

    return {
      content,
      tokens: data.eval_count || this.estimateTokens(content),
      usage: data
    };
  }

  /**
   * Rough token estimation (4 chars per token for English)
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Ollama-specific configuration validation
   */
  validateConfig() {
    const errors = [];

    if (!this.model) {
      errors.push('Model is required (e.g., llama3, mistral)');
    }

    // Ollama doesn't require API key for local instances
    // But we validate URL format if provided
    if (this.baseUrl) {
      try {
        new URL(this.baseUrl);
      } catch (e) {
        errors.push('Invalid Base URL format');
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check if Ollama server is running
   */
  async checkHealth() {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        headers: this.getHeaders()
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  /**
   * Get available models from Ollama
   */
  async getAvailableModels() {
    try {
      const response = await fetch(`${this.endpoint}/api/tags`, {
        method: 'GET',
        headers: this.getHeaders()
      });

      if (!response.ok) {
        return [];
      }

      const data = await response.json();
      return data.models?.map(m => m.name) || [];
    } catch {
      return [];
    }
  }
}
