import {
  HttpRequest,
  TestItem,
  Assertion,
  HttpMethod,
} from "../types";
import { readFile } from "../utils/fileUtils";
import { logVerbose, logWarning } from "../utils/logger";
import { VariableManager } from "./VariableManager";
import { ValidationError } from "../errors/ValidationError";

export class HttpFileParser {
  private parsedCustomAssertions = new Set<string>();
  private currentRequest: HttpRequest | null = null;
  private currentTest: TestItem | null = null;
  private isParsingBody = false;
  private bodyContent = "";

  constructor(private variableManager: VariableManager) {}

  async parse(filePath: string): Promise<HttpRequest[]> {
    const content = await readFile(filePath);
    logVerbose(`File content loaded: ${filePath}`);
    const lines = content.split("\n");
    return this.parseRequests(lines);
  }

  private parseRequests(lines: string[]): HttpRequest[] {
    const requests: HttpRequest[] = [];
    this.resetParserState();

    for (const line of lines) {
      this.parseLine(line, requests);
    }

    this.finishCurrentRequest(requests);
    logVerbose(`Total parsed requests: ${requests.length}`);
    return requests;
  }

  private resetParserState(): void {
    this.currentRequest = null;
    this.currentTest = null;
    this.isParsingBody = false;
    this.bodyContent = "";
    this.parsedCustomAssertions.clear();
  }

  private parseLine(line: string, requests: HttpRequest[]): void {
    logVerbose(`Processing line: ${line}`);

    if (this.isComment(line)) return;

    if (line.startsWith("@")) {
      this.handleVariable(line);
    } else if (this.isRequestStart(line)) {
      this.startNewRequest(requests, line);
    } else if (this.isTestStart(line)) {
      this.startNewTest(line);
    } else if (this.currentRequest) {
      this.parseRequestLine(line);
    }
  }

  private isComment(line: string): boolean {
    return line.trim().startsWith("#") && !this.isRequestStart(line) && !this.isTestStart(line);
  }

  private handleVariable(line: string): void {
    const [key, value] = line.slice(1).split("=").map((s) => s.trim());
    if (this.currentRequest) {
      this.currentRequest.variableUpdates.push({ key, value });
      logVerbose(`Added variable update to request: ${key} = ${value}`);
    } else if (!this.variableManager.getVariable(key)) {
      this.variableManager.setVariable(key, value);
      logVerbose(`Set variable from file: ${key} = ${value}`);
    } else {
      logVerbose(`Variable ${key} already exists, skipping`);
    }
  }

  private isRequestStart(line: string): boolean {
    return line.startsWith("### ");
  }

  private startNewRequest(requests: HttpRequest[], line: string): void {
    this.finishCurrentRequest(requests);
    this.currentRequest = this.createNewRequest(line);
    this.currentTest = null;
    this.isParsingBody = false;
    this.bodyContent = "";
    this.parsedCustomAssertions.clear();
  }

  private finishCurrentRequest(requests: HttpRequest[]): void {
    if (this.currentRequest) {
      this.currentRequest.body = this.parseJsonBody(this.bodyContent);
      requests.push(this.currentRequest);
      logVerbose(`Parsed request: ${this.currentRequest.name}, URL: ${this.currentRequest.url}`);
    }
  }

  private createNewRequest(line: string): HttpRequest {
    const newRequest: HttpRequest = {
      name: line.slice(4).trim(),
      method: "GET",
      url: "",
      headers: {},
      tests: [],
      body: "",
      variableUpdates: [],
    };
    logVerbose(`Started new request: ${newRequest.name}`);
    return newRequest;
  }

  private isTestStart(line: string): boolean {
    return line.startsWith("#### ");
  }

  private startNewTest(line: string): void {
    if (!this.currentRequest) {
      throw new ValidationError("Test defined outside of a request");
    }
    this.isParsingBody = false;
    this.currentTest = this.createNewTest(line);
  }

  private createNewTest(line: string): TestItem {
    if (!this.currentRequest) {
      throw new ValidationError("Cannot create test without a current request");
    }
    const newTest: TestItem = {
      type: "Assert",
      name: this.currentRequest.name + " " + line.slice(5).trim() || "Assert",
      assertions: [],
    };
    this.currentRequest.tests.push(newTest);
    logVerbose(`Started new test: ${newTest.name}`);
    return newTest;
  }

