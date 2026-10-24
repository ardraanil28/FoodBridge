import { GoogleGenAI } from '@google/genai';
import fs from 'node:fs';

const apiKey = process.env.GEMINI_API_KEY;
const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';

let genAI = null;
if (apiKey && apiKey !== 'YOUR_GEMINI_API_KEY_HERE') {
  try {
    genAI = new GoogleGenAI({ apiKey });
  } catch (err) {
    console.warn('Failed to initialize GoogleGenAI:', err.message);
  }
}

/**
 * Deterministic fallback parser for food text when Gemini is unavailable or not configured.
 * Safely extracts quantity, units, and obvious keywords without hallucinating.
 */
function deterministicFallbackParse(text) {
  const lower = text.toLowerCase();
  
  // Try extracting quantity
  let quantity = null;
  const qtyMatch = lower.match(/(\d+(\.\d+)?)/);
  if (qtyMatch) {
    quantity = parseFloat(qtyMatch[1]);
  }

  // Try extracting unit
  let unit = 'portions';
  if (lower.includes('kg') || lower.includes('kilo')) {
    unit = 'kg';
  } else if (lower.includes('packet') || lower.includes('pkt')) {
    unit = 'packets';
  } else if (lower.includes('meal')) {
    unit = 'meals';
  }

  // Dietary class
  let dietary_class = 'unknown';
  if (lower.includes('vegan')) {
    dietary_class = 'vegan';
  } else if (lower.includes('veg') || lower.includes('vegetable') || lower.includes('sadhya') || lower.includes('vegetarian')) {
    dietary_class = 'vegetarian';
  } else if (lower.includes('chicken') || lower.includes('meat') || lower.includes('fish') || lower.includes('non-veg') || lower.includes('beef') || lower.includes('egg')) {
    dietary_class = 'non-vegetarian';
  }

  // Category
  let category = 'cooked_meals';
  if (lower.includes('bread') || lower.includes('cake') || lower.includes('bun') || lower.includes('bakery') || lower.includes('croissant')) {
    category = 'bakery';
  } else if (lower.includes('vegetable') || lower.includes('fruit') || lower.includes('tomato') || lower.includes('onion')) {
    category = 'raw_produce';
  } else if (lower.includes('juice') || lower.includes('water') || lower.includes('tea') || lower.includes('beverage')) {
    category = 'beverages';
  } else if (lower.includes('rice') || lower.includes('curry') || lower.includes('meals') || lower.includes('biryani') || lower.includes('sambar')) {
    category = 'cooked_meals';
  }

  return {
    source: 'deterministic_fallback',
    title: text.length > 50 ? text.substring(0, 47) + '...' : text,
    description: `User description: "${text}"`,
    category,
    quantity: quantity || 10,
    unit,
    dietary_class,
    declared_allergens: [],
    has_unknown_allergens: true,
    storage_info: 'ambient',
    notes_for_user: 'Parsed using offline rule engine. Please review and complete any missing allergen and time details.'
  };
}

