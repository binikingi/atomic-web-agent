import { tool } from "langchain";
import { z } from "zod";

export function validateConditionTool() {
  return tool(
    ({ result, reasoning }: { result: boolean; reasoning: string }) => {
      console.log(`Validation result: ${result}`);
      console.log(`Reasoning: ${reasoning}`);
      return JSON.stringify({ result, reasoning });
    },
    {
      name: "ReturnValidationResult",
      description: `Use this tool to return the final validation result after examining the page.
Call this tool once you have determined whether the condition is true or false.
This is a TERMINAL action - after calling this tool, your task is complete and you should not take any further actions.

Parameters:
- result: true if the condition is met, false otherwise
- reasoning: Brief explanation of why the condition is true/false`,
      schema: z.object({
        result: z.boolean().describe("Whether the condition is met"),
        reasoning: z.string().describe("Brief explanation of the result"),
      }),
    }
  );
}
