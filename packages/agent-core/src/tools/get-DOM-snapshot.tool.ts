import { tool } from "langchain";
import { type Page } from "playwright";
import { z } from "zod";
import { generateAccessibilitySnapshot } from "./utils/accessibility-snapshot.util.js";
import { type ElementLocatorRegistry } from "./utils/element-registry.util.js";

export function getDOMSnapshotTool(
  page: Page,
  elementRegistry: ElementLocatorRegistry
) {
  return tool(
    async ({ extraTags = [] }: { extraTags?: string[] }) => {
      console.log("Taking accessibility-based DOM snapshot...");
      if (extraTags.length > 0) {
        console.log(`  - Including extra tags: ${extraTags.join(", ")}`);
      }

      // Generate accessibility snapshot with visual metadata
      const snapshot = await generateAccessibilitySnapshot(
        page,
        elementRegistry.getMap(),
        extraTags
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

By default, the snapshot includes only visible, interactive elements like buttons, links, text inputs, etc.

You can optionally include additional HTML elements by specifying their tag names in the 'extraTags' parameter.
This is useful for validation tasks that need to examine text content or specific elements.

Examples:
- To include paragraph text: extraTags: ["p"]
- To include headings: extraTags: ["h1", "h2", "h3"]
- To include spans and divs: extraTags: ["span", "div"]
- To include multiple types: extraTags: ["p", "span", "h1", "h2", "label"]

Common tags you might want to include:
- Text content: "p", "span", "div"
- Headings: "h1", "h2", "h3", "h4", "h5", "h6"
- Lists: "li", "ul", "ol"
- Labels: "label"`,
      schema: z.object({
        extraTags: z
          .array(z.string())
          .optional()
          .describe(
            "Optional array of additional HTML tag names to include in the snapshot (e.g., ['p', 'span', 'h1'])"
          ),
      }),
    }
  );
}
