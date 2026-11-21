import { Request, Response } from 'express';
import {
  generateHumanReadableInterpretation,
  generateCompatibilityAnalysis
} from '../services/chatgptService.js';
import { WrongLanguageError, requestLanguage } from '../utils/responseLanguage.js';
import { getWeeklyHoroscope, WeeklyInvalidResponseError } from '../services/weeklyHoroscopeService.js';
import { getDailyHoroscope, parseSign, toPlainText, HoroscopeUnavailableError } from '../services/dailyHoroscopeService.js';
import { getExecutionId, reserveToolExecution, settleToolExecution, releaseToolExecution } from '../modules/payment/toolBilling.service.js';
import { TOOL_KEYS } from '../modules/payment/toolKeys.js';
import { ApiError } from '../utils/ApiError.js';
import { logError } from '../utils/safeError.js';

// Generate human-readable birth chart interpretation
export const interpretBirthChart = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const executionId = getExecutionId(req);
  let billed: Awaited<ReturnType<typeof reserveToolExecution>> | null = null;

  try {
    const { birthData } = req.body;

    if (!birthData) {
      return res.status(400).json({
        success: false,
        error: 'Birth data is required'
      });
    }

    if (userId) {
      billed = await reserveToolExecution(userId, TOOL_KEYS.INTERP_BIRTH_CHART, executionId);
      if (billed.alreadySettled) {
        return res.json({ success: true, data: billed.execution!.resultPayload });
      }
    }

    // NOTE: generateHumanReadableInterpretation silently returns mock data on an OpenRouter 402
    // (payment-required) instead of throwing — it has no way to tell this caller whether the
    // result was real AI output or the mock fallback. Until that function is refactored to expose
    // its source explicitly, a 402-triggered mock reading is settled as if it were real AI output.
    // Low risk today since this toolKey has no active price yet; flagged for a fast-follow once
    // pricing for this operation is actually approved and activated.
    const interpretation = await generateHumanReadableInterpretation(birthData, requestLanguage(req));

    if (userId && billed && !billed.skip) await settleToolExecution(executionId, interpretation);
    res.json({
      success: true,
      data: interpretation
    });
  } catch (error: any) {
    if (userId && billed && !billed.skip) await releaseToolExecution(executionId, "FAILED").catch(() => {});
    if (error instanceof ApiError) return res.status(error.statusCode).json({ success: false, error: error.message });
    if (error instanceof WrongLanguageError) return res.status(502).json({ success: false, error: error.message, code: error.code, language: error.language });
    logError('Interpretation Error:', error);
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

// Weekly horoscope for a Sun sign: one stored reading per sign per Monday-Sunday week (Asia/Kolkata).
export const generateAIWeeklyHoroscope = async (req: Request, res: Response) => {
  const sign = parseSign(req.params.sign);
  if (!sign) {
    return res.status(400).json({ success: false, error: 'Unknown zodiac sign' });
  }
  try {
    const h = await getWeeklyHoroscope(sign);
    // The week rolls over at midnight IST on Monday, so this must not be cached past that.
    res.setHeader('Cache-Control', 'no-store');
    res.json({ success: true, data: h });
  } catch (error: any) {
    // Each cause gets its own code so the page can say what is actually wrong. Nothing is ever substituted for a missing reading.
    if (error instanceof WeeklyInvalidResponseError) {
      return res.status(502).json({ success: false, code: 'HOROSCOPE_INVALID', error: 'The weekly horoscope could not be completed. Please try again.' });
    }
    if (error instanceof HoroscopeUnavailableError) {
      return res.status(503).json({ success: false, code: 'HOROSCOPE_UNAVAILABLE', error: "This week's horoscope is not available right now. Please try again later." });
    }
    if (error?.code === 'P2021' || error?.code === 'P2022') {
      // The weekly_horoscopes table (or a column) is missing: the database migration has not been applied.
      console.error('Weekly horoscope: the database is missing the weekly_horoscopes table. Apply migration 20261121090000_add_weekly_horoscopes. Prisma code:', error.code);
      return res.status(503).json({ success: false, code: 'WEEKLY_NOT_READY', error: 'Weekly horoscopes are being set up. Please try again soon.' });
    }
    console.error('Weekly Horoscope Error:', error?.code ?? error?.message);
    res.status(500).json({ success: false, code: 'WEEKLY_FAILED', error: 'Failed to load the weekly horoscope' });
  }
};

// Generate AI-powered compatibility analysis
export const generateAICompatibility = async (req: Request, res: Response) => {
  const userId = req.user?.id;
  const executionId = getExecutionId(req);
  let billed: Awaited<ReturnType<typeof reserveToolExecution>> | null = null;

  try {
    const { sign1, sign2 } = req.query;

    if (!sign1 || !sign2) {
      return res.status(400).json({
        success: false,
        error: 'Both zodiac signs are required'
      });
    }

    if (userId) {
      billed = await reserveToolExecution(userId, TOOL_KEYS.INTERP_COMPAT, executionId);
      if (billed.alreadySettled) {
        return res.json({ success: true, data: billed.execution!.resultPayload });
      }
    }

    const analysis = await generateCompatibilityAnalysis(
      sign1 as string,
      sign2 as string,
      requestLanguage(req)
    );
    const data = { sign1, sign2, analysis };

    if (userId && billed && !billed.skip) await settleToolExecution(executionId, data);
    res.json({ success: true, data });
  } catch (error: any) {
    if (userId && billed && !billed.skip) await releaseToolExecution(executionId, "FAILED").catch(() => {});
    if (error instanceof ApiError) return res.status(error.statusCode).json({ success: false, error: error.message });
    if (error instanceof WrongLanguageError) return res.status(502).json({ success: false, error: error.message, code: error.code, language: error.language });
    logError('Compatibility Analysis Error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate compatibility analysis'
    });
  }
};
