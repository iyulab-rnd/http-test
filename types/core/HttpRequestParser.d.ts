import { HttpRequest } from "../types";
import { VariableManager } from "./VariableManager";
export declare class HttpRequestParser {
    private variableManager;
    private testParser;
    constructor(variableManager: VariableManager);
    parse(section: string): HttpRequest;
    private initializeRequest;
    private splitRequestAndTestLines;
    private parseRequestLines;
    private isHttpMethod;
    private setRequestMethod;
    private handleHeader;
    private handleVariable;
    private parseBody;
}
