import { HttpRequest } from "../types";
import { VariableManager } from "./VariableManager";
/**
 * Parses HTTP files and extracts request information.
 */
export declare class HttpFileParser {
    private variableManager;
    private parsedCustomAssertions;
    /**
     * Creates an instance of HttpFileParser.
     * @param variableManager - The VariableManager instance to use.
     */
    constructor(variableManager: VariableManager);
    /**
     * Parses the given HTTP file.
     * @param filePath - The path to the HTTP file.
     * @returns A promise that resolves to an array of HttpRequest objects.
     */
    parse(filePath: string): Promise<HttpRequest[]>;
    /**
     * Parses the lines of an HTTP file into HttpRequest objects.
     * @param lines - The lines of the HTTP file.
     * @returns An array of HttpRequest objects.
     */
    private parseRequests;
    /**
     * Checks if a line is a comment.
     * @param line - The line to check.
     * @returns True if the line is a comment, false otherwise.
     */
    private isComment;
    /**
     * Checks if a line is the start of a new request.
     * @param line - The line to check.
     * @returns True if the line is the start of a new request, false otherwise.
     */
    private isRequestStart;
    /**
     * Checks if a line is the start of a new test.
     * @param line - The line to check.
     * @returns True if the line is the start of a new test, false otherwise.
     */
    private isTestStart;
    /**
     * Checks if a line contains an HTTP method.
     * @param line - The line to check.
     * @returns True if the line contains an HTTP method, false otherwise.
     */
    private isHttpMethod;
    /**
     * Checks if a line is a custom assertion.
     * @param line - The line to check.
     * @returns True if the line is a custom assertion, false otherwise.
     */
    private isCustomAssert;
    private parseJsonBody;
    private isInsideQuotes;
    /**
     * Handles a variable declaration line.
     * @param currentRequest - The current HttpRequest being processed.
     * @param line - The line containing the variable declaration.
     */
    private handleVariable;
    /**
     * Finishes processing the current request and adds it to the list of requests.
     * @param currentRequest - The current HttpRequest being processed.
     * @param requests - The list of processed requests.
     */
    private finishCurrentRequest;
    /**
     * Creates a new HttpRequest object.
     * @param line - The line containing the request name.
     * @returns A new HttpRequest object.
     */
    private createNewRequest;
    /**
     * Creates a new TestItem object and adds it to the current request.
     * @param currentRequest - The current HttpRequest being processed.
     * @param line - The line containing the test name.
     * @returns A new TestItem object.
     */
    private createNewTest;
    /**
     * Sets the HTTP method and URL for the current request.
     * @param currentRequest - The current HttpRequest being processed.
     * @param line - The line containing the HTTP method and URL.
     */
    private setRequestMethod;
    /**
     * Handles a key-value pair line in the request or test section.
     * @param currentRequest - The current HttpRequest being processed.
     * @param currentTest - The current TestItem being processed, if any.
     * @param line - The line containing the key-value pair.
     */
    private handleKeyValuePair;
    /**
     * Adds a custom assertion to the current test.
     * @param currentTest - The current TestItem being processed.
     * @param line - The line containing the custom assertion.
     */
    private addCustomAssertion;
    /**
     * Handles a line in the test section.
     * @param currentTest - The current TestItem being processed.
     * @param line - The line to handle.
     */
    private handleTestLine;
    /**
     * Parses an assertion from a key-value pair.
     * @param key - The assertion key.
     * @param value - The assertion value.
     * @returns An Assertion object or null if parsing fails.
     */
    private parseAssertion;
    private parseValue;
}
