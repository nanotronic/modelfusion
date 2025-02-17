import { TextGenerationPromptFormat } from "../../model-function/generate-text/TextGenerationPromptFormat.js";
import {
  TextChatPrompt,
  validateChatPrompt,
} from "../../model-function/generate-text/prompt-format/ChatPrompt.js";
import { TextInstructionPrompt } from "../../model-function/generate-text/prompt-format/InstructionPrompt.js";

/**
 * Formats a text prompt as an Anthropic prompt.
 */
export function text(): TextGenerationPromptFormat<string, string> {
  return {
    format(prompt) {
      let text = "";
      text += "\n\nHuman:";
      text += prompt;
      text += "\n\nAssistant:";
      return text;
    },
    stopSequences: [],
  };
}

/**
 * Formats an instruction prompt as an Anthropic prompt.
 */
export function instruction(): TextGenerationPromptFormat<
  TextInstructionPrompt,
  string
> {
  return {
    format(prompt) {
      let text = prompt.system ?? "";

      text += "\n\nHuman:";
      text += prompt.instruction;
      text += "\n\nAssistant:";

      return text;
    },
    stopSequences: [],
  };
}

/**
 * Formats a chat prompt as an Anthropic prompt.
 *
 * @see https://docs.anthropic.com/claude/docs/constructing-a-prompt
 */
export function chat(): TextGenerationPromptFormat<TextChatPrompt, string> {
  return {
    format(prompt) {
      validateChatPrompt(prompt);

      let text = prompt.system ?? "";

      for (const { role, content } of prompt.messages) {
        switch (role) {
          case "user": {
            text += `\n\nHuman:${content}`;
            break;
          }
          case "assistant": {
            text += `\n\nAssistant:${content}`;
            break;
          }
          default: {
            const _exhaustiveCheck: never = role;
            throw new Error(`Unsupported role: ${_exhaustiveCheck}`);
          }
        }
      }

      // AI message prefix:
      text += `\n\nAssistant:`;

      return text;
    },
    stopSequences: [],
  };
}
