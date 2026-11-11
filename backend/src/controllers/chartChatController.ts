import { OPENROUTER_MODEL } from '../config/aiModels.js';
import { Request, Response } from 'express';
import axios from 'axios';
import { WrongLanguageError, generateInLanguage, languageRule, requestLanguage, tokenBudget } from '../utils/responseLanguage.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const chartChat = async (req: Request, res: Response) => {
  try {
    const { question, birthData } = req.body;
    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;

    if (!OPENROUTER_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'OPENROUTER_API_KEY is not configured'
      });
    }

    if (!question || !birthData) {
      return res.status(400).json({
        success: false,
        error: 'Question and birth data are required'
      });
    }

    // The visitor's chosen language, if any; otherwise Hinglish as before.
    const lang = requestLanguage(req);

    // Create context from birth data
    const context = `
User's Birth Chart Information:
- Sun Sign (Core Identity): ${birthData.sign}
- Moon Sign (Emotions): ${birthData.moon}
- Rising Sign (How Others See You): ${birthData.rising}
- Birth Date: ${birthData.birthDate}
- Birth Time: ${birthData.birthTime}
- Birth Place: ${birthData.birthPlace}

User's Question: ${question}

Please answer the user's question about their birth chart in a helpful, friendly, and personalized way. Use simple language and relate the answer to their specific astrological placements.${languageRule(lang, " Respond in Hinglish (Hindi-English mix) for better relatability.")}
    `;

    const responseText = await generateInLanguage(lang, async (retryNote) => {
      const response = await axios.post(
        `${OPENROUTER_BASE_URL}/chat/completions`,
        {
          model: OPENROUTER_MODEL,
          messages: [
            {
              role: 'system',
              content: 'You are a friendly astrologer who answers questions about birth charts in simple, personalized language. Always relate answers to the user\'s specific astrological placements.'
            },
            {
              role: 'user',
              content: context + retryNote
            }
          ],
          temperature: 0.7,
          max_tokens: tokenBudget(800, lang)
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'http://localhost:8081',
            'X-Title': 'Astrology App'
          }
        }
      );

      return response.data.choices[0].message.content as string;
    });

    res.json({
      success: true,
      data: {
        response: responseText
      }
    });
  } catch (error: any) {
    if (error instanceof WrongLanguageError) return res.status(502).json({ success: false, error: error.message, code: error.code, language: error.language });
    console.error('Chart Chat Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get response'
    });
  }
};
