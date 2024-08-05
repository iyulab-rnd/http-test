import path from "path";
import { RunOptions, HttpRequest } from "../types";
import { TestManager } from "../core/TestManager";
import { VariableManager } from "../core/VariableManager";
import { logInfo, logError, setVerbose } from "../utils/logger";
import { fileExists, loadVariables } from "../utils/fileUtils";
import { HttpFileParser } from "../core/HttpFileParser";

/**
 * Runs the test suite based on the provided file path and options.
 * @param filePath - The path to the HTTP file.
 * @param options - Run options including verbose mode and variable file.
 */
export async function run(
  filePath: string,
  options: RunOptions
): Promise<void> {
  setVerbose(!!options.verbose);

  try {
    logInfo("Starting test run...");

    const variableManager = new VariableManager();
    await loadVariablesFile(variableManager, filePath, options.var);

    const httpFileParser = new HttpFileParser(variableManager);
    const requests: HttpRequest[] = await httpFileParser.parse(filePath);

    const testManager = new TestManager(filePath);
    const results = await testManager.run(requests, options);

    const failedTests = results.filter((result) => !result.passed);
    if (failedTests.length > 0) {
      logError(`${failedTests.length} test(s) failed.`);
      process.exit(1);
    } else {
      logInfo("All tests passed successfully.");
    }
  } catch (error) {
    await handleError(error);
  }
}

/**
 * Loads variables from a file if specified or available.
 * @param variableManager - The VariableManager instance.
 * @param filePath - The path to the main HTTP file.
 * @param varFile - Optional path to a variable file.
 */
async function loadVariablesFile(
  variableManager: VariableManager,
  filePath: string,
  varFile: string | undefined
): Promise<void> {
  const variableFile =
    varFile || path.join(path.dirname(filePath), "variables.json");
  if (await fileExists(variableFile)) {
    logInfo(`Loading variables from ${variableFile}`);
    const variables = await loadVariables(variableFile);
    variableManager.setVariables(variables);
  } else {
    logInfo(
      "No variable file specified or found. Proceeding without external variables."
    );
  }
}

/**
 * Handles errors that occur during the test run.
 * @param error - The error object or message.
 */
async function handleError(error: unknown): Promise<void> {
  logError("Error running tests:");
  if (error instanceof AggregateError && Array.isArray(error.errors)) {
    error.errors.forEach((e, index) => {
      logError(`Error ${index + 1}:`);
      logError(e instanceof Error ? e.stack || e.message : String(e));
    });
  } else if (error instanceof Error) {
    logError(error.stack || error.message);
  } else {
    logError(String(error));
  }
  process.exit(1);
}

// CLI entry point
if (require.main === module) {
  const args = process.argv.slice(2);
  const filePath = args[0];
  const options: RunOptions = {
    verbose: args.includes("--verbose"),
    var: args.find((arg) => arg.startsWith("--var="))?.split("=")[1],
  };

  if (!filePath) {
    console.error("Please provide a file path");
    process.exit(1);
  }

  run(filePath, options).catch((error) => {
    console.error("Unhandled error:", error);
    process.exit(1);
  });
}
