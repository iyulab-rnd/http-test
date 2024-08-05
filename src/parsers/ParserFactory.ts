import { logVerbose } from '../utils/logger';
import { ContentTypeParser, ParserContext } from './ContentTypeParser';
import { JsonParser } from './JsonParser';
import { MultipartFormDataParser } from './MultipartFormDataParser';

export class ParserFactory {
  static createParser(contentType: string, context: ParserContext): ContentTypeParser {
    logVerbose(`Creating parser for content-type: ${contentType}`);
    if (contentType.includes('application/json')) {
      return new JsonParser(context);
    } else if (contentType.includes('multipart/form-data')) {
      return new MultipartFormDataParser();
    }
    // 기본 파서 또는 다른 content-type에 대한 파서 추가
    logVerbose(`Using default JsonParser for content-type: ${contentType}`);
    return new JsonParser(context);
  }
}