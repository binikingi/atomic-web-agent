import { tool } from "langchain";
import { type Page } from "playwright";
import z from "zod";

export const ClickByPositionToolSchema = z.object({
  x: z.number().describe("The x coordinate to click on"),
  y: z.number().describe("The y coordinate to click on"),
});

export function clickByPositionTool(page: Page) {
  return tool(
    async ({ x, y }) => {
      console.log(`Clicking at position: (${x}, ${y})`);
      return await page.mouse.click(x, y);
    },
    {
      name: "ClickByPosition",
      description:
        "Click on a position with the given x and y coordinates. use this tool when you have a screen shot page from the GetPageScreenShot tool and you want to click on a specific position on the page.",
      schema: ClickByPositionToolSchema,
    }
  );
}
