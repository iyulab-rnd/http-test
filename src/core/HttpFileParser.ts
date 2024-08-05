import {
  HttpRequest,
  TestItem,
  Assertion,
  HttpMethod,
} from "../types";
import { readFile } from "../utils/fileUtils";
import { logVerbose, logWarning } from "../utils/logger";
import { VariableManager } from "./VariableManager";

/**
 * Parses HTTP files and extracts request information.
 */
export class HttpFileParser {
  private parsedCustomAssertions = new Set<string>();

  /**
   * Creates an instance of HttpFileParser.
   * @param variableManager - The VariableManager instance to use.
   */
  constructor(private variableManager: VariableManager) {
    this.parsedCustomAssertions = new Set<string>();
  }

  /**
   * Parses the given HTTP file.
   * @param filePath - The path to the HTTP file.
   * @returns A promise that resolves to an array of HttpRequest objects.
   */
  async parse(filePath: string): Promise<HttpRequest[]> {
    const content = await readFile(filePath);
    logVerbose(`File content loaded: ${filePath}`);
    const lines = content.split("\n");
    return this.parseRequests(lines);
  }

  /**
   * Parses the lines of an HTTP file into HttpRequest objects.
   * @param lines - The lines of the HTTP file.
   * @returns An array of HttpRequest objects.
   */
  private parseRequests(lines: string[]): HttpRequest[] {
    const requests: HttpRequest[] = [];
    let currentRequest: HttpRequest | null = null;
    let currentTest: TestItem | null = null;
    let isParsingBody = false;
    let bodyContent = "";

    this.parsedCustomAssertions.clear();

    for (const line of lines) {
      logVerbose(`Processing line: ${line}`);

      if (this.isComment(line)) {
        continue;
      }

      if (line.startsWith("@")) {
        this.handleVariable(currentRequest, line);
      } else if (this.isRequestStart(line)) {
        if (currentRequest) {
          currentRequest.body = bodyContent.trim();
          this.finishCurrentRequest(currentRequest, requests);
        }
        currentRequest = this.createNewRequest(line);
        currentTest = null;
        isParsingBody = false;
        bodyContent = "";
        this.parsedCustomAssertions.clear();
      } else if (this.isTestStart(line) && currentRequest) {
        isParsingBody = false;
        currentTest = this.createNewTest(currentRequest, line);
      } else if (currentRequest) {
        if (this.isHttpMethod(line)) {
          this.setRequestMethod(currentRequest, line);
        } else if (line.includes(":") && !isParsingBody) {
          if (this.isCustomAssert(line) && currentTest) {
            this.addCustomAssertion(currentTest, line);
          } else {
            this.handleKeyValuePair(currentRequest, currentTest, line);
          }
        } else if (line.trim() === "" && !isParsingBody && !currentTest) {
          isParsingBody = true;
        } else if (isParsingBody) {
          bodyContent += line + "\n";
        } else if (currentTest) {
          this.handleTestLine(currentTest, line);
        }
      }
    }

    if (currentRequest) {
      currentRequest.body = this.parseJsonBody(bodyContent);
      this.finishCurrentRequest(currentRequest, requests);
    }

    logVerbose(`Total parsed requests: ${requests.length}`);
    return requests;
  }

  /**
   * Checks if a line is a comment.
   * @param line - The line to check.
   * @returns True if the line is a comment, false otherwise.
   */
  private isComment(line: string): boolean {
    return (
      line.trim().startsWith("#") &&
      !this.isRequestStart(line) &&
      !this.isTestStart(line)
    );
  }

  /**
   * Checks if a line is the start of a new request.
   * @param line - The line to check.
   * @returns True if the line is the start of a new request, false otherwise.
   */
  private isRequestStart(line: string): boolean {
    return line.startsWith("### ");
  }

  /**
   * Checks if a line is the start of a new test.
   * @param line - The line to check.
   * @returns True if the line is the start of a new test, false otherwise.
   */
  private isTestStart(line: string): boolean {
    return line.startsWith("#### ");
  }

  /**
   * Checks if a line contains an HTTP method.
   * @param line - The line to check.
   * @returns True if the line contains an HTTP method, false otherwise.
   */
  private isHttpMethod(line: string): boolean {
    return /^(GET|POST|PUT|DELETE|PATCH)\s/.test(line);
  }

  /**
   * Checks if a line is a custom assertion.
   * @param line - The line to check.
   * @returns True if the line is a custom assertion, false otherwise.
   */
  private isCustomAssert(line: string): boolean {
    return (
      line.startsWith("Custom-Assert") ||
      line.toLowerCase().startsWith("_customassert")
    );
  }

