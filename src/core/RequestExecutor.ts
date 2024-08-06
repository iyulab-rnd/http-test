import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
import { convertAxiosResponse } from "../utils/httpUtils";
import { logVerbose, logError } from "../utils/logger";
import { URL } from "url";
import { RequestError } from "../errors/RequestError";
import FormData from "form-data";
import fs from "fs";
import path from "path";
import https from "https";

/**
 * Executes HTTP requests and processes responses.
 */
export class RequestExecutor {
  private serverCheckTimeout = 5000;
  private requestTimeout = 10000;

  // RequestExecutor 클래스 내부
  private axiosInstance = axios.create({
    httpsAgent: new https.Agent({
      rejectUnauthorized: false,
    }),
  });

  /**
   * Creates an instance of RequestExecutor.
   * @param variableManager - The VariableManager instance to use.
   */
  constructor(
    private variableManager: VariableManager,
    private baseDir: string
  ) {}

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const processedRequest = this.applyVariables(request);
    logVerbose(
      `Executing request: ${processedRequest.method} ${processedRequest.url}`
    );

    try {
      await this.validateUrl(processedRequest.url);
      await this.checkServerStatus(processedRequest.url);
      const axiosResponse = await this.sendRequest(processedRequest);

      logVerbose("Full response:");
      logVerbose(`Status: ${axiosResponse.status}`);
      logVerbose(`Headers: ${JSON.stringify(axiosResponse.headers, null, 2)}`);
      logVerbose(`Data: ${JSON.stringify(axiosResponse.data, null, 2)}`);

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
      console.log("Checking server status...");
      await this.axiosInstance.head(url, {
        timeout: this.serverCheckTimeout,
      });
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new RequestError(
          `Server is not responding at ${url}. Please check if the server is running.`
        );
      }
    }
  }

  private async sendRequest(request: HttpRequest) {
    const { method, url, headers, body } = request;

    let data = body;
    let requestHeaders = { ...headers };

    const contentType = headers["Content-Type"] || headers["content-type"];
    if (contentType) {
      if (contentType.includes("application/json")) {
        data = this.parseJsonBody(body as string);
      } else if (contentType.includes("multipart/form-data")) {
        const formData = this.parseFormData(headers, body as string);
        data = formData;

        delete requestHeaders["Content-Type"];
        delete requestHeaders["content-type"];
        requestHeaders = {
          ...requestHeaders,
          ...formData.getHeaders(),
        };
      }
    }

    const config: AxiosRequestConfig = {
      method,
      url,
      headers: requestHeaders,
      data,
      timeout: this.requestTimeout,
      validateStatus: () => true,
    };

    const loggableConfig = { ...config, data: "[FormData]" };
    logVerbose(
      `Sending request with config: ${JSON.stringify(loggableConfig, null, 2)}`
    );

    return this.axiosInstance(config);
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

  private parseFormData(
    headers: Record<string, string>,
    body: string
  ): FormData {
    const formData = new FormData();
    const contentType = headers["Content-Type"] || headers["content-type"];
    if (!contentType) {
      throw new Error("Content-Type header not found.");
    }
    const boundaryMatch = contentType.match(/boundary=(.+)$/);
    if (!boundaryMatch) {
      throw new Error("Boundary not found in Content-Type header.");
    }
    const boundary = boundaryMatch[1].trim();

    const parts = body.split(new RegExp(`--${boundary}`));
    parts.forEach((part) => {
      if (part.trim().length === 0 || part == "--") return;

      this.buildFormData(formData, part);
    });

    return formData;
  }

  private buildFormData(formData: FormData, part: string) {
    const lines = part.split("\r\n");
    const headers: Record<string, string> = {};
    let name: string | null = null;
    let filename: string | null = null;
    let contentType: string | null = null;
    let content: string | null = null;

    lines.forEach((line) => {
      if (line.trim().length === 0) return;

      const headerMatch = line.match(/(.+?): (.+)/);
      if (headerMatch) {
        headers[headerMatch[1].toLowerCase()] = headerMatch[2];
      } else {
        if (content == null) {
          content = line;
        } else {
          content += "\r\n" + line;
        }
      }
    });

    const contentDisposition = headers["content-disposition"];
    if (contentDisposition) {
      const match = contentDisposition.match(/name="(.+?)"/);
      if (match) {
        name = match[1];
      }
      const filenameMatch = contentDisposition.match(/filename="(.+?)"/);
      if (filenameMatch) {
        filename = filenameMatch[1];
      }
    }

    const contentTypeHeader = headers["content-type"];
    if (contentTypeHeader) {
      contentType = contentTypeHeader;
    }

    if (!name) {
      throw new Error("Name not found in Content-Disposition header.");
    }

    let options: {
      filename?: string;
      contentType?: string;
    } = {};
    if (filename) {
      options.filename = filename;
    }
    if (contentType) {
      options.contentType = contentType;
    }

    if (filename && content) {
      const [_, filePath] = (content as string).split(" ");

      if (filePath) {
        const absoluteFilePath = path.resolve(this.baseDir, filePath);
        if (!fs.existsSync(absoluteFilePath)) {
          throw new Error(filePath + " is not found.");
        }

        formData.append(name, fs.createReadStream(absoluteFilePath), options);
      } else {
        throw new Error("Invalid file path format.");
      }
    } else {
      const value = content!;
      formData.append(name, value, options);
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
