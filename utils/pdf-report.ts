/* eslint-disable no-console */
/**
 * PDF Report Generation Utility (Stub)
 * 
 * Note: expo-sharing needs to be installed for actual PDF sharing
 * npm install expo-sharing
 */

export interface KundliReportData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  latitude: number;
  longitude: number;
  timezone: number;
  gender: 'male' | 'female';
  planets: PlanetPosition[];
  houses: HouseData[];
  yogas: YogaData[];
  dashas: DashaPeriod[];
}

export interface PlanetPosition {
  name: string;
  longitude: number;
  latitude: number;
  speed: number;
  isRetrograde: boolean;
  house: number;
  sign: string;
  nakshatra: string;
}

export interface HouseData {
  number: number;
  longitude: number;
  sign: string;
  lord: string;
}

export interface YogaData {
  name: string;
  description: string;
  isPresent: boolean;
}

export interface DashaPeriod {
  planet: string;
  startDate: string;
  endDate: string;
  duration: number;
}

export interface HoroscopeReportData {
  zodiac: string;
  date: string;
  prediction: string;
  luckyColor: string;
  luckyNumber: number;
  luckyTime: string;
}

export interface CompatibilityReportData {
  boyName: string;
  girlName: string;
  boyBirthDate: string;
  girlBirthDate: string;
  score: number;
  koota: KootaData[];
  recommendation: string;
}

export interface KootaData {
  name: string;
  boyPoints: number;
  girlPoints: number;
  maxPoints: number;
  status: 'compatible' | 'incompatible' | 'neutral';
}

/**
 * Escapes HTML characters to prevent XSS / markup injection.
 */
export function escapeHtml(str: unknown): string {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Generate Kundli HTML
 */
export const generateKundliHTML = (data: KundliReportData): string => {
  return `
    <html>
      <head>
        <title>${escapeHtml(data.name)}'s Kundli Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #6B46C1; }
          .section { margin: 20px 0; padding: 10px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>${escapeHtml(data.name)}'s Kundli Report</h1>
        <div class="section">
          <h2>Birth Details</h2>
          <p>Date: ${escapeHtml(data.birthDate)}</p>
          <p>Time: ${escapeHtml(data.birthTime)}</p>
          <p>Place: ${escapeHtml(data.birthPlace)}</p>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate Compatibility HTML
 */
export const generateCompatibilityHTML = (data: CompatibilityReportData): string => {
  return `
    <html>
      <head>
        <title>Compatibility Report</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          h1 { color: #6B46C1; }
          .section { margin: 20px 0; padding: 10px; border: 1px solid #ddd; }
        </style>
      </head>
      <body>
        <h1>Compatibility Report</h1>
        <div class="section">
          <h2>${escapeHtml(data.boyName)} & ${escapeHtml(data.girlName)}</h2>
          <p>Compatibility Score: ${data.score}/36</p>
          <p>${escapeHtml(data.recommendation)}</p>
        </div>
      </body>
    </html>
  `;
};

/**
 * Generate PDF Report
 */
export const generatePDFReport = async (
  _htmlContent: string,
  _filename: string = 'report.pdf'
): Promise<string> => {
  // Stub implementation - in production, use a PDF library
  return _filename;
};

/**
 * Generate Kundli Report
 */
export const generateKundliReport = async (kundliData: KundliReportData): Promise<string> => {
  const html = generateKundliHTML(kundliData);
  return generatePDFReport(html, `${kundliData.name}-kundli.pdf`);
};

/**
 * Generate Compatibility Report
 */
export const generateCompatibilityReport = async (compatibilityData: CompatibilityReportData): Promise<string> => {
  const html = generateCompatibilityHTML(compatibilityData);
  return generatePDFReport(html, 'compatibility-report.pdf');
};

/**
 * Generate Horoscope Report
 */
export const generateHoroscopeReport = async (horoscopeData: HoroscopeReportData): Promise<string> => {
  const html = `
    <html>
      <head>
        <title>${escapeHtml(horoscopeData.zodiac)} Horoscope</title>
      </head>
      <body>
        <h1>${escapeHtml(horoscopeData.zodiac)} Horoscope - ${escapeHtml(horoscopeData.date)}</h1>
        <p>${escapeHtml(horoscopeData.prediction)}</p>
      </body>
    </html>
  `;
  return generatePDFReport(html, `${horoscopeData.zodiac}-horoscope.pdf`);
};

/**
 * Save Report to Device
 */
export const saveReportToDevice = async (
  _filename: string,
  _content: string
): Promise<boolean> => {
  try {
    return true;
  } catch (error) {
    return false;
  }
};

export default {
  generateKundliHTML,
  generateCompatibilityHTML,
  generatePDFReport,
  generateKundliReport,
  generateCompatibilityReport,
  generateHoroscopeReport,
  saveReportToDevice,
};
