import { generateKundliHTML, exportReportAsHTML } from '../../utils/report-generator';
import { writeAsStringAsync } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { KundliData } from '../../utils/kundli-generator';

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://documents/',
  writeAsStringAsync: jest.fn(),
}));

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(),
  shareAsync: jest.fn(),
}));

describe('report-generator', () => {
  const mockKundliData: KundliData = {
    personalInfo: {
      name: 'Test User',
      birthDate: '1995-05-15',
      birthTime: '12:30',
      birthPlace: 'Mumbai',
      displayPlace: 'Mumbai, MH, India',
      dateTime: { year: 1995, month: 5, day: 15, hour: 12, minute: 30 },
    },
    ascendant: { sign: 'Leo', degree: 15.5 },
    calculationSource: 'vedastro',
    planets: [
      { name: 'Sun', sanskritName: 'Surya', sign: 'Taurus', nakshatra: 'Krittika', house: 10, isRetrograde: false },
      { name: 'Mercury', sanskritName: 'Budha', sign: 'Taurus', nakshatra: 'Rohini', house: 10, isRetrograde: true },
    ],
    insights: ['A strong career indicated by Sun in the 10th house.', 'Retrograde Mercury demands careful communication.'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateKundliHTML', () => {
    it('should generate valid HTML containing personal and planetary details', () => {
      const html = generateKundliHTML(mockKundliData);
      expect(html).toContain('Janam Kundli - Test User');
      expect(html).toContain('15/5/1995');
      expect(html).toContain('12:30');
      expect(html).toContain('Leo');
      expect(html).toContain('15.50°');
      expect(html).toContain('Sun');
      expect(html).toContain('Retrograde');
    });
  });

  describe('exportReportAsHTML', () => {
    it('should write HTML file and share it if sharing is available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(true);

      const result = await exportReportAsHTML(mockKundliData);

      expect(writeAsStringAsync).toHaveBeenCalledWith(
        expect.stringContaining('file://documents/Kundli_Test_User_'),
        expect.stringContaining('Janam Kundli - Test User')
      );
      expect(Sharing.shareAsync).toHaveBeenCalledWith(
        expect.stringContaining('file://documents/Kundli_Test_User_')
      );
      expect(result).toEqual({
        success: true,
        path: expect.stringContaining('file://documents/Kundli_Test_User_'),
      });
    });

    it('should return error if sharing is not available', async () => {
      (Sharing.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

      const result = await exportReportAsHTML(mockKundliData);

      expect(writeAsStringAsync).toHaveBeenCalled();
      expect(Sharing.shareAsync).not.toHaveBeenCalled();
      expect(result).toEqual({
        success: false,
        error: 'Sharing not available on this device',
      });
    });

    it('should handle write errors gracefully', async () => {
      (writeAsStringAsync as jest.Mock).mockRejectedValueOnce(new Error('Write failed'));

      const result = await exportReportAsHTML(mockKundliData);

      expect(result).toEqual({
        success: false,
        error: 'Failed to generate report file',
      });
    });
  });
});
