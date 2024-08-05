import { ContentTypeParser } from './ContentTypeParser';
export declare class UrlEncodedParser implements ContentTypeParser {
    parseBody(body: string): string;
    isBodyStart(): boolean;
    isBodyEnd(): boolean;
}
