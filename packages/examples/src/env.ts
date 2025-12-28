import z from "zod";
import dotenv from "dotenv";

dotenv.config({ quiet: true });

export const env = z
  .object({
    ANTHROPIC_API_KEY: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
  })
  .parse(process.env);
