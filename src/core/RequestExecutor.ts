import axios, { AxiosError, AxiosRequestConfig } from "axios";
import { HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
import { convertAxiosResponse } from "../utils/httpUtils";
import { logVerbose, logError } from "../utils/logger";
import FormData from "form-data";
import { URL } from "url";
import { createReadStream } from "fs";
import { basename } from "path";

export class RequestExecutor {
  constructor(private variableManager: VariableManager) {}

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const processedRequest = this.applyVariables(request);
    logVerbose(
      `Executing request: ${processedRequest.method} ${processedRequest.url}`
    );

    try {
      this.validateUrl(processedRequest.url);
      await this.checkServerStatus(processedRequest.url);
      const axiosResponse = await this.sendRequest(processedRequest);
      return convertAxiosResponse(axiosResponse);
    } catch (error) {
      return this.handleRequestError(error, processedRequest);
    }
  }

  private validateUrl(url: string): void {
    try {
      new URL(url);
    } catch (error) {
      throw new Error(`Invalid URL: ${url}`);
    }
  }

  private async checkServerStatus(url: string): Promise<void> {
    try {
      await axios.get(url, { timeout: 5000 });
    } catch (error) {
      if (axios.isAxiosError(error) && !error.response) {
        throw new Error(
          `Server is not responding at ${url}. Please check if the server is running.`
        );
      }
    }
  }

  private applyVariables(request: HttpRequest): HttpRequest {
    const updatedRequest = {
      ...request,
      url: this.variableManager.replaceVariables(request.url),
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          this.variableManager.replaceVariables(value),
        ])
      ),
    };

    if (typeof updatedRequest.body === 'string') {
      updatedRequest.body = this.variableManager.replaceVariables(updatedRequest.body);
    }
    
    return updatedRequest;
  }

  private async sendRequest(request: HttpRequest) {
    const { method, url, headers, body } = request;
  
    let data: any = body;
    let formHeaders = {};
  
    const contentType = headers['Content-Type'] || headers['content-type'];
    if (contentType) {
      if (contentType.includes('application/json')) {
        data = this.parseJsonBody(body);
      } else if (contentType.includes('multipart/form-data')) {
        const { formData, headers: multipartHeaders } = this.createMultipartFormData(body);
        data = formData;
        formHeaders = multipartHeaders;
      }
    }
  
    const config: AxiosRequestConfig = {
      method,
      url,
      headers: { ...headers, ...formHeaders },
      data,
      timeout: 10000,
      validateStatus: (status) => true,
    };
  
    logVerbose(`Sending request with config: ${JSON.stringify(config, null, 2)}`);
    return axios(config);
  }
  
  private parseJsonBody(body: string | undefined): any {
    if (!body) return undefined;
    body = body.trim();
    try {
      return JSON.parse(body);
    } catch (error) {
      logError(`Failed to parse JSON body: ${error}`);
      logVerbose(`Raw body content: ${body}`);
      // Return an empty object instead of the raw body to prevent further errors
      return {};
    }
  }

  private createMultipartFormData(body: string | undefined): { formData: FormData, headers: Record<string, string> } {
    const formData = new FormData();
    const lines = body?.split('\n') || [];
    let currentName: string | null = null;
    let currentFilename: string | null = null;
    let currentContentType: string | null = null;
    let isFile = false;
    let fileContent = '';

    for (const line of lines) {
      if (line.startsWith('Content-Disposition:')) {
        const nameMatch = line.match(/name="([^"]+)"/);
        const filenameMatch = line.match(/filename="([^"]+)"/);
        if (nameMatch) {
          currentName = nameMatch[1];
        }
        if (filenameMatch) {
          currentFilename = filenameMatch[1];
          isFile = true;
        } else {
          isFile = false;
        }
      } else if (line.startsWith('Content-Type:')) {
        currentContentType = line.split(':')[1].trim();
      } else if (line.trim() === '' && currentName) {
        if (isFile) {
          fileContent = '';
        }
      } else if (currentName) {
        if (isFile) {
          fileContent += line + '\n';
        } else {
          formData.append(currentName, line.trim());
          currentName = null;
        }
      }

      if (currentName && isFile && line.trim() === '' && fileContent) {
        const buffer = Buffer.from(fileContent);
        formData.append(currentName, buffer, {
          filename: currentFilename || 'file',
          contentType: currentContentType || 'application/octet-stream',
        });
        currentName = null;
        currentFilename = null;
        currentContentType = null;
        isFile = false;
        fileContent = '';
      }
    }

    return { formData, headers: formData.getHeaders() };
  }

  private handleRequestError(
    error: unknown,
    request: HttpRequest
  ): HttpResponse {
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      if (axiosError.response) {
        logError(
          `Request failed with status ${axiosError.response.status}: ${axiosError.message}`
        );
        return convertAxiosResponse(axiosError.response);
      } else if (axiosError.request) {
        logError(`No response received: ${axiosError.message}`);
        throw new Error(
          `No response received from ${request.url}. Please check your network connection and server status.`
        );
      }
    }
    logError(
      `Request failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
    throw new Error(
      `Request to ${request.url} failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}