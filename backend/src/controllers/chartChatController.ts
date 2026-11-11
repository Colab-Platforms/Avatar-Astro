import { OPENROUTER_MODEL } from '../config/aiModels.js';
import { Request, Response } from 'express';
import axios from 'axios';
import { getExecutionId, reserveToolExecution, settleToolExecution, releaseToolExecution } from '../modules/payment/toolBilling.service.js';
import { TOOL_KEYS } from '../modules/payment/toolKeys.js';
import { ApiError } from '../utils/ApiError.js';

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1';

export const chartChat = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const executionId = getExecutionId(req);
  let billed: Awaited<ReturnType<typeof reserveToolExecution>> | null = null;

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

    if (userId) {
      billed = await reserveToolExecution(userId, TOOL_KEYS.INTERP_CHART_CHAT, executionId);
      if (billed.alreadySettled) {
        return res.json({ success: true, data: billed.execution!.resultPayload });
      }
    }

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

Please answer the user's question about their birth chart in a helpful, friendly, and personalized way. Use simple language and relate the answer to their specific astrological placements. Respond in Hinglish (Hindi-English mix) for better relatability.
    `;

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
            content: context
          }
        ],
        temperature: 0.7,
        max_tokens: 800
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

    const responseText = response.data.choices[0].message.content;
    const data = { response: responseText };

    if (userId && billed && !billed.skip) await settleToolExecution(executionId, data);
    res.json({ success: true, data });
  } catch (error: any) {
    if (userId && billed && !billed.skip) await releaseToolExecution(executionId, "FAILED").catch(() => {});
    if (error instanceof ApiError) return res.status(error.statusCode).json({ success: false, error: error.message });
    console.error('Chart Chat Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get response'
    });
  }
};
