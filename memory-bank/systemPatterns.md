# System Patterns

## System Architecture
- Frontend: React-based web application
- State Management: Zustand stores (gameStateStore, battleLogStore, providerStore)
- Provider Layer: Adapter pattern with BaseAdapter interface
- Streaming: Custom SSE implementation for real-time thinking display
- Validation: Comprehensive Chess Validator Engine

## Key Technical Decisions
- Zustand for state management (simple, performant, no boilerplate)
- React hooks architecture for reusable logic
- Factory pattern for provider instantiation
- Adapter pattern for provider abstraction
- Custom streaming for SSE parsing (no external streaming library)
- Provider-agnostic design for maximum extensibility

## Design Patterns in Use
- **Factory Pattern**: Provider Registry creates provider instances
- **Adapter Pattern**: BaseAdapter interface unified access to different LLM APIs
- **Store Pattern**: Zustand stores for centralized state management
- **Hook Pattern**: Custom hooks for reusable logic (AI Orchestrator, Stream Handler)
- **Observer Pattern**: SSE streaming for real-time updates
- **Strategy Pattern**: Different summarization strategies for context compaction

## Component Relationships
- **Provider Layer**: OpenAIAdapter, AnthropicAdapter, OllamaAdapter implement BaseAdapter
- **Registry Layer**: ProviderRegistry factory instantiates providers
- **State Layer**: gameStateStore manages game state, battleLogStore manages logs, providerStore manages provider configs
- **Validation Layer**: ChessValidator handles all rule enforcement
- **Context Layer**: ContextBuilder manages prompts, NarrativeSummarizer compacts history
- **Orchestration Layer**: AI Orchestrator drives game loop with error recovery
- **Stream Layer**: Stream Handler parses SSE for real-time thinking
- **UI Layer**: GameBoard, BattleFeed, DirectorPanel, Telemetry Panel visualize state

## Critical Implementation Paths
1. Provider adapter instantiation through registry
2. Context management with sliding window and summarization
3. AI Orchestrator game loop with move validation
4. SSE streaming and real-time thinking display
5. Hallucination detection and recovery
6. Battle feed virtualization for performance
7. Chrome DevTools MCP integration for debugging
