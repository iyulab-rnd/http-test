import { Variables } from '../types';
import { 
  logVerbose 
} from '../utils/logger';
import { replaceVariablesInString } from '../utils/variableUtils';

export class VariableManager {
  private variables: Variables = {};

  setVariables(variables: Variables): void {
    this.variables = { ...this.variables, ...variables };
  }

  replaceVariables(content: string): string {
    return replaceVariablesInString(content, this.variables);
  }

  setVariable(key: string, value: string): void {
    this.variables[key] = value;
    logVerbose(`Set variable: ${key} = ${value}`);
  }

  getVariable(key: string): string | undefined {
    return this.variables[key];
  }
}
