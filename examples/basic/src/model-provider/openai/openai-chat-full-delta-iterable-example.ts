import {
  OpenAIChatMessage,
  OpenAIChatModel,
  OpenAIChatResponseFormat,
} from "ai-utils.js";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  const model = new OpenAIChatModel({
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    maxTokens: 500,
  });

  const deltas = await model.callAPI(
    [
      OpenAIChatMessage.system("You are a story writer. Write a story about:"),
      OpenAIChatMessage.user("A robot learning to love"),
    ],
    { responseFormat: OpenAIChatResponseFormat.fullDeltaIterable }
  );

  for await (const delta of deltas) {
    process.stdout.write(delta[0].delta.content ?? "");
  }
})();
