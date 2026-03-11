import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

export class ResumeParserService {
  /**
   * Extracts text from a PDF or DOCX file buffer.
   * 
   * @param buffer The file buffer
   * @param mimetype The MIME type of the file (application/pdf or application/vnd.openxmlformats-officedocument.wordprocessingml.document)
   * @returns Extracted raw text
   */
  static async extractText(buffer: Buffer, mimetype: string): Promise<string> {
    try {
      if (mimetype === 'application/pdf') {
        const parser = new PDFParse({ data: buffer });
        const result = await parser.getText();
        await parser.destroy();
        return result.text.trim();
      }

      if (
        mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
        mimetype === 'application/msword'
      ) {
        const result = await mammoth.extractRawText({ buffer });
        return result.value.trim();
      }

      throw new Error(`Unsupported file type: ${mimetype}`);
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to parse document: ${error.message}`);
      }
      throw new Error('An unknown error occurred during document parsing');
    }
  }
}
