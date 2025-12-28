import { getAgent } from "./agents.js";

console.time("runTime");
const mobileDocumentAgent = getAgent("openai");
await mobileDocumentAgent.init("chromium", {
  launchOptions: { headless: false },
});
const page = mobileDocumentAgent.getCurrentPage();
await page.goto("https://www.time.gov/");
const result = await mobileDocumentAgent.test(
  "Check if time in Alaska is before 10AM"
);
console.log("time is before 10am?:", result);
await mobileDocumentAgent.close();
console.timeEnd("runTime");
