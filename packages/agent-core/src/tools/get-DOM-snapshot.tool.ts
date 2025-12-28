import { tool } from "langchain";
import { type Page } from "playwright";
import { generateAccessibilitySnapshot } from "./utils/accessibility-snapshot.util.js";
import { type ElementLocatorRegistry } from "./utils/element-registry.util.js";

export function getDOMSnapshotTool(
  page: Page,
  elementRegistry: ElementLocatorRegistry
) {
  return tool(
    async () => {
      console.log("Taking accessibility-based DOM snapshot...");

      // Generate accessibility snapshot with visual metadata
      const snapshot = await generateAccessibilitySnapshot(
        page,
        elementRegistry.getMap()
      );

      // Convert to JSON string for the model
      const snapshotJson = JSON.stringify(snapshot, null, 2);
      const snapshotSize = new Blob([snapshotJson]).size;

      console.log(`Accessibility snapshot generated:`);
      console.log(`  - Elements found: ${snapshot.elements.length}`);
      console.log(`  - Snapshot size: ${snapshotSize} bytes`);
      console.log(`  - URL: ${snapshot.url}`);

      return snapshotJson;
    },
    {
      name: "GetDOMSnapshot",
      description: `Get an accessibility-based snapshot of the current webpage.
Returns a structured JSON representation with interactive elements, their roles, names, and visual properties.
Each element has a unique 'id' that can be used with action tools (ClickByElementId, InputByElementId).
The snapshot includes only visible, interactive elements like buttons, links, text inputs, etc.`,
    }
  );
}
