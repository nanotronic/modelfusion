import dotenv from "dotenv";
import {
  OpenAIApiConfiguration,
  generateText,
  openai,
  retryNever,
} from "modelfusion";

dotenv.config();

async function main() {
  const api = new OpenAIApiConfiguration({
    retry: retryNever(),
  });

  const text = await generateText(
    openai.CompletionTextGenerator({
      api,
      model: "gpt-3.5-turbo-instruct",
    }),
    "Write a short story about a robot learning to love:\n\n"
  );

  console.log(text);
}

main().catch(console.error);
