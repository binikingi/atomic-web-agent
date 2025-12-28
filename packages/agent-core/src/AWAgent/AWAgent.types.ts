import type { ClientTool, ServerTool } from "@langchain/core/tools";

export type AgentTool = ServerTool | ClientTool;
