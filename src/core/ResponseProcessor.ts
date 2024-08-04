import { HttpResponse, VariableUpdate } from '../types';
import { VariableManager } from './VariableManager';
import { JSONPath } from 'jsonpath-plus';
import { logVerbose, logError } from '../utils/logger';

export class ResponseProcessor {
  constructor(private variableManager: VariableManager) {}

  async process(response: HttpResponse, variableUpdates: VariableUpdate[]): Promise<void> {
    logVerbose(`Processing response with status ${response.status}`);
    await this.processVariableUpdates(variableUpdates, response);
  }

  private async processVariableUpdates(updates: VariableUpdate[], response: HttpResponse): Promise<void> {
    let responseBody: any;
    const contentType = response.headers['content-type'];

    if (contentType && contentType.includes('application/json')) {
      try {
        responseBody = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
      } catch (error) {
        logError(`Failed to parse response data as JSON: ${error}`);
        responseBody = response.data;
      }
    } else {
      responseBody = response.data;
    }

    for (const update of updates) {
      let value: string;
      if (update.value.startsWith('$.')) {
        value = this.extractValueFromJsonPath(update.value, responseBody);
      } else {
        value = this.variableManager.replaceVariables(update.value);
      }

      // 변수 값을 숫자로 변환할 수 있는 경우 숫자로 변환
      if (!isNaN(Number(value))) {
        this.variableManager.setVariable(update.key, Number(value));
      } else {
        this.variableManager.setVariable(update.key, value);
      }
      
      logVerbose(`Updated variable: ${update.key} = ${value}`);
    }
  }

  private extractValueFromJsonPath(jsonPath: string, json: any): string {
    const result = JSONPath({path: jsonPath, json});
    if (result.length === 0) {
      throw new Error(`JSONPath ${jsonPath} not found in response`);
    }
    return String(result[0]);
  }
}
