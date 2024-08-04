import { HttpRequest, TestItem, Assertion, HttpMethod, VariableUpdate } from '../types';
import { readFile } from '../utils/fileUtils';
import { logVerbose } from '../utils/logger';
import { VariableManager } from './VariableManager';
import path from 'path';
import { ParserFactory } from '../parsers/ParserFactory';

export class HttpFileParser {
  constructor(private variableManager: VariableManager) {}

  async parse(filePath: string): Promise<HttpRequest[]> {
    const content = await readFile(filePath);
    logVerbose(`File content loaded: ${filePath}`);
    const lines = content.split('\n');
    const baseDir = path.dirname(filePath);
    return this.parseRequests(lines, baseDir);
  }

  private parseRequests(lines: string[], baseDir: string): HttpRequest[] {
    const requests: HttpRequest[] = [];
    let currentRequest: HttpRequest | null = null;
    let currentTest: TestItem | null = null;
    let isParsingBody = false;
    let bodyContent = '';

    for (const line of lines) {
      logVerbose(`Processing line: ${line}`);

      if (this.isComment(line)) {
        continue;
      }

      if (line.startsWith('@')) {
        this.handleVariable(currentRequest, line);
      } else if (this.isRequestStart(line)) {
        if (currentRequest) {
          currentRequest.body = bodyContent.trim();
          this.finishCurrentRequest(currentRequest, requests);
        }
        currentRequest = this.createNewRequest(line);
        currentTest = null;
        isParsingBody = false;
        bodyContent = '';
      } else if (this.isTestStart(line) && currentRequest) {
        isParsingBody = false;  // Stop parsing body when test section starts
        currentTest = this.createNewTest(currentRequest, line);
      } else if (currentRequest) {
        if (this.isHttpMethod(line)) {
          this.setRequestMethod(currentRequest, line);
        } else if (line.includes(':') && !isParsingBody) {
          this.handleKeyValuePair(currentRequest, currentTest, line);
        } else if (line.trim() === '' && !isParsingBody && !currentTest) {
          isParsingBody = true;
        } else if (isParsingBody) {
          bodyContent += line + '\n';
        } else if (currentTest) {
          this.handleTestLine(currentTest, line);
        }
      }

      if (this.isCustomAssert(line) && currentTest) {
        this.addCustomAssertion(currentTest, line, baseDir);
      }
    }

    if (currentRequest) {
      currentRequest.body = bodyContent.trim();
      this.finishCurrentRequest(currentRequest, requests);
    }

    logVerbose(`Total parsed requests: ${requests.length}`);
    return requests;
  }

  private handleTestLine(currentTest: TestItem, line: string): void {
    if (line.includes(':')) {
      const [key, value] = line.split(':').map(s => s.trim());
      const assertion = this.parseAssertion(key, value);
      currentTest.assertions.push(assertion);
      logVerbose(`Added assertion to test: ${JSON.stringify(assertion)}`);
    }
  }
  
  private isComment(line: string): boolean {
    return line.trim().startsWith('#') && !this.isRequestStart(line) && !this.isTestStart(line);
  }

  private isRequestStart(line: string): boolean {
    return line.startsWith('### ');
  }

  private isTestStart(line: string): boolean {
    return line.startsWith('#### ');
  }

  private isHttpMethod(line: string): boolean {
    return /^(GET|POST|PUT|DELETE|PATCH)\s/.test(line);
  }

  private isCustomAssert(line: string): boolean {
    return line.startsWith('Custom-Assert') || line.toLowerCase().startsWith('_customassert');
  }

  private handleVariable(currentRequest: HttpRequest | null, line: string): void {
    const [key, value] = line.slice(1).split('=').map(s => s.trim());
    if (currentRequest) {
      currentRequest.variableUpdates.push({ key, value });
      logVerbose(`Added variable update to request: ${key} = ${value}`);
    } else if (!this.variableManager.getVariable(key)) {
      this.variableManager.setVariable(key, value);
      logVerbose(`Set variable from file: ${key} = ${value}`);
    } else {
      logVerbose(`Variable ${key} already exists, skipping`);
    }
  }

