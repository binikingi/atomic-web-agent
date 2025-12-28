import { tool } from "langchain";
import { type Page } from "playwright";
import z from "zod";
import { type ElementLocatorRegistry } from "./utils/element-registry.util.js";

export const ClickByElementIdToolSchema = z.object({
  elementId: z
    .string()
    .describe("The element ID from the accessibility snapshot to click on"),
});

export function clickByElementIdTool(
  _page: Page,
  elementRegistry: ElementLocatorRegistry
) {
  return tool(
    async ({ elementId }) => {
      console.log(`Clicking on element: ${elementId}`);

      const locator = elementRegistry.get(elementId);
      if (!locator) {
        throw new Error(
          `Element ID "${elementId}" not found in registry. Please take a fresh DOM snapshot first using GetDOMSnapshot tool.`
        );
      }

      try {
        await locator.click({ timeout: 5000 });
        return `Successfully clicked on element ${elementId}`;
      } catch (error) {
        throw new Error(
          `Failed to click on element ${elementId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    {
      name: "ClickByElementId",
      description: `Click on an element using its ID from the accessibility snapshot.
The element ID should come from the most recent GetDOMSnapshot result.
This is the recommended way to interact with page elements instead of using CSS selectors.`,
      schema: ClickByElementIdToolSchema,
    }
  );
}
