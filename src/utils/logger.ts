import chalk from "chalk";
import {
  LogLevel,
  TestSummary,
  HttpRequest,
  TestResult
} from "../types";

let verbose = false;

export function setVerbose(v: boolean): void {
  verbose = v;
}

export function log(message: string, level: LogLevel = LogLevel.INFO): void {
  let logMessage = `[${LogLevel[level]}] ${message}`;

  switch (level) {
    case LogLevel.VERBOSE:
      if (verbose) {
        console.log(chalk.gray(logMessage));
      }
      break;
    case LogLevel.INFO:
      console.log(chalk.blue(logMessage));
      break;
    case LogLevel.WARNING:
      console.warn(chalk.yellow(logMessage));
      break;
    case LogLevel.ERROR:
      console.error(chalk.red(logMessage));
      break;
    case LogLevel.PLAIN:
      console.log(message);
      break;
    default:
      console.log(logMessage);
  }
}

export function logVerbose(message: string): void {
  log(message, LogLevel.VERBOSE);
}

export function logInfo(message: string): void {
  log(message, LogLevel.INFO);
}

export function logWarning(message: string): void {
  log(message, LogLevel.WARNING);
}

export function logError(message: string): void {
  log(message, LogLevel.ERROR);
}

export function logPlain(message: string): void {
  log(message, LogLevel.PLAIN);
}

export function logRequestStart(request: HttpRequest): void {
  logPlain("\n" + "=".repeat(50));
  logPlain(`📌 Request: ${request.name}`);
  logPlain("=".repeat(50));
  logVerbose(`Executing request: ${request.name}`);
  logVerbose(`Method: ${request.method}`);
  logVerbose(`URL: ${request.url}`);
  logVerbose(`Headers: ${JSON.stringify(request.headers)}`);
  if (request.body) {
    logVerbose(`Body: ${request.body}`);
  }
}

export function logTestResult(result: TestResult): void {
  const status = result.passed ? "✅ PASS" : "❌ FAIL";
  const statusCode = result.statusCode ? `(Status: ${result.statusCode})` : "";
  const message = `${result.name}: ${status} ${statusCode}`;
  if (result.passed) {
    logInfo(message);
  } else {
    logWarning(message);
    if (result.error) {
      logError(
        result.error instanceof Error
          ? result.error.message
          : String(result.error)
      );
    }
  }
}

export function logTestSummary(summary: TestSummary): void {
  logPlain("\n" + "=".repeat(50));
  logPlain("📊 Test Summary");
  logPlain("=".repeat(50));
  logPlain(`Total Tests: ${summary.totalTests}`);
  logPlain(`Passed Tests: ${summary.passedTests}`);
  logPlain(`Failed Tests: ${summary.failedTests}`);

  const statusEmojis = summary.results
    .map((r) => (r.passed ? "✅" : "❌"))
    .join("");
  logPlain(`\n${statusEmojis}`);

  summary.results.forEach((result, index) => {
    const indent = "  ";
    const status = result.passed ? "✅ PASS" : "❌ FAIL";
    const statusCode = result.statusCode
      ? `(Status: ${result.statusCode})`
      : "";
    const message = `${indent}${index + 1}. ${
      result.name
    }: ${status} ${statusCode}`;
    logPlain(message);
  });
}
