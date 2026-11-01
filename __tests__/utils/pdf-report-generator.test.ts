import PDFReportGenerator from '../../utils/pdf-report-generator';
import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Mock expo-print and expo-sharing
jest.mock('expo-print', () => ({
  printToFileAsync: jest.fn(() => Promise.resolve({ uri: 'file://print_pdf.pdf' })),
}), { virtual: true });

jest.mock('expo-sharing', () => ({
  isAvailableAsync: jest.fn(() => Promise.resolve(true)),
  shareAsync: jest.fn(() => Promise.resolve()),
}), { virtual: true });

jest.mock('expo-file-system', () => ({
  documentDirectory: 'file://documents/',
  writeAsStringAsync: jest.fn(),
  readAsStringAsync: jest.fn(() => Promise.resolve('mock_content')),
  EncodingType: { UTF8: 'utf8' },
}));

jest.mock('react-native', () => ({
  Share: {
    share: jest.fn(),
  },
}));

describe('PDFReportGenerator', () => {
  const mockKundliData: any = {
    name: 'John Doe',
    birthDate: '1990-01-01',
    birthTime: '12:00',
    birthPlace: 'Mumbai',
    ascendant: 'Leo',
    moonSign: 'Aries',
    sunSign: 'Taurus',
    nakshatra: 'Aswini',
    nakshatraPada: 1,
    planets: [
      {
        name: 'Sun',
        sanskritName: 'Surya',
        sign: 'Taurus',
        signSanskrit: 'Vrishabha',
        degree: 15.5,
        nakshatra: 'Rohini',
        nakshatraLord: 'Moon',
        house: 10,
        isRetrograde: false,
        isCombust: false,
        dignity: 'Friendly',
        avastha: 'Yuva',
      },
    ],
    houses: [
      {
        number: 1,
        sign: 'Leo',
        signLord: 'Sun',
        planets: [],
        aspects: [],
      },
    ],
    dasha: {
      mahadasha: { planet: 'Sun', startDate: '2020-01-01', endDate: '2026-01-01' },
      antardasha: { planet: 'Moon', startDate: '2024-01-01', endDate: '2025-01-01' },
    },
    yogas: [
      {
        name: 'Raja Yoga',
        sanskritName: 'Raja Yoga',
        type: 'Benefic',
        strength: 80,
        description: 'Brings success and power.',
        effects: ['Wealth', 'Status'],
      },
    ],
    mangalDosha: true,
    mangalDoshaDetails: 'Presence of Mars in 1st house.',
    kalsarpaDosha: false,
    sadeSati: {
      isActive: true,
      currentPhase: 'Peak',
      startDate: '2022-01-01',
      endDate: '2025-01-01',
      effects: ['Challenges', 'Growth'],
      remedies: ['Hanuman Chalisa'],
    },
    divisionalCharts: [
      {
        name: 'D9 Navamsa',
        chart: [{ house: 1, sign: 'Aries', planets: ['Sun'] }],
      },
    ],
  };

  const mockMatchingData: any = {
    boyName: 'Amit',
    girlName: 'Priya',
    boyBirthDetails: {
      date: '1990-01-01',
      time: '12:00',
      place: 'Mumbai',
    },
    girlBirthDetails: {
      date: '1992-02-02',
      time: '14:00',
      place: 'Pune',
    },
    totalScore: 28,
    maxScore: 36,
    kootas: [
      {
        sanskritName: 'Varna',
        boyValue: 'Brahmin',
        girlValue: 'Kshatriya',
        score: 1,
        maxScore: 1,
        description: 'Work compatibility.',
      },
    ],
    mangalCompatibility: {
      boyHasDosha: false,
      girlHasDosha: false,
      isCompatible: true,
      description: 'Both free from Dosha.',
    },
    conclusion: 'Excellent compatibility match.',
    recommendations: ['Perform a simple pooja.', 'Verify compatibility of D9 charts.'],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should generate Kundli PDF using expo-print if available', async () => {
    const uri = await PDFReportGenerator.generateKundliPDF(mockKundliData);
    expect(uri).toBe('file://print_pdf.pdf');
  });

  it('should generate Matching PDF using expo-print if available', async () => {
    const uri = await PDFReportGenerator.generateMatchingPDF(mockMatchingData);
    expect(uri).toBe('file://print_pdf.pdf');
  });

  it('should fallback to saving HTML file if expo-print is not available', async () => {
    const printMock = require('expo-print');
    const originalPrintToFile = printMock.printToFileAsync;
    printMock.printToFileAsync = undefined;

    const uri = await PDFReportGenerator.generateKundliPDF(mockKundliData);
    expect(uri).toContain('file://documents/kundli_');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalled();

    // Restore
    printMock.printToFileAsync = originalPrintToFile;
  });

  it('should share PDF using expo-sharing if available', async () => {
    const res = await PDFReportGenerator.sharePDF('file://test.pdf');
    expect(res).toBe(true);
    const sharingMock = require('expo-sharing');
    expect(sharingMock.shareAsync).toHaveBeenCalledWith('file://test.pdf', expect.any(Object));
  });

  it('should fallback to react-native Share if expo-sharing is not available', async () => {
    const sharingMock = require('expo-sharing');
    (sharingMock.isAvailableAsync as jest.Mock).mockResolvedValueOnce(false);

    const res = await PDFReportGenerator.sharePDF('file://test.pdf');
    expect(res).toBe(true);
    expect(Share.share).toHaveBeenCalledWith(expect.objectContaining({ url: 'file://test.pdf' }));
  });

  it('should save PDF by copying it to documents directory', async () => {
    const res = await PDFReportGenerator.savePDF('file://src.pdf', 'dest.pdf');
    expect(res).toBe('file://documents/dest.pdf');
    expect(FileSystem.readAsStringAsync).toHaveBeenCalledWith('file://src.pdf');
    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('file://documents/dest.pdf', 'mock_content');
  });

  it('should generate and share Kundli report', async () => {
    const res = await PDFReportGenerator.generateAndShareKundli(mockKundliData);
    expect(res).toBe(true);
  });

  it('should generate and share Matching report', async () => {
    const res = await PDFReportGenerator.generateAndShareMatching(mockMatchingData);
    expect(res).toBe(true);
  });
});
