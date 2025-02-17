import { TextGenerationPromptFormat } from "../TextGenerationPromptFormat.js";
import { TextInstructionPrompt } from "./InstructionPrompt.js";

const DEFAULT_SYSTEM_PROMPT_INPUT =
  "Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.";
const DEFAULT_SYSTEM_PROMPT_NO_INPUT =
  "Below is an instruction that describes a task. Write a response that appropriately completes the request.";

/**
 * Formats a text prompt as an Alpaca prompt.
 */
export function text(): TextGenerationPromptFormat<string, string> {
  return {
    stopSequences: [],
    format(prompt) {
      let text = DEFAULT_SYSTEM_PROMPT_NO_INPUT;
      text += "\n\n### Instruction:\n";
      text += prompt;
      text += "\n\n### Response:\n";

      return text;
    },
  };
}

/**
 * Formats an instruction prompt as an Alpaca prompt.
 *
 * If the instruction has a system prompt, it overrides the default system prompt
 * (which can impact the results, because the model may be trained on the default system prompt).
 *
 * Prompt format with input:
 * ```
 * Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.
 *
 * ### Instruction:
 *
 * {instruction}
 *
 * ### Input:
 *
 * {input}
 *
 * ### Response:
 *
 * ```
 *
 * Prompt format without input:
 * ```
 * Below is an instruction that describes a task. Write a response that appropriately completes the request.
 *
 * ### Instruction:
 *
 * {instruction}
 *
 * ### Response:
 *
 * ```
 *
 * @see https://github.com/tatsu-lab/stanford_alpaca#data-release
 */
export function instruction(): TextGenerationPromptFormat<
  TextInstructionPrompt & { input?: string }, // optional input supported by Alpaca
  string
> {
  return {
    stopSequences: [],
    format(prompt) {
      let text =
        prompt.system ??
        (prompt.input != null
          ? DEFAULT_SYSTEM_PROMPT_INPUT
          : DEFAULT_SYSTEM_PROMPT_NO_INPUT);

      text += "\n\n### Instruction:\n";

      if (prompt.system != null) {
        text += `${prompt.system}\n`;
      }

      text += prompt.instruction;

      if (prompt.input != null) {
        text += `\n\n### Input:\n${prompt.input}`;
      }

      text += "\n\n### Response:\n";

      return text;
    },
  };
}
