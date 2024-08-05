import { TestResult, TestSummary } from '../types';
export declare class TestResultCollector {
    private results;
    addResult(result: TestResult): void;
    getResults(): TestResult[];
    getSummary(): TestSummary;
}
