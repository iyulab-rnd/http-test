import path from "path";
import { RunOptions, HttpRequest } from "../types";
import { TestManager } from "../core/TestManager";
import { VariableManager } from "../core/VariableManager";
import { logInfo, logError, setVerbose } from "../utils/logger";
import { fileExists, loadVariables } from "../utils/fileUtils";
import { HttpFileParser } from "../core/HttpFileParser";

export async function run(
  filePath: string,
  options: RunOptions
): Promise<void> {
  setVerbose(!!options.verbose);

  try {
    logInfo("Starting test run...");

    const absoluteFilePath = path.resolve(filePath);
    const baseDir = path.dirname(absoluteFilePath);

    const variableManager = new VariableManager();
    await loadVariablesFile(variableManager, absoluteFilePath, options.var);

    const httpFileParser = new HttpFileParser(variableManager, baseDir);
    const requests: HttpRequest[] = await httpFileParser.parse(absoluteFilePath);

    const testManager = new TestManager(absoluteFilePath);
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