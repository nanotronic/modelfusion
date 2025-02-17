---
sidebar_position: 35
title: Anthropic
---

# Anthropic

## Setup

1. You can sign up at [Anthropic](https://www.anthropic.com/) and create an API key.
1. The API key can be configured as an environment variable (`ANTHROPIC_API_KEY`) or passed in as an option into the model constructor.

## Configuration

### API Configuration

[Anthropic API Configuration](/api/classes/AnthropicApiConfiguration)

```ts
const api = new AnthropicApiConfiguration({
  apiKey: "my-api-key", // optional; default: process.env.ANTHROPIC_API_KEY
  // ...
});

const model = anthropic.TextGenerator({
  api,
  // ...
});
```

## Model Functions

[Examples](https://github.com/lgrammel/modelfusion/tree/main/examples/basic/src/model-provider/anthropic)

### Generate Text

[AnthropicTextGenerationModel API](/api/classes/AnthropicTextGenerationModel)

```ts
import { anthropic, generateText } from "modelfusion";

const text = await generateText(
  anthropic.TextGenerator({
    model: "claude-instant-1",
    temperature: 0.7,
    maxCompletionTokens: 500,
  }),
  `\n\nHuman: Write a short story about a robot learning to love\n\nAssistant: `
);
```

### Stream Text

[AnthropicTextGenerationModel API](/api/classes/AnthropicTextGenerationModel)

```ts
import { anthropic, streamText } from "modelfusion";

const textStream = await streamText(
  anthropic.TextGenerator({
    model: "claude-instant-1",
    temperature: 0.7,
    maxCompletionTokens: 500,
  }),
  `\n\nHuman: Write a short story about a robot learning to love\n\nAssistant: `
);

for await (const textPart of textStream) {
  process.stdout.write(textPart);
}
```

## Prompt Format

Anthropic requires a very specific prompt format with "Human: " and "Assistant: " sections.
Using a prompt mapping can make the interaction with Anthropic models easier.

### Text prompt

[AnthropicPromptFormat.text()](/api/namespaces/AnthropicPromptFormat) lets you use basic text prompts with Anthropic models. It is available as a shorthand method:

```ts
const textStream = await streamText(
  anthropic
    .TextGenerator({
      // ...
    })
    .withTextPrompt(),
  "Write a short story about a robot learning to love"
);
```

### Instruction prompt

[AnthropicPromptFormat.instruction()](/api/namespaces/AnthropicPromptFormat) lets you use [text instruction prompts](/api/interfaces/TextInstructionPrompt) with Anthropic models. It is available as a shorthand method:

```ts
const textStream = await streamText(
  anthropic
    .TextGenerator({
      // ...
    })
    .withInstructionPrompt(),
  { instruction: "Write a short story about a robot learning to love" }
);
```

### Chat prompt

[AnthropicPromptFormat.chat()](/api/namespaces/AnthropicPromptFormat) lets you use use [text chat prompts](/api/interfaces/TextChatPrompt) with Anthropic models. It is available as a shorthand method:

```ts
const textStream = await streamText(
  anthropic
    .TextGenerator({
      // ...
    })
    .withChatPrompt(),
  {
    // note: Anthropic models don't adhere well to the system message, we leave it out
    messages: [
      {
        role: "user",
        content: "Suggest a name for a robot.",
      },
      {
        role: "assistant",
        content: "I suggest the name Robbie",
      },
      {
        role: "user",
        content: "Write a short story about Robbie learning to love",
      },
    ],
  }
);
```
