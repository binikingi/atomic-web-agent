import { tool } from "langchain";
import { type Page } from "playwright";

export function getPageScreenShotTool(page: Page) {
  return tool(
    async () => {
      console.log("Taking screenshot...");
      const screenshot = await page.screenshot({ type: "jpeg" });
      return screenshot;
    },
    {
      name: "GetPageScreenShot",
      description:
        "Take a screenshot of the current page and return it as a JPEG image.",
    }
  );
}
