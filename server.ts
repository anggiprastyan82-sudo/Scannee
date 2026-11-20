import "dotenv/config";
import express from "express";
import type { Request, Response } from "express";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenAI, Type } from "@google/genai";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const isProduction = process.env.NODE_ENV === "production";

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Server API key is not configured. Please check your GEMINI_API_KEY secret in Settings > Secrets."
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function startServer() {
  const app = express();

  app.use(express.json({ limit: "25mb" }));

  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { imageBase64, mimeType } = req.body as {
        imageBase64?: string;
        mimeType?: string;
      };

      if (!imageBase64 || typeof imageBase64 !== "string") {
        res.status(400).json({ error: "Missing document image data." });
        return;
      }

      const resolvedMimeType =
        typeof mimeType === "string" && mimeType.startsWith("image/")
          ? mimeType
          : "image/jpeg";

      const ai = getAiClient();

      const response = await ai.models.generateContent({
        model: "gemini-4-hydrogen",
        contents: [
          {
            parts: [
              {
                text: `Analyze this document for authenticity and potential manipulation, forgery, or artificial AI alteration.
                Look for:
                1. Visual anomalies: inconsistent typography, mismatched fonts, blurred or irregular logos, compression boundaries around text, alignment flaws, artificial generation artifacts.
                2. Factual and textual integrity: fabricated institutional claims, improbable pricing formulas, references to unverified geopolitical events or wars, forged ministerial signatures or stamps.
                3. Historical/Hoax context: verify whether this matches known circulating misinformation, disinformation circulars, or hoaxes (such as Indonesian fuel price hike / BBM non-subsidi hoaxes citing Danantara/Pertamina or speculative war scenarios).
                4. Official layout compliance: standard corporate identity guidelines of the cited entities versus informal/fabricated templates.
                
                Provide the analysis in strictly valid JSON with this structure:
                {
                  "isGenuine": boolean,
                  "confidence": number,
                  "summary": "Concise factual summary of what the document depicts and whether it is authentic or fabricated",
                  "findings": [
                    { "category": "Visual" | "Factual" | "Institutional" | "Contextual", "description": "Specific evidence discovered", "severity": "low" | "medium" | "high" }
                  ],
                  "verdict": "Clear definitive verdict explaining whether the document should be treated as genuine, modified, or an outright hoax."
                }`,
              },
              {
                inlineData: {
                  data: imageBase64,
                  mimeType: resolvedMimeType,
                },
              },
            ],
          },
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              isGenuine: { type: Type.BOOLEAN },
              confidence: { type: Type.NUMBER },
              summary: { type: Type.STRING },
              findings: {
                type: Type.ARRAY,
                items: {
                  type: Type.OBJECT,
                  properties: {
                    category: { type: Type.STRING },
                    description: { type: Type.STRING },
                    severity: { type: Type.STRING },
                  },
                  required: ["category", "description", "severity"],
                },
              },
              verdict: { type: Type.STRING },
            },
            required: [
              "isGenuine",
              "confidence",
              "summary",
              "findings",
              "verdict",
            ],
          },
          tools: [{ googleSearch: {} }],
        },
      });

      const rawText = (response.text ?? "").trim();
      if (!rawText) {
        res
          .status(502)
          .json({ error: "Empty response received from analysis engine." });
        return;
      }

      const cleanedText = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();

      const parsed = JSON.parse(cleanedText);
      res.json(parsed);
    } catch (err: unknown) {
      console.error("Error in /api/analyze:", err);
      const status =
        typeof err === "object" &&
        err !== null &&
        "status" in err &&
        typeof (err as { status?: unknown }).status === "number"
          ? (err as { status: number }).status
          : 500;
      const message =
        err instanceof Error
          ? err.message
          : "Failed to analyze document on the server.";
      res.status(status >= 400 && status < 600 ? status : 500).json({
        error: message,
      });
    }
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, "dist");
    app.use(express.static(distPath));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
