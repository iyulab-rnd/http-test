import { HttpRequest, TestResult, RunOptions } from "../types";
export declare class TestManager {
    private requestExecutor;
    private responseProcessor;
    private resultCollector;
    private variableManager;
    private assertionEngine;
    private baseDir;
    constructor(httpFilePath: string);
    run(requests: HttpRequest[], options?: RunOptions): Promise<TestResult[]>;
    private processRequest;
    private runTests;
    private createTestResult;
    private createDefaultStatusCodeTest;
    private handleRequestError;
}
