import dotenv from "dotenv";
import {
  HeliconeOpenAIApiConfiguration,
  OpenAIChatMessage,
  generateText,
  openai,
} from "modelfusion";

dotenv.config();

async function main() {
  const text = await generateText(
    openai.ChatTextGenerator({
      api: new HeliconeOpenAIApiConfiguration(),
      model: "gpt-3.5-turbo",
      temperature: 0.7,
      maxCompletionTokens: 500,
    }),
    [
      OpenAIChatMessage.system(
        "Write a short story about a robot learning to love:"
      ),
    ]
  );

  console.log(text);
}

main().catch(console.error);
