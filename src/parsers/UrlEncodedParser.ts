import { ContentTypeParser } from './ContentTypeParser';
import querystring from 'querystring';

export class UrlEncodedParser implements ContentTypeParser {
  
  parseBody(body: string): string {
    const parsed = querystring.parse(body);
    return JSON.stringify(parsed);
  }

  isBodyStart(): boolean {
    return true;
  }

  isBodyEnd(): boolean {
    return false;
  }
}