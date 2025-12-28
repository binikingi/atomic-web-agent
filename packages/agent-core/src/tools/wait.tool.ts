import { tool } from "langchain";
import z from "zod";

export const WaitToolSchema = z.object({
  waitMs: z.number().int().describe("The number of milliseconds to wait"),
});

export function waitTool() {
  return tool(
    async ({ waitMs }) => {
      console.log(`Waiting for ${waitMs} milliseconds`);
      return new Promise((resolve) => setTimeout(resolve, waitMs));
    },
    {
      name: "Wait",
      description: "Wait for a specified number of milliseconds",
      schema: WaitToolSchema,
    }
  );
}