  private parseRequestLine(line: string): void {
    if (this.isHttpMethod(line)) {
      this.setRequestMethod(line);
    } else if (line.includes(":") && !this.isParsingBody) {
      this.handleKeyValuePair(line);
    } else if (line.trim() === "" && !this.isParsingBody && !this.currentTest) {
      this.isParsingBody = true;
    } else if (this.isParsingBody) {
      this.bodyContent += line + "\n";
    } else if (this.currentTest) {
      this.handleTestLine(line);
    }
  }

  private isHttpMethod(line: string): boolean {
    return /^(GET|POST|PUT|DELETE|PATCH)\s/.test(line);
  }

  private setRequestMethod(line: string): void {
    if (!this.currentRequest) {
      throw new ValidationError("Cannot set method without a current request");
    }
    const [method, url] = line.split(" ");
    this.currentRequest.method = method as HttpMethod;
    this.currentRequest.url = this.variableManager.replaceVariables(url.trim());
    logVerbose(`Set method: ${this.currentRequest.method}, URL: ${this.currentRequest.url}`);
  }

  private handleKeyValuePair(line: string): void {
    if (!this.currentRequest) {
      throw new ValidationError("Cannot handle key-value pair without a current request");
    }
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    if (key.trim().toLowerCase() === "_expecterror") {
      this.currentRequest.expectError = value.toLowerCase() === "true";
      logVerbose(`Set expectError: ${this.currentRequest.expectError}`);
    } else if (this.currentTest) {
      const assertion = this.parseAssertion(key.trim(), value);
      if (assertion) {
        this.currentTest.assertions.push(assertion);
        logVerbose(`Added assertion to test: ${JSON.stringify(assertion)}`);
      } else {
        logWarning(`Failed to parse assertion: ${key.trim()}: ${value}`);
      }
    } else {
      this.currentRequest.headers[key.trim()] = this.variableManager.replaceVariables(value);
      logVerbose(`Added header to request: ${key.trim()}: ${this.currentRequest.headers[key.trim()]}`);
    }
  }

  private handleTestLine(line: string): void {
    if (line.includes(":")) {
      const [key, value] = line.split(":").map((s) => s.trim());
      const assertion = this.parseAssertion(key, value);
      if (assertion !== null && this.currentTest) {
        this.currentTest.assertions.push(assertion);
        logVerbose(`Added assertion to test: ${JSON.stringify(assertion)}`);
      }
    }
  }

  private parseAssertion(key: string, value: string): Assertion | null {
    if (key.toLowerCase() === "status") {
      const statusValue = value.trim().toLowerCase();
      if (["2xx", "3xx", "4xx", "5xx"].includes(statusValue)) {
        return { type: "status", value: statusValue };
      }
      const statusCode = parseInt(value, 10);
      if (!isNaN(statusCode)) {
        return { type: "status", value: statusCode };
      }
      return null;
    } else if (key.toLowerCase() === "content-type") {
      return { type: "header", key: "Content-Type", value };
    } else if (key.toLowerCase() === "body") {
      return { type: "body", key: "$", value: "" };
    } else if (key.startsWith("$")) {
      return { type: "body", key, value: this.parseValue(value) };
    } else if (
      key.toLowerCase() === "custom-assert" ||
      key.toLowerCase() === "_customassert"
    ) {
      const customFunction = value.trim();
      if (!this.parsedCustomAssertions.has(customFunction)) {
        this.parsedCustomAssertions.add(customFunction);
        return { type: "custom", customFunction };
      }
      return null;
    } else {
      return { type: "header", key, value };
    }
  }

  private parseValue(value: unknown): string | number | boolean {
    if (typeof value === 'string') {
      if (!isNaN(Number(value))) {
        return Number(value);
      } else if (value.toLowerCase() === 'true') {
        return true;
      } else if (value.toLowerCase() === 'false') {
        return false;
      }
    }
    return value as string;
  }

  private parseJsonBody(bodyContent: string): string {
    const lines = bodyContent.split('\n');
    const cleanedLines = lines.map(line => {
      const commentIndex = line.indexOf('#');
      if (commentIndex !== -1 && !this.isInsideQuotes(line, commentIndex)) {
        return line.substring(0, commentIndex).trim();
      }
      return line;
    });
    return cleanedLines.join('\n').trim();
  }
  
  private isInsideQuotes(line: string, index: number): boolean {
    let inQuotes = false;
    for (let i = 0; i < index; i++) {
      if (line[i] === '"' && (i === 0 || line[i-1] !== '\\')) {
        inQuotes = !inQuotes;
      }
    }
    return inQuotes;
  }
}