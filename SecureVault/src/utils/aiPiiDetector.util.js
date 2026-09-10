/**
 * aiPiiDetector.util.js
 * ─────────────────────────────────────────────────────────────────────
 * AI-Powered PII Detection using OpenAI GPT-4o Vision
 * 
 * Handles image-based documents where traditional OCR fails:
 *   - PAN Cards (ABCDE1234F format)
 *   - Aadhaar Cards (12-digit masked or full)
 *   - Passports, Driving Licenses
 *   - Any scanned document with Indian PII
 * 
 * Falls back to Tesseract OCR if OpenAI key is not configured.
 * ─────────────────────────────────────────────────────────────────────
 */

const fs = require("fs");
const path = require("path");

// ── Supported image MIME types ────────────────────────────────────────────────
const IMAGE_MIME_TYPES = new Set([
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/tiff",
    "image/bmp",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
    "image/x-heic",
    "image/x-heif"
]);

// ── Vision system prompt for PII extraction ───────────────────────────
const PII_SYSTEM_PROMPT = `You are an expert Indian document analysis system specializing in DPDP Act 2023 compliance.
Your job is to analyze document images and extract ALL sensitive personal information (PII) with EXACT spatial bounding boxes.

CRITICAL BOUNDING BOX INSTRUCTIONS:
- You must carefully locate where each element actually is in THIS image.
- Do NOT guess, hallucinate, or output default coordinates.
- All bounding boxes are "box_2d": [ymin, xmin, ymax, xmax] normalized from 0 to 1000 scale:
  ymin = top edge (0 = top of image, 1000 = bottom)
  xmin = left edge (0 = left of image, 1000 = right)
  ymax = bottom edge
  xmax = right edge

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
AADHAAR CARD / LETTER MASKING RULES (DPDP Act 2023 / UIDAI Guidelines)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Populate "maskZones" with ALL of these regions that exist in the image:
1. "PHOTO" – holder photograph (blackout rectangle)
2. "DOB" – Date of Birth text value (e.g. DD/MM/YYYY)
3. "QR_CODE" – QR code square (or multiple QR codes if full letter)
4. "AADHAAR_NUM" – The 12-digit Aadhaar number (format: XXXX XXXX XXXX).
   NOTE: On full Aadhaar letters, the 12-digit number appears in TWO PLACES (in the middle 'Your Aadhaar No.' section AND at the bottom card section). You MUST include a separate "AADHAAR_NUM" zone for EACH occurrence!
   Ensure the xmin and xmax cover the entire 12 digits width generously!

DO NOT mask: Name, Father's Name, Gender — these MUST remain visible.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PAN CARD MASKING RULES:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
1. "PHOTO" – holder photograph
2. "PAN_NUM" – the 10-character PAN number text
3. "DOB" – Date of Birth text value
DO NOT mask: Name, Father's name.

Respond ONLY with a JSON object in this exact format (no markdown code fences, no extra text):
{
  "hasPII": true,
  "types": ["AADHAAR", "DOB", "PHOTO", "QR_CODE"],
  "documentType": "AADHAAR_CARD",
  "findings": [
    { "type": "AADHAAR", "label": "Aadhaar Number", "value": "8562 4468 1627", "masked": "XXXX-XXXX-1627", "confidence": 0.99, "box_2d": [630, 310, 680, 710] },
    { "type": "DOB", "label": "Date of Birth", "value": "04/02/2006", "masked": "**/**/****", "confidence": 0.98, "box_2d": [815, 440, 842, 655] },
    { "type": "NAME", "label": "Name", "value": "Pannir Pruthvi Raj", "masked": "Pannir Pruthvi Raj", "confidence": 0.99, "box_2d": [790, 390, 820, 575] }
  ],
  "maskZones": [
    { "zone": "PHOTO", "label": "Holder Photo", "box_2d": [760, 210, 890, 380] },
    { "zone": "DOB", "label": "Date of Birth", "box_2d": [815, 440, 842, 655] },
    { "zone": "QR_CODE", "label": "QR Code", "box_2d": [450, 580, 700, 800] },
    { "zone": "AADHAAR_NUM", "label": "Aadhaar Number", "box_2d": [630, 310, 680, 710] }
  ],
  "card_box_2d": [50, 20, 950, 980],
  "maskedAadhaar": "XXXX-XXXX-1627",
  "summary": "Aadhaar document with detected sensitive zones"
}`;

// ── OpenAI Vision Analysis ────────────────────────────────────────────────────

/**
 * Analyze an image file using AI Vision (Gemini 2.5 Flash / GPT-4o) for PII detection.
 * @param {string} imagePath - Absolute path to the image file
 * @param {string} mimeType - MIME type of the image
 * @returns {Promise<object>} PII findings object
 */
