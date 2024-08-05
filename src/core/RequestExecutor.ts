import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
import { convertAxiosResponse } from "../utils/httpUtils";
import { logVerbose, logError, logWarning } from "../utils/logger";
import FormData from "form-data";
import { URL } from "url";
import { RequestError } from "../errors/RequestError";

/**
 * Executes HTTP requests and processes responses.
 */
export class RequestExecutor {
  private serverCheckTimeout = 5000;
  private requestTimeout = 10000;

  /**
   * Creates an instance of RequestExecutor.
   * @param variableManager - The VariableManager instance to use.
   */
  constructor(private variableManager: VariableManager) {}

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const processedRequest = this.applyVariables(request);
    logVerbose(
      `Executing request: ${processedRequest.method} ${processedRequest.url}`
    );

    try {
      await this.validateUrl(processedRequest.url);
      await this.checkServerStatus(processedRequest.url);
      const axiosResponse = await this.sendRequest(processedRequest);
      return convertAxiosResponse(axiosResponse);
    } catch (error) {
      return this.handleRequestError(error, processedRequest);
    }
  }

  private applyVariables(request: HttpRequest): HttpRequest {
    return {
      ...request,
      url: this.variableManager.replaceVariables(request.url),
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          this.variableManager.replaceVariables(value),
        ])
      ),
      body:
        typeof request.body === "string"
          ? this.variableManager.replaceVariables(request.body)
          : request.body,
    };
  }

  private async validateUrl(url: string): Promise<void> {
    try {
      new URL(url);
    } catch {
      throw new RequestError(`Invalid URL: ${url}`);
    }
  }

  private async checkServerStatus(url: string): Promise<void> {
    try {
      await axios.get(url, { timeout: this.serverCheckTimeout });
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new RequestError(
          `Server is not responding at ${url}. Please check if the server is running.`
        );
      }
    }
  }

  /**
   * Sends an HTTP request.
   * @param request - The HttpRequest to send.
   * @returns A promise that resolves to an AxiosResponse.
   */
  private async sendRequest(request: HttpRequest) {
    const { method, url, headers, body } = request;

    let data = body;
    let formHeaders = {};

    const contentType = headers["Content-Type"] || headers["content-type"];
    if (contentType) {
      if (contentType.includes("application/json")) {
        data = this.parseJsonBody(body as string);
      } else if (contentType.includes("multipart/form-data")) {
        const formData = new FormData();
        const boundary = contentType.split("boundary=")[1];
        if (body) {
          var bodyText = body as string;
          const parts = bodyText.split(`--${boundary}`);
          parts.forEach((part) => {
            if (part.trim() && !part.includes("--")) {
              const [headerSection, ...contentSections] =
                part.split("\r\n\r\n");
              const content = contentSections.join("\r\n\r\n").trim();
              const nameMatch = headerSection.match(/name="([^"]+)"/);
              const filenameMatch = headerSection.match(/filename="([^"]+)"/);
              if (nameMatch && nameMatch[1]) {
                if (filenameMatch && filenameMatch[1]) {
                  const filename = filenameMatch[1];
                  const contentTypeMatch =
                    headerSection.match(/Content-Type: (.+)/);
                  const fileContentType = contentTypeMatch
                    ? contentTypeMatch[1].trim()
                    : "application/octet-stream";
                  const buffer = Buffer.from(content, "binary");
                  formData.append(nameMatch[1], buffer, {
                    filename,
                    contentType: fileContentType,
                  });
                } else {
                  formData.append(nameMatch[1], content);
                }
              }
            }
          });
        } else {
          logWarning(
            "Request body is undefined for multipart/form-data request"
          );
        }
        data = formData;
        formHeaders = formData.getHeaders();
      }
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: { ...headers, ...formHeaders },
      data,
      timeout: this.requestTimeout,
      validateStatus: () => true,
    };

    logVerbose(
      `Sending request with config: ${JSON.stringify(config, null, 2)}`
    );
    return axios(config);
  }

  private parseJsonBody(body: string | undefined): object | undefined {
    if (!body) return undefined;
    body = body.trim();
    try {
      return JSON.parse(body);
    } catch (error) {
      logError(`Failed to parse JSON body: ${error}`);
      logVerbose(`Raw body content: ${body}`);
      return {};
    }
  }

  private async handleRequestError(
    error: unknown,
    request: HttpRequest
  ): Promise<HttpResponse> {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        await logError(
          `Request failed with status ${axiosError.response.status}: ${axiosError.message}`
        );
        return convertAxiosResponse(axiosError.response);
      } else if (axiosError.request) {
        await logError(`No response received: ${axiosError.message}`);
        throw new RequestError(
          `No response received from ${request.url}. Please check your network connection and server status.`
        );
      }
    }
    logError(
      `Request failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw new RequestError(
      `Request to ${request.url} failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}
