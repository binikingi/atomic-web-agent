import z from "zod";
import { getAgent } from "./agents.js";

console.time("runTime");
const agent = getAgent("openai");
await agent.init("chromium", {
  launchOptions: { headless: false },
});
const page = agent.getCurrentPage();
await page.goto("https://nike.com");
await agent.do("Go to men's shoes");
const { shoes } = await agent.extract(
  "return to me this data of the first 4 shoes in this page,  take all the data from the snapshot from this page and do not click any links everything is on the page",
  z.object({
    shoes: z.array(
      z.object({
        name: z.string(),
        numOfColors: z.number().default(0),
        price: z.number(),
      })
    ),
  })
);
console.log("Extracted shoes:", shoes);
await agent.close();
console.timeEnd("runTime");
