import dotenv from "dotenv";
import { OpenAIChatMessage, openai, useTool } from "modelfusion";
import { calculator } from "../../tool/tools/calculator-tool";

dotenv.config();

async function main() {
  console.log();
  console.log("Logging: detailed-object");
  console.log();

  const { tool, result } = await useTool(
    openai.ChatTextGenerator({ model: "gpt-3.5-turbo" }),
    calculator,
    [OpenAIChatMessage.user("What's fourteen times twelve?")],
    { logging: "detailed-object" }
  );
}

main().catch(console.error);
