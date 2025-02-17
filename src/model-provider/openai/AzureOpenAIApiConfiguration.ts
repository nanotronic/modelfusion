import { AbstractApiConfiguration } from "../../core/api/AbstractApiConfiguration.js";
import { RetryFunction } from "../../core/api/RetryFunction.js";
import { ThrottleFunction } from "../../core/api/ThrottleFunction.js";
import { loadApiKey } from "../../core/api/loadApiKey.js";

/**
 * Configuration for the Azure OpenAI API. This class is responsible for constructing URLs specific to the Azure OpenAI deployment.
 * It creates URLs of the form
 * `https://[resourceName].openai.azure.com/openai/deployments/[deploymentId]/[path]?api-version=[apiVersion]`
 *
 * @see https://learn.microsoft.com/en-us/azure/ai-services/openai/reference
 */
export class AzureOpenAIApiConfiguration extends AbstractApiConfiguration {
  readonly resourceName: string;
  readonly deploymentId: string;
  readonly apiVersion: string;

  readonly headers: Record<string, string>;

  constructor({
    resourceName,
    deploymentId,
    apiVersion,
    apiKey,
    retry,
    throttle,
  }: {
    resourceName: string;
    deploymentId: string;
    apiVersion: string;
    apiKey?: string;
    retry?: RetryFunction;
    throttle?: ThrottleFunction;
  }) {
    super({ retry, throttle });

    this.resourceName = resourceName;
    this.deploymentId = deploymentId;
    this.apiVersion = apiVersion;

    this.headers = {
      "api-key": loadApiKey({
        apiKey,
        environmentVariableName: "AZURE_OPENAI_API_KEY",
        description: "Azure OpenAI",
      }),
    };
  }

  assembleUrl(path: string): string {
    return `https://${this.resourceName}.openai.azure.com/openai/deployments/${this.deploymentId}${path}?api-version=${this.apiVersion}`;
  }
}