  private finishCurrentRequest(currentRequest: HttpRequest | null, requests: HttpRequest[]): void {
    if (currentRequest) {
      requests.push(currentRequest);
      logVerbose(`Parsed request: ${currentRequest.name}, URL: ${currentRequest.url}`);
    }
  }

  private createNewRequest(line: string): HttpRequest {
    const newRequest: HttpRequest = {
      name: line.slice(4).trim(),
      method: 'GET',
      url: '',
      headers: {},
      tests: [],
      body: '',
      variableUpdates: []
    };
    logVerbose(`Started new request: ${newRequest.name}`);
    return newRequest;
  }

  private createNewTest(currentRequest: HttpRequest, line: string): TestItem {
    const newTest: TestItem = {
      type: 'Assert',
      name: currentRequest.name + " " + line.slice(5).trim() || 'Assert',
      assertions: []
    };
    currentRequest.tests.push(newTest);
    logVerbose(`Started new test: ${newTest.name}`);
    return newTest;
  }

  private setRequestMethod(currentRequest: HttpRequest, line: string): void {
    const [method, url] = line.split(' ');
    currentRequest.method = method as HttpMethod;
    currentRequest.url = this.variableManager.replaceVariables(url.trim());
    logVerbose(`Set method: ${currentRequest.method}, URL: ${currentRequest.url}`);
  }

  private handleKeyValuePair(currentRequest: HttpRequest, currentTest: TestItem | null, line: string): void {
    const [key, ...valueParts] = line.split(':');
    const value = valueParts.join(':').trim(); // Preserve colons in the value
    if (currentTest) {
      const assertion = this.parseAssertion(key.trim(), value);
      currentTest.assertions.push(assertion);
      logVerbose(`Added assertion to test: ${JSON.stringify(assertion)}`);
    } else {
      currentRequest.headers[key.trim()] = this.variableManager.replaceVariables(value);
      logVerbose(`Added header to request: ${key.trim()}: ${currentRequest.headers[key.trim()]}`);
    }
  }


  private addCustomAssertion(currentTest: TestItem, line: string, baseDir: string): void {
    const customFunctionPath = line.split(' ')[1] || line.split(':')[1];
    if (customFunctionPath) {
      currentTest.assertions.push({
        type: 'custom',
        customFunction: this.resolvePath(baseDir, customFunctionPath.trim())
      });
      logVerbose(`Added custom assertion: ${this.resolvePath(baseDir, customFunctionPath.trim())}`);
    }
  }

  private resolvePath(baseDir: string, relativeOrAbsolutePath: string): string {
    return path.isAbsolute(relativeOrAbsolutePath)
      ? relativeOrAbsolutePath
      : path.join(baseDir, relativeOrAbsolutePath);
  }

  private parseAssertion(key: string, value: string): Assertion {
    if (key.toLowerCase() === 'status') {
      return { type: 'status', value: parseInt(value, 10) };
    } else if (key.toLowerCase() === 'content-type') {
      return { type: 'header', key: 'Content-Type', value };
    } else if (key.toLowerCase() === 'body') {
      return { type: 'body', key: '$', value: '' };
    } else if (key.startsWith('$')) {
      return { type: 'body', key, value: this.parseValue(value) };
    } else if (key.toLowerCase() === 'custom-assert' || key.toLowerCase() === '_customassert') {
      return { type: 'custom', customFunction: value.trim() };
    } else {
      return { type: 'header', key, value };
    }
  }

  private parseValue(value: string): any {
    try {
      return JSON.parse(value);
    } catch {
      if (!isNaN(Number(value))) {
        return Number(value);
      } else if (value.toLowerCase() === 'true') {
        return true;
      } else if (value.toLowerCase() === 'false') {
        return false;
      }
      return value;
    }
  }
}