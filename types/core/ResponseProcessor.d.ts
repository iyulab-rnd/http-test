import { HttpResponse, VariableUpdate } from "../types";
import { VariableManager } from "./VariableManager";
export declare class ResponseProcessor {
    private variableManager;
    constructor(variableManager: VariableManager);
    process(response: HttpResponse, variableUpdates: VariableUpdate[]): Promise<void>;
    private processVariableUpdates;
    private parseResponseBody;
    private evaluateExpression;
    private extractValueFromJsonPath;
}
