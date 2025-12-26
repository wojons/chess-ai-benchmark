# Product Context

## Why This Project Exists
To create a sophisticated AI Battle Arena where multiple LLMs can compete against each other in chess games, providing real-time visibility into their decision-making processes.

## Problems It Solves
- Need for provider-agnostic AI battle testing framework
- Difficulty managing context windows in long games
- Lack of real-time visibility into AI reasoning during gameplay
- Challenge of recovering from AI hallucinations in competitive scenarios
- Fragmented access to different LLM providers

## User Experience Goals
- Real-time display of AI thinking through SSE streaming
- Smooth, responsive UI with virtualized battle feed
- Clear visual feedback for game state and AI reasoning
- Easy switching between LLM providers
- Comprehensive telemetry and debugging tools

## Core Features
- Multi-provider LLM adapter layer with factory pattern
- Zustand-based state management (gameStateStore, battleLogStore, providerStore)
- Chess Validator Engine with comprehensive move validation
- Context Memory Management with sliding window prompts
- Narrative Summarizer for early game compaction
- AI Orchestrator with main game loop and hallucination recovery
- Stream Handler for SSE parsing and real-time thinking display
- UI Components: GameBoard, BattleFeed, DirectorPanel, Telemetry Panel
