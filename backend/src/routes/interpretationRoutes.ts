import { Router } from 'express';
import {
  interpretBirthChart,
  generateAIDailyHoroscope,
  generateAICompatibility
} from '../controllers/interpretationController.js';
import { chartChat } from '../controllers/chartChatController.js';
import { auth } from "../middleware/authMiddleware.js";

const router = Router();

// POST /api/interpretation/birth-chart - Generate human-readable birth chart interpretation
router.post('/birth-chart', auth('USER'), interpretBirthChart);

// GET /api/interpretation/horoscope/:sign - Generate AI-powered daily horoscope
router.get('/horoscope/:sign', generateAIDailyHoroscope);

// GET /api/interpretation/compatibility - Generate AI-powered compatibility analysis
router.get('/compatibility', auth('USER'), generateAICompatibility);

// POST /api/interpretation/chart-chat - Chat about birth chart
router.post('/chart-chat', auth('USER'), chartChat);

export default router;
