import { type Page, type Locator } from "playwright";

export interface ElementSnapshot {
  id: string;
  role: string;
  name: string | undefined;
  value: string | undefined;
  visible: boolean;
  inViewport: boolean;
  editable: boolean;
  disabled: boolean | undefined;
  checked: boolean | undefined;
  required: boolean | undefined;
  masked: boolean | undefined;
  bbox:
    | {
        x: number;
        y: number;
        w: number;
        h: number;
      }
    | undefined;
  children: ElementSnapshot[] | undefined;
}

export interface PageSnapshot {
  url: string;
  viewport: {
    width: number;
    height: number;
  };
  elements: ElementSnapshot[];
}

interface ElementData {
  xpath: string;
  role: string;
  name: string;
  value: string;
  disabled: boolean;
  checked: boolean;
  required: boolean;
  tagName: string;
  type: string;
}

let elementIdCounter = 0;

/**
 * Generates a stable synthetic ID for an element
 */
function generateElementId(role: string): string {
  return `${role}_${elementIdCounter++}`;
}

/**
 * Enriches element data with visual and interaction metadata using XPath locator
 */
async function enrichElement(
  page: Page,
  elementData: ElementData,
  locatorMap: Map<string, Locator>
): Promise<ElementSnapshot | null> {
  const id = generateElementId(elementData.role);

  try {
    // Locate element using XPath
    const locator = page.locator(`xpath=${elementData.xpath}`);

    // Check if element exists
    const count = await locator.count();
    if (count === 0) {
      return null;
    }

    // Use first matching element
    const element = locator.first();

    // Store locator for later use
    locatorMap.set(id, element);

    // Get visibility state
    const isVisible = await element.isVisible().catch(() => false);
    if (!isVisible) {
      return null; // Filter out hidden elements
    }

    // Get bounding box
    const boundingBox = await element.boundingBox().catch(() => null);

    // Check if in viewport (approximation based on bounding box)
    const viewport = page.viewportSize() || { width: 1280, height: 800 };
    const isInViewport = boundingBox
      ? boundingBox.x >= 0 &&
        boundingBox.y >= 0 &&
        boundingBox.x + boundingBox.width <= viewport.width &&
        boundingBox.y + boundingBox.height <= viewport.height
      : false;

    // Get editability state
    const isEditable = await element.isEditable().catch(() => false);

    // Build element snapshot
    const snapshot: ElementSnapshot = {
      id,
      role: elementData.role,
      name: elementData.name || undefined,
      value: elementData.value || undefined,
      visible: isVisible,
      inViewport: isInViewport,
      editable: isEditable,
      disabled: elementData.disabled ? true : undefined,
      checked: elementData.checked ? true : undefined,
      required: elementData.required ? true : undefined,
      masked: elementData.type === "password" ? true : undefined,
      bbox: boundingBox
        ? {
            x: Math.round(boundingBox.x),
            y: Math.round(boundingBox.y),
            w: Math.round(boundingBox.width),
            h: Math.round(boundingBox.height),
          }
        : undefined,
      children: undefined,
    };

    return snapshot;
  } catch (error) {
    // If we can't enrich this element, skip it
    console.warn(`Failed to enrich element ${elementData.role}:`, error);
    return null;
  }
}

/**
 * Generates an accessibility-based snapshot of the page with visual metadata
 */