export const geminiService = {
  isConfigured() {
    return Boolean(genAI && apiKey);
  },

  /**
   * Parse informal spoken or typed food description (English, Malayalam, Hindi, etc.)
   * Section 15 priority feature.
   */
  async parseFoodDescription(text) {
    if (!text || !text.trim()) {
      throw new Error('Description text is required.');
    }

    if (!genAI) {
      return deterministicFallbackParse(text);
    }

    try {
      const prompt = `
You are an assistant for FoodBridge AI, a surplus food redistribution platform.
A donor provided this informal or spoken food description (which may be in English, Malayalam, Hindi, or Manglish):
"""${text}"""

Extract structured fields as JSON.
GROUND RULES:
- Output valid JSON only, inside a markdown code block or raw JSON object.
- Valid categories: "cooked_meals", "bakery", "raw_produce", "packaged_groceries", "beverages", "other"
- Valid units: "portions", "meals", "kg", "packets"
- Valid dietary classes: "vegetarian", "vegan", "non-vegetarian", "unknown"
- Do NOT invent ingredients, allergens, or preparation times.
- If allergens are not explicitly stated, set declared_allergens to ["unknown"] and has_unknown_allergens to true.
- Never claim food is certified safe.
- Suggest a concise, dignified title and clean description in English.

Required JSON Schema:
{
  "title": string,
  "description": string,
  "category": string,
  "quantity": number,
  "unit": string,
  "dietary_class": string,
  "declared_allergens": string[],
  "has_unknown_allergens": boolean,
  "storage_info": string,
  "preparation_notes": string
}
`;

      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt
      });

      const responseText = response.text || '';
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);

      if (!jsonMatch) {
        return deterministicFallbackParse(text);
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // Normalize fields
      return {
        source: 'gemini_ai',
        title: parsed.title || text.substring(0, 40),
        description: parsed.description || text,
        category: ['cooked_meals', 'bakery', 'raw_produce', 'packaged_groceries', 'beverages', 'other'].includes(parsed.category) ? parsed.category : 'cooked_meals',
        quantity: typeof parsed.quantity === 'number' && parsed.quantity > 0 ? parsed.quantity : 10,
        unit: ['portions', 'meals', 'kg', 'packets'].includes(parsed.unit) ? parsed.unit : 'portions',
        dietary_class: ['vegetarian', 'vegan', 'non-vegetarian', 'unknown'].includes(parsed.dietary_class) ? parsed.dietary_class : 'unknown',
        declared_allergens: Array.isArray(parsed.declared_allergens) ? parsed.declared_allergens : ['unknown'],
        has_unknown_allergens: Boolean(parsed.has_unknown_allergens),
        storage_info: parsed.storage_info || 'ambient',
        notes_for_user: 'Extracted by Gemini AI. Please verify all quantities, dietary tags, and collection deadlines before submitting.'
      };
    } catch (err) {
      console.warn('Gemini API call failed, using deterministic fallback:', err.message);
      return deterministicFallbackParse(text);
    }
  },

  /**
   * Explain verified engine matches in friendly, natural language.
   * Uses only facts provided by the deterministic engine.
   */
  async explainMatch(matchInfo) {
    const baseSummary = matchInfo.reasons.join('. ') + '.';
    if (!genAI) {
      return baseSummary;
    }

    try {
      const prompt = `
Rewrite these verified matching engine facts into 1-2 friendly, empathetic sentences for a food recipient or donor:
Facts:
- Score: ${matchInfo.score}/100
- Contributable: ${matchInfo.contributable_quantity} ${matchInfo.unit}
- Key reasons: ${matchInfo.reasons.join('; ')}
- Warnings: ${matchInfo.warnings.join('; ') || 'None'}

Rules:
- Be clear, concise, and humble.
- Mention locality and dietary match.
- Do NOT make any claims about food safety.
- Return plain text only.
`;
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt
      });
      return response.text.trim();
    } catch {
      return baseSummary;
    }
  },

  /**
   * Generic text generation helper for internal summaries
   */
  async generateSummary(prompt) {
    if (!genAI) return null;
    try {
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt
      });
      return response.text.trim();
    } catch {
      return null;
    }
  },

  /**
   * AI Feature D — Food Waste Insights (Section 15 Feature D)
   * Analyzes real historical donation, request, and collection records
   */
  async analyzeWasteInsights(historyStats) {
    const { totalDonations, totalRequests, totalCollected, categoryStats, localityStats } = historyStats;

    // Check if sufficient historical records exist
    const isDataSufficient = totalDonations >= 5 && totalCollected > 0;

    const baseInsights = {
      isDataSufficient,
      summary: isDataSufficient
        ? `Based on ${totalDonations} food listings and ${totalCollected} confirmed collected portions, the highest recovery velocity occurs in ${localityStats[0]?.area || 'local'} areas.`
        : 'Limited historical handoff data available. Displaying verified descriptive statistics until more distribution cycles are logged.',
      topCategories: categoryStats.slice(0, 3).map(c => ({
        category: c.category.replace('_', ' '),
        available: c.total_available,
        listingsCount: c.count
      })),
      recommendation: isDataSufficient
        ? 'Cooked meals require prompt collection scheduling (< 4 hours) to maintain 90%+ collection rates.'
        : 'Encourage early listing of cooked meals to give community kitchens sufficient transit time.'
    };

    if (!genAI || !isDataSufficient) {
      return baseInsights;
    }

    try {
      const prompt = `
You are a food redistribution data analyst for FoodBridge AI in Kerala.
Analyze these real historical food recovery statistics:
- Total Listings: ${totalDonations}
- Total Community Requests: ${totalRequests}
- Total Confirmed Collected Portions: ${totalCollected}
- Top Categories: ${JSON.stringify(categoryStats)}

Provide a concise 2-sentence objective insight on surplus recovery patterns and 1 practical recommendation for local donors.
Strict rules:
- Do not invent numbers.
- State uncertainty clearly.
- Output valid JSON with keys: "summary" and "recommendation".
`;
      const response = await genAI.models.generateContent({
        model: modelName,
        contents: prompt
      });
      const text = response.text || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        return {
          ...baseInsights,
          summary: parsed.summary || baseInsights.summary,
          recommendation: parsed.recommendation || baseInsights.recommendation
        };
      }
      return baseInsights;
    } catch {
      return baseInsights;
    }
  }
};
