import { HttpRequest } from "../types";
import { VariableManager } from "./VariableManager";
export declare class HttpFileParser {
    private variableManager;
    constructor(variableManager: VariableManager);
    parse(filePath: string): Promise<HttpRequest[]>;
    private splitIntoSections;
    private parseRequests;
    private handleGlobalVariables;
}
