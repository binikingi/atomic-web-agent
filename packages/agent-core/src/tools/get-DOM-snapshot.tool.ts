import { tool } from "langchain";
import { type Page } from "playwright";
import { minimizeSnapshot } from "./utils/minimize-snapshot.util.js";

export function getDOMSnapshotTool(page: Page) {
  return tool(
    async () => {
      console.log("Taking DOM snapshot...");
      const snapshot = await page.evaluate(() => {
        const DOM = document.body.outerHTML;
        return DOM;
      });
      const minimizedSnapshot = minimizeSnapshot(snapshot);
      const ziseofMinimized = new Blob([minimizedSnapshot]).size;
      console.log(`Minimized snapshot size: ${ziseofMinimized} bytes`);
      return minimizedSnapshot;
    },
    {
      name: "GetDOMSnapshot",
      description: "Get an snapshot of the current webpage",
    }
  );
}
