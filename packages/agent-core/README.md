# @bini-bar-labs/atomic-web-agent-core

The core of the Atomic Web Agent, providing essential functionalities for AI-powered web interaction and automation.

## Overview

`@bini-bar-labs/atomic-web-agent-core` is a powerful library that combines the capabilities of [Playwright](https://playwright.dev/) for browser automation with [LangChain](https://js.langchain.com/) for AI agent orchestration. It enables you to create intelligent agents that can interact with web applications autonomously.

## Features

- **AI-Powered Browser Automation**: Control browser interactions using AI models (Anthropic Claude, OpenAI GPT)
- **Built-in Tools**: Pre-configured tools for common web interactions (clicking, typing, navigation, screenshots)
- **Extensible**: Easy to add custom tools for specific use cases
- **Type-Safe**: Full TypeScript support with comprehensive type definitions
- **Accessibility-First**: Uses accessibility snapshots for robust element interaction

## Installation

```bash
npm install @bini-bar-labs/atomic-web-agent-core
```

or with pnpm:

```bash
pnpm add @bini-bar-labs/atomic-web-agent-core
```

## Quick Start

```typescript
import { AWAgent } from "@bini-bar-labs/atomic-web-agent-core";
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

## Page Validation

The `test()` method enables you to validate conditions on the current webpage using natural language. It returns `true` if the condition is met, `false` otherwise.

```typescript
// Example: Check if user is logged in
const isLoggedIn = await agent.test("The user is logged in");
console.log(isLoggedIn); // true or false

// Example: Verify form validation
const hasError = await agent.test("An error message is displayed");

// Example: Check element state
const isButtonDisabled = await agent.test("The submit button is disabled");

// Example: Verify content presence
const hasWelcomeMessage = await agent.test("A welcome message appears on the page");

// Example: Complex state validation
const isCheckoutReady = await agent.test(
  "The shopping cart has items and the checkout button is clickable"
);
```

### Best Practices for test() Conditions

- **Be specific and measurable**: "The login button is visible" is better than "The page looks good"
- **Focus on observable state**: Describe what should be visible or present on the page
- **Avoid subjective interpretations**: Use concrete, verifiable conditions
- **Keep it atomic**: Test one condition at a time for clearer results

## Data Extraction

The `extract()` method enables you to extract structured data from webpages using Zod schemas. It returns typed data that matches your schema.

```typescript
import { z } from "zod";

// Define your data schema
const productSchema = z.object({
  title: z.string().describe("The product title"),
  price: z.number().describe("The product price in dollars"),
  description: z.string().describe("The product description"),
  inStock: z.boolean().describe("Whether the product is in stock"),
  rating: z.number().optional().describe("Product rating out of 5"),
});

type Product = z.infer<typeof productSchema>;

// Extract data from the page
const product = await agent.extract<Product>(
  productSchema,
  "Extract product information from this page"
);

console.log(product);
// { title: "...", price: 99.99, description: "...", inStock: true, rating: 4.5 }
```

### More Examples

```typescript
// Extract multiple items (array)
const itemsSchema = z.object({
  items: z.array(
    z.object({
      name: z.string(),
      price: z.number(),
    })
  ),
});

const data = await agent.extract(itemsSchema);

// Extract user profile
const profileSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  age: z.number().optional(),
  isVerified: z.boolean(),
});

const profile = await agent.extract(profileSchema);

// Extract with custom instructions
const statsSchema = z.object({
  visitors: z.number(),
  pageViews: z.number(),
  bounceRate: z.number(),
});

const stats = await agent.extract(
  statsSchema,
  "Look for the analytics dashboard section and extract the key metrics displayed"
);
```

### Features

- **Type-safe**: Full TypeScript support with automatic type inference
- **Schema validation**: Extracted data is validated against your Zod schema
- **Native structured output**: Uses LangChain's `providerStrategy` for efficient extraction via model provider's native structured output capability
- **Automatic field detection**: AI determines how to extract each field
- **Flexible**: Works with complex nested schemas
- **Error handling**: Clear validation errors if data doesn't match schema

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
- `test(condition: string): Promise<boolean>` - Validate a condition on the current page and return true/false
- `extract<T>(schema: z.ZodSchema<T>, instructions?: string): Promise<T>` - Extract structured data from the page using a Zod schema
- `close(): Promise<void>` - Close the browser and clean up resources

### Exports

```typescript
export { AWAgent } from "@bini-bar-labs/atomic-web-agent-core";
export { type PlaywrightPage } from "@bini-bar-labs/atomic-web-agent-core";
export { createTool } from "@bini-bar-labs/atomic-web-agent-core";
export { type AgentTool } from "@bini-bar-labs/atomic-web-agent-core";
export { ElementLocatorRegistry } from "@bini-bar-labs/atomic-web-agent-core";
export { validateConditionTool } from "@bini-bar-labs/atomic-web-agent-core";
export { extractDataTool } from "@bini-bar-labs/atomic-web-agent-core";
export {
  type ElementSnapshot,
  type PageSnapshot,
  generateAccessibilitySnapshot,
} from "@bini-bar-labs/atomic-web-agent-core";
```

## Built-in Tools

The agent comes with several pre-configured tools:

- **Navigate**: Navigate to URLs
- **Click**: Click elements by ID or position
- **Input**: Type text into input fields
- **Screenshot**: Capture page screenshots
- **DOM Snapshot**: Get accessibility-based page structure (with optional extra tags)
- **Wait**: Wait for specified durations
- **Console Print**: Output messages to console
- **Validation**: Return validation results (used by `test()` method)

Note: The `extract()` method uses native structured output via LangChain's `providerStrategy` rather than a custom tool, allowing for more efficient data extraction directly from the model provider.

### DOM Snapshot with Custom Elements

The DOM Snapshot tool is intelligent and can include additional HTML elements beyond the default interactive elements. The AI can request specific tags to be included in the snapshot.

**How it works:**
- By default, the snapshot includes only interactive elements (buttons, inputs, links, etc.)
- The AI can specify additional HTML tags to include using the `extraTags` parameter
- This is useful for validation tasks that need to examine text content or specific elements

**Example use case:**
When you ask the agent to validate text content on a page, the AI will automatically:
1. Call `GetDOMSnapshot` with `extraTags: ["p", "span", "h1", "h2"]`
2. Receive a snapshot that includes both interactive elements AND the specified text elements
3. Validate the condition based on the complete snapshot

**Common tags the AI might request:**
- Text content: `p`, `span`, `div`
- Headings: `h1`, `h2`, `h3`, `h4`, `h5`, `h6`
- Lists: `li`, `ul`, `ol`
- Labels: `label`

This feature enables more accurate validation and interaction with webpage content without overwhelming the context with unnecessary elements.

## Custom Tools

You can extend the agent with custom tools:

```typescript
import { AWAgent, createTool } from "@bini-bar-labs/atomic-web-agent-core";

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
