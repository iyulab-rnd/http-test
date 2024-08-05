import { Assertion, HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
/**
 * Handles the assertion logic for HTTP responses.
 */
export declare class AssertionEngine {
    private variableManager;
    private baseDir;
    /**
     * Creates an instance of AssertionEngine.
     * @param variableManager - The VariableManager instance to use.
     * @param baseDir - The base directory for resolving paths.
     */
    constructor(variableManager: VariableManager, baseDir: string);
    /**
     * Asserts the given assertion against the HTTP response.
     * @param assertion - The assertion to check.
     * @param response - The HTTP response to assert against.
     * @param request - The original HTTP request.
     */
    assert(assertion: Assertion, response: HttpResponse, request: HttpRequest): Promise<void>;
    /**
     * Asserts the status code of the response.
     * @param assertion - The status assertion.
     * @param response - The HTTP response.
     */
    private assertStatus;
    /**
     * Asserts a header in the response.
     * @param assertion - The header assertion.
     * @param response - The HTTP response.
     */
    private assertHeader;
    /**
     * Asserts the Content-Type header.
     * @param actual - The actual Content-Type value.
     * @param expected - The expected Content-Type value.
     */
    private assertContentType;
    /**
     * Asserts the body of the response.
     * @param assertion - The body assertion.
     * @param response - The HTTP response.
     */
    private assertBody;
    /**
     * Parses the value of an assertion.
     * @param value - The value to parse.
     * @returns The parsed value.
     */
    private parseValue;
    private adjustJsonPath;
    private isEqual;
    /**
     * Asserts using a custom validator function.
     * @param assertion - The custom assertion.
     * @param response - The HTTP response.
     * @param request - The original HTTP request.
     */
    private assertCustom;
    /**
     * Runs a custom validator function.
     * @param customFunctionPath - The path to the custom validator function.
     * @param response - The HTTP response.
     * @param request - The original HTTP request.
     */
    private runCustomValidator;
    /**
     * Resolves the path of a custom validator function.
     * @param customFunctionPath - The path to resolve.
     * @returns The resolved path.
     */
    private resolvePath;
}
