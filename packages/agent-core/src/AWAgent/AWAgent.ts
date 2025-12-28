import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import {
  createAgent,
  HumanMessage,
  type ReactAgent,
  SystemMessage,
  Tool,
  type BaseMessage,
  ToolMessage,
  AIMessage,
} from "langchain";
import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  chromium,
  type LaunchOptions,
  type Page,
} from "playwright";
import { clickByElementIdTool } from "../tools/click-by-element-id.tool.js";
import { clickByPositionTool } from "../tools/click-by-position.tool.js";
import { getDOMSnapshotTool } from "../tools/get-DOM-snapshot.tool.js";
import { getPageScreenShotTool } from "../tools/get-page-screenshot.tool.js";
import { inputByElementIdTool } from "../tools/input-by-element-id.tool.js";
import { navigateTool } from "../tools/navigate.tool.js";
import { printToConsoleTool } from "../tools/print-to-console.tool.js";
import { validateConditionTool } from "../tools/validate-condition.tool.js";
import { ElementLocatorRegistry } from "../tools/utils/element-registry.util.js";
import { waitTool } from "../tools/wait.tool.js";
import type { AgentTool } from "./AWAgent.types.js";
import { loggingMiddleware } from "./middlewares/logging-calls.middleware.js";
import { trimMessagesHistoryMiddleware } from "./middlewares/trim-messages-history.middleware.js";

export class AWAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Page[] | null = null;
  private currentPageContext: Page | null = null;
  private model: ChatAnthropic | ChatOpenAI;
  private agent: ReactAgent | null = null;
  private systemMessage: SystemMessage;
  private elementRegistry: ElementLocatorRegistry;
  private overrideTools: {
    getDOMSnapshotTool?: (
      page: Page,
      registry: ElementLocatorRegistry
    ) => AgentTool;
  };
  private customTools: ((page: Page) => AgentTool)[];

  constructor(
    model: ChatAnthropic | ChatOpenAI,
    systemMessage: string,
    options?: {
      customTools?: ((page: Page) => Tool)[];
      overrideTools?: {
        getDOMSnapshotTool?: (
          page: Page,
          registry: ElementLocatorRegistry
        ) => AgentTool;
      };
    }
  ) {
    this.model = model;
    this.systemMessage = new SystemMessage(systemMessage);
    this.elementRegistry = new ElementLocatorRegistry();
    this.overrideTools = options?.overrideTools ?? {};
    this.customTools = options?.customTools ?? [];
  }

  async init(
    type: "chromium",
    options?: {
      launchOptions?: LaunchOptions;
      contextOptions?: BrowserContextOptions;
    }
  ) {
    switch (type) {
      case "chromium": {
        this.browser = await chromium.launch(options?.launchOptions);
        this.context = await this.browser.newContext(options?.contextOptions);
        this.currentPageContext = await this.context.newPage();
      }
    }
  }

  async newPage() {
    if (!this.context) {
      throw new Error("Browser not initialized");
    }
    const page = await this.context.newPage();
    this.currentPageContext = page;
    return page;
  }

  getCurrentPage() {
    if (!this.currentPageContext) {
      throw new Error("Agent is not initialized");
    }
    return this.currentPageContext;
  }

  getAllPages() {
    if (!this.context) {
      throw new Error("Browser not initialized");
    }
    this.pages = this.context.pages();
    return this.pages;
  }

  async do(task: string) {
    if (!this.currentPageContext) {
      throw new Error("Agent is not initialized");
    }
    if (!this.agent) {
      const tools = this.createTools(this.currentPageContext);

      const agent = createAgent({
        model: this.model,
        tools: tools,
        systemPrompt: this.systemMessage,
        middleware: [loggingMiddleware, trimMessagesHistoryMiddleware],
      });
      this.agent = agent;
    }

    const response = await this.agent.invoke({
      messages: [new HumanMessage(task)],
    });

    return console.log(response.messages.at(-1)!.content);
  }

  async test(condition: string): Promise<boolean> {
    if (!this.currentPageContext) {
      throw new Error("Agent is not initialized");
    }

    // Create a temporary agent with validation tools
    const validationTools = [
      ...this.createTools(this.currentPageContext),
      validateConditionTool(),
    ];

    const validationSystemPrompt = new SystemMessage(
      `You are a webpage validation agent. Your task is to determine if a given condition is true or false on the current webpage.

Instructions:
1. First, use GetDOMSnapshot to examine the page structure
2. If needed, use GetPageScreenShot for visual confirmation
3. Analyze whether the condition is met based on the available evidence
4. Call ReturnValidationResult with your boolean conclusion and reasoning
5. IMPORTANT: After calling ReturnValidationResult, your task is complete. Do NOT take any further actions.

Be precise and factual. Only return true if you have clear evidence the condition is met.
If you cannot determine the result with confidence, return false with an explanation.

Your final action MUST be to call ReturnValidationResult. Do not continue after that.`
    );

    const validationAgent = createAgent({
      model: this.model,
      tools: validationTools,
      systemPrompt: validationSystemPrompt,
      middleware: [loggingMiddleware, trimMessagesHistoryMiddleware],
    });

    const response = await validationAgent.invoke(
      {
        messages: [new HumanMessage(`Validate: ${condition}`)],
      },
      {
        recursionLimit: 10, // Limit iterations to prevent infinite loops
      }
    );

    // Parse the validation result from the agent's messages
    const result = this.extractValidationResult(response.messages);

    return result;
  }

  async close() {
    if (this.context) {
      for (const page of this.context.pages()) {
        await page.close();
      }
      await this.context.close();
      this.context = null;
      this.currentPageContext = null;
    }
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }

  private extractValidationResult(messages: BaseMessage[]): boolean {
    // Find the ReturnValidationResult tool call in messages
    // Iterate from the end to find the most recent tool call
    for (let i = messages.length - 1; i >= 0; i--) {
      const message = messages[i];

      // Check if this is a tool message with the validation result
      if (
        message instanceof ToolMessage &&
        message.name === "ReturnValidationResult"
      ) {
        try {
          const content = JSON.parse(
            typeof message.content === "string"
              ? message.content
              : JSON.stringify(message.content)
          ) as { result: boolean; reasoning: string };
          return content.result;
        } catch (error) {
          throw new Error(
            `Failed to parse validation result: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      // Also check tool calls in AI messages
      if (
        message instanceof AIMessage &&
        message.tool_calls &&
        Array.isArray(message.tool_calls)
      ) {
        for (const toolCall of message.tool_calls) {
          if (toolCall.name === "ReturnValidationResult" && toolCall.args) {
            return (toolCall.args as { result: boolean; reasoning: string })
              .result;
          }
        }
      }
    }

    throw new Error(
      "Validation result not found in agent response. The agent did not call ReturnValidationResult."
    );
  }

  private createTools(page: Page): AgentTool[] {
    return [
      // Element ID-based tools (recommended for use with accessibility snapshots)
      clickByElementIdTool(page, this.elementRegistry),
      inputByElementIdTool(page, this.elementRegistry),
      // Snapshot tool with element registry integration
      this.overrideTools.getDOMSnapshotTool?.(page, this.elementRegistry) ??
        getDOMSnapshotTool(page, this.elementRegistry),
      // Other utility tools
      waitTool(),
      navigateTool(page),
      getPageScreenShotTool(page),
      clickByPositionTool(page),
      printToConsoleTool(),
      ...this.customTools.map((buildTool) => buildTool(page)),
    ];
  }
}
