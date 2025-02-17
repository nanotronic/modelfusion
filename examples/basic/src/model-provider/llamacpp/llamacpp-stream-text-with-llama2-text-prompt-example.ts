import { Llama2PromptFormat, llamacpp, streamText } from "modelfusion";

// example assumes you are running https://huggingface.co/TheBloke/Llama-2-7B-GGUF with llama.cpp
async function main() {
  const textStream = await streamText(
    llamacpp
      .TextGenerator({
        contextWindowSize: 4096, // Llama 2 context window size
        maxCompletionTokens: 512,
      })
      .withTextPromptFormat(Llama2PromptFormat.text()),
    "Write a short story about a robot learning to love."
  );

  for await (const textPart of textStream) {
    process.stdout.write(textPart);
  }
}

main().catch(console.error);
