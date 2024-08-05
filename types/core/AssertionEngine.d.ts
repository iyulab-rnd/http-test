import { Assertion, HttpRequest, HttpResponse } from "../types";
import { VariableManager } from "./VariableManager";
export declare class AssertionEngine {
    private variableManager;
    private baseDir;
    constructor(variableManager: VariableManager, baseDir: string);
    assert(assertion: Assertion, response: HttpResponse, request: HttpRequest): Promise<void>;
    private assertStatus;
    private assertHeader;
    private assertContentType;
    private assertBody;
    private parseResponseData;
    private assertJsonPath;
    private parseValue;
    private adjustJsonPath;
    private isEqual;
    private assertCustom;
    private runCustomValidator;
    private resolvePath;
}
