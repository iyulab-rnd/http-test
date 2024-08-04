import { HttpResponse, VariableUpdate } from '../types';
import { VariableManager } from './VariableManager';
import { replaceVariablesWithJsonPath } from '../utils/variableUtils';
import { logVerbose } from '../utils/logger';

export class ResponseProcessor {
  constructor(private variableManager: VariableManager) {}

  async process(response: HttpResponse, variableUpdates: VariableUpdate[]): Promise<void> {
    logVerbose(`Processing response with status ${response.status}`);
    await this.processVariableUpdates(variableUpdates, response);
  }

  private async processVariableUpdates(updates: VariableUpdate[], response: HttpResponse): Promise<void> {
    const responseBody = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;

    for (const update of updates) {
      let value: string;
      if (update.value.startsWith('$.')) {
        value = this.extractValueFromJsonPath(update.value, responseBody);
      } else {
        value = this.variableManager.replaceVariables(update.value);
      }

      this.variableManager.setVariable(update.key, value);
      logVerbose(`Updated variable: ${update.key} = ${value}`);
    }
  }

  private extractValueFromJsonPath(jsonPath: string, json: any): string {
    const result = replaceVariablesWithJsonPath(jsonPath, json, {});
    if (result === jsonPath) {
      throw new Error(`JSONPath ${jsonPath} not found in response`);
    }
    return result;
  }
}
