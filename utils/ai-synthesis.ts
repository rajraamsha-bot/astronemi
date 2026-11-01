import { KundliData } from './kundli-generator';
import { sendMessage } from '@/services/ai-chatbot-service';
import { isAIFeaturesEnabled } from '@/config/ai-features';
import { Logger } from '@/services/logger';
import { CompatibilityResult } from './compatibility-engine';
import { getLordPlacementString } from './vedic-astrology';

/**
 * AI Astrological Synthesis Service
 * 
 * Takes raw planetary data and converts it into a cohesive,
 * guru-like "Synthetic Reading" that tells a single fluid story.
 */
export async function getSyntheticAstrologyReading(kundli: KundliData): Promise<string> {
  if (!isAIFeaturesEnabled()) {
    return 'AI Guru insights are not available in this version. Please use the detailed chart sections below.';
  }

  try {
    const ak = kundli.charaKarakas?.find(k => k.karakaShort === 'AK');
    const currentDasha = kundli.vimshottariDasha?.[0];
    const yogas = kundli.parasharYogas?.slice(0, 5).map(y => y.name).join(', ');

    // Build the "Deep Context" Planet List
    const planetContext = kundli.planets.map(p => {
      const lordship = getLordPlacementString(p, kundli.ascendant.signIndex);
      const isRetro = p.isRetrograde ? '(Retrograde)' : '';
      const strength = kundli.shadbala?.find(s => s.planet === p.name);
      const strengthText = strength ? `${strength.totalRupas} Rupas (${strength.percentage}%)` : 'Unknown strength';
      return `${p.name}: In ${p.sign} (${p.house}H), rules ${lordship} ${isRetro}. Strength: ${strengthText}`;
    }).join('\n      ');

    // Build the "Aspects" Context
    const aspectContext = kundli.aspects?.directAspects
      .filter(a => a.toPlanet) // Only show aspects on other planets for clarity
      .map(a => `${a.fromPlanet} aspects ${a.toPlanet} (in ${a.toHouse}H)`)
      .slice(0, 10)
      .join('\n      ');

    // Build the "Astrological Fact Sheet" for the AI
    const factSheet = `
      - Name: ${kundli.personalInfo.name}
      - Birth Place: ${kundli.personalInfo.birthPlace}
      - Ascendant (Lagna): ${kundli.ascendant.sign}
      - Atmakaraka (Soul Planet): ${ak?.planet || 'Unknown'}
      
      Planetary Placements & Lordships:
      ${planetContext}
      
      Key Planetary Aspects (Drishti):
      ${aspectContext || 'No major aspects identified'}
      
      Current Cosmic Weather:
      - Current Dasha Period: ${currentDasha?.planet} (starts ${currentDasha?.startDate.toLocaleDateString()})
      - Sade Sati Status: ${kundli.sadeSati?.isActive ? `Yes (${kundli.sadeSati.currentPhase.phase} phase)` : 'No'}
      - Major Yoga Detected: ${yogas || 'None identified'}
    `;

    const prompt = `
      You are a legendary Vedic Astrologer (Shastri). I will provide you with a high-fidelity astrological data sheet for a user.
      
      User Data Context:
      ${factSheet}
      
      Your Task:
      Synthesize these data points into a single, cohesive, and deeply insightful personal reading. 
      
      The Secret of Elite Astrology:
      Don't just list facts. Connect the dots with Planetary Strength (Shadbala)!
      - If a planet is the 10th lord but has very LOW Shadbala, it means the user has the potential for career success but it will require tremendous discipline and effort to manifest.
      - If a planet has HIGH Shadbala (>100%), it dominates the personality and its results will be felt intensely.
      - Contrast the Atmakaraka (soul's deeper mission) with the strongest planet in the chart.
      
      Guidelines:
      1. DO NOT use bullet points or a list format.
      2. Tell a "story" of the person's soul journey, character, and current life phase.
      3. Use a tone that is wise, compassionate, and "guru-like." 
      4. Use modern but respectful language. 
      
      Response should be about 3-4 paragraphs. Start with a traditional Sanskrit greeting.
    `;

    const response = await sendMessage(prompt, [], {
      birthDate: `${kundli.personalInfo.dateTime.year}-${kundli.personalInfo.dateTime.month}-${kundli.personalInfo.dateTime.day}`,
      birthTime: `${kundli.personalInfo.dateTime.hour}:${kundli.personalInfo.dateTime.minute}`,
    });

    return response || "The celestial mirrors are momentarily clouded. Please try again soon.";
  } catch (error) {
    Logger.error('AI Synthesis failed:', error);
    return "The stars are whispering, but I cannot yet hear them clearly. Please try again later.";
  }
}

/**
 * AI Synthesis for Relationship Compatibility
 */
export async function getSoulmateSynthesis(
  boyName: string,
  girlName: string,
  result: CompatibilityResult
): Promise<string> {
  if (!isAIFeaturesEnabled()) {
    return `The cosmic alignment between ${boyName} and ${girlName} suggests a synergy score of ${result.percentage.toFixed(1)}%. AI synthesis is not available in this version; use the Guna Milan and Manglik sections above for the full reading.`;
  }

  const prompt = `
    Act as a wise Vedic Relationship Guru. Analyze the compatibility between ${boyName} and ${girlName}.
    
    Data:
    - Ashtakoot Guna Score: ${result.totalPoints}/36 (${result.percentage.toFixed(1)}%)
    - Manglik Match: ${result.isManglikMatch ? 'Compatible (Neutralized)' : 'Conflict Found'}
    - Expert Advice: ${result.expertAdvice}
    
    Instructions:
    1. Provide a beautiful, 2-paragraph narrative about their "Cosmic Synergy."
    2. Focus on emotional harmony, physical attraction (Yoni), and mental alignment (Maitri).
    3. Use a supportive, spiritual, and professional tone.
    4. Highlight the strongest Gunas.
    5. If there are Doshas (like Nadi or Bhakoot), suggest it as a path for growth rather than a warning.
    
    Output Format: Just the narrative text. No headings.
  `;

  try {
    const response = await sendMessage(prompt, []);
    return response || `The cosmic alignment between ${boyName} and ${girlName} suggests a synergy score of ${result.percentage.toFixed(1)}%. While there are areas for growth, their shared path holds potential for spiritual and mental harmony.`;
  } catch (error) {
    Logger.error('Error generating soulmate synthesis:', error);
    return `The cosmic alignment between ${boyName} and ${girlName} suggests a synergy score of ${result.percentage.toFixed(1)}%. While there are areas for growth, their shared path holds potential for spiritual and mental harmony.`;
  }
}

export default {
  getSyntheticAstrologyReading,
  getSoulmateSynthesis,
};