export async function generateAccessibilitySnapshot(
  page: Page,
  locatorMap: Map<string, Locator>
): Promise<PageSnapshot> {
  // Reset counter for consistent IDs
  elementIdCounter = 0;

  // Clear previous locator map
  locatorMap.clear();

  // Extract all interactive elements with XPath locators
  const elementsData = await page.evaluate(() => {
    const results: Array<{
      xpath: string;
      role: string;
      name: string;
      value: string;
      disabled: boolean;
      checked: boolean;
      required: boolean;
      tagName: string;
      type: string;
    }> = [];

    function getXPath(element: Element): string {
      if (element.id) {
        return `//*[@id="${element.id}"]`;
      }

      const parts: string[] = [];
      let current: Element | null = element;

      while (current && current.nodeType === Node.ELEMENT_NODE) {
        let index = 0;
        let sibling = current.previousSibling;

        while (sibling) {
          if (
            sibling.nodeType === Node.ELEMENT_NODE &&
            sibling.nodeName === current.nodeName
          ) {
            index++;
          }
          sibling = sibling.previousSibling;
        }

        const tagName = current.nodeName.toLowerCase();
        const position = index > 0 ? `[${index + 1}]` : "";
        parts.unshift(`${tagName}${position}`);

        current = current.parentElement;
      }

      return `/${parts.join("/")}`;
    }

    function inferRole(element: Element): string {
      const tagName = element.tagName.toLowerCase();
      const explicitRole = element.getAttribute("role");
      if (explicitRole) return explicitRole;

      if (tagName === "button") return "button";
      if (tagName === "a") return "link";
      if (tagName === "input") {
        const type = (element as HTMLInputElement).type;
        if (type === "text" || type === "email" || type === "password")
          return "textbox";
        if (type === "checkbox") return "checkbox";
        if (type === "radio") return "radio";
        if (type === "search") return "searchbox";
        if (type === "submit") return "button";
      }
      if (tagName === "textarea") return "textbox";
      if (tagName === "select") return "combobox";
      if (tagName === "form") return "form";
      if (tagName === "nav") return "navigation";
      if (tagName === "main") return "main";
      if (tagName === "dialog") return "dialog";
      return "generic";
    }

    function getName(element: Element): string {
      // Priority: aria-label > text content > placeholder > name attr
      const ariaLabel = element.getAttribute("aria-label");
      if (ariaLabel) return ariaLabel.trim();

      const placeholder = element.getAttribute("placeholder");
      if (placeholder) return placeholder.trim();

      const nameAttr = element.getAttribute("name");
      if (nameAttr) return nameAttr.trim();

      // For links and buttons, get text content
      if (
        element instanceof HTMLButtonElement ||
        element instanceof HTMLAnchorElement
      ) {
        return (element.textContent || "").trim().substring(0, 100);
      }

      // For inputs, use the value or label
      if (element instanceof HTMLInputElement) {
        const labels = document.querySelectorAll(`label[for="${element.id}"]`);
        if (labels.length > 0) {
          return (labels[0].textContent || "").trim();
        }
      }

      return "";
    }

    // Find all interactive elements
    const selectors = [
      "button",
      "a[href]",
      "input",
      "textarea",
      "select",
      "[role='button']",
      "[role='link']",
      "[role='textbox']",
      "[role='checkbox']",
      "[role='radio']",
      "[role='combobox']",
      "[onclick]",
    ];

    const elements = document.querySelectorAll(selectors.join(", "));

    elements.forEach((element) => {
      const role = inferRole(element);
      const name = getName(element);
      const xpath = getXPath(element);

      let value = "";
      let checked = false;
      let type = "";

      if (
        element instanceof HTMLInputElement ||
        element instanceof HTMLTextAreaElement
      ) {
        value = element.value;
        type = element instanceof HTMLInputElement ? element.type : "textarea";
      }

      if (element instanceof HTMLInputElement && element.type === "checkbox") {
        checked = element.checked;
      }

      const disabled =
        element instanceof HTMLButtonElement ||
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? element.disabled
          : false;

      const required =
        element instanceof HTMLInputElement ||
        element instanceof HTMLSelectElement ||
        element instanceof HTMLTextAreaElement
          ? element.required
          : false;

      results.push({
        xpath,
        role,
        name,
        value,
        disabled,
        checked,
        required,
        tagName: element.tagName.toLowerCase(),
        type,
      });
    });

    return results;
  });

  // Get viewport size
  const viewportSize = page.viewportSize() || { width: 1280, height: 800 };

  // Enrich each element with visual metadata
  const elements: ElementSnapshot[] = [];
  for (const elementData of elementsData) {
    const enrichedElement = await enrichElement(page, elementData, locatorMap);
    if (enrichedElement) {
      elements.push(enrichedElement);
    }
  }

  return {
    url: page.url(),
    viewport: {
      width: viewportSize.width,
      height: viewportSize.height,
    },
    elements,
  };
}
