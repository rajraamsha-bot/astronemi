import pdfReport from '../../utils/pdf-report';
import { KundliReportData, CompatibilityReportData, HoroscopeReportData } from '../../utils/pdf-report';

describe('pdf-report utility', () => {
  const mockKundliData: KundliReportData = {
    name: 'John Doe',
    birthDate: '1990-01-01',
    birthTime: '12:00',
    birthPlace: 'New Delhi',
    latitude: 28.61,
    longitude: 77.20,
    timezone: 5.5,
    gender: 'male',
    planets: [],
    houses: [],
    yogas: [],
    dashas: [],
  };

  const mockCompatibilityData: CompatibilityReportData = {
    boyName: 'Amit',
    girlName: 'Priya',
    boyBirthDate: '1990-01-01',
    girlBirthDate: '1992-02-02',
    score: 28,
    koota: [],
    recommendation: 'Highly recommended.',
  };

  const mockHoroscopeData: HoroscopeReportData = {
    zodiac: 'Aries',
    date: '2025-01-01',
    prediction: 'A great day ahead.',
    luckyColor: 'Red',
    luckyNumber: 9,
    luckyTime: 'Morning',
  };

  it('should generate Kundli HTML and report file name', async () => {
    const html = pdfReport.generateKundliHTML(mockKundliData);
    expect(html).toContain("John Doe's Kundli Report");
    expect(html).toContain('New Delhi');

    const fileName = await pdfReport.generateKundliReport(mockKundliData);
    expect(fileName).toBe('John Doe-kundli.pdf');
  });

  it('should generate Compatibility HTML and report file name', async () => {
    const html = pdfReport.generateCompatibilityHTML(mockCompatibilityData);
    expect(html).toContain('Compatibility Report');
    expect(html).toContain('Amit & Priya');

    const fileName = await pdfReport.generateCompatibilityReport(mockCompatibilityData);
    expect(fileName).toBe('compatibility-report.pdf');
  });

  it('should generate Horoscope Report', async () => {
    const fileName = await pdfReport.generateHoroscopeReport(mockHoroscopeData);
    expect(fileName).toBe('Aries-horoscope.pdf');
  });

  it('should escape HTML to prevent XSS injection in generated reports', () => {
    const maliciousKundli: KundliReportData = {
      ...mockKundliData,
      name: '<script>alert("XSS")</script>',
      birthPlace: '<img src=x onerror=alert(1)>',
    };
    const html = pdfReport.generateKundliHTML(maliciousKundli);
    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('should save report to device', async () => {
    const result = await pdfReport.saveReportToDevice('test.pdf', 'content');
    expect(result).toBe(true);
  });
});
