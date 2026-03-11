import { ResumeParserService } from '../resume-parser';
const pdfParse = require('pdf-parse');
import mammoth from 'mammoth';

// Mock dependencies
jest.mock('pdf-parse', () => jest.fn());
jest.mock('mammoth');

describe('ResumeParserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse PDF files correctly', async () => {
    (pdfParse as jest.Mock).mockResolvedValue({ text: '  Mock PDF Content  ' });
    
    const buffer = Buffer.from('mock pdf');
    const result = await ResumeParserService.extractText(buffer, 'application/pdf');
    
    expect(pdfParse).toHaveBeenCalledWith(buffer);
    expect(result).toBe('Mock PDF Content');
  });

  it('should parse DOCX files correctly', async () => {
    (mammoth.extractRawText as jest.Mock).mockResolvedValue({ value: '  Mock DOCX Content  ' });
    
    const buffer = Buffer.from('mock docx');
    const result = await ResumeParserService.extractText(buffer, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    
    expect(mammoth.extractRawText).toHaveBeenCalledWith({ buffer });
    expect(result).toBe('Mock DOCX Content');
  });

  it('should throw error on unsupported mime type', async () => {
    const buffer = Buffer.from('mock txt');
    
    await expect(ResumeParserService.extractText(buffer, 'text/plain'))
      .rejects
      .toThrow('Unsupported file type: text/plain');
  });

  it('should wrap external parser errors', async () => {
    (pdfParse as jest.Mock).mockRejectedValue(new Error('PDF corrupted'));
    
    const buffer = Buffer.from('bad pdf');
    await expect(ResumeParserService.extractText(buffer, 'application/pdf'))
      .rejects
      .toThrow('Failed to parse document: PDF corrupted');
  });
});
