import { ChatAnthropic } from "@langchain/anthropic";
import { ChatOpenAI } from "@langchain/openai";
import dedent from "dedent";
import { env } from "../env.js";
import { AWAgent } from "@bini-bar-labs/atomic-web-agent-core";

const systemMessage = dedent`
    You are a helpfull web automation agent
`;

export const getAgent = (provider: "openai" | "anthropic") => {
  let model: ChatOpenAI | ChatAnthropic;

  switch (provider) {
    case "anthropic": {
      if (env.ANTHROPIC_API_KEY === undefined) {
        throw new Error("ANTHROPIC_API_KEY is not defined");
      }
      model = new ChatAnthropic({
        apiKey: env.ANTHROPIC_API_KEY,
        model: "claude-sonnet-4-20250514",
        temperature: 0.1,
      });
      break;
    }
    case "openai": {
      if (env.OPENAI_API_KEY === undefined) {
        throw new Error("OPENAI_API_KEY is not defined");
      }
      model = new ChatOpenAI({
        apiKey: env.OPENAI_API_KEY,
        model: "gpt-5-mini-2025-08-07",
      });
      break;
    }
  }

  return new AWAgent(model, systemMessage);
};
