/**
 * Legacy Logic Pro — Full-Stack Server Entry Point
 * Express server running on port 3000 with Vite middlewares mounted in dev.
 * Provides server-side Gemini 3.1 Pro Thinking Mode API for session financial advisory.
 */

import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Health check endpoint
  app.get('/api/health', (req: Request, res: Response) => {
    res.json({
      status: 'healthy',
      service: 'Legacy Logic Pro Backend',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // AI Query Endpoint with Gemini 3.1 Pro High Thinking Mode
  app.post('/api/ai/query', async (req: Request, res: Response) => {
    const { query, sessionData, enableAI } = req.body;

    // Hard Gate: guarantee ZERO AI calls if opt-in toggle is false
    if (!enableAI) {
      return res.status(403).json({
        error: 'AI Assistant is disabled for this session. Enable the toggle in the Upload / Session Options panel.',
      });
    }

    if (!query || typeof query !== 'string') {
      return res.status(400).json({ error: 'Query text is required.' });
    }

    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: 'GEMINI_API_KEY environment variable is not configured.' });
      }

      const ai = new GoogleGenAI({ apiKey });

      // Prepare context summary of currently processed session data
      const contextSummary = {
        client: sessionData?.clientName || 'Apex Industrial Gears Pvt Ltd',
        voucherCount: sessionData?.vouchers?.length || 0,
        trialBalance: {
          totalDebit: sessionData?.trialBalance?.total_debit,
          totalCredit: sessionData?.trialBalance?.total_credit,
          isBalanced: sessionData?.trialBalance?.is_balanced,
          imbalanceDiff: sessionData?.trialBalance?.difference,
        },
        gst: {
          outputGst: sessionData?.gst?.total_output_gst,
          inputGst: sessionData?.gst?.total_input_gst,
          netPayable: sessionData?.gst?.net_gst_payable,
          itcEligible: sessionData?.gst?.itc_eligible,
        },
        anomalies: sessionData?.anomalies?.map((a: any) => ({
          title: a.title,
          description: a.description,
          severity: a.severity,
        })) || [],
      };

      const systemPrompt = `
You are an expert Chartered Accountant and senior tax/audit partner in India assisting on the "Legacy Logic Pro" practice management platform.
You are analyzing client accounting data.

Context of currently loaded financial session:
${JSON.stringify(contextSummary, null, 2)}

Requirements:
1. Always format monetary values in the Indian Numbering System (e.g. ₹12,34,567.89, lakhs and crores).
2. Ground all answers strictly in Indian accounting standards, Income Tax Act, 1961, and CGST/SGST Acts.
3. Keep your response professional, precise, structured, and insightful.
4. Conclude with a reminder that answers are advisory working papers and must be verified before statutory filing.
      `.trim();

      const userPrompt = `${systemPrompt}\n\nUser Question: ${query}`;

      const response = await ai.models.generateContent({
        model: 'gemini-3.1-pro-preview',
        contents: userPrompt,
        config: {
          thinkingConfig: {
            thinkingLevel: ThinkingLevel.HIGH,
          },
        },
      });

      const answerText = response.text || 'No response generated from model.';

      return res.json({
        answer: answerText,
        advisory: 'Advisory only. Review against statutory vouchers and source documents before final audit sign-off.',
        modelUsed: 'gemini-3.1-pro-preview',
        thinkingLevel: 'HIGH',
      });
    } catch (err: any) {
      console.error('Gemini API Error:', err);
      return res.status(500).json({
        error: `AI processing failed: ${err.message || 'Internal error'}`,
      });
    }
  });

  // Serve Vite in development or static dist in production
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Legacy Logic Pro server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
