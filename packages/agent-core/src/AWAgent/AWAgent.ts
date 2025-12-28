import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import {
  AIMessage,
  type BaseMessage,
  createAgent,
  HumanMessage,
  providerStrategy,
  type ReactAgent,
  SystemMessage,
  Tool,
  ToolMessage,
} from "langchain";
import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  chromium,
  type LaunchOptions,
  type Page,
} from "playwright";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import { clickByElementIdTool } from "../tools/click-by-element-id.tool.js";
import { getDOMSnapshotTool } from "../tools/get-DOM-snapshot.tool.js";
import { inputByElementIdTool } from "../tools/input-by-element-id.tool.js";
import { navigateTool } from "../tools/navigate.tool.js";
import { printToConsoleTool } from "../tools/print-to-console.tool.js";
import { ElementLocatorRegistry } from "../tools/utils/element-registry.util.js";
import { validateConditionTool } from "../tools/validate-condition.tool.js";
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

      // Enhance system message with behavioral guidelines
      const baseMessage = typeof this.systemMessage.content === "string"
        ? this.systemMessage.content
        : JSON.stringify(this.systemMessage.content);

      const enhancedSystemPrompt = new SystemMessage(
        `${baseMessage}

IMPORTANT BEHAVIORAL GUIDELINES:
1. You are operating on a browser page. ALWAYS start by using GetDOMSnapshot to see what page you're currently on and what's available.
2. Be PROACTIVE and take ACTION immediately. Do NOT ask the user clarifying questions unless absolutely necessary.
3. If you're already on a website and the user asks to navigate to a section (e.g., "go to men's shoes"), use the available page elements to navigate within the current site.
4. Use ClickByElementId to click on links, buttons, or navigation elements that match the user's intent.
5. If you need more context about the page, use GetDOMSnapshot with extra tags like ["a", "nav", "h1", "h2"] to see navigation links and headings.
6. Only use NavigateToURL if you need to go to a completely different website with a specific URL.
7. Execute the task directly based on what you observe on the page. Be decisive.
8. If you cannot complete the task with the available tools and page elements, explain why clearly.`
      );

      const agent = createAgent({
        model: this.model,
        tools: tools,
        systemPrompt: enhancedSystemPrompt,
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

  async extract<T>(instructions: string, schema: z.ZodSchema<T>): Promise<T> {
    if (!this.currentPageContext) {
      throw new Error("Agent is not initialized");
    }

    // Create tools for extraction (without the extractDataTool)
    const extractionTools = this.createTools(this.currentPageContext);

    // Generate schema description for the AI
    const schemaDescription = this.generateSchemaDescription(schema);

    const extractionSystemPrompt = new SystemMessage(
      `You are a webpage data extraction agent. Your task is to extract structured data from the current webpage according to a specific schema.

Instructions:
1. Use GetDOMSnapshot to examine the page structure. Include extra tags if needed (e.g., ["p", "span", "h1"] for text content)
2. If needed, use GetPageScreenShot for visual confirmation
3. Analyze the page content and extract the required data fields according to the schema
4. Return the extracted data in your final response

Additional instructions: ${instructions}\n\n
Data Schema: ${schemaDescription}

Be precise and accurate. Extract only the data that is clearly present on the page.
If a field is not found or cannot be determined, use null for optional fields or your best judgment for required fields.`
    );

    const extractionAgent = createAgent({
      model: this.model,
      tools: extractionTools,
      systemPrompt: extractionSystemPrompt,
      // No middleware - incompatible with structured output (providerStrategy)
      responseFormat: providerStrategy(schema),
    });

    const response = await extractionAgent.invoke(
      {
        messages: [
          new HumanMessage(
            `Extract data from the current page according to the schema.`
          ),
        ],
      },
      {
        recursionLimit: 15, // Limit iterations to prevent infinite loops
      }
    );

    // Extract the structured output from the response
    const extractedData = this.extractStructuredOutput(response, schema);

    return extractedData;
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

  private generateSchemaDescription(schema: z.ZodSchema): string {
    // Convert Zod schema to JSON Schema for a clear, standard representation
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-argument
    const jsonSchema = zodToJsonSchema(schema as any, "extractionSchema");
    return JSON.stringify(jsonSchema, null, 2);
  }

  private extractStructuredOutput<T>(
    response: { messages: BaseMessage[] },
    schema: z.ZodSchema<T>
  ): T {
    // With providerStrategy, the structured output should be in the last message
    const lastMessage = response.messages[response.messages.length - 1];

    if (lastMessage instanceof AIMessage) {
      try {
        // The structured output is typically in message.content or message.additional_kwargs
        let structuredData: unknown;

        // Check if content is already an object (structured output)
        if (
          typeof lastMessage.content === "object" &&
          lastMessage.content !== null
        ) {
          structuredData = lastMessage.content;
        }
        // Check additional_kwargs for structured output
        else if (lastMessage.additional_kwargs?.structured_output) {
          structuredData = lastMessage.additional_kwargs.structured_output;
        }
        // Try parsing content as JSON
        else if (typeof lastMessage.content === "string") {
          try {
            structuredData = JSON.parse(lastMessage.content);
          } catch {
            throw new Error("Could not parse structured output from response");
          }
        }

        // Validate the extracted data against the schema
        const validatedData = schema.parse(structuredData);
        console.log("Data extracted and validated successfully");
        return validatedData;
      } catch (error) {
        if (error instanceof z.ZodError) {
          const errorMessages = error.issues
            .map((e) => `${e.path.join(".")}: ${e.message}`)
            .join(", ");
          throw new Error(`Extracted data validation failed: ${errorMessages}`);
        }
        throw new Error(
          `Failed to extract structured output: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }

    throw new Error(
      "No structured output found in agent response. Expected an AI message with structured data."
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
      // getPageScreenShotTool(page),
      // clickByPositionTool(page),
      printToConsoleTool(),
      ...this.customTools.map((buildTool) => buildTool(page)),
    ];
  }
}
