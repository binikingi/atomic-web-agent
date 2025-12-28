import { tool } from "langchain";
import { type Page } from "playwright";
import z from "zod";
import { type ElementLocatorRegistry } from "./utils/element-registry.util.js";

export const InputByElementIdToolSchema = z.object({
  elementId: z
    .string()
    .describe("The element ID from the accessibility snapshot to input text into"),
  text: z.string().describe("The text to input into the element"),
});

export function inputByElementIdTool(
  _page: Page,
  elementRegistry: ElementLocatorRegistry
) {
  return tool(
    async ({ elementId, text }) => {
      console.log(`Inputting text into element: ${elementId}`);

      const locator = elementRegistry.get(elementId);
      if (!locator) {
        throw new Error(
          `Element ID "${elementId}" not found in registry. Please take a fresh DOM snapshot first using GetDOMSnapshot tool.`
        );
      }

      try {
        // Check if element is editable
        const isEditable = await locator.isEditable().catch(() => false);
        if (!isEditable) {
          throw new Error(`Element ${elementId} is not editable`);
        }

        await locator.fill(text, { timeout: 5000 });
        return `Successfully filled element ${elementId} with text: "${text}"`;
      } catch (error) {
        throw new Error(
          `Failed to input text into element ${elementId}: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    },
    {
      name: "InputByElementId",
      description: `Input text into an element using its ID from the accessibility snapshot.
The element ID should come from the most recent GetDOMSnapshot result.
This is the recommended way to fill form fields instead of using CSS selectors.
Only works with editable elements like textboxes and search boxes.`,
      schema: InputByElementIdToolSchema,
    }
  );
}
