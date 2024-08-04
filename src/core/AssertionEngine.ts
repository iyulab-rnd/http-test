import { Assertion, HttpResponse } from '../types';
import { JSONPath } from 'jsonpath-plus';
import { VariableManager } from './VariableManager';
import { logVerbose } from '../utils/logger';

export class AssertionEngine {
  constructor(private variableManager: VariableManager) {}

  async assert(assertion: Assertion, response: HttpResponse): Promise<void> {
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
    this.assertJsonContentType(response);
    const responseData = this.parseResponseData(response);
    
    if (typeof assertion.key === 'string' && assertion.key.startsWith('$')) {
      const jsonPath = this.adjustJsonPath(assertion.key, responseData);
      const result = JSONPath({path: jsonPath, json: responseData});
      if (result.length === 0) {
        throw new Error(`JSON path ${jsonPath} not found in response: ${JSON.stringify(responseData)}`);
      }
      const actualValue = result[0];
      const expectedValue = this.parseValue(assertion.value);
      if (!this.isEqual(actualValue, expectedValue)) {
        throw new Error(`Expected ${jsonPath} to be ${JSON.stringify(expectedValue)}, got ${JSON.stringify(actualValue)}`);
      }
    } else {
      if (!this.isEqual(responseData, assertion.value)) {
        throw new Error(`Body mismatch: ${JSON.stringify(responseData)} !== ${JSON.stringify(assertion.value)}`);
      }
    }
  }

  private assertJsonContentType(response: HttpResponse): void {
    const contentType = response.headers['content-type'];
    if (!contentType || !contentType.includes('application/json')) {
      throw new Error(`Expected Content-Type to be application/json, got ${contentType}`);
    }
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
}
