import { tool } from "langchain";
import { type Page } from "playwright";
import z from "zod";

export function navigateTool(page: Page) {
  return tool(
    async ({ url }) => {
      console.log(`Navigating to URL: ${url}`);
      return await page.goto(url);
    },
    {
      name: "NavigateToURL",
      description: "Navigate to a specified URL",
      schema: z.object({
        url: z.string().url().describe("The URL to navigate to"),
      }),
    }
  );
}
