import { OpenAIAdapter } from './openaiAdapter.js';
import { AnthropicAdapter } from './anthropicAdapter.js';
import { OllamaAdapter } from './ollamaAdapter.js';

/**
 * Provider Types
 */
export const PROVIDER_TYPES = {
  OPENAI: 'openai',
  ANTHROPIC: 'anthropic',
  OLLAMA: 'ollama',
  GROQ: 'groq',
  XAI: 'xai',
  CUSTOM: 'custom'
};

/**
 * Provider Registry
 * Factory for creating provider adapters
 */
export class ProviderRegistry {
  constructor() {
    this.adapters = new Map();
    this.registeredTypes = new Map();
    this.registerDefaults();
  }

  /**
   * Register default adapters
   */
  registerDefaults() {
    this.registerProvider(PROVIDER_TYPES.OPENAI, OpenAIAdapter);
    this.registerProvider(PROVIDER_TYPES.GROQ, OpenAIAdapter); // Groq uses OpenAI-compatible API
    this.registerProvider(PROVIDER_TYPES.XAI, OpenAIAdapter);  // xAI uses OpenAI-compatible API
    this.registerProvider(PROVIDER_TYPES.ANTHROPIC, AnthropicAdapter);
    this.registerProvider(PROVIDER_TYPES.OLLAMA, OllamaAdapter);
  }

  /**
   * Register a custom adapter type
   * @param {string} type - Provider type identifier
   * @param {class} AdapterClass - Adapter class extending ProviderAdapter
   */
  registerProvider(type, AdapterClass) {
    this.registeredTypes.set(type, AdapterClass);
  }

  /**
   * Create an adapter instance
   * @param {object} config - Provider configuration
   * @returns {ProviderAdapter} Adapter instance
   */
  createAdapter(config) {
    const { providerType, baseUrl, apiKey, model, temperature, topP, maxTokens } = config;

    if (!providerType) {
      throw new Error('Provider type is required');
    }

    const AdapterClass = this.registeredTypes.get(providerType);

    if (!AdapterClass) {
      throw new Error(`Unknown provider type: ${providerType}`);
    }

    const adapter = new AdapterClass(config);

    return adapter;
  }

  /**
   * Get available provider types
   * @returns {string[]} Array of provider type identifiers
   */
  getAvailableTypes() {
    return Array.from(this.registeredTypes.keys());
  }

  /**
   * Check if a provider type is registered
   * @param {string} type - Provider type
   * @returns {boolean}
   */
  hasProvider(type) {
    return this.registeredTypes.has(type);
  }

  /**
   * Get default configuration for a provider type
   * @param {string} type - Provider type
   * @returns {object} Default configuration
   */
  getDefaultConfig(type) {
    const defaults = {
      [PROVIDER_TYPES.OPENAI]: {
        baseUrl: 'https://api.openai.com/v1',
        model: 'gpt-4o',
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 500,
        streamEnabled: true
      },
      [PROVIDER_TYPES.GROQ]: {
        baseUrl: 'https://api.groq.com/openai/v1',
        model: 'llama-3.3-70b-versatile',
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 500,
        streamEnabled: true
      },
      [PROVIDER_TYPES.XAI]: {
        baseUrl: 'https://api.x.ai/v1',
        model: 'grok-beta',
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 500,
        streamEnabled: true
      },
      [PROVIDER_TYPES.ANTHROPIC]: {
        baseUrl: 'https://api.anthropic.com/v1',
        model: 'claude-3-5-sonnet-20241022',
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 500,
        streamEnabled: true,
        apiVersion: '2023-06-01'
      },
      [PROVIDER_TYPES.OLLAMA]: {
        baseUrl: 'http://localhost:11434',
        model: 'llama3',
        temperature: 0.8,
        topP: 0.9,
        maxTokens: 500,
        streamEnabled: true
      }
    };

    return defaults[type] || {};
  }

  /**
   * Get display name for a provider type
   * @param {string} type - Provider type
   * @returns {string} Display name
   */
  getDisplayName(type) {
    const names = {
      [PROVIDER_TYPES.OPENAI]: 'OpenAI',
      [PROVIDER_TYPES.GROQ]: 'Groq',
      [PROVIDER_TYPES.XAI]: 'xAI (Grok)',
      [PROVIDER_TYPES.ANTHROPIC]: 'Anthropic Claude',
      [PROVIDER_TYPES.OLLAMA]: 'Ollama (Local)',
      [PROVIDER_TYPES.CUSTOM]: 'Custom Provider'
    };

    return names[type] || type;
  }

  /**
   * Get icon for a provider type (for UI)
   * @param {string} type - Provider type
   * @returns {string} Icon name or emoji
   */
  getIcon(type) {
    const icons = {
      [PROVIDER_TYPES.OPENAI]: '🤖',
      [PROVIDER_TYPES.GROQ]: '⚡',
      [PROVIDER_TYPES.XAI]: '🚀',
      [PROVIDER_TYPES.ANTHROPIC]: '🧠',
      [PROVIDER_TYPES.OLLAMA]: '🦙',
      [PROVIDER_TYPES.CUSTOM]: '🔧'
    };

    return icons[type] || '🔌';
  }

  /**
   * Validate provider configuration
   * @param {object} config - Provider configuration
   * @returns {object} { valid: boolean, errors: string[] }
   */
  validateConfig(config) {
    const { providerType } = config;

    if (!providerType) {
      return {
        valid: false,
        errors: ['Provider type is required']
      };
    }

    if (!this.hasProvider(providerType)) {
      return {
        valid: false,
        errors: [`Unknown provider type: ${providerType}`]
      };
    }

    try {
      const adapter = this.createAdapter(config);
      return adapter.validateConfig();
    } catch (error) {
      return {
        valid: false,
        errors: [error.message]
      };
    }
  }
}

// Singleton instance
export const providerRegistry = new ProviderRegistry();
