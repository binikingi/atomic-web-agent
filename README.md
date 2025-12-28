# Atomic Web Agent

An AI-powered web automation framework that combines Playwright browser automation with LangChain agents to interact with web applications using natural language commands.

## Overview

Atomic Web Agent enables you to create intelligent web automation agents that can understand tasks in natural language and execute them through browser interactions. Built on top of Playwright and LangChain, it provides a flexible framework for building web automation agents with AI capabilities.

## Architecture

This project is organized as a monorepo with two main packages:

### 📦 Packages

#### `@bini-bar-labs/atomic-web-agent-core`
The core package provides the foundational framework for building AI-powered web automation agents.

**Key Features:**
- Browser automation using Playwright
- LangChain integration for AI agent capabilities
- Support for multiple AI providers (Anthropic Claude, OpenAI)
- Built-in tools for common web interactions
- Middleware system for extensibility
- Custom tool override support

**Built-in Tools:**
- `NavigateToURL` - Navigate to web pages
- `ClickBySelector` - Click elements using CSS selectors
- `ClickByPosition` - Click elements by coordinates
- `InputBySelector` - Input text into form fields
- `GetDOMSnapshot` - Capture and analyze page structure
- `GetPageScreenshot` - Take screenshots
- `Wait` - Wait for specified duration
- `PrintToConsole` - Output information

#### `@bini-bar-labs/atomic-web-agent-examples`
Example implementations and custom agents built using the core package.

## Installation

```bash
# Install dependencies
pnpm install

# Build all packages
pnpm build
```

## Quick Start

### Basic Example

```typescript
import { AWAgent } from "@bini-bar-labs/atomic-web-agent-core";
import { ChatOpenAI } from "@langchain/openai";

// Create a model
const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4",
});

// Define system message
const systemMessage = `
  You are a web automation agent.
  Use the tools available to complete tasks.
  Prefer DOM snapshots over screenshots.
  Use selectors for clicking and inputting when possible.
`;

// Initialize agent
const agent = new AWAgent(model, systemMessage);

await agent.init("chromium", {
  launchOptions: { headless: false },
});

// Execute tasks
await agent.do("Navigate to https://example.com");
await agent.do("Take a screenshot of the page");

// Clean up
await agent.close();
```

### Advanced Example with Custom Tools

```typescript
import { AWAgent, createTool } from "@bini-bar-labs/atomic-web-agent-core";
import { ChatAnthropic } from "@langchain/anthropic";
import type { Page } from "playwright";

// Create custom tool
const customGetDOMSnapshotTool = (page: Page) => {
  return createTool(
    async () => {
      // Custom implementation
      const snapshot = await page.locator("body").innerHTML();
      return snapshot;
    },
    {
      name: "CustomDOMSnapshot",
      description: "Get a custom DOM snapshot",
      schema: z.object({}),
    }
  );
};

// Initialize with custom tools
const model = new ChatAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
  model: "claude-3-5-sonnet-20241022",
});

const agent = new AWAgent(model, systemMessage, {
  overrideTools: {
    getDOMSnapshotTool: customGetDOMSnapshotTool,
  },
});
```

### Mobile Web App Example

```typescript
import { AWAgent } from "@bini-bar-labs/atomic-web-agent-core";
import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  apiKey: process.env.OPENAI_API_KEY,
  model: "gpt-4",
});

const agent = new AWAgent(model, systemMessage);

// Initialize with mobile viewport
await agent.init("chromium", {
  launchOptions: { headless: false },
  contextOptions: {
    viewport: { width: 375, height: 667 },
    permissions: ["geolocation"],
  },
});

await agent.do("Navigate to https://mobile-app.example.com");
await agent.do("Login with username 'user@example.com'");
await agent.do("Click on the menu button");

await agent.close();
```

## API Reference

### `AWAgent`

The main class for creating and managing web automation agents.

#### Constructor

```typescript
constructor(
  model: ChatAnthropic | ChatOpenAI,
  systemMessage: string,
  options?: {
    overrideTools?: {
      getDOMSnapshotTool?: (page: Page) => StructuredTool;
    };
  }
)
```

#### Methods

##### `init(type: "chromium", options?)`
Initialize the browser and context.

```typescript
await agent.init("chromium", {
  launchOptions: {
    headless: false,
    // Other Playwright launch options
  },
  contextOptions: {
    viewport: { width: 1280, height: 720 },
    // Other Playwright context options
  },
});
```

##### `do(task: string)`
Execute a task using natural language.

```typescript
await agent.do("Click the login button");
```

##### `getCurrentPage()`
Get the current active page.

```typescript
const page = agent.getCurrentPage();
```

##### `newPage()`
Create a new page in the current context.

```typescript
const newPage = await agent.newPage();
```

##### `getAllPages()`
Get all pages in the current context.

```typescript
const pages = agent.getAllPages();
```

##### `close()`
Close the browser and clean up resources.

```typescript
await agent.close();
```

## Running Examples

The `exmaples` package includes example implementations:

```bash
# Build the project
pnpm build

# Run the mobile clock-in example
pnpm --filter @bini-bar-labs/atomic-web-agent-examples start
```

## Development

### Project Structure

```
atomic-web-agent/
├── packages/
│   ├── agent-core/           # Core framework
│   │   ├── src/
│   │   │   ├── AWAgent/      # Main agent class
│   │   │   ├── tools/        # Built-in tools
│   │   │   └── index.ts      # Package exports
│   │   └── package.json
│   │
│   └── examples/       # Example implementations
│       ├── src/
│       │   ├── examples/     # Example agents
│       └── package.json
│
├── package.json              # Root package
├── pnpm-workspace.yaml       # Workspace configuration
└── tsconfig.base.json        # Base TypeScript config
```

### Scripts

```bash
# Lint all packages
pnpm lint

# Build all packages
pnpm build

# Build in watch mode
pnpm build-watch
```

### Creating Custom Tools

You can create custom tools using the `createTool` function from LangChain:

```typescript
import { createTool, type PlaywrightPage } from "@bini-bar-labs/atomic-web-agent-core";
import z from "zod";

export function myCustomTool(page: PlaywrightPage) {
  return createTool(
    async ({ param1, param2 }) => {
      // Your tool implementation
      console.log(`Executing custom tool with ${param1} and ${param2}`);
      // Perform actions on the page
      return "Success";
    },
    {
      name: "MyCustomTool",
      description: "Description of what this tool does",
      schema: z.object({
        param1: z.string().describe("Description of param1"),
        param2: z.number().describe("Description of param2"),
      }),
    }
  );
}
```

## Environment Variables

Create a `.env` file in the `packages/examples` directory:

```env
OPENAI_API_KEY=your_openai_api_key_here
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

## Requirements

- Node.js 22+
- pnpm 9+
- TypeScript 5+

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
