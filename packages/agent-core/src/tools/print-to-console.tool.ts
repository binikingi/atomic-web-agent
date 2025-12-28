import { tool } from "langchain";
import z from "zod";

export const PrintToConsoleToolSchema = z.object({
  message: z.string().describe("The message to print to the console"),
});

export function printToConsoleTool() {
  return tool(
    ({ message }) => {
      console.log(`[AI]: ${message}`);
      return true;
    },
    {
      name: "PrintToConsole",
      description: "Print a message to the console.",
      schema: PrintToConsoleToolSchema,
    }
  );
}
