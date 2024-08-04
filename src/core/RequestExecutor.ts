import axios, { AxiosError } from 'axios';
import { HttpRequest, HttpResponse } from '../types';
import { VariableManager } from './VariableManager';
import { convertAxiosResponse } from '../utils/httpUtils';
import { logVerbose } from '../utils/logger';
import FormData from 'form-data';

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
    const updatedRequest = {
      ...request,
      url: this.variableManager.replaceVariables(request.url),
      headers: Object.fromEntries(
        Object.entries(request.headers).map(([key, value]) => [
          key,
          this.variableManager.replaceVariables(value)
        ])
      ),
    };

    if (this.isFormData(request.body)) {
      const formData = new FormData();
      request.body.forEach((value, key) => {
        formData.append(key, this.variableManager.replaceVariables(value));
      });
      updatedRequest.body = formData;
    } else if (request.body) {
      updatedRequest.body = this.variableManager.replaceVariables(request.body);
    }

    return updatedRequest;
  }

  private isFormData(body: any): body is FormData {
    return body && typeof body.getHeaders === 'function';
  }

  private async sendRequest(request: HttpRequest) {
    const { method, url, headers, body } = request;
    return axios({
      method,
      url,
      headers: this.isFormData(body) ? { ...headers, ...body.getHeaders() } : headers,
      data: body,
      timeout: 5000, // 5 seconds timeout
      validateStatus: (status) => true // 모든 상태 코드를 허용하도록 설정
    });
  }
}
