export interface RunOptions {
  verbose?: boolean;
  var?: string;
}

export type HttpMethod = "GET" | "POST" | "PUT" | "DELETE" | "PATCH";

export interface HttpRequest {
  name: string;
  method: HttpMethod;
  url: string;
  headers: Record<string, string>;
  body?: string;
  tests: TestItem[];
  variableUpdates: VariableUpdate[];
}

export interface VariableUpdate {
  key: string;
  value: string;
}

export interface TestItem {
  type: "Assert";
  name?: string;
  assertions: Assertion[];
}

export interface TestResult {
  name: string;
  passed: boolean;
  error?: Error;
  statusCode?: number;
}

export interface TestSummary {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  results: TestResult[];
}

export type AssertionType = "status" | "header" | "body" | "custom";

export interface Assertion {
  type: AssertionType;
  key?: string;
  value?: any | ((value: any) => boolean);
  customFunction?: string;
}

export interface Variables {
  [key: string]: string;
}

export interface HttpResponse {
  status: number;
  headers: Record<string, string>;
  data: any;
}

export interface CustomValidatorContext {
  request: HttpRequest;
  variables: Variables;
}

export type CustomValidatorFunction = (response: HttpResponse, context: CustomValidatorContext) => void;

export interface VariableManager {
  replaceVariables(content: string): string;
  setVariable(key: string, value: string): void;
  loadVariables(filePath: string): Promise<void>;
  getVariable(key: string): string | undefined;
  replaceVariablesWithJsonPath(content: string, json: any): string;
}

export interface FileUtils {
  readFile(filePath: string): Promise<string>;
  loadVariables(filePath: string): Promise<Variables>;
}

export interface AssertionEngine {
  assert(assertion: Assertion, response: HttpResponse): Promise<void>;
}

export enum LogLevel {
  INFO,
  WARNING,
  ERROR,
  VERBOSE,
  PLAIN
}