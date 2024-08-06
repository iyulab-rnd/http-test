import { TestItem } from "../types";
import { VariableManager } from "./VariableManager";
export declare class TestParser {
    private variableManager;
    constructor(variableManager: VariableManager);
    parse(lines: string[]): {
        tests: TestItem[];
        variableUpdates: {
            key: string;
            value: string;
        }[];
    };
    private createNewTest;
    private parseAssertion;
    private parseStatusAssertion;
    private parseValue;
}
