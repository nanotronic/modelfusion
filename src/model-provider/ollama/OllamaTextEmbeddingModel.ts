import { z } from "zod";
import { FunctionOptions } from "../../core/FunctionOptions.js";
import { ApiConfiguration } from "../../core/api/ApiConfiguration.js";
import { callWithRetryAndThrottle } from "../../core/api/callWithRetryAndThrottle.js";
import {
  createJsonResponseHandler,
  postJsonToApi,
} from "../../core/api/postToApi.js";
import { AbstractModel } from "../../model-function/AbstractModel.js";
import {
  EmbeddingModel,
  EmbeddingModelSettings,
} from "../../model-function/embed/EmbeddingModel.js";
import { OllamaApiConfiguration } from "./OllamaApiConfiguration.js";
import { failedOllamaCallResponseHandler } from "./OllamaError.js";

export interface OllamaTextEmbeddingModelSettings
  extends EmbeddingModelSettings {
  api?: ApiConfiguration;
  model: string;
  embeddingDimensions?: number;
  isParallelizable?: boolean;
}

export class OllamaTextEmbeddingModel
  extends AbstractModel<OllamaTextEmbeddingModelSettings>
  implements EmbeddingModel<string, OllamaTextEmbeddingModelSettings>
{
  constructor(settings: OllamaTextEmbeddingModelSettings) {
    super({ settings });
  }

  readonly provider = "ollama" as const;
  get modelName() {
    return null;
  }

  readonly maxValuesPerCall = 1;
  get isParallelizable() {
    return this.settings.isParallelizable ?? false;
  }

  readonly contextWindowSize = undefined;
  get embeddingDimensions() {
    return this.settings.embeddingDimensions;
  }

  async callAPI(
    texts: Array<string>,
    options?: FunctionOptions
  ): Promise<OllamaTextEmbeddingResponse> {
    if (texts.length > this.maxValuesPerCall) {
      throw new Error(
        `The Llama.cpp embedding API only supports ${this.maxValuesPerCall} texts per API call.`
      );
    }

    return callWithRetryAndThrottle({
      retry: this.settings.api?.retry,
      throttle: this.settings.api?.throttle,
      call: async () =>
        callOllamaEmbeddingAPI({
          ...this.settings,
          abortSignal: options?.run?.abortSignal,
          prompt: texts[0],
        }),
    });
  }

  get settingsForEvent(): Partial<OllamaTextEmbeddingModelSettings> {
    return {
      embeddingDimensions: this.settings.embeddingDimensions,
    };
  }

  async doEmbedValues(texts: string[], options?: FunctionOptions) {
    const response = await this.callAPI(texts, options);

    return {
      response,
      embeddings: [response.embedding],
    };
  }

  withSettings(additionalSettings: Partial<OllamaTextEmbeddingModelSettings>) {
    return new OllamaTextEmbeddingModel(
      Object.assign({}, this.settings, additionalSettings)
    ) as this;
  }
}

const ollamaTextEmbeddingResponseSchema = z.object({
  embedding: z.array(z.number()),
});

export type OllamaTextEmbeddingResponse = z.infer<
  typeof ollamaTextEmbeddingResponseSchema
>;

async function callOllamaEmbeddingAPI({
  api = new OllamaApiConfiguration(),
  abortSignal,
  model,
  prompt,
}: {
  api?: ApiConfiguration;
  abortSignal?: AbortSignal;
  model: string;
  prompt: string;
}): Promise<OllamaTextEmbeddingResponse> {
  return postJsonToApi({
    url: api.assembleUrl(`/api/embeddings`),
    headers: api.headers,
    body: { model, prompt },
    failedResponseHandler: failedOllamaCallResponseHandler,
    successfulResponseHandler: createJsonResponseHandler(
      ollamaTextEmbeddingResponseSchema
    ),
    abortSignal,
  });
}
