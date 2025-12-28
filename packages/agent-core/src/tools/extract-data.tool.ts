import { tool } from "langchain";
import { z } from "zod";

export function extractDataTool() {
  return tool(
    ({ data }: { data: Record<string, unknown> }) => {
      console.log(`Data extracted successfully`);
      console.log(`Extracted data:`, JSON.stringify(data, null, 2));
      return JSON.stringify({ data });
    },
    {
      name: "ReturnExtractedData",
      description: `Use this tool to return the extracted data from the webpage after gathering all required information.
Call this tool once you have collected all the data fields according to the extraction schema.
This is a TERMINAL action - after calling this tool, your task is complete and you should not take any further actions.

The data parameter should be a JSON object containing all the fields specified in the extraction instructions.
Make sure all required fields are present and have the correct types.`,
      schema: z.object({
        data: z
          .record(z.string(), z.unknown())
          .describe(
            "The extracted data as a JSON object with the specified fields"
          ),
      }),
    }
  );
}
