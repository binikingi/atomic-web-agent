import {
  test,
  expect,
  chromium,
  type Browser,
  type Page,
} from "playwright/test";
import { generateAccessibilitySnapshot } from "./utils/accessibility-snapshot.util.js";
import { ElementLocatorRegistry } from "./utils/element-registry.util.js";

test.describe("DOM Snapshot Tool", () => {
  let browser: Browser;
  let page: Page;
  let registry: ElementLocatorRegistry;

  test.beforeAll(async () => {
    browser = await chromium.launch();
  });

  test.afterAll(async () => {
    await browser.close();
  });

  test.beforeEach(async () => {
    page = await browser.newPage();
    registry = new ElementLocatorRegistry();
  });

  test.afterEach(async () => {
    await page.close();
  });

  test("should extract accessibility tree from simple HTML", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <head><title>Test Page</title></head>
        <body>
          <h1>Hello World</h1>
          <button>Click Me</button>
          <input type="text" placeholder="Enter text" />
          <a href="/test">Test Link</a>
        </body>
      </html>
    `;

    await page.setContent(html);

    // Debug: Log what the evaluate function returns
    const rawTree = await page.evaluate(() => {
      interface TreeNode {
        role: string;
        name: string;
        tagName: string;
        children?: TreeNode[];
      }

      function buildTree(element: Element): TreeNode {
        function inferRole(el: Element): string {
          const tagName = el.tagName.toLowerCase();
          if (tagName === "button") return "button";
          if (tagName === "a") return "link";
          if (tagName === "input") {
            const type = (el as HTMLInputElement).type;
            if (type === "text" || type === "email" || type === "password")
              return "textbox";
            if (type === "checkbox") return "checkbox";
            if (type === "radio") return "radio";
            if (type === "search") return "searchbox";
          }
          if (tagName === "textarea") return "textbox";
          if (tagName === "select") return "combobox";
          if (tagName === "h1" || tagName === "h2" || tagName === "h3")
            return "heading";
          return "generic";
        }

        const role = element.getAttribute("role") || inferRole(element);
        const name =
          element.getAttribute("aria-label") ||
          (element as HTMLElement).innerText?.substring(0, 100) ||
          element.getAttribute("name") ||
          element.getAttribute("placeholder") ||
          "";

        const node: TreeNode = {
          role,
          name: name.trim(),
          tagName: element.tagName.toLowerCase(),
        };

        const children = Array.from(element.children)
          .map(buildTree)
          .filter((child): child is TreeNode => child !== null);

        if (children.length > 0) {
          node.children = children;
        }

        return node;
      }

      return buildTree(document.body);
    });

    console.log(
      "Raw tree from page.evaluate:",
      JSON.stringify(rawTree, null, 2)
    );

    const snapshot = await generateAccessibilitySnapshot(
      page,
      registry.getMap()
    );

    console.log("Generated snapshot:", JSON.stringify(snapshot, null, 2));
    console.log("Registry size:", registry.size());
    console.log("Registry IDs:", registry.getAllIds());

    expect(snapshot).toBeDefined();
    expect(snapshot.elements).toBeDefined();
    expect(snapshot.elements.length).toBeGreaterThan(0);

    // Should find the button
    const button = snapshot.elements.find((el) => el.role === "button");
    expect(button).toBeDefined();
    expect(button?.name).toContain("Click Me");

    // Should find the textbox
    const textbox = snapshot.elements.find((el) => el.role === "textbox");
    expect(textbox).toBeDefined();

    // Should find the link
    const link = snapshot.elements.find((el) => el.role === "link");
    expect(link).toBeDefined();
  });

  test("should extract elements from google.com", async () => {
    await page.goto("https://google.com", { waitUntil: "networkidle" });

    // Debug: Check what the raw tree looks like
    const rawTree = await page.evaluate(() => {
      interface TreeNode {
        role: string;
        name: string;
        tagName: string;
        hasText: boolean;
        children?: TreeNode[];
      }

      function buildTree(element: Element, depth: number = 0): TreeNode | null {
        if (depth > 5) return null; // Limit depth for debugging

        function inferRole(el: Element): string {
          const tagName = el.tagName.toLowerCase();
          if (tagName === "button") return "button";
          if (tagName === "a") return "link";
          if (tagName === "input") {
            const type = (el as HTMLInputElement).type;
            if (type === "text" || type === "email" || type === "password")
              return "textbox";
            if (type === "search") return "searchbox";
            if (type === "checkbox") return "checkbox";
          }
          if (tagName === "textarea") return "textbox";
          if (tagName === "select") return "combobox";
          return "generic";
        }

        const role = element.getAttribute("role") || inferRole(element);
        const name =
          element.getAttribute("aria-label") ||
          element.getAttribute("title") ||
          element.getAttribute("name") ||
          element.getAttribute("placeholder") ||
          "";

        const node: TreeNode = {
          role,
          name: name.trim(),
          tagName: element.tagName.toLowerCase(),
          hasText: (element as HTMLElement).innerText ? true : false,
        };

        const visibleChildren = Array.from(element.children).filter((child) => {
          const style = window.getComputedStyle(child as HTMLElement);
          return style.display !== "none" && style.visibility !== "hidden";
        });

        const children = visibleChildren
          .slice(0, 10) // Limit children for debugging
          .map((child) => buildTree(child, depth + 1))
          .filter((child): child is TreeNode => child !== null);

        if (children.length > 0) {
          node.children = children;
        }

        return node;
      }

      return buildTree(document.body);
    });

    console.log(
      "Raw tree from google.com (first few levels):",
      JSON.stringify(rawTree, null, 2)
    );

    // Check for interactive elements
    const buttons = await page.locator("button").count();
    const links = await page.locator("a").count();
    const inputs = await page.locator("input").count();

    console.log(
      `Google.com has: ${buttons} buttons, ${links} links, ${inputs} inputs`
    );

    const snapshot = await generateAccessibilitySnapshot(
      page,
      registry.getMap()
    );

    console.log("Generated snapshot from google.com:");
    console.log("  - Elements found:", snapshot.elements.length);
    console.log("  - Registry size:", registry.size());
    console.log(
      "  - First 10 elements:",
      JSON.stringify(snapshot.elements.slice(0, 10), null, 2)
    );

    expect(snapshot).toBeDefined();
    expect(snapshot.url).toContain("google");
    expect(snapshot.elements.length).toBeGreaterThan(0);
  });

  test("should correctly map elements to locators", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <button id="btn1">First Button</button>
          <button id="btn2">Second Button</button>
          <input type="text" id="input1" placeholder="First input" />
          <input type="text" id="input2" placeholder="Second input" />
        </body>
      </html>
    `;

    await page.setContent(html);

    const snapshot = await generateAccessibilitySnapshot(
      page,
      registry.getMap()
    );

    console.log("Elements found:", snapshot.elements.length);
    console.log("Registry size:", registry.size());

    expect(snapshot.elements.length).toBeGreaterThan(0);
    expect(registry.size()).toBeGreaterThan(0);

    // Try to interact with an element using the registry
    const buttonElement = snapshot.elements.find(
      (el) => el.role === "button" && el.name?.includes("First")
    );

    expect(buttonElement).toBeDefined();

    if (buttonElement) {
      const locator = registry.get(buttonElement.id);
      expect(locator).toBeDefined();

      if (locator) {
        // Verify we can interact with the locator
        await expect(locator).toBeVisible();
        await expect(locator).toBeEnabled();
      }
    }
  });

  test("should filter out hidden elements", async () => {
    const html = `
      <!DOCTYPE html>
      <html>
        <body>
          <button style="display: block;">Visible Button</button>
          <button style="display: none;">Hidden Button</button>
          <button style="visibility: hidden;">Invisible Button</button>
          <input type="text" value="visible" />
          <input type="text" value="hidden" style="display: none;" />
        </body>
      </html>
    `;

    await page.setContent(html);

    const snapshot = await generateAccessibilitySnapshot(
      page,
      registry.getMap()
    );

    // Should only find visible elements
    const buttons = snapshot.elements.filter((el) => el.role === "button");
    const inputs = snapshot.elements.filter((el) => el.role === "textbox");

    console.log("Visible buttons:", buttons.length);
    console.log("Visible inputs:", inputs.length);

    expect(buttons.length).toBe(1);
    expect(buttons[0].name).toContain("Visible");
    expect(inputs.length).toBe(1);
  });
});
