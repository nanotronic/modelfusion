import { z } from "zod";
import { FunctionOptions } from "../../../core/FunctionOptions.js";
import { ApiConfiguration } from "../../../core/api/ApiConfiguration.js";
import { callWithRetryAndThrottle } from "../../../core/api/callWithRetryAndThrottle.js";
import {
  ResponseHandler,
  createJsonResponseHandler,
  postJsonToApi,
} from "../../../core/api/postToApi.js";
import { parseJSON } from "../../../core/schema/parseJSON.js";
import { AbstractModel } from "../../../model-function/AbstractModel.js";
import { Delta } from "../../../model-function/Delta.js";
import { parsePartialJson } from "../../../model-function/generate-structure/parsePartialJson.js";
import { TextGenerationModelSettings } from "../../../model-function/generate-text/TextGenerationModel.js";
import { ToolDefinition } from "../../../tool/ToolDefinition.js";
import { OpenAIApiConfiguration } from "../OpenAIApiConfiguration.js";
import { failedOpenAICallResponseHandler } from "../OpenAIError.js";
import { OpenAIChatMessage } from "./OpenAIChatMessage.js";
import { createOpenAIChatDeltaIterableQueue } from "./OpenAIChatStreamIterable.js";

export interface AbstractOpenAIChatCallSettings {
  api?: ApiConfiguration;

  model: string;

  functions?: Array<{
    name: string;
    description?: string;
    parameters: unknown;
  }>;
  functionCall?: "none" | "auto" | { name: string };

  tools?: Array<{
    type: "function";
    function: {
      name: string;
      description?: string;
      parameters: unknown;
    };
  }>;
  toolChoice?:
    | "none"
    | "auto"
    | { type: "function"; function: { name: string } };

  stop?: string | string[];
  maxTokens?: number;

  temperature?: number;
  topP?: number;

  seed?: number | null;

  responseFormat?: {
    type?: "text" | "json_object";
  };

  n?: number;
  presencePenalty?: number;
  frequencyPenalty?: number;
  logitBias?: Record<number, number>;
}

export interface AbstractOpenAIChatSettings
  extends TextGenerationModelSettings,
    Omit<AbstractOpenAIChatCallSettings, "stop" | "maxTokens"> {
  isUserIdForwardingEnabled?: boolean;
}

export type OpenAIChatPrompt = OpenAIChatMessage[];

/**
 * Abstract text generation model that calls an API that is compatible with the OpenAI chat API.
 *
 * @see https://platform.openai.com/docs/api-reference/chat/create
 */
export abstract class AbstractOpenAIChatModel<
  SETTINGS extends AbstractOpenAIChatSettings,
> extends AbstractModel<SETTINGS> {
  constructor(settings: SETTINGS) {
    super({ settings });
  }

  async callAPI<RESULT>(
    messages: Array<OpenAIChatMessage>,
    options: {
      responseFormat: OpenAIChatResponseFormatType<RESULT>;
    } & FunctionOptions & {
        functions?: AbstractOpenAIChatCallSettings["functions"];
        functionCall?: AbstractOpenAIChatCallSettings["functionCall"];
        tools?: AbstractOpenAIChatCallSettings["tools"];
        toolChoice?: AbstractOpenAIChatCallSettings["toolChoice"];
      }
  ): Promise<RESULT> {
    return callWithRetryAndThrottle({
      retry: this.settings.api?.retry,
      throttle: this.settings.api?.throttle,
      call: async () =>
        callOpenAIChatCompletionAPI({
          ...this.settings,

          // function & tool calling:
          functions: options.functions ?? this.settings.functions,
          functionCall: options.functionCall ?? this.settings.functionCall,
          tools: options.tools ?? this.settings.tools,
          toolChoice: options.toolChoice ?? this.settings.toolChoice,

          // map to OpenAI API names:
          stop: this.settings.stopSequences,
          maxTokens: this.settings.maxCompletionTokens,
          openAIResponseFormat: this.settings.responseFormat,

          // other settings:
          user: this.settings.isUserIdForwardingEnabled
            ? options.run?.userId
            : undefined,
          abortSignal: options.run?.abortSignal,

          responseFormat: options.responseFormat,
          messages,
        }),
    });
  }

  async doGenerateText(prompt: OpenAIChatPrompt, options?: FunctionOptions) {
    const response = await this.callAPI(prompt, {
      ...options,
      responseFormat: OpenAIChatResponseFormat.json,
    });

    return {
      response,
      text: response.choices[0]!.message.content!,
      usage: this.extractUsage(response),
    };
  }

  doStreamText(prompt: OpenAIChatPrompt, options?: FunctionOptions) {
    return this.callAPI(prompt, {
      ...options,
      responseFormat: OpenAIChatResponseFormat.textDeltaIterable,
    });
  }

  async doGenerateToolCall(
    tool: ToolDefinition<string, unknown>,
    prompt: OpenAIChatPrompt,
    options?: FunctionOptions
  ) {
    const response = await this.callAPI(prompt, {
      ...options,
      responseFormat: OpenAIChatResponseFormat.json,
      toolChoice: {
        type: "function",
        function: { name: tool.name },
      },
      tools: [
        {
          type: "function",
          function: {
            name: tool.name,
            description: tool.description,
            parameters: tool.parameters.getJsonSchema(),
          },
        },
      ],
    });

    const toolCalls = response.choices[0]?.message.tool_calls;

    return {
      response,
      toolCall:
        toolCalls == null || toolCalls.length === 0
          ? null
          : {
              id: toolCalls[0].id,
              args: parseJSON({ text: toolCalls[0].function.arguments }),
            },
      usage: this.extractUsage(response),
    };
  }

  async doGenerateToolCallsOrText(
    tools: Array<ToolDefinition<string, unknown>>,
    prompt: OpenAIChatPrompt,
    options?: FunctionOptions
  ) {
    const response = await this.callAPI(prompt, {
      ...options,
      responseFormat: OpenAIChatResponseFormat.json,
      toolChoice: "auto",
      tools: tools.map((tool) => ({
        type: "function",
        function: {
          name: tool.name,
          description: tool.description,
          parameters: tool.parameters.getJsonSchema(),
        },
      })),
    });

    const message = response.choices[0]?.message;

    return {
      response,
      text: message.content ?? null,
      toolCalls:
        message.tool_calls?.map((toolCall) => ({
          id: toolCall.id,
          name: toolCall.function.name,
          args: parseJSON({ text: toolCall.function.arguments }),
        })) ?? null,
      usage: this.extractUsage(response),
    };
  }

  extractUsage(response: OpenAIChatResponse) {
    return {
      promptTokens: response.usage.prompt_tokens,
      completionTokens: response.usage.completion_tokens,
      totalTokens: response.usage.total_tokens,
    };
  }
}

