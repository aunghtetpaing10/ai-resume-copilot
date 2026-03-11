import { ResumeParserService } from '../resume-parser';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';

const mockGetText = jest.fn();
const mockDestroy = jest.fn();

// Mock dependencies
jest.mock('pdf-parse', () => {
  return {
    PDFParse: jest.fn().mockImplementation(() => ({
      getText: mockGetText,
      destroy: mockDestroy
    }))
  };
});
jest.mock('mammoth');

describe('ResumeParserService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should parse PDF files correctly', async () => {
    mockGetText.mockResolvedValue({ text: '  Mock PDF Content  ' });
    
    const buffer = Buffer.from('mock pdf');
    const result = await ResumeParserService.extractText(buffer, 'application/pdf');
    
    expect(PDFParse).toHaveBeenCalledWith({ data: buffer });
    expect(mockGetText).toHaveBeenCalled();
    expect(mockDestroy).toHaveBeenCalled();
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
    mockGetText.mockRejectedValue(new Error('PDF corrupted'));
    
    const buffer = Buffer.from('bad pdf');
    await expect(ResumeParserService.extractText(buffer, 'application/pdf'))
      .rejects
      .toThrow('Failed to parse document: PDF corrupted');
  });
});
