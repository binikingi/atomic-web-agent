import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import {
  createAgent,
  HumanMessage,
  type ReactAgent,
  SystemMessage,
  Tool,
} from "langchain";
import {
  type Browser,
  type BrowserContext,
  type BrowserContextOptions,
  chromium,
  type LaunchOptions,
  type Page,
} from "playwright";
import { clickByPositionTool } from "../tools/click-by-position.tool.js";
import { clickBySelectorTool } from "../tools/click-by-selector.tool.js";
import { getDOMSnapshotTool } from "../tools/get-DOM-snapshot.tool.js";
import { getPageScreenShotTool } from "../tools/get-page-screenshot.tool.js";
import { inputTool } from "../tools/input.tool.js";
import { navigateTool } from "../tools/navigate.tool.js";
import { waitTool } from "../tools/wait.tool.js";
import { loggingMiddleware } from "./middlewares/logging-calls.middleware.js";
import { trimMessagesHistoryMiddleware } from "./middlewares/trim-messages-history.middleware.js";
import { printToConsoleTool } from "../tools/print-to-console.tool.js";
import type { AgentTool } from "./AWAgent.types.js";

export class AWAgent {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private pages: Page[] | null = null;
  private currentPageContext: Page | null = null;
  private model: ChatAnthropic | ChatOpenAI;
  private agent: ReactAgent | null = null;
  private systemMessage: SystemMessage;
  private overrideTools: {
    getDOMSnapshotTool?: (page: Page) => AgentTool;
  };
  private customTools: ((page: Page) => AgentTool)[];

  constructor(
    model: ChatAnthropic | ChatOpenAI,
    systemMessage: string,
    options?: {
      customTools?: ((page: Page) => Tool)[];
      overrideTools?: {
        getDOMSnapshotTool?: (page: Page) => AgentTool;
      };
    }
  ) {
    this.model = model;
    this.systemMessage = new SystemMessage(systemMessage);
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

  private createTools(page: Page): AgentTool[] {
    return [
      clickBySelectorTool(page),
      inputTool(page),
      this.overrideTools.getDOMSnapshotTool?.(page) ?? getDOMSnapshotTool(page),
      waitTool(),
      navigateTool(page),
      getPageScreenShotTool(page),
      clickByPositionTool(page),
      printToConsoleTool(),
      ...this.customTools.map((buildTool) => buildTool(page)),
    ];
  }
}
