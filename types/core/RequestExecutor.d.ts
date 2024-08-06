import { HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
/**
 * Executes HTTP requests and processes responses.
 */
export declare class RequestExecutor {
    private variableManager;
    private baseDir;
    private serverCheckTimeout;
    private requestTimeout;
    private axiosInstance;
    /**
     * Creates an instance of RequestExecutor.
     * @param variableManager - The VariableManager instance to use.
     */
    constructor(variableManager: VariableManager, baseDir: string);
    execute(request: HttpRequest): Promise<HttpResponse>;
    private applyVariables;
    private validateUrl;
    private checkServerStatus;
    private sendRequest;
    private parseJsonBody;
    private parseFormData;
    private buildFormData;
    private handleRequestError;
}
