import { type Locator } from "playwright";

/**
 * Registry for managing element ID to Playwright Locator mappings
 * This is used to translate synthetic element IDs from the accessibility snapshot
 * into actual Playwright locators for performing actions
 */
export class ElementLocatorRegistry {
  private locatorMap: Map<string, Locator>;

  constructor() {
    this.locatorMap = new Map();
  }

  /**
   * Gets the internal locator map (used by snapshot generation)
   */
  getMap(): Map<string, Locator> {
    return this.locatorMap;
  }

  /**
   * Gets a locator by its element ID
   */
  get(elementId: string): Locator | undefined {
    return this.locatorMap.get(elementId);
  }

  /**
   * Sets a locator for an element ID
   */
  set(elementId: string, locator: Locator): void {
    this.locatorMap.set(elementId, locator);
  }

  /**
   * Clears all element mappings
   */
  clear(): void {
    this.locatorMap.clear();
  }

  /**
   * Gets all element IDs
   */
  getAllIds(): string[] {
    return Array.from(this.locatorMap.keys());
  }

  /**
   * Gets the number of registered elements
   */
  size(): number {
    return this.locatorMap.size;
  }

  /**
   * Checks if an element ID exists in the registry
   */
  has(elementId: string): boolean {
    return this.locatorMap.has(elementId);
  }
}
