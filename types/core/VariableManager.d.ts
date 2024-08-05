import { Variables } from '../types';
export declare class VariableManager {
    private variables;
    setVariables(variables: Variables): void;
    replaceVariables(content: string): string;
    setVariable(key: string, value: string | number | boolean): void;
    getVariable(key: string): string | number | boolean | undefined;
    getAllVariables(): Variables;
}
