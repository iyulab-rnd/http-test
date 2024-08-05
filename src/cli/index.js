"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = run;
const path_1 = __importDefault(require("path"));
const TestManager_1 = require("../core/TestManager");
const VariableManager_1 = require("../core/VariableManager");
const logger_1 = require("../utils/logger");
const fileUtils_1 = require("../utils/fileUtils");
const HttpFileParser_1 = require("../core/HttpFileParser");
/**
 * Runs the test suite based on the provided file path and options.
 * @param filePath - The path to the HTTP file.
 * @param options - Run options including verbose mode and variable file.
 */
async function run(filePath, options) {
    (0, logger_1.setVerbose)(!!options.verbose);
    try {
        (0, logger_1.logInfo)("Starting test run...");
        const variableManager = new VariableManager_1.VariableManager();
        await loadVariablesFile(variableManager, filePath, options.var);
        const httpFileParser = new HttpFileParser_1.HttpFileParser(variableManager);
        const requests = await httpFileParser.parse(filePath);
        const testManager = new TestManager_1.TestManager(filePath);
        const results = await testManager.run(requests, options);
        const failedTests = results.filter((result) => !result.passed);
        if (failedTests.length > 0) {
            (0, logger_1.logError)(`${failedTests.length} test(s) failed.`);
            process.exit(1);
        }
        else {
            (0, logger_1.logInfo)("All tests passed successfully.");
        }
    }
    catch (error) {
        await handleError(error);
    }
}
/**
 * Loads variables from a file if specified or available.
 * @param variableManager - The VariableManager instance.
 * @param filePath - The path to the main HTTP file.
 * @param varFile - Optional path to a variable file.
 */
async function loadVariablesFile(variableManager, filePath, varFile) {
    const variableFile = varFile || path_1.default.join(path_1.default.dirname(filePath), "variables.json");
    if (await (0, fileUtils_1.fileExists)(variableFile)) {
        (0, logger_1.logInfo)(`Loading variables from ${variableFile}`);
        const variables = await (0, fileUtils_1.loadVariables)(variableFile);
        variableManager.setVariables(variables);
    }
    else {
        (0, logger_1.logInfo)("No variable file specified or found. Proceeding without external variables.");
    }
}
/**
 * Handles errors that occur during the test run.
 * @param error - The error object or message.
 */
async function handleError(error) {
    (0, logger_1.logError)("Error running tests:");
    if (error instanceof AggregateError) {
        for (const [index, e] of error.errors.entries()) {
            (0, logger_1.logError)(`Error ${index + 1}:`);
            (0, logger_1.logError)(e instanceof Error ? e.stack || e.message : String(e));
        }
    }
    else if (error instanceof Error) {
        (0, logger_1.logError)(error.stack || error.message);
    }
    else {
        (0, logger_1.logError)(String(error));
    }
    process.exit(1);
}
// CLI entry point
if (require.main === module) {
    const args = process.argv.slice(2);
    const filePath = args[0];
    const options = {
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
