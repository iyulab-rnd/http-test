import {
  Assertion,
  CustomValidatorContext,
  HttpRequest,
  HttpResponse,
} from "../types";
import { JSONPath } from "jsonpath-plus";
import { VariableManager } from "./VariableManager";
import { logVerbose, logError } from "../utils/logger";
import { loadCustomValidator } from "../validators/customValidator";
import path from "path";
import { AssertionError } from "../errors/AssertionError";

/**
 * Handles the assertion logic for HTTP responses.
 */
export class AssertionEngine {
  /**
   * Creates an instance of AssertionEngine.
   * @param variableManager - The VariableManager instance to use.
   * @param baseDir - The base directory for resolving paths.
   */
  constructor(
    private variableManager: VariableManager,
    private baseDir: string
  ) {}

  /**
   * Asserts the given assertion against the HTTP response.
   * @param assertion - The assertion to check.
   * @param response - The HTTP response to assert against.
   * @param request - The original HTTP request.
   */
  async assert(
    assertion: Assertion,
    response: HttpResponse,
    request: HttpRequest
  ): Promise<void> {
    if (typeof assertion.value === "string") {
      assertion.value = this.variableManager.replaceVariables(assertion.value);
    }

    logVerbose(
      `Asserting ${JSON.stringify(assertion)} on response with status ${
        response.status
      }`
    );

    switch (assertion.type) {
      case "status":
        this.assertStatus(assertion, response);
        break;
      case "header":
        this.assertHeader(assertion, response);
        break;
      case "body":
        await this.assertBody(assertion, response);
        break;
      case "custom":
        if (assertion.customFunction) {
          await this.assertCustom(assertion, response, request);
        }
        break;
      default:
        throw new AssertionError(
          `Unknown assertion type: ${(assertion as Assertion).type}`
        );
    }
  }

  /**
   * Asserts the status code of the response.
   * @param assertion - The status assertion.
   * @param response - The HTTP response.
   */
  private assertStatus(assertion: Assertion, response: HttpResponse): void {
    if (typeof assertion.value === "function") {
      if (!assertion.value(response.status)) {
        throw new AssertionError(
          `Status ${response.status} does not meet the assertion criteria`
        );
      }
    } else if (response.status !== assertion.value) {
      throw new AssertionError(
        `Expected status ${assertion.value}, got ${response.status}`
      );
    }
  }

  /**
   * Asserts a header in the response.
   * @param assertion - The header assertion.
   * @param response - The HTTP response.
   */
  private assertHeader(assertion: Assertion, response: HttpResponse): void {
    if (!assertion.key) {
      throw new AssertionError("Header key is missing in assertion");
    }
    const headerValue = response.headers[assertion.key.toLowerCase()];
    if (
      typeof headerValue === "string" &&
      typeof assertion.value === "string"
    ) {
      if (assertion.key.toLowerCase() === "content-type") {
        this.assertContentType(headerValue, assertion.value);
      } else if (headerValue !== assertion.value) {
        throw new AssertionError(
          `Expected ${assertion.key} to be ${assertion.value}, got ${headerValue}`
        );
      }
    } else {
      throw new AssertionError(
        `Invalid header value type for ${assertion.key}`
      );
    }
  }

  /**
   * Asserts the Content-Type header.
   * @param actual - The actual Content-Type value.
   * @param expected - The expected Content-Type value.
   */
  private assertContentType(actual: string, expected: string): void {
    const expectedType = expected.split(";")[0].trim();
    const actualType = actual.split(";")[0].trim();
    if (expectedType !== actualType) {
      throw new AssertionError(
        `Expected Content-Type to be ${expectedType}, got ${actualType}`
      );
    }
  }

