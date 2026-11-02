import { Request, Response } from 'express';
import {
  generateHumanReadableInterpretation,
  generateCompatibilityAnalysis
} from '../services/chatgptService.js';
import { getDailyHoroscope, parseSign, toPlainText, HoroscopeUnavailableError } from '../services/dailyHoroscopeService.js';

// Generate human-readable birth chart interpretation
export const interpretBirthChart = async (req: Request, res: Response) => {
  try {
    const { birthData } = req.body;

    if (!birthData) {
      return res.status(400).json({
        success: false,
        error: 'Birth data is required'
      });
    }

    const interpretation = await generateHumanReadableInterpretation(birthData);

    res.json({
      success: true,
      data: interpretation
    });
  } catch (error: any) {
    console.error('Interpretation Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate interpretation'
    });
  }
};

// Daily horoscope for a Sun sign: one stored reading per sign per Asia/Kolkata day (see dailyHoroscopeService).
export const generateAIDailyHoroscope = async (req: Request, res: Response) => {
  const sign = parseSign(req.params.sign);
  if (!sign) {
    return res.status(400).json({ success: false, error: 'Unknown zodiac sign' });
  }
  try {
    const h = await getDailyHoroscope(sign);
    // The reading changes at midnight IST, so it must never be served from a browser or CDN cache past that.
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: { ...h, horoscope: toPlainText(h.sections) } });
  } catch (error: any) {
    if (error instanceof HoroscopeUnavailableError) {
      return res.status(503).json({ success: false, code: 'HOROSCOPE_UNAVAILABLE', error: "Today's horoscope is not available right now. Please try again later." });
    }
    console.error('Horoscope Generation Error:', error?.message);
    res.status(500).json({ success: false, error: 'Failed to load the horoscope' });
  }
};

// Generate AI-powered compatibility analysis
export const generateAICompatibility = async (req: Request, res: Response) => {
  try {
    const { sign1, sign2 } = req.query;

    if (!sign1 || !sign2) {
      return res.status(400).json({
        success: false,
        error: 'Both zodiac signs are required'
      });
    }

    const analysis = await generateCompatibilityAnalysis(
      sign1 as string,
      sign2 as string
    );

    res.json({
      success: true,
      data: {
        sign1,
        sign2,
        analysis
      }
    });
  } catch (error: any) {
    console.error('Compatibility Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate compatibility analysis'
    });
  }
};
