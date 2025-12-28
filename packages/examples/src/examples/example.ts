import { getAgent } from "./agents.js";

console.time("runTime");
const mobileDocumentAgent = getAgent("openai");
await mobileDocumentAgent.init("chromium", {
  launchOptions: { headless: false },
});
const page = mobileDocumentAgent.getCurrentPage();
await page.goto("https://google.com");
await mobileDocumentAgent.do(
  "Enter in the search box the term 'what is Agentic AI?'"
);
await mobileDocumentAgent.close();
console.timeEnd("runTime");
