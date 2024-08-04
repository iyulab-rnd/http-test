import axios, { AxiosError } from 'axios';
import { HttpRequest, HttpResponse } from '../types';
import { VariableManager } from './VariableManager';
import { convertAxiosResponse } from '../utils/httpUtils';
import { logVerbose } from '../utils/logger';

export class RequestExecutor {
  constructor(private variableManager: VariableManager) {}

  async execute(request: HttpRequest): Promise<HttpResponse> {
    const processedRequest = this.applyVariables(request);
    logVerbose(`Executing request: ${processedRequest.method} ${processedRequest.url}`);
    try {
      const axiosResponse = await this.sendRequest(processedRequest);
      return convertAxiosResponse(axiosResponse);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response) {
        // 예상된 오류 응답을 반환
        return convertAxiosResponse(error.response);
      }
      throw error;
    }
  }

  private applyVariables(request: HttpRequest): HttpRequest {
    return {
      ...request,
      url: this.variableManager.replaceVariables(request.url),
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          this.variableManager.replaceVariables(value)
        ])
      ),
      body: request.body ? this.variableManager.replaceVariables(request.body) : undefined
    };
  }

  private async sendRequest(request: HttpRequest) {
    const { method, url, headers, body } = request;
    return axios({
      method,
      url,
      headers,
      data: body,
      timeout: 5000, // 5 seconds timeout
    });
  }
}
