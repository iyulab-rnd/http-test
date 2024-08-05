import { ContentTypeParser } from './ContentTypeParser';
import FormData from 'form-data';
export declare class MultipartFormDataParser implements ContentTypeParser {
    private bodyBuffer;
    private isParsingBody;
    parseBody(body: string, boundary?: string): FormData | string;
    isBodyStart(line: string, boundary?: string): boolean;
    isBodyEnd(line: string, boundary?: string): boolean;
    private formDataToString;
}
