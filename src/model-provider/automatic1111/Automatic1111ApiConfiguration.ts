import { BaseUrlApiConfiguration } from "../../core/api/BaseUrlApiConfiguration.js";
import { RetryFunction } from "../../core/api/RetryFunction.js";
import { ThrottleFunction } from "../../core/api/ThrottleFunction.js";

export class Automatic1111ApiConfiguration extends BaseUrlApiConfiguration {
  constructor({
    baseUrl = "http://127.0.0.1:7860/sdapi/v1",
    retry,
    throttle,
  }: {
    baseUrl?: string;
    retry?: RetryFunction;
    throttle?: ThrottleFunction;
  } = {}) {
    super({
      baseUrl,
      headers: {},
      retry,
      throttle,
    });
  }
}
