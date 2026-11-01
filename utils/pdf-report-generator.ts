/* eslint-disable import/namespace */
/**
 * PDF Report Generator Service
 * 
 * Generates professional PDF reports for kundli, horoscope matching,
 * and other astrological reports.
 * 
 * Uses expo-print for PDF generation (requires expo-print package)
 * Falls back to HTML generation for web platforms
 */

import { Share } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Conditional import for expo-print (may not be installed)
let Print: any = null;
let Sharing: any = null;

try {
    Print = require('expo-print');
    Sharing = require('expo-sharing');
  } catch (e) {
    // expo-print or expo-sharing not installed, using fallback
  }

// Types
export interface KundliReportData {
  name: string;
  birthDate: string;
  birthTime: string;
  birthPlace: string;
  ascendant: string;
  moonSign: string;
  sunSign: string;
  nakshatra: string;
  nakshatraPada: number;
  planets: PlanetPosition[];
  houses: HouseData[];
  dasha: DashaData;
  yogas: YogaData[];
  mangalDosha: boolean;
  mangalDoshaDetails?: string;
  kalsarpaDosha?: boolean;
  kalsarpaDoshaDetails?: string;
  sadeSati?: SadeSatiData;
  divisionalCharts?: DivisionalChartData[];
}

export interface PlanetPosition {
  name: string;
  sanskritName: string;
  sign: string;
  signSanskrit: string;
  degree: number;
  nakshatra: string;
  nakshatraLord: string;
  house: number;
  isRetrograde: boolean;
  isCombust: boolean;
  dignity: string;
  avastha: string;
}

export interface HouseData {
  number: number;
  sign: string;
  signLord: string;
  planets: string[];
  aspects: string[];
}

export interface DashaData {
  mahadasha: { planet: string; startDate: string; endDate: string };
  antardasha: { planet: string; startDate: string; endDate: string };
  pratyantardasha?: { planet: string; startDate: string; endDate: string };
}

export interface YogaData {
  name: string;
  sanskritName: string;
  type: string;
  strength: number;
  description: string;
  effects: string[];
}

export interface SadeSatiData {
  isActive: boolean;
  currentPhase: string;
  startDate: string;
  endDate: string;
  effects: string[];
  remedies: string[];
}

export interface DivisionalChartData {
  name: string;
  chart: { house: number; sign: string; planets: string[] }[];
}

export interface MatchingReportData {
  boyName: string;
  girlName: string;
  boyBirthDetails: { date: string; time: string; place: string };
  girlBirthDetails: { date: string; time: string; place: string };
  totalScore: number;
  maxScore: number;
  kootas: KootaData[];
  conclusion: string;
  recommendations: string[];
}

