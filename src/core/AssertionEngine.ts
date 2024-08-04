import { Assertion, CustomValidatorContext, HttpRequest, HttpResponse } from '../types';
import { JSONPath } from 'jsonpath-plus';
import { VariableManager } from './VariableManager';
import { logVerbose, logInfo, logError } from '../utils/logger';
import { loadCustomValidator } from '../validators/customValidator';
import path from 'path';

export class AssertionEngine {
  constructor(private variableManager: VariableManager, private baseDir: string) {}

  async assert(assertion: Assertion, response: HttpResponse, request: HttpRequest): Promise<void> {
    // 변수 적용
    if (typeof assertion.value === 'string') {
      assertion.value = this.variableManager.replaceVariables(assertion.value);
    }

    logVerbose(`Asserting ${JSON.stringify(assertion)} on response with status ${response.status}`);

    switch (assertion.type) {
      case 'status':
        this.assertStatus(assertion, response);
        break;
      case 'header':
        this.assertHeader(assertion, response);
        break;
      case 'body':
        await this.assertBody(assertion, response);
        break;
        case 'custom':
          await this.assertCustom(assertion, response, request);
          break;  
      default:
        throw new Error(`Unknown assertion type: ${(assertion as Assertion).type}`);
    }
  }

  private assertStatus(assertion: Assertion, response: HttpResponse): void {
    if (typeof assertion.value === 'function') {
      if (!assertion.value(response.status)) {
        throw new Error(`Status ${response.status} does not meet the assertion criteria`);
      }
    } else if (response.status !== assertion.value) {
      throw new Error(`Expected status ${assertion.value}, got ${response.status}`);
    }
  }

  private assertHeader(assertion: Assertion, response: HttpResponse): void {
    if (!assertion.key) {
      throw new Error('Header key is missing in assertion');
    }
    const headerValue = response.headers[assertion.key.toLowerCase()];
    if (typeof headerValue === 'string' && typeof assertion.value === 'string') {
      if (assertion.key.toLowerCase() === 'content-type') {
        this.assertContentType(headerValue, assertion.value);
      } else if (headerValue !== assertion.value) {
        throw new Error(`Expected ${assertion.key} to be ${assertion.value}, got ${headerValue}`);
      }
    } else {
      throw new Error(`Invalid header value type for ${assertion.key}`);
    }
  }

  private assertContentType(actual: string, expected: string): void {
    const expectedType = expected.split(';')[0].trim();
    const actualType = actual.split(';')[0].trim();
    if (expectedType !== actualType) {
      throw new Error(`Expected Content-Type to be ${expectedType}, got ${actualType}`);
    }
  }

  private async assertBody(assertion: Assertion, response: HttpResponse): Promise<void> {
    const responseData = this.parseResponseData(response);
  
    if (assertion.key === '$') {
      // 'Body:' 키워드 처리. 이 경우 아무 것도 하지 않습니다.
      return;
    } else if (typeof assertion.key === 'string' && assertion.key.startsWith('$')) {
      // JSONPath를 사용한 부분 검증
      const jsonPath = this.adjustJsonPath(assertion.key, responseData);
      const result = JSONPath({ path: jsonPath, json: responseData });
      if (result.length === 0) {
        throw new Error(`JSON path ${jsonPath} not found in response: ${JSON.stringify(responseData)}`);
      }
      const actualValue = result[0];
      const expectedValue = this.parseValue(assertion.value);
      if (!this.isEqual(actualValue, expectedValue)) {
        throw new Error(`Expected ${jsonPath} to be ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
      }
    } else {
      throw new Error(`Invalid body assertion key: ${assertion.key}`);
    }
  }
  
  private parseValue(value: any): any {
    if (typeof value === 'string') {
      if (!isNaN(Number(value))) {
        return Number(value);
      } else if (value.toLowerCase() === 'true') {
        return true;
      } else if (value.toLowerCase() === 'false') {
        return false;
      }
    }
    return value;
  }

  private parseResponseData(response: HttpResponse): any {
    try {
      return typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
    } catch (error) {
      throw new Error(`Failed to parse response data as JSON: ${error}`);
    }
  }

  private adjustJsonPath(jsonPath: string, data: any): string {
    if (!Array.isArray(data) && jsonPath.startsWith('$[')) {
      return '$' + jsonPath.slice(2);
    }
    return jsonPath;
  }
  
  private isEqual(actual: any, expected: any): boolean {
    if (Array.isArray(actual) && Array.isArray(expected)) {
      return actual.length === expected.length && 
             actual.every((value, index) => this.isEqual(value, expected[index]));
    }
    if (typeof actual === 'object' && actual !== null && typeof expected === 'object' && expected !== null) {
      const actualKeys = Object.keys(actual);
      const expectedKeys = Object.keys(expected);
      return actualKeys.length === expectedKeys.length && 
             actualKeys.every(key => this.isEqual(actual[key], expected[key]));
    }
    return actual === expected;
  }

  private async assertCustom(assertion: Assertion, response: HttpResponse, request: HttpRequest): Promise<void> {
    if (!assertion.customFunction) {
      throw new Error('Custom function path is not provided for custom assertion');
    }
    try {
      logVerbose(`Running custom validator script: ${assertion.customFunction}`);
      await this.runCustomValidator(assertion.customFunction, response, request);
      logVerbose(`Custom validator script executed successfully`);
    } catch (error) {
      logError(`Custom validation failed: ${error instanceof Error ? error.message : String(error)}`);
      throw new Error(`Custom validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async runCustomValidator(customFunctionPath: string, response: HttpResponse, request: HttpRequest): Promise<void> {
    const resolvedPath = this.resolvePath(customFunctionPath);
    const customValidator = await loadCustomValidator(resolvedPath, this.baseDir);
    const context: CustomValidatorContext = {
      request,
      variables: this.variableManager.getAllVariables()
    };
    try {
      logVerbose(`Executing custom validator from path: ${resolvedPath}`);
      customValidator(response, context);
      logVerbose(`Custom validator executed without error`);
    } catch (error) {
      logError(`Error in custom validator: ${error instanceof Error ? error.message : String(error)}`);
      throw error;
    }
  }

  private resolvePath(customFunctionPath: string): string {
    if (path.isAbsolute(customFunctionPath)) {
      return customFunctionPath;
    }
    return path.resolve(this.baseDir, customFunctionPath);
  }
}