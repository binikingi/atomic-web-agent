import { getAgent } from "./agents.js";

console.time("runTime");
const agent = getAgent("openai");
await agent.init("chromium", {
  launchOptions: { headless: false },
});
const page = agent.getCurrentPage();
await page.goto("https://www.time.gov/");
const result = await agent.test("Check if time in Alaska is before 10AM");
console.log("time is before 10am?:", result);
await agent.close();
console.timeEnd("runTime");