export interface KootaData {
  name: string;
  sanskritName: string;
  boyValue: string;
  girlValue: string;
  score: number;
  maxScore: number;
  description: string;
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
 * Generate HTML for Kundli Report
 */
function generateKundliHTML(data: KundliReportData): string {
  const planetRows = data.planets.map(p => `
    <tr>
      <td>${escapeHtml(p.sanskritName)}</td>
      <td>${escapeHtml(p.signSanskrit)} (${escapeHtml(p.sign)})</td>
      <td>${p.degree.toFixed(2)}°</td>
      <td>${escapeHtml(p.nakshatra)}</td>
      <td>${p.house}</td>
      <td>${p.isRetrograde ? '✓' : '-'}</td>
      <td>${escapeHtml(p.dignity)}</td>
    </tr>
  `).join('');

  const yogaRows = data.yogas.map(y => `
    <div class="yoga-item">
      <h4>${escapeHtml(y.sanskritName)} (${escapeHtml(y.name)})</h4>
      <p class="yoga-type">${escapeHtml(y.type)} Yoga - Strength: ${y.strength}%</p>
      <p>${escapeHtml(y.description)}</p>
      <ul>
        ${y.effects.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
      </ul>
    </div>
  `).join('');

  const divisionalChartsHTML = data.divisionalCharts?.map(dc => `
    <div class="divisional-chart">
      <h4>${escapeHtml(dc.name)}</h4>
      <table class="chart-table">
        ${dc.chart.map(h => `
          <tr>
            <td>House ${h.house}</td>
            <td>${escapeHtml(h.sign)}</td>
            <td>${h.planets.map(escapeHtml).join(', ') || '-'}</td>
          </tr>
        `).join('')}
      </table>
    </div>
  `).join('') || '';

  return `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>जातक चार्ट - ${escapeHtml(data.name)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans Devanagari', 'Segoe UI', Tahoma, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }
    
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 2px solid #ffd700;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #ffd700;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .header .subtitle {
      color: #b8860b;
      font-size: 16px;
    }
    
    .section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 215, 0, 0.2);
    }
    
    .section h2 {
      color: #ffd700;
      font-size: 20px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
    }
    
    .basic-info {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 15px;
    }
    
    .info-item {
      padding: 10px;
      background: rgba(0, 0, 0, 0.2);
      border-radius: 5px;
    }
    
    .info-item label {
      color: #b8860b;
      font-size: 12px;
      display: block;
      margin-bottom: 5px;
    }
    
    .info-item value {
      color: #fff;
      font-size: 16px;
      font-weight: 500;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th, td {
      padding: 10px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 215, 0, 0.2);
    }
    
    th {
      background: rgba(255, 215, 0, 0.1);
      color: #ffd700;
      font-weight: 500;
    }
    
    tr:hover {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .dosha-warning {
      background: rgba(255, 0, 0, 0.1);
      border: 1px solid rgba(255, 0, 0, 0.3);
      padding: 15px;
      border-radius: 5px;
      margin-top: 10px;
    }
    
    .dosha-warning h3 {
      color: #ff6b6b;
      margin-bottom: 10px;
    }
    
    .yoga-item {
      background: rgba(0, 0, 0, 0.2);
      padding: 15px;
      border-radius: 5px;
      margin-bottom: 15px;
    }
    
    .yoga-item h4 {
      color: #ffd700;
      margin-bottom: 5px;
    }
    
    .yoga-type {
      color: #b8860b;
      font-size: 12px;
      margin-bottom: 10px;
    }
    
    .yoga-item ul {
      margin-left: 20px;
      margin-top: 10px;
    }
    
    .yoga-item li {
      margin-bottom: 5px;
      color: #ccc;
    }
    
    .dasha-current {
      background: linear-gradient(135deg, rgba(255, 215, 0, 0.1), rgba(255, 215, 0, 0.05));
      padding: 20px;
      border-radius: 10px;
      text-align: center;
    }
    
    .dasha-current h3 {
      color: #ffd700;
      margin-bottom: 15px;
    }
    
    .dasha-periods {
      display: flex;
      justify-content: space-around;
      margin-top: 15px;
    }
    
    .dasha-period {
      text-align: center;
    }
    
    .dasha-period label {
      color: #b8860b;
      font-size: 12px;
      display: block;
    }
    
    .dasha-period value {
      color: #fff;
      font-size: 18px;
      font-weight: 500;
    }
    
    .footer {
      text-align: center;
      padding: 20px;
      margin-top: 30px;
      border-top: 1px solid rgba(255, 215, 0, 0.2);
      color: #888;
      font-size: 12px;
    }
    
    .chart-diagram {
      width: 100%;
      max-width: 400px;
      margin: 20px auto;
      aspect-ratio: 1;
      border: 2px solid #ffd700;
      position: relative;
    }
    
    .divisional-chart {
      margin-bottom: 20px;
    }
    
    .divisional-chart h4 {
      color: #ffd700;
      margin-bottom: 10px;
    }
    
    .chart-table {
      font-size: 12px;
    }
    
    @media print {
      body {
        background: white;
        color: black;
      }
      
      .section {
        background: #f5f5f5;
        border: 1px solid #ddd;
      }
      
      th {
        background: #e0e0e0;
        color: #333;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🕉 जातक चार्त 🕉</h1>
    <div class="subtitle">AstroNemi - Vedic Astrology Report</div>
  </div>
  
  <div class="section">
    <h2>👤 व्यक्तिगत विवरण (Personal Details)</h2>
    <div class="basic-info">
      <div class="info-item">
        <label>नाम (Name)</label>
        <value>${escapeHtml(data.name)}</value>
      </div>
      <div class="info-item">
        <label>जन्म तिथि (Birth Date)</label>
        <value>${escapeHtml(data.birthDate)}</value>
      </div>
      <div class="info-item">
        <label>जन्म समय (Birth Time)</label>
        <value>${escapeHtml(data.birthTime)}</value>
      </div>
      <div class="info-item">
        <label>जन्म स्थान (Birth Place)</label>
        <value>${escapeHtml(data.birthPlace)}</value>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>🌟 मूल जानकारी (Basic Astrological Info)</h2>
    <div class="basic-info">
      <div class="info-item">
        <label>लग्न (Ascendant)</label>
        <value>${escapeHtml(data.ascendant)}</value>
      </div>
      <div class="info-item">
        <label>चंद्र राशि (Moon Sign)</label>
        <value>${escapeHtml(data.moonSign)}</value>
      </div>
      <div class="info-item">
        <label>सूर्य राशि (Sun Sign)</label>
        <value>${escapeHtml(data.sunSign)}</value>
      </div>
      <div class="info-item">
        <label>नक्षत्र (Nakshatra)</label>
        <value>${escapeHtml(data.nakshatra)} (पद ${data.nakshatraPada})</value>
      </div>
    </div>
  </div>
  
  <div class="section">
    <h2>🪐 ग्रह स्थिति (Planetary Positions)</h2>
    <table>
      <thead>
        <tr>
          <th>ग्रह</th>
          <th>राशि</th>
          <th>अंश</th>
          <th>नक्षत्र</th>
          <th>भाव</th>
          <th>वक्री</th>
          <th>अवस्था</th>
        </tr>
      </thead>
      <tbody>
        ${planetRows}
      </tbody>
    </table>
  </div>
  
  <div class="section">
    <h2>⏰ विंशोत्तरी दशा (Vimshottari Dasha)</h2>
    <div class="dasha-current">
      <h3>वर्तमान दशा (Current Period)</h3>
      <div class="dasha-periods">
        <div class="dasha-period">
          <label>महादशा</label>
          <value>${escapeHtml(data.dasha.mahadasha.planet)}</value>
        </div>
        <div class="dasha-period">
          <label>अंतर्दशा</label>
          <value>${escapeHtml(data.dasha.antardasha.planet)}</value>
        </div>
      </div>
    </div>
  </div>
  
  ${data.yogas.length > 0 ? `
  <div class="section">
    <h2>🔮 योग (Yogas)</h2>
    ${yogaRows}
  </div>
  ` : ''}
  
  ${(data.mangalDosha || data.kalsarpaDosha) ? `
  <div class="section">
    <h2>⚠️ दोष (Doshas)</h2>
    ${data.mangalDosha ? `
    <div class="dosha-warning">
      <h3>मंगल दोष (Mangal Dosha)</h3>
      <p>${escapeHtml(data.mangalDoshaDetails) || 'मंगल दोष उपस्थित है। विवाह पूर्व विशेष पूजा अनुष्ठान आवश्यक हो सकता है।'}</p>
    </div>
    ` : ''}
    ${data.kalsarpaDosha ? `
    <div class="dosha-warning">
      <h3>कालसर्प दोष (Kalsarpa Dosha)</h3>
      <p>${escapeHtml(data.kalsarpaDoshaDetails) || 'कालसर्प दोष उपस्थित है।'}</p>
    </div>
    ` : ''}
  </div>
  ` : ''}
  
  ${data.sadeSati ? `
  <div class="section">
    <h2>🪐 साढ़े साती (Sade Sati)</h2>
    <div class="basic-info">
      <div class="info-item">
        <label>स्थिति</label>
        <value>${data.sadeSati.isActive ? 'सक्रिय' : 'निष्क्रिय'}</value>
      </div>
      ${data.sadeSati.isActive ? `
      <div class="info-item">
        <label>वर्तमान चरण</label>
        <value>${escapeHtml(data.sadeSati.currentPhase)}</value>
      </div>
      ` : ''}
    </div>
    ${data.sadeSati.effects.length > 0 ? `
    <p style="margin-top: 15px;"><strong>प्रभाव:</strong></p>
    <ul>
      ${data.sadeSati.effects.map(e => `<li>${escapeHtml(e)}</li>`).join('')}
    </ul>
    ` : ''}
  </div>
  ` : ''}
  
  ${divisionalChartsHTML}
  
  <div class="footer">
    <p>यह रिपोर्ट AstroNemi द्वारा उत्पन्न की गई है</p>
    <p>Generated on: ${new Date().toLocaleDateString('hi-IN')} at ${new Date().toLocaleTimeString('hi-IN')}</p>
    <p>© ${new Date().getFullYear()} AstroNemi - All Rights Reserved</p>
  </div>
</body>
</html>
  `;
}

/**
 * Generate HTML for Matching Report
 */
function generateMatchingHTML(data: MatchingReportData): string {
  const kootaRows = data.kootas.map(k => `
    <tr>
      <td>${escapeHtml(k.sanskritName)}</td>
      <td>${escapeHtml(k.boyValue)}</td>
      <td>${escapeHtml(k.girlValue)}</td>
      <td>${k.score}/${k.maxScore}</td>
      <td>${escapeHtml(k.description)}</td>
    </tr>
  `).join('');

  const percentage = Math.round((data.totalScore / data.maxScore) * 100);
  const resultColor = percentage >= 50 ? '#4caf50' : '#f44336';
  const resultText = percentage >= 75 ? 'उत्तम मिलान' : 
                      percentage >= 50 ? 'अच्छा मिलान' : 
                      percentage >= 36 ? 'औसत मिलान' : 'कम मिलान';

  return `
<!DOCTYPE html>
<html lang="hi">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>कुंडली मिलान - ${escapeHtml(data.boyName)} & ${escapeHtml(data.girlName)}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Noto Sans Devanagari', 'Segoe UI', Tahoma, sans-serif;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      color: #e0e0e0;
      padding: 20px;
      line-height: 1.6;
    }
    
    .header {
      text-align: center;
      padding: 30px 0;
      border-bottom: 2px solid #ffd700;
      margin-bottom: 30px;
    }
    
    .header h1 {
      color: #ffd700;
      font-size: 28px;
      margin-bottom: 10px;
    }
    
    .couples-names {
      display: flex;
      justify-content: center;
      align-items: center;
      gap: 20px;
      margin: 20px 0;
    }
    
    .person-name {
      text-align: center;
    }
    
    .person-name h3 {
      color: #ffd700;
      font-size: 20px;
    }
    
    .person-name p {
      color: #888;
      font-size: 12px;
    }
    
    .ampersand {
      color: #ffd700;
      font-size: 30px;
    }
    
    .score-circle {
      width: 150px;
      height: 150px;
      border-radius: 50%;
      background: conic-gradient(${resultColor} ${percentage}%, #333 ${percentage}%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin: 30px auto;
      position: relative;
    }
    
    .score-circle::before {
      content: '';
      width: 120px;
      height: 120px;
      background: #1a1a2e;
      border-radius: 50%;
      position: absolute;
    }
    
    .score-value {
      position: relative;
      z-index: 1;
      text-align: center;
    }
    
    .score-value .score {
      font-size: 36px;
      font-weight: bold;
      color: ${resultColor};
    }
    
    .score-value .max {
      font-size: 14px;
      color: #888;
    }
    
    .result-text {
      text-align: center;
      font-size: 24px;
      color: ${resultColor};
      margin: 20px 0;
    }
    
    .section {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 20px;
      margin-bottom: 20px;
      border: 1px solid rgba(255, 215, 0, 0.2);
    }
    
    .section h2 {
      color: #ffd700;
      font-size: 20px;
      margin-bottom: 15px;
      padding-bottom: 10px;
      border-bottom: 1px solid rgba(255, 215, 0, 0.3);
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 10px;
    }
    
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid rgba(255, 215, 0, 0.2);
    }
    
    th {
      background: rgba(255, 215, 0, 0.1);
      color: #ffd700;
      font-weight: 500;
    }
    
    .conclusion {
      background: rgba(0, 0, 0, 0.2);
      padding: 20px;
      border-radius: 10px;
      text-align: center;
      font-size: 16px;
      line-height: 1.8;
    }
    
    .recommendations {
      margin-top: 15px;
    }
    
    .recommendations li {
      margin-bottom: 10px;
      padding-left: 20px;
      position: relative;
    }
    
    .recommendations li::before {
      content: '✓';
      color: #4caf50;
      position: absolute;
      left: 0;
    }
    
    .footer {
      text-align: center;
      padding: 20px;
      margin-top: 30px;
      border-top: 1px solid rgba(255, 215, 0, 0.2);
      color: #888;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>🕉 कुंडली मिलान 🕉</h1>
    <div class="subtitle">AstroNemi - Kundali Matching Report</div>
  </div>
  
  <div class="couples-names">
    <div class="person-name">
      <h3>${escapeHtml(data.boyName)}</h3>
      <p>${escapeHtml(data.boyBirthDetails.date)} | ${escapeHtml(data.boyBirthDetails.time)}</p>
      <p>${escapeHtml(data.boyBirthDetails.place)}</p>
    </div>
    <div class="ampersand">&</div>
    <div class="person-name">
      <h3>${escapeHtml(data.girlName)}</h3>
      <p>${escapeHtml(data.girlBirthDetails.date)} | ${escapeHtml(data.girlBirthDetails.time)}</p>
      <p>${escapeHtml(data.girlBirthDetails.place)}</p>
    </div>
  </div>
  
  <div class="score-circle">
    <div class="score-value">
      <div class="score">${data.totalScore}</div>
      <div class="max">/ ${data.maxScore} गुण</div>
    </div>
  </div>
  
  <div class="result-text">${escapeHtml(resultText)}</div>
  
  <div class="section">
    <h2>📊 अष्टकूट मिलान (Ashtakoot Matching)</h2>
    <table>
      <thead>
        <tr>
          <th>कूट</th>
          <th>वर</th>
          <th>वधू</th>
          <th>अंक</th>
          <th>विवरण</th>
        </tr>
      </thead>
      <tbody>
        ${kootaRows}
      </tbody>
      <tfoot>
        <tr style="font-weight: bold; background: rgba(255, 215, 0, 0.1);">
          <td colspan="3">कुल अंक (Total)</td>
          <td>${data.totalScore}/${data.maxScore}</td>
          <td></td>
        </tr>
      </tfoot>
    </table>
  </div>
  
  <div class="section">
    <h2>📝 निष्कर्ष (Conclusion)</h2>
    <div class="conclusion">
      ${escapeHtml(data.conclusion)}
    </div>
    ${data.recommendations.length > 0 ? `
    <ul class="recommendations">
      ${data.recommendations.map(r => `<li>${escapeHtml(r)}</li>`).join('')}
    </ul>
    ` : ''}
  </div>
  
  <div class="footer">
    <p>यह रिपोर्ट AstroNemi द्वारा उत्पन्न की गई है</p>
    <p>Generated on: ${new Date().toLocaleDateString('hi-IN')} at ${new Date().toLocaleTimeString('hi-IN')}</p>
    <p>© ${new Date().getFullYear()} AstroNemi - All Rights Reserved</p>
  </div>
</body>
</html>
  `;
}

/**
 * PDF Generator class
 */
export const PDFReportGenerator = {
  /**
   * Generate Kundli PDF Report
   */
  generateKundliPDF: async (data: any): Promise<string | null> => {
    try {
      const html = generateKundliHTML(data);
      
      // Check if expo-print is available
      if (Print && Print.printToFileAsync) {
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });
        return uri;
      }
      
      // Fallback: Save HTML file
      const documentsDir = FileSystem.documentDirectory;
      if (documentsDir) {
        const filename = `kundli_${(data.name as string).replace(/\s+/g, '_')}_${Date.now()}.html`;
        const fileUri = `${documentsDir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, html, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        return fileUri;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Generate Matching PDF Report
   */
  generateMatchingPDF: async (data: any): Promise<string | null> => {
    try {
      const html = generateMatchingHTML(data);
      
      // Check if expo-print is available
      if (Print && Print.printToFileAsync) {
        const { uri } = await Print.printToFileAsync({
          html,
          base64: false,
        });
        return uri;
      }
      
      // Fallback: Save HTML file
      const documentsDir = FileSystem.documentDirectory;
      if (documentsDir) {
        const filename = `matching_${data.boyName}_${data.girlName}_${Date.now()}.html`;
        const fileUri = `${documentsDir}${filename}`;
        await FileSystem.writeAsStringAsync(fileUri, html, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        return fileUri;
      }
      
      return null;
    } catch (error) {
      return null;
    }
  },

  /**
   * Share PDF file
   */
  sharePDF: async (uri: string, title: string = 'Kundli Report'): Promise<boolean> => {
    try {
      // Check if expo-sharing is available
      if (Sharing && Sharing.isAvailableAsync && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, {
          mimeType: uri.endsWith('.html') ? 'text/html' : 'application/pdf',
          dialogTitle: title,
          UTI: 'com.adobe.pdf',
        });
        return true;
      }
      
      // Fallback: Use React Native Share API
      await Share.share({
        url: uri,
        title: title,
        message: title,
      });
      return true;
    } catch (error) {
      return false;
    }
  },

  /**
   * Save PDF to device
   */
  savePDF: async (uri: string, filename: string): Promise<string | null> => {
    try {
      const documentsDir = FileSystem.documentDirectory;
      if (!documentsDir) return null;
      
      const newUri = `${documentsDir}${filename}`;
      
      // Read from source and write to destination
      const content = await FileSystem.readAsStringAsync(uri);
      await FileSystem.writeAsStringAsync(newUri, content);
      
      return newUri;
    } catch (error) {
      return null;
    }
  },

  /**
   * Generate and share Kundli report in one step
   */
  async generateAndShareKundli(data: KundliReportData): Promise<boolean> {
    const uri = await this.generateKundliPDF(data);
    if (uri) {
      return await this.sharePDF(uri, `Kundli Report - ${data.name}`);
    }
    return false;
  },

  /**
   * Generate and share Matching report in one step
   */
  async generateAndShareMatching(data: MatchingReportData): Promise<boolean> {
    const uri = await this.generateMatchingPDF(data);
    if (uri) {
      return await this.sharePDF(uri, `Matching Report - ${data.boyName} & ${data.girlName}`);
    }
    return false;
  },
};

export default PDFReportGenerator;
