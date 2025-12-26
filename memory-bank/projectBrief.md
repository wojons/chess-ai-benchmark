# Project Brief

**Project:** AI Battle Arena Engine
**Created:** 2025-12-26
**Status:** Active Development

## Core Requirements
- Modular, multi-file AI vs AI battle system
- Support multiple LLM providers (OpenAI, Anthropic, Ollama, Groq, xAI)
- Context memory management with sliding window prompts
- Narrative summarization for early game compaction
- Real-time streaming with SSE parsing
- Comprehensive chess rule validation
- AI orchestrator with hallucination recovery

## Goals
- Create an extensible framework for AI chess battles
- Implement provider-agnostic architecture
- Provide real-time visibility into AI thinking
- Ensure accurate rule enforcement with comprehensive validation
- Enable seamless switching between LLM providers

## Success Criteria
- All providers function correctly through adapter layer
- Context management prevents token overflow efficiently
- Real-time thinking displayed via SSE streaming
- AI orchestrator recovers from hallucinations gracefully
- Clean, modular codebase with clear separation of concerns