  private parseJsonBody(bodyContent: string): string {
    // JSON 라인별로 처리
    const lines = bodyContent.split('\n');
    const cleanedLines = lines.map(line => {
      // '#' 이후의 내용을 제거, 단 '#'이 따옴표 안에 있는 경우는 제외
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
  
  /**
   * Handles a variable declaration line.
   * @param currentRequest - The current HttpRequest being processed.
   * @param line - The line containing the variable declaration.
   */
  private handleVariable(
    currentRequest: HttpRequest | null,
    line: string
  ): void {
    const [key, value] = line
      .slice(1)
      .split("=")
      .map((s) => s.trim());
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

  /**
   * Finishes processing the current request and adds it to the list of requests.
   * @param currentRequest - The current HttpRequest being processed.
   * @param requests - The list of processed requests.
   */
  private finishCurrentRequest(
    currentRequest: HttpRequest | null,
    requests: HttpRequest[]
  ): void {
    if (currentRequest) {
      requests.push(currentRequest);
      logVerbose(
        `Parsed request: ${currentRequest.name}, URL: ${currentRequest.url}`
      );
    }
  }

  /**
   * Creates a new HttpRequest object.
   * @param line - The line containing the request name.
   * @returns A new HttpRequest object.
   */
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

  /**
   * Creates a new TestItem object and adds it to the current request.
   * @param currentRequest - The current HttpRequest being processed.
   * @param line - The line containing the test name.
   * @returns A new TestItem object.
   */
  private createNewTest(currentRequest: HttpRequest, line: string): TestItem {
    const newTest: TestItem = {
      type: "Assert",
      name: currentRequest.name + " " + line.slice(5).trim() || "Assert",
      assertions: [],
    };
    currentRequest.tests.push(newTest);
    logVerbose(`Started new test: ${newTest.name}`);
    return newTest;
  }

  /**
   * Sets the HTTP method and URL for the current request.
   * @param currentRequest - The current HttpRequest being processed.
   * @param line - The line containing the HTTP method and URL.
   */
  private setRequestMethod(currentRequest: HttpRequest, line: string): void {
    const [method, url] = line.split(" ");
    currentRequest.method = method as HttpMethod;
    currentRequest.url = this.variableManager.replaceVariables(url.trim());
    logVerbose(
      `Set method: ${currentRequest.method}, URL: ${currentRequest.url}`
    );
  }

  /**
   * Handles a key-value pair line in the request or test section.
   * @param currentRequest - The current HttpRequest being processed.
   * @param currentTest - The current TestItem being processed, if any.
   * @param line - The line containing the key-value pair.
   */
  private handleKeyValuePair(
    currentRequest: HttpRequest,
    currentTest: TestItem | null,
    line: string
  ): void {
    const [key, ...valueParts] = line.split(":");
    const value = valueParts.join(":").trim();
    if (key.trim().toLowerCase() === "_expecterror") {
      currentRequest.expectError = value.toLowerCase() === "true";
      logVerbose(`Set expectError: ${currentRequest.expectError}`);
    } else if (currentTest) {
      const assertion = this.parseAssertion(key.trim(), value);
      if (assertion) {
        currentTest.assertions.push(assertion);
        logVerbose(`Added assertion to test: ${JSON.stringify(assertion)}`);
      } else {
        logWarning(`Failed to parse assertion: ${key.trim()}: ${value}`);
      }
    } else {
      currentRequest.headers[key.trim()] =
        this.variableManager.replaceVariables(value);
      logVerbose(
        `Added header to request: ${key.trim()}: ${
          currentRequest.headers[key.trim()]
        }`
      );
    }
  }
  
  /**
   * Adds a custom assertion to the current test.
   * @param currentTest - The current TestItem being processed.
   * @param line - The line containing the custom assertion.
   */
  private addCustomAssertion(currentTest: TestItem, line: string): void {
    const customFunctionPath = line.split(":")[1]?.trim() || "";
    if (
      customFunctionPath &&
      !this.parsedCustomAssertions.has(customFunctionPath)
    ) {
      currentTest.assertions.push({
        type: "custom",
        customFunction: customFunctionPath,
      });
      this.parsedCustomAssertions.add(customFunctionPath);
      logVerbose(`Added custom assertion: ${customFunctionPath}`);
    }
  }

  /**
   * Handles a line in the test section.
   * @param currentTest - The current TestItem being processed.
   * @param line - The line to handle.
   */
  private handleTestLine(currentTest: TestItem, line: string): void {
    if (line.includes(":")) {
      const [key, value] = line.split(":").map((s) => s.trim());
      const assertion = this.parseAssertion(key, value);
      if (assertion !== null) {
        currentTest.assertions.push(assertion);
        logVerbose(`Added assertion to test: ${JSON.stringify(assertion)}`);
      }
    }
  }

  /**
   * Parses an assertion from a key-value pair.
   * @param key - The assertion key.
   * @param value - The assertion value.
   * @returns An Assertion object or null if parsing fails.
   */
  private parseAssertion(key: string, value: string): Assertion | null {
    if (key.toLowerCase() === "status") {
      return { type: "status", value: parseInt(value, 10) };
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
}
