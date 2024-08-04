import { Assertion, HttpRequest, TestItem } from '../types';
import { readFile } from '../utils/fileUtils';
import { 
  logVerbose 
} from '../utils/logger';
import { VariableManager } from './VariableManager';

export class HttpFileParser {
  constructor(private variableManager: VariableManager) {}

  async parse(filePath: string): Promise<HttpRequest[]> {
    const content = await readFile(filePath);
    logVerbose(`File content loaded: ${filePath}`);
    const requests: HttpRequest[] = [];
    const lines = content.split('\n');
  
    let currentRequest: HttpRequest | null = null;
    let currentTest: TestItem | null = null;
    let isParsingBody = false;
  
    for (const line of lines) {
      const trimmedLine = line.trim();
      logVerbose(`Processing line: ${trimmedLine}`);

      if (this.isComment(trimmedLine)) {
        continue;
      }

      if (trimmedLine.startsWith('@')) {
        if (currentRequest) {
          this.handleVariableUpdate(currentRequest, trimmedLine);
        } else {
          this.handleVariable(trimmedLine);
        }
      } else if (this.isRequestStart(trimmedLine)) {
        this.finishCurrentRequest(currentRequest, requests);
        currentRequest = this.startNewRequest(trimmedLine);
        currentTest = null;
        isParsingBody = false;
      } else if (this.isTestStart(trimmedLine) && currentRequest) {
        currentTest = this.startNewTest(trimmedLine, currentRequest);
        isParsingBody = false;
      } else if (this.isHttpMethod(trimmedLine) && currentRequest) {
        this.setRequestMethod(currentRequest, trimmedLine);
      } else if (trimmedLine.includes(':') && currentRequest) {
        this.handleKeyValuePair(currentRequest, currentTest, trimmedLine, isParsingBody);
      } else if (trimmedLine === '') {
        isParsingBody = false;
      } else if (currentRequest && !currentTest) {
        this.appendToRequestBody(currentRequest, line);
      }
    }

    this.finishCurrentRequest(currentRequest, requests);
  
    logVerbose(`Total parsed requests: ${requests.length}`);
    return requests;
  }

  private isComment(line: string): boolean {
    return line.startsWith('#') && !this.isRequestStart(line) && !this.isTestStart(line);
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

  private handleVariable(line: string): void {
    const [key, value] = line.slice(1).split('=').map(s => s.trim());
    if (!this.variableManager.getVariable(key)) {
      this.variableManager.setVariable(key, value);
      logVerbose(`Set variable from file: ${key} = ${value}`);
    } else {
      logVerbose(`Variable ${key} already exists, skipping`);
    }
  }

  private handleVariableUpdate(currentRequest: HttpRequest, line: string): void {
    const [key, value] = line.slice(1).split('=').map(s => s.trim());
    currentRequest.variableUpdates.push({ key, value });
    logVerbose(`Added variable update to request: ${key} = ${value}`);
  }
  
  private finishCurrentRequest(currentRequest: HttpRequest | null, requests: HttpRequest[]): void {
    if (currentRequest) {
      requests.push(currentRequest);
      logVerbose(`Parsed request: ${currentRequest.name}, URL: ${currentRequest.url}`);
    }
  }
  
  private startNewRequest(line: string): HttpRequest {
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
  
  private startNewTest(line: string, currentRequest: HttpRequest): TestItem {
    const newTest: TestItem = {
      type: 'Assert',
      name: line.slice(5).trim() || 'Assert',
      assertions: []
    };
    currentRequest.tests.push(newTest);
    logVerbose(`Started new test: ${newTest.name}`);
    return newTest;
  }

  private setRequestMethod(currentRequest: HttpRequest, line: string): void {
    const [method, url] = line.split(' ');
    currentRequest.method = method as HttpRequest['method'];
    currentRequest.url = this.variableManager.replaceVariables(url.trim());
    logVerbose(`Set method: ${currentRequest.method}, URL: ${currentRequest.url}`);
  }

  private handleKeyValuePair(currentRequest: HttpRequest, currentTest: TestItem | null, line: string, isParsingBody: boolean): void {
    const [key, value] = line.split(':').map(s => s.trim());
    if (currentTest) {
      if (key.toLowerCase() === 'body') {
        isParsingBody = true;
      } else {
        const assertion = this.parseAssertion(key, value);
        currentTest.assertions.push(assertion);
        logVerbose(`Added ${isParsingBody ? 'body ' : ''}assertion to test: ${JSON.stringify(assertion)}`);
      }
    } else {
      currentRequest.headers[key] = this.variableManager.replaceVariables(value);
      logVerbose(`Added header to request: ${key}: ${currentRequest.headers[key]}`);
    }
  }

  private appendToRequestBody(currentRequest: HttpRequest, line: string): void {
    currentRequest.body += line + '\n';
  }

  private parseAssertion(key: string, value: string): Assertion {
    if (key.toLowerCase() === 'status') {
      return { type: 'status', value: parseInt(value, 10) };
    } else if (key.toLowerCase() === 'content-type') {
      return { type: 'header', key: 'Content-Type', value };
    } else if (key.startsWith('$')) {
      let parsedValue: any = this.parseValue(value);
      return { type: 'body', key, value: parsedValue };
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