const openAIChatResponseSchema = z.object({
  id: z.string(),
  choices: z.array(
    z.object({
      message: z.object({
        role: z.literal("assistant"),
        content: z.string().nullable(),
        function_call: z
          .object({
            name: z.string(),
            arguments: z.string(),
          })
          .optional(),
        tool_calls: z
          .array(
            z.object({
              id: z.string(),
              type: z.literal("function"),
              function: z.object({
                name: z.string(),
                arguments: z.string(),
              }),
            })
          )
          .optional(),
      }),
      index: z.number(),
      logprobs: z.nullable(z.any()),
      finish_reason: z
        .enum([
          "stop",
          "length",
          "tool_calls",
          "content_filter",
          "function_call",
        ])
        .optional()
        .nullable(),
    })
  ),
  created: z.number(),
  model: z.string(),
  system_fingerprint: z.string().optional(),
  object: z.literal("chat.completion"),
  usage: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number(),
  }),
});

export type OpenAIChatResponse = z.infer<typeof openAIChatResponseSchema>;

async function callOpenAIChatCompletionAPI<RESPONSE>({
  api = new OpenAIApiConfiguration(),
  abortSignal,
  responseFormat,
  model,
  messages,
  functions,
  functionCall,
  tools,
  toolChoice,
  temperature,
  topP,
  n,
  stop,
  maxTokens,
  presencePenalty,
  frequencyPenalty,
  logitBias,
  user,
  openAIResponseFormat,
  seed,
}: AbstractOpenAIChatCallSettings & {
  api?: ApiConfiguration;
  abortSignal?: AbortSignal;
  responseFormat: OpenAIChatResponseFormatType<RESPONSE>;
  messages: Array<OpenAIChatMessage>;
  user?: string;
  openAIResponseFormat: AbstractOpenAIChatCallSettings["responseFormat"]; // mapping
}): Promise<RESPONSE> {
  // empty arrays are not allowed for stop:
  if (stop != null && Array.isArray(stop) && stop.length === 0) {
    stop = undefined;
  }

  return postJsonToApi({
    url: api.assembleUrl("/chat/completions"),
    headers: api.headers,
    body: {
      stream: responseFormat.stream,
      model,
      messages,
      functions,
      function_call: functionCall,
      tools,
      tool_choice: toolChoice,
      temperature,
      top_p: topP,
      n,
      stop,
      max_tokens: maxTokens,
      presence_penalty: presencePenalty,
      frequency_penalty: frequencyPenalty,
      logit_bias: logitBias,
      seed,
      response_format: openAIResponseFormat,
      user,
    },
    failedResponseHandler: failedOpenAICallResponseHandler,
    successfulResponseHandler: responseFormat.handler,
    abortSignal,
  });
}

export type OpenAIChatResponseFormatType<T> = {
  stream: boolean;
  handler: ResponseHandler<T>;
};

export const OpenAIChatResponseFormat = {
  /**
   * Returns the response as a JSON object.
   */
  json: {
    stream: false,
    handler: createJsonResponseHandler(openAIChatResponseSchema),
  } satisfies OpenAIChatResponseFormatType<OpenAIChatResponse>,

  /**
   * Returns an async iterable over the text deltas (only the tex different of the first choice).
   */
  textDeltaIterable: {
    stream: true,
    handler: async ({ response }: { response: Response }) =>
      createOpenAIChatDeltaIterableQueue(
        response.body!,
        (delta) => delta[0]?.delta.content ?? ""
      ),
  } satisfies OpenAIChatResponseFormatType<AsyncIterable<Delta<string>>>,

  structureDeltaIterable: {
    stream: true,
    handler: async ({ response }: { response: Response }) =>
      createOpenAIChatDeltaIterableQueue(response.body!, (delta) =>
        parsePartialJson(delta[0]?.function_call?.arguments)
      ),
  } satisfies OpenAIChatResponseFormatType<AsyncIterable<Delta<unknown>>>,
};
