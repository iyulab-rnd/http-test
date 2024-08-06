import { HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
/**
 * Executes HTTP requests and processes responses.
 */
export declare class RequestExecutor {
    private variableManager;
    private serverCheckTimeout;
    private requestTimeout;
    /**
     * Creates an instance of RequestExecutor.
     * @param variableManager - The VariableManager instance to use.
     */
    constructor(variableManager: VariableManager);
    execute(request: HttpRequest): Promise<HttpResponse>;
    private applyVariables;
    private validateUrl;
    private checkServerStatus;
    /**
     * Sends an HTTP request.
     * @param request - The HttpRequest to send.
     * @returns A promise that resolves to an AxiosResponse.
     */
    private sendRequest;
    private parseJsonBody;
    private parseFormData;
    private handleRequestError;
}
