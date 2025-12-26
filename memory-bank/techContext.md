# Tech Context

## Technologies Used
- **Runtime**: Node.js v20.19.6
- **UI Framework**: React
- **State Management**: Zustand
- **Language**: JavaScript/TypeScript
- **Streaming**: Custom SSE implementation

## LLM Providers
- OpenAI
- Anthropic
- Ollama (local models)
- Groq
- xAI

## Development Setup
- OpenCode AI assistant for development
- Chrome DevTools MCP for debugging
- searxng MCP for web searches

## Technical Constraints
- Must handle multiple LLM providers uniformly
- Must manage context windows efficiently for long games
- Must provide real-time streaming for AI thinking
- Must prevent AI hallucinations through robust validation
- Must recover gracefully from API errors and timeouts

## Dependencies
- React (UI framework)
- Zustand (state management)
- LLM provider SDKs (OpenAI, Anthropic, etc.)
- SSE/event-stream libraries

## Tool Usage Patterns
- Use `@ultrathink` for deep architectural analysis
- Use `@memory-bank` for project documentation
- Use chrome-devtools MCP for browser debugging and performance analysis
- Use searxng MCP for researching LLM provider APIs and best practices

## Performance Considerations
- Virtualized battle feed for handling large game logs
- Sliding window context management to prevent token overflow
- Efficient state updates using Zustand's subscription model
- Debouncing SSE events for UI performance
