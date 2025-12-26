# Quick Start Guide

## 🚀 AI Battle Arena - Quick Setup

### Step 1: Install Dependencies

```bash
npm install
```

### Step 2: Start Development Server

```bash
npm run dev
```

The application will open at `http://localhost:3000`

### Step 3: Configure Players

1. Click the **Settings** button in the header (or use `Esc` key to close later)
2. **Player 1 (White)**:
   - Select Provider (OpenAI, Anthropic, Groq, xAI, or Ollama)
   - Enter API Key
   - Choose Model (e.g., `gpt-4o`, `claude-3-5-sonnet-20241022`)
   - Select Persona or enter custom System Prompt
   - Adjust Temperature (0.0 - 2.0)

3. **Player 2 (Black)**:
   - Repeat configuration for second player
   - Use same or different provider
   - Choose different persona for variety

### Step 4: Start Battle

1. Click **Start Battle** in the Director Panel
2. Watch:
   - **Game Board** updating in real-time
   - **Battle Feed** showing AI thinking (italic whispers) and trash talk (bold shouts)
   - **Telemetry** tracking latency, tokens, and error rates

### Step 5: Use Director Controls

- **Pause**: Stop the battle at any point
- **Reset**: Return to starting position
- **Speed**: Adjust delay between turns (Instant to Slow)
- **Force Move**: Override AI to play a specific move
- **Skip Turn**: Advance without a move (if stuck)
- **Override Prompt**: Intercept and modify next AI prompt

### Step 6: Monitor Performance

Switch to **Telemetry** tab to see:
- Token usage per player
- Average latency
- Error and hallucination rates
- Win probability (if evaluator model enabled)

## 🔑 API Key Examples

### OpenAI

```
Base URL: https://api.openai.com/v1
Model: gpt-4o
API Key: sk-...
```

### Anthropic

```
Base URL: https://api.anthropic.com/v1
Model: claude-3-5-sonnet-20241022
API Key: sk-ant-...
```

### Groq

```
Base URL: https://api.groq.com/openai/v1
Model: llama-3.3-70b-versatile
API Key: gsk_...
```

### xAI

```
Base URL: https://api.x.ai/v1
Model: grok-beta
API Key: xai-...
```

### Ollama (Local)

```
Base URL: http://localhost:11434
Model: llama3
API Key: (not required for local)
```

## 🎯 Pre-configured Personas

### Arrogant Grandmaster
> "I am the greatest player in history. Every move is brilliant."

### Chaotic Hacker
> "Unpredictable and unconventional. Conventional openings are for NPCs."

### Analytical Bot
> "Methodical and precise. Evaluates positions objectively."

### Taunting Trickster
> "Deceptive and cunning. Sets traps and taunts about hidden threats."

## ⌨️ Keyboard Shortcuts

| Key | Action |
|------|---------|
| `Space` | Toggle Play/Pause |
| `Ctrl+R` | Reset Game |
| `Escape` | Close Settings Panel |

## 📊 Troubleshooting

### "Invalid API Key" Error
- Check API key is correct
- Verify provider matches API key type
- For Ollama, ensure server is running (`ollama serve`)

### "Hallucination Detected" Warning
- Normal behavior; system will retry automatically
- If persists after 3 retries, use Director controls to intervene

### High Latency
- Check network connection
- Try different provider/model combination
- Increase turn delay in settings

### Token Limit Reached
- System compacts context automatically after 30 moves
- Monitor "Tokens/Move" metric in telemetry

## 🎓 Next Steps

1. **Experiment with different personae**
2. **Try various provider/model combinations**
3. **Monitor hallucination patterns**
4. **Analyze telemetry for insights**
5. **Use Director controls to guide games**

## 📚 Full Documentation

See [README.md](./README.md) for complete architecture and technical details.

---

**Happy battling! 🎮**
