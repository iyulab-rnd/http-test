import { Assertion, HttpRequest, TestItem } from '../types';
import { readFile } from '../utils/fileUtils';
import { logVerbose } from '../utils/logger';
import { VariableManager } from './VariableManager';
import path from 'path';
import FormData from 'form-data';

export class HttpFileParser {
  constructor(private variableManager: VariableManager) {}

  async parse(filePath: string): Promise<HttpRequest[]> {
    const content = await readFile(filePath);
    logVerbose(`File content loaded: ${filePath}`);
    const requests: HttpRequest[] = [];
    const lines = content.split('\n');
    const baseDir = path.dirname(filePath);

    let currentRequest: HttpRequest | null = null;
    let currentTest: TestItem | null = null;
    let isParsingBody = false;
    let bodyBuffer: string[] = [];
    let contentType: string | null = null;

    for (const line of lines) {
      const trimmedLine = line.trim();
      logVerbose(`Processing line: ${trimmedLine}`);

      if (this.isComment(trimmedLine, isParsingBody)) {
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
        bodyBuffer = [];
        contentType = null;
      } else if (this.isTestStart(trimmedLine) && currentRequest) {
        currentTest = this.startNewTest(trimmedLine, currentRequest);
        isParsingBody = false;
        bodyBuffer = [];
      } else if (this.isHttpMethod(trimmedLine) && currentRequest) {
        this.setRequestMethod(currentRequest, trimmedLine);
      } else if (trimmedLine.includes(':') && currentRequest && !isParsingBody) {
        this.handleKeyValuePair(currentRequest, currentTest, trimmedLine, isParsingBody);

        if (trimmedLine.toLowerCase().startsWith('content-type')) {
          const [key, value] = trimmedLine.split(':').map(s => s.trim());
          if (key.toLowerCase() === 'content-type') {
            contentType = value.toLowerCase();
          }
        }
      } else if (this.isBodyStart(trimmedLine, contentType)) {
        isParsingBody = true;
        bodyBuffer.push(trimmedLine);
      } else if (isParsingBody) {
        bodyBuffer.push(trimmedLine);
        if (this.isBodyEnd(trimmedLine, bodyBuffer[0])) {
          isParsingBody = false;
          if (currentRequest) {
            currentRequest.body = this.parseBodyContent(bodyBuffer.join('\n').trim(), contentType);
          }
        }
      } else if (currentRequest && !currentTest) {
        this.appendToRequestBody(currentRequest, line);
      } else if (this.isCustomAssertStart(trimmedLine) && currentTest) {
        currentTest.assertions.push({
          type: 'custom',
          customFunction: this.resolvePath(baseDir, trimmedLine.split(' ')[1].trim())
        });
        logVerbose(`Added custom assertion: ${this.resolvePath(baseDir, trimmedLine.split(' ')[1].trim())}`);
      } else if (this.isCustomAssertValue(trimmedLine) && currentTest) {
        currentTest.assertions.push({
          type: 'custom',
          customFunction: this.resolvePath(baseDir, trimmedLine.split(':')[1].trim())
        });
        logVerbose(`Added custom assertion: ${this.resolvePath(baseDir, trimmedLine.split(':')[1].trim())}`);
      }
    }

    this.finishCurrentRequest(currentRequest, requests);
    logVerbose(`Total parsed requests: ${requests.length}`);
    return requests;
  }

  private resolvePath(baseDir: string, relativeOrAbsolutePath: string): string {
    return path.isAbsolute(relativeOrAbsolutePath)
      ? relativeOrAbsolutePath
      : path.join(baseDir, relativeOrAbsolutePath);
  }

  private isComment(line: string, isParsingBody: boolean): boolean {
    if (isParsingBody && line.includes('#')) {
      const matches = line.match(/"(.*?)"/g);
      if (matches) {
        for (const match of matches) {
          line = line.replace(match, match.replace(/#/g, ''));
        }
      }
    }
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

  private isBodyStart(line: string, contentType: string | null): boolean {
    return (contentType === 'application/json' && (line === '{' || line === '[')) ||
           (contentType === 'application/xml' && line.startsWith('<'));
  }

  private isBodyEnd(line: string, startLine: string): boolean {
    return (line === '}' && startLine.startsWith('{')) || 
           (line === ']' && startLine.startsWith('[')) || 
           (line.startsWith('</') && startLine.startsWith('<'));
  }

  private isCustomAssertStart(line: string): boolean {
    return line.startsWith('Custom-Assert');
  }

  private isCustomAssertValue(line: string): boolean {
    return line.toLowerCase().startsWith('_customassert');
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
      name: currentRequest.name + " " + line.slice(5).trim() || 'Assert',
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
    if (currentRequest.body === undefined) {
      currentRequest.body = '';
    }
    currentRequest.body += line + '\n';
  }

  private parseBodyContent(body: string, contentType: string | null): string | FormData {
    switch (contentType) {
      case 'application/json':
        return this.variableManager.replaceVariables(body);
      case 'application/xml':
        return this.variableManager.replaceVariables(body);
      case 'text/plain':
        return this.variableManager.replaceVariables(body);
      case 'multipart/form-data':
        const form = new FormData();
        const parts = body.split('------WebKitFormBoundary');
        parts.forEach(part => {
          const match = part.match(/name="([^"]+)"\s*(.*)/s);
          if (match) {
            const name = match[1];
            const value = match[2].trim();
            form.append(name, value);
          }
        });
        return form;
      default:
        return this.variableManager.replaceVariables(body);
    }
  }

  private parseAssertion(key: string, value: string): Assertion {
    if (key.toLowerCase() === 'status') {
      return { type: 'status', value: parseInt(value, 10) };
    } else if (key.toLowerCase() === 'content-type') {
      return { type: 'header', key: 'Content-Type', value };
    } else if (key.startsWith('$')) {
      let parsedValue: any = this.parseValue(value);
      return { type: 'body', key, value: parsedValue };
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

