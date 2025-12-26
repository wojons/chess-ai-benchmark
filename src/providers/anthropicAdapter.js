import { ProviderAdapter, parseSSE, createTimeout } from './baseAdapter.js';

/**
 * Anthropic Claude Adapter
 */
export class AnthropicAdapter extends ProviderAdapter {
  constructor(config) {
    super(config);
    this.endpoint = config.baseUrl.endsWith('/v1') ? config.baseUrl : `${config.baseUrl}/v1`;
    this.messagesEndpoint = `${this.endpoint}/messages`;
    this.version = config.apiVersion || '2023-06-01';
  }

  getHeaders() {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': this.version,
      'anthropic-dangerous-direct-browser-access': 'true'
    };
  }

  buildBody(prompt, stream = true) {
    return {
      model: this.model,
      messages: [{ role: 'user', content: prompt }],
      max_tokens: this.maxTokens,
      temperature: this.temperature,
      top_p: this.topP,
      stream
    };
  }

  parseChunk(line) {
    if (line.trim() === '') return null;
    if (line.startsWith('event:')) return null;
    if (!line.startsWith('data: ')) return null;

    try {
      const data = JSON.parse(line.slice(6));

      // Handle content_block_delta events
      if (data.type === 'content_block_delta' && data.delta?.text) {
        return data.delta.text;
      }

      // Handle content_block_stop (end of content)
      if (data.type === 'message_stop') {
        return null;
      }
    } catch (e) {
      // Invalid JSON, skip
    }

    return null;
  }

  async stream(prompt, onDelta, onComplete, onError) {
    const validation = this.validateConfig();
    if (!validation.valid) {
      onError(new Error(`Invalid configuration: ${validation.errors.join(', ')}`));
      return () => {};
    }

    const controller = new AbortController();
    const timeoutMs = 60000; // 60 second timeout

    try {
      const response = await Promise.race([
        fetch(this.messagesEndpoint, {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify(this.buildBody(prompt, true)),
          signal: controller.signal
        }),
        createTimeout(timeoutMs)
      ]);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await parseSSE(
        response,
        (line) => this.parseChunk(line),
        onDelta
      );

      onComplete({
        content: result.content,
        tokens: this.estimateTokens(result.content),
        usage: { estimated: true }
      });

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

    const response = await fetch(this.messagesEndpoint, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildBody(prompt, false))
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    const content = data.content?.[0]?.text || '';

    return {
      content,
      tokens: data.usage?.output_tokens || this.estimateTokens(content),
      usage: data.usage || {}
    };
  }

  /**
   * Rough token estimation (4 chars per token for English)
   */
  estimateTokens(text) {
    return Math.ceil(text.length / 4);
  }

  /**
   * Anthropic-specific configuration validation
   */
  validateConfig() {
    const base = super.validateConfig();
    const errors = [...base.errors];

    // Validate base URL format
    try {
      new URL(this.baseUrl);
    } catch (e) {
      errors.push('Invalid Base URL format');
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
}