async function analyzeImageWithAI(imagePath, mimeType) {
    if (!process.env.OPENAI_API_KEY) {
        require("dotenv").config();
    }
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        // No API key — fall back to Tesseract OCR
        console.log("[AI-PII] No OPENAI_API_KEY configured, falling back to Tesseract OCR");
        return null;
    }

    try {
        const { OpenAI } = require("openai");

        // Auto-detect OpenRouter vs direct OpenAI based on key prefix
        const isOpenRouter = apiKey.startsWith("sk-or-");
        const openai = new OpenAI({
            apiKey,
            ...(isOpenRouter && { baseURL: "https://openrouter.ai/api/v1" })
        });
        // google/gemini-2.5-flash excels at spatial 0-1000 bounding box detection on OpenRouter
        const model = isOpenRouter ? "google/gemini-2.5-flash" : "gpt-4o";

        // Read image and encode as base64
        const imageBuffer = fs.readFileSync(imagePath);
        const base64Image = imageBuffer.toString("base64");

        // Map MIME type to OpenAI accepted format
        const imageMediaType = mimeType === "image/jpg" ? "image/jpeg" : mimeType;

        console.log(`[AI-PII] Sending image to AI Vision (${model}) for PII analysis (${Math.round(imageBuffer.length / 1024)}KB)...`);

        const response = await openai.chat.completions.create({
            model,
            max_tokens: 1500,
            messages: [{
                    role: "system",
                    content: PII_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: [{
                            type: "image_url",
                            image_url: {
                                url: `data:${imageMediaType};base64,${base64Image}`
                            }
                        },
                        {
                            type: "text",
                            text: "Analyze this document image for all PII and sensitive personal information. Accurately detect spatial bounding boxes for masking according to UIDAI and DPDP Act rules. Return ONLY the JSON object."
                        }
                    ]
                }
            ]
        });

        const content = response && response.choices && response.choices[0] &&
            response.choices[0].message && response.choices[0].message.content ?
            response.choices[0].message.content.trim() :
            "";
        if (!content) {
            throw new Error("Empty response from GPT-4o");
        }

        // Parse JSON response (strip any markdown code fences if present)
        const jsonStr = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
        const result = JSON.parse(jsonStr);

        console.log(`[AI-PII] GPT-4o detected: hasPII=${result.hasPII}, types=${result.types?.join(",") || "none"}, doc=${result.documentType}`);

        return {
            hasPII: Boolean(result.hasPII),
            types: result.types || [],
            findings: result.findings || [],
            // maskZones: structured redaction zones (PHOTO, DOB, QR_CODE, AADHAAR_NUM)
            // Takes priority over findings for image blackout rectangle placement
            maskZones: result.maskZones || [],
            card_box_2d: result.card_box_2d || null,
            maskedAadhaar: result.maskedAadhaar || null,
            documentType: result.documentType || "UNKNOWN",
            summary: result.summary || "",
            source: "gpt4o-vision"
        };

    } catch (err) {
        console.warn(`[AI-PII] GPT-4o Vision failed: ${err.message}. Falling back to Tesseract OCR.`);
        return null; // Signal to caller to use OCR fallback
    }
}

/**
 * Analyze a text string using GPT-4o for enhanced PII detection.
 * More accurate than regex for edge cases (formatted numbers, OCR artifacts, etc.)
 * @param {string} text - Extracted text content
 * @returns {Promise<object|null>} PII findings or null to use regex fallback
 */
async function analyzeTextWithAI(text) {
    if (!process.env.OPENAI_API_KEY) {
        require("dotenv").config();
    }
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || !text || text.trim().length < 5) return null;

    try {
        const { OpenAI } = require("openai");

        // Auto-detect OpenRouter vs direct OpenAI
        const isOpenRouter = apiKey.startsWith("sk-or-");
        const openai = new OpenAI({
            apiKey,
            ...(isOpenRouter && { baseURL: "https://openrouter.ai/api/v1" })
        });
        const model = isOpenRouter ? "google/gemini-2.5-flash" : "gpt-4o";

        const response = await openai.chat.completions.create({
            model,
            max_tokens: 1024,
            messages: [{
                    role: "system",
                    content: PII_SYSTEM_PROMPT
                },
                {
                    role: "user",
                    content: `Analyze this text for PII:\n\n${text.substring(0, 4000)}\n\nReturn ONLY the JSON object.`
                }
            ]
        });

        const content = response && response.choices && response.choices[0] &&
            response.choices[0].message && response.choices[0].message.content ?
            response.choices[0].message.content.trim() :
            "";
        if (!content) return null;

        const jsonStr = content.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
        const result = JSON.parse(jsonStr);

        return {
            hasPII: Boolean(result.hasPII),
            types: result.types || [],
            findings: result.findings || [],
            maskedAadhaar: result.maskedAadhaar || null,
            documentType: result.documentType || "GENERAL_DOCUMENT",
            summary: result.summary || "",
            source: "gpt4o-mini-text"
        };

    } catch (err) {
        console.warn(`[AI-PII] GPT-4o text analysis failed: ${err.message}`);
        return null;
    }
}

/**
 * Check if AI PII detection is available (API key configured).
 * @returns {boolean}
 */
function isAIEnabled() {
    if (!process.env.OPENAI_API_KEY) {
        require("dotenv").config();
    }
    return Boolean(process.env.OPENAI_API_KEY);
}

/**
 * Check if a MIME type is an image supported for AI Vision analysis.
 * @param {string} mimeType
 * @returns {boolean}
 */
function isImageMimeType(mimeType) {
    return IMAGE_MIME_TYPES.has(mimeType);
}

module.exports = {
    analyzeImageWithAI,
    analyzeTextWithAI,
    isAIEnabled,
    isImageMimeType,
    IMAGE_MIME_TYPES
};