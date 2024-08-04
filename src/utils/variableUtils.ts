import { Variables } from '../types';
import { JSONPath } from 'jsonpath-plus';
import { logVerbose } from './logger';

export function replaceVariablesInString(content: string, variables: Variables): string {
  return content.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const trimmedKey = key.trim();
    const value = variables[trimmedKey];
    logVerbose(`Replacing variable: {{${trimmedKey}}} with ${value}`);
    return value !== undefined ? value : `{{${trimmedKey}}}`;
  });
}

export function replaceVariablesWithJsonPath(content: string, json: any, variables: Variables): string {
  return content.replace(/\{\{(.+?)\}\}/g, (_, key) => {
    const trimmedKey = key.trim();
    if (trimmedKey.startsWith('$.')) {
      const jsonPathResult = JSONPath({path: trimmedKey, json});
      if (jsonPathResult.length > 0) {
        return String(jsonPathResult[0]);
      }
    }
    return variables[trimmedKey] || `{{${trimmedKey}}}`;
  });
}
