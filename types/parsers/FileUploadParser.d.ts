import { ContentTypeParser } from './ContentTypeParser';
import FormData from 'form-data';
export declare class FileUploadParser implements ContentTypeParser {
    parseBody(body: string): FormData;
    isBodyStart(line: string): boolean;
    isBodyEnd(): boolean;
}
