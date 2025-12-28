import { tool } from "langchain";
import { type Page } from "playwright";
import z from "zod";

export const ClickBySelectorToolSchema = z.object({
  selector: z.string().describe("The CSS selector of the element to click on"),
});

export function clickBySelectorTool(page: Page) {
  return tool(
    async ({ selector }) => {
      console.log(`Clicking on (first) selector: ${selector}`);
      return page.locator(selector).first().click({ timeout: 1000 });
    },
    {
      name: "ClickBySelector",
      description: "Click on an element with the given CSS selector",
      schema: ClickBySelectorToolSchema,
    }
  );
}
