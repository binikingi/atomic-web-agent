import { tool } from "langchain";
import { type Page } from "playwright";
import { expect } from "playwright/test";
import z from "zod";

export const InputBySelectorToolSchema = z.object({
  selector: z.string().describe("The CSS selector of the element to input"),
  text: z.string().describe("The text to input into the element"),
});

export function inputTool(page: Page) {
  return tool(
    async ({ selector, text }) => {
      console.log(
        `Inputting text into selector: ${selector} with text: ${text}`
      );
      const element = page.locator(selector);
      await expect(
        element,
        `Expected to find 1 element with selector ${selector}, got: ${await element.count()}`
      ).toHaveCount(1);
      return await element.fill(text, { timeout: 1000 });
    },
    {
      name: "InputBySelector",
      description: "Input text into an element with the given CSS selector",
      schema: InputBySelectorToolSchema,
    }
  );
}