  /**
   * Asserts the body of the response.
   * @param assertion - The body assertion.
   * @param response - The HTTP response.
   */
  private async assertBody(
    assertion: Assertion,
    response: HttpResponse
  ): Promise<void> {
    let responseData = response.data;

    if (typeof responseData === "string" && responseData.trim() !== "") {
      try {
        responseData = JSON.parse(responseData);
      } catch (error) {
        throw new AssertionError(
          `Failed to parse response data as JSON: ${error}`
        );
      }
    }

    if (assertion.key === "$") {
      return;
    } else if (
      typeof assertion.key === "string" &&
      assertion.key.startsWith("$")
    ) {
      if (!responseData) {
        throw new AssertionError(
          "Response body is empty, cannot perform JSON path assertion"
        );
      }
      const jsonPath = this.adjustJsonPath(assertion.key, responseData);
      const result = JSONPath({ path: jsonPath, json: responseData });
      if (result.length === 0) {
        throw new AssertionError(
          `JSON path ${jsonPath} not found in response: ${JSON.stringify(
            responseData
          )}`
        );
      }
      const actualValue = result[0];
      const expectedValue = this.parseValue(assertion.value as string);
      if (!this.isEqual(actualValue, expectedValue)) {
        throw new AssertionError(
          `Expected ${jsonPath} to be ${JSON.stringify(
            expectedValue
          )}, got ${JSON.stringify(actualValue)}`
        );
      }
    } else {
      throw new AssertionError(`Invalid body assertion key: ${assertion.key}`);
    }
  }

  /**
   * Parses the value of an assertion.
   * @param value - The value to parse.
   * @returns The parsed value.
   */
  private parseValue(
    value: string | number | boolean
  ): string | number | boolean {
    if (typeof value === "string") {
      if (!isNaN(Number(value))) {
        return Number(value);
      } else if (value.toLowerCase() === "true") {
        return true;
      } else if (value.toLowerCase() === "false") {
        return false;
      }
    }
    return value;
  }
  
  private adjustJsonPath(jsonPath: string, data: unknown): string {
    if (
      typeof data === "object" &&
      data !== null &&
      !Array.isArray(data) &&
      jsonPath.startsWith("$[")
    ) {
      return "$" + jsonPath.slice(2);
    }
    return jsonPath;
  }

  private isEqual(actual: unknown, expected: unknown): boolean {
    if (Array.isArray(actual) && Array.isArray(expected)) {
      return (
        actual.length === expected.length &&
        actual.every((value, index) => this.isEqual(value, expected[index]))
      );
    }
    if (
      typeof actual === "object" &&
      actual !== null &&
      typeof expected === "object" &&
      expected !== null
    ) {
      const actualKeys = Object.keys(actual as object);
      const expectedKeys = Object.keys(expected as object);
      return (
        actualKeys.length === expectedKeys.length &&
        actualKeys.every((key) =>
          this.isEqual(
            (actual as Record<string, unknown>)[key],
            (expected as Record<string, unknown>)[key]
          )
        )
      );
    }
    return actual === expected;
  }

  /**
   * Asserts using a custom validator function.
   * @param assertion - The custom assertion.
   * @param response - The HTTP response.
   * @param request - The original HTTP request.
   */
  private async assertCustom(
    assertion: Assertion,
    response: HttpResponse,
    request: HttpRequest
  ): Promise<void> {
    if (!assertion.customFunction) {
      throw new AssertionError(
        "Custom function path is not provided for custom assertion"
      );
    }
    try {
      logVerbose(
        `Running custom validator script: ${assertion.customFunction}`
      );
      await this.runCustomValidator(
        assertion.customFunction,
        response,
        request
      );
      logVerbose(`Custom validator script executed successfully`);
    } catch (error) {
      logError(
        `Custom validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw new AssertionError(
        `Custom validation failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
    }
  }

  /**
   * Runs a custom validator function.
   * @param customFunctionPath - The path to the custom validator function.
   * @param response - The HTTP response.
   * @param request - The original HTTP request.
   */
  private async runCustomValidator(
    customFunctionPath: string,
    response: HttpResponse,
    request: HttpRequest
  ): Promise<void> {
    const resolvedPath = this.resolvePath(customFunctionPath);
    const customValidator = await loadCustomValidator(resolvedPath);
    const context: CustomValidatorContext = {
      request,
      variables: this.variableManager.getAllVariables(),
    };
    try {
      logVerbose(`Executing custom validator from path: ${resolvedPath}`);
      customValidator(response, context);
      logVerbose(`Custom validator executed without error`);
    } catch (error) {
      logError(
        `Error in custom validator: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      throw error;
    }
  }

  /**
   * Resolves the path of a custom validator function.
   * @param customFunctionPath - The path to resolve.
   * @returns The resolved path.
   */
  private resolvePath(customFunctionPath: string): string {
    if (path.isAbsolute(customFunctionPath)) {
      return customFunctionPath;
    }
    return path.resolve(this.baseDir, customFunctionPath);
  }
}
