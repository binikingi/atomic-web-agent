# @binikingi/atomic-web-agent-core

The core of the Atomic Web Agent, providing essential functionalities for AI-powered web interaction and automation.

## Overview

`@binikingi/atomic-web-agent-core` is a powerful library that combines the capabilities of [Playwright](https://playwright.dev/) for browser automation with [LangChain](https://js.langchain.com/) for AI agent orchestration. It enables you to create intelligent agents that can interact with web applications autonomously.

## Features

- **AI-Powered Browser Automation**: Control browser interactions using AI models (Anthropic Claude, OpenAI GPT)
- **Built-in Tools**: Pre-configured tools for common web interactions (clicking, typing, navigation, screenshots)
- **Extensible**: Easy to add custom tools for specific use cases
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Accessibility-First**: Uses accessibility snapshots for robust element interaction

## Installation

```bash
npm install @binikingi/atomic-web-agent-core
```

or with pnpm:

```bash
pnpm add @binikingi/atomic-web-agent-core
```

## Quick Start

```typescript
import { AWAgent } from "@binikingi/atomic-web-agent-core";
import { ChatAnthropic } from "@langchain/anthropic";

// Initialize the model
const model = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-sonnet-20241022",
});

// Create the agent
const agent = new AWAgent(
  model,
  "You are a helpful web automation assistant."
);

// Initialize and run
await agent.init();
await agent.run("Navigate to https://example.com and take a screenshot");
await agent.close();
```

## API Reference

### AWAgent

The main class for creating and controlling web agents.

#### Constructor

```typescript
new AWAgent(
  model: ChatAnthropic | ChatOpenAI,
  systemMessage: string,
  options?: {
    overrideTools?: {
      getDOMSnapshotTool?: (page: Page, registry: ElementLocatorRegistry) => AgentTool;
    };
    customTools?: ((page: Page) => AgentTool)[];
  }
)
```

#### Methods

- `init(launchOptions?: LaunchOptions, contextOptions?: BrowserContextOptions): Promise<void>` - Initialize the browser and agent
- `run(message: string): Promise<void>` - Execute a task with the agent
- `close(): Promise<void>` - Close the browser and clean up resources

### Exports

```typescript
export { AWAgent } from "@binikingi/atomic-web-agent-core";
export { type PlaywrightPage } from "@binikingi/atomic-web-agent-core";
export { createTool } from "@binikingi/atomic-web-agent-core";
export { type AgentTool } from "@binikingi/atomic-web-agent-core";
export { ElementLocatorRegistry } from "@binikingi/atomic-web-agent-core";
export {
  type ElementSnapshot,
  type PageSnapshot,
  generateAccessibilitySnapshot,
} from "@binikingi/atomic-web-agent-core";
```

## Built-in Tools

The agent comes with several pre-configured tools:

- **Navigate**: Navigate to URLs
- **Click**: Click elements by ID or position
- **Input**: Type text into input fields
- **Screenshot**: Capture page screenshots
- **DOM Snapshot**: Get accessibility-based page structure
- **Wait**: Wait for specified durations
- **Console Print**: Output messages to console

## Custom Tools

You can extend the agent with custom tools:

```typescript
import { AWAgent, createTool } from "@binikingi/atomic-web-agent-core";

const myCustomTool = (page: Page) =>
  createTool(
    async ({ input }) => {
      // Your custom logic here
      return "Result";
    },
    {
      name: "my_custom_tool",
      description: "Description of what this tool does",
      schema: z.object({
        input: z.string(),
      }),
    }
  );

const agent = new AWAgent(model, systemMessage, {
  customTools: [myCustomTool],
});
```

## Requirements

- Node.js >= 18
- An API key for Anthropic Claude or OpenAI

## License

ISC

## Repository

[https://github.com/binikingi/atomic-web-agent](https://github.com/binikingi/atomic-web-agent)

## Issues

Report issues at [https://github.com/binikingi/atomic-web-agent/issues](https://github.com/binikingi/atomic-web-agent/issues)

## Author

Bini Barazany <bgt636@gmail.com>
