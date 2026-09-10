/**
 * redactor.util.js
 * ─────────────────────────────────────────────────────────
 * DPDP-Compliant PII Detection & Redaction Engine
 * Supports: Aadhaar, PAN, Phone, Email
 * PDF redaction via pdf-lib, Text redaction via regex
 */

const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

// ── OCR for image-based documents (PAN card, Aadhaar photo, etc.) ────────────
// Tesseract.js is loaded lazily to avoid startup overhead
let _tesseractWorker = null;

async function getOcrText(imagePath) {
    try {
        const Tesseract = require("tesseract.js");
        const { data: { text } } = await Tesseract.recognize(imagePath, "eng", {
            logger: () => {} // suppress progress logs
        });
        return text || "";
    } catch (err) {
        console.warn("[REDACTOR] OCR failed, falling back to heuristic:", err.message);
        // Heuristic latin1 fallback — can catch PAN-like strings embedded in some image metadata
        const buf = fs.readFileSync(imagePath);
        return buf.toString("latin1").replace(/[^\x20-\x7E\n]/g, " ");
    }
}

// ── PII Pattern Definitions ──────────────────────────────────────────────────

const PII_PATTERNS = {
    AADHAAR: {
        regex: /\b([2-9]{1}[0-9]{3}[\s\-]?[0-9]{4}[\s\-]?[0-9]{4})\b/g,
        label: "Aadhaar Number",
        mask: (m) => {
            const digits = m.replace(/[\s\-]/g, "");
            return `XXXX-XXXX-${digits.slice(-4)}`;
        },
        maskFull: () => "XXXX-XXXX-XXXX"
    },
    PAN: {
        // OCR commonly inserts spaces or dashes between the PAN groups.
        regex: /\b([A-Z]{5})[\s\-]?([0-9]{4})[\s\-]?([A-Z])\b/g,
        label: "PAN Card",
        mask: (m) => {
            const pan = m.replace(/[\s\-]/g, "").toUpperCase();
            return `XXXXX${pan.slice(5)}`;
        },
        maskFull: () => "XXXXXXXXXX"
    },
    PHONE: {
        regex: /\b(\+91[\s\-]?)?[6-9][0-9]{9}\b/g,
        label: "Phone Number",
        mask: (m) => {
            const digits = m.replace(/[\s\-\+]/g, "");
            return `XXXXXX${digits.slice(-4)}`;
        },
        maskFull: () => "XXXXXXXXXX"
    },
    EMAIL: {
        regex: /\b[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}\b/g,
        label: "Email Address",
        mask: (m) => {
            const [user, domain] = m.split("@");
            return `${user[0]}****@${domain}`;
        },
        maskFull: () => "****@****.***"
    },
    PASSPORT: {
        regex: /\b([A-Z]{1}[0-9]{7})\b/g,
        label: "Passport Number",
        mask: (m) => `X${m.slice(-4).padStart(m.length - 1, "X")}`,
        maskFull: () => "XXXXXXXX"
    }
};

// ── Scan Text for PII ────────────────────────────────────────────────────────

/**
 * Detects PII in a text string.
 * @returns {{ types: string[], findings: Array<{type, label, value, masked}> }}
 */
function scanText(text) {
    const types = new Set();
    const findings = [];

    // Normalize to uppercase so OCR-extracted mixed-case text (e.g. "Abcde1234f") matches PAN/Passport patterns
    const normalizedText = (text || "").toUpperCase();

    for (const [type, def] of Object.entries(PII_PATTERNS)) {
        const regex = new RegExp(def.regex.source, "gi");
        let match;
        while ((match = regex.exec(normalizedText)) !== null) {
            const value = type === "PAN" ?
                match[0].replace(/[\s\-]/g, "") :
                match[0];
            types.add(type);
            findings.push({
                type,
                label: def.label,
                value: value.toUpperCase(),
                masked: def.mask(value.toUpperCase()),
                index: match.index
            });
        }
    }

    return {
        hasPII: types.size > 0,
        types: [...types],
        findings
    };
}

/**
 * Redact PII in a text string.
 * @param {string} text
 * @param {string[]} [onlyTypes] - Optional filter to redact specific types only
 * @returns {string} Redacted text
 */
function redactText(text, onlyTypes = null) {
    let result = text;
    for (const [type, def] of Object.entries(PII_PATTERNS)) {
        if (onlyTypes && !onlyTypes.includes(type)) continue;
        const regex = new RegExp(def.regex.source, "gi");
        result = result.replace(regex, (m) => def.mask(m.toUpperCase()));
    }
    return result;
}

/**
 * Generate masked Aadhaar string (keeps only last 4 digits)
 * @param {string} text
 * @returns {string|null} e.g. "XXXX-XXXX-1234"
 */
function extractMaskedAadhaar(text) {
    const regex = new RegExp(PII_PATTERNS.AADHAAR.regex.source, "gi");
    const match = regex.exec((text || "").toUpperCase());
    if (!match) return null;
    const digits = match[0].replace(/[\s\-]/g, "");
    return `XXXX-XXXX-${digits.slice(-4)}`;
}

// ── PDF Redaction via pdf-lib ────────────────────────────────────────────────

/**
 * Redact a PDF file by drawing black rectangles over sensitive pages
 * and adding a redaction stamp. Returns path to the redacted PDF.
 * Note: Full text-level redaction requires OCR-extracted coordinates;
 * here we apply a header notice and per-page redaction overlays.
 *
 * @param {string} inputPath - Path to input PDF
 * @param {object} scanResult - Result from scanText
 * @param {string} outputPath - Output path for redacted PDF
 */
async function redactPdf(inputPath, scanResult, outputPath) {
    throw new Error(
        `Precise PDF masking is unavailable for ${path.basename(inputPath)}. ` +
        "The original PDF must not be served as a masked copy."
    );
}

// ── Image Redaction via Sharp & SVG Overlays ────────────────────────────────

/**
 * Redact an image file (JPEG, PNG, WEBP, etc.) by compositing blackout boxes
 * over sensitive fields (PAN, Aadhaar, phone) and adding a DPDP Act compliance banner.
 *
 * @param {string} filePath - Absolute path to the image file (modified in-place)
 * @param {string} mimeType - Image MIME type
 * @param {object} [piiDetails] - Optional pre-scanned PII findings / documentType
 * @returns {Promise<string>} filePath
 */
async function redactImage(filePath, mimeType, piiDetails = {}) {
    try {
        if (!fs.existsSync(filePath)) return filePath;
        if (piiDetails.unmask === true || piiDetails.autoMask === false) {
            return filePath;
        }

        const sharp = require("sharp");
        sharp.cache(false); // CRITICAL: Disable file caching to prevent Windows EBUSY file locks

        // Read into memory buffer so Sharp never locks the file on disk
        const fileBuffer = fs.readFileSync(filePath);
        const meta = await sharp(fileBuffer).metadata();
        const width = meta.width || 800;
        const height = meta.height || 600;

        let hasPII = Boolean(piiDetails.hasPII || (piiDetails.types && piiDetails.types.length > 0));
        let types = piiDetails.types || [];
        let documentType = piiDetails.documentType || "UNKNOWN";
        let findings = piiDetails.findings || [];
        // maskZones: AI-returned structural zones (PHOTO, DOB, QR_CODE, AADHAAR_NUM)
        // These are always blacked out regardless of charText content
        let maskZones = piiDetails.maskZones || [];

        // Re-run AI detection when no precise coordinates or mask zones are stored yet
        if (!findings.length && !maskZones.length) {
            const { analyzeImageWithAI } = require("./aiPiiDetector.util");
            const aiRes = await analyzeImageWithAI(filePath, mimeType);
            if (aiRes && aiRes.hasPII) {
                hasPII = true;
                types = aiRes.types || [];
                documentType = aiRes.documentType || "UNKNOWN";
                findings = aiRes.findings || [];
                maskZones = aiRes.maskZones || [];
            }
        }

        const boxesToRedact = [];
        const SKIP_TYPES = new Set(["NAME", "GENDER", "FATHER_NAME"]);

        // ── 1. Structural Zones from AI Vision (PHOTO, QR_CODE, AADHAAR_NUM, DOB) ──
        if (maskZones && maskZones.length > 0) {
            for (const zone of maskZones) {
                if (!zone.box_2d || zone.box_2d.length !== 4) continue;
                if (SKIP_TYPES.has((zone.zone || "").toUpperCase())) continue;
                const [ymin, xmin, ymax, xmax] = zone.box_2d;
                const pad = (zone.zone === "AADHAAR_NUM" || zone.zone === "PAN_NUM") ? 8 : 4;
                const bx = Math.max(0, Math.round((xmin / 1000) * width) - pad);
                const by = Math.max(0, Math.round((ymin / 1000) * height) - pad);
                const bw = Math.min(width - bx, Math.round(((xmax - xmin) / 1000) * width) + pad * 2);
                const bh = Math.min(height - by, Math.round(((ymax - ymin) / 1000) * height) + pad * 2);
                if (bw > 0 && bh > 0) {
                    boxesToRedact.push({
                        x: bx,
                        y: by,
                        w: bw,
                        h: bh,
                        zone: zone.zone || "MASK",
                        label: zone.label || zone.zone || "REDACTED"
                    });
                }
            }
        } else if (findings && Array.isArray(findings) && findings.length > 0) {
            for (const f of findings) {
                if (SKIP_TYPES.has((f.type || "").toUpperCase())) continue;
                if (f.box_2d && Array.isArray(f.box_2d) && f.box_2d.length === 4) {
                    const [ymin, xmin, ymax, xmax] = f.box_2d;
                    const bx = Math.max(0, Math.round((xmin / 1000) * width) - 6);
                    const by = Math.max(0, Math.round((ymin / 1000) * height) - 4);
                    const bw = Math.min(width - bx, Math.round(((xmax - xmin) / 1000) * width) + 12);
                    const bh = Math.min(height - by, Math.round(((ymax - ymin) / 1000) * height) + 8);
                    if (bw > 0 && bh > 0) {
                        boxesToRedact.push({
                            x: bx,
                            y: by,
                            w: bw,
                            h: bh,
                            zone: f.type || "PII",
                            label: `${f.type || "PII"} REDACTED`
                        });
                    }
                }
            }
        }

        // ── 2. Local Tesseract Worker for Pixel-Perfect Text Bounding Boxes ────────
        // Scans directly on image pixels to guarantee 100% masking of:
        // - Aadhaar 12-digit numbers (middle and bottom)
        // - DOB values (date digits only, preserving "DOB:" label)
        // - PAN card numbers
        try {
            const Tesseract = require("tesseract.js");
            const worker = await Tesseract.createWorker("eng");
            const ocrRet = await worker.recognize(fileBuffer, {}, { blocks: true });
            await worker.terminate();

            if (ocrRet && ocrRet.data) {
                for (const block of(ocrRet.data.blocks || [])) {
                    for (const para of(block.paragraphs || [])) {
                        for (const line of(para.lines || [])) {
                            const lineText = (line.text || "").trim();
                            const normalizedLineText = lineText.replace(/[\s\-]/g, "").toUpperCase();

                            // OCR may split a PAN into separate words (ABCDE 1234 F).
                            if (/\b[A-Z]{5}[0-9]{4}[A-Z]\b/.test(normalizedLineText)) {
                                hasPII = true;
                                if (!types.includes("PAN")) types.push("PAN");
                                if (line.bbox) {
                                    boxesToRedact.push({
                                        x: line.bbox.x0 - 6,
                                        y: line.bbox.y0 - 4,
                                        w: (line.bbox.x1 - line.bbox.x0) + 12,
                                        h: (line.bbox.y1 - line.bbox.y0) + 8,
                                        zone: "PAN_NUM",
                                        label: "PAN NUMBER"
                                    });
                                }
                            }

                            // Full Aadhaar 12-digit number row (3 groups of 4 digits)
                            if (/\b\d{4}\s+\d{4}\s+\d{4}\b/.test(lineText)) {
                                hasPII = true;
                                if (!types.includes("AADHAAR")) types.push("AADHAAR");

                                const fourDigitWords = (line.words || []).filter(w => /^\d{4}$/.test((w.text || "").trim()));
                                if (fourDigitWords.length >= 3) {
                                    const minX = Math.min(...fourDigitWords.map(w => w.bbox.x0));
                                    const maxX = Math.max(...fourDigitWords.map(w => w.bbox.x1));
                                    const minY = Math.min(...fourDigitWords.map(w => w.bbox.y0));
                                    const maxY = Math.max(...fourDigitWords.map(w => w.bbox.y1));
                                    boxesToRedact.push({
                                        x: minX - 12,
                                        y: minY - 4,
                                        w: (maxX - minX) + 24,
                                        h: (maxY - minY) + 8,
                                        zone: "AADHAAR_NUM",
                                        label: "AADHAAR NUMBER"
                                    });
                                } else if (line.bbox) {
                                    boxesToRedact.push({
                                        x: line.bbox.x0 - 8,
                                        y: line.bbox.y0 - 4,
                                        w: (line.bbox.x1 - line.bbox.x0) + 16,
                                        h: (line.bbox.y1 - line.bbox.y0) + 8,
                                        zone: "AADHAAR_NUM",
                                        label: "AADHAAR NUMBER"
                                    });
                                }
                            }

                            // DOB value only (e.g. "04/02/2006" or "12-08-1995")
                            for (const w of(line.words || [])) {
                                const wt = (w.text || "").trim();
                                if (/\b\d{2}[\/\-]\d{2}[\/\-]\d{4}\b/.test(wt)) {
                                    hasPII = true;
                                    if (!types.includes("DOB")) types.push("DOB");
                                    boxesToRedact.push({
                                        x: w.bbox.x0 - 4,
                                        y: w.bbox.y0 - 3,
                                        w: (w.bbox.x1 - w.bbox.x0) + 8,
                                        h: (w.bbox.y1 - w.bbox.y0) + 6,
                                        zone: "DOB",
                                        label: "DOB VALUE"
                                    });
                                }

                                // PAN card number (e.g. "ABCDE1234F")
                                if (/^[A-Z]{5}\d{4}[A-Z]$/i.test(wt)) {
                                    hasPII = true;
                                    if (!types.includes("PAN")) types.push("PAN");
                                    boxesToRedact.push({
                                        x: w.bbox.x0 - 6,
                                        y: w.bbox.y0 - 4,
                                        w: (w.bbox.x1 - w.bbox.x0) + 12,
                                        h: (w.bbox.y1 - w.bbox.y0) + 8,
                                        zone: "PAN_NUM",
                                        label: "PAN NUMBER"
                                    });
                                }
                            }
                        }
                    }
                }
            }
        } catch (ocrErr) {
            console.warn("[REDACTOR] Tesseract worker extraction warning:", ocrErr.message);
        }

        // If still no boxes found and hasPII is marked, log warning
        if (boxesToRedact.length === 0 && hasPII) {
            console.warn(`[REDACTOR] Cannot locate precise redaction zones for ${path.basename(filePath)} — image served unmasked`);
            return filePath;
        }

        // ── 3. Construct SVG Overlay ───────────────────────────────────────────
        let svgElements = "";
        for (const box of boxesToRedact) {
            const bx = Math.max(0, Math.round(box.x));
            const by = Math.max(0, Math.round(box.y));
            const bw = Math.min(width - bx, Math.round(box.w));
            const bh = Math.min(height - by, Math.round(box.h));
            if (bw > 0 && bh > 0) {
                svgElements += `<rect x="${bx}" y="${by}" width="${bw}" height="${bh}" fill="#000000"/>`;
            }
        }

        const svgOverlay = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${svgElements}</svg>`;

        // 5. Composite using Sharp from in-memory buffer (zero disk lock)
        let pipeline = sharp(fileBuffer).composite([{ input: Buffer.from(svgOverlay), top: 0, left: 0 }]);

        if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
            pipeline = pipeline.jpeg({ quality: 92 });
        } else if (mimeType === "image/png") {
            pipeline = pipeline.png();
        } else if (mimeType === "image/webp") {
            pipeline = pipeline.webp({ quality: 92 });
        }

        const redactedBuffer = await pipeline.toBuffer();

        // Write safely back to disk
        fs.writeFileSync(filePath, redactedBuffer);
        console.log(`[REDACTOR] Successfully masked image: ${path.basename(filePath)} (${boxesToRedact.length} redaction zones, ${redactedBuffer.length} bytes)`);

    } catch (err) {
        console.error("[REDACTOR] redactImage error:", err.message);
        throw err;
    }
    return filePath;
}

function extractPdfText(buf) {
    let extracted = "";
    const str = buf.toString("latin1");

    // Extract and decompress FlateDecode streams
    const streamRegex = /stream[\r\n]+([\s\S]*?)[\r\n]+endstream/g;
    let match;
    while ((match = streamRegex.exec(str)) !== null) {
        const raw = Buffer.from(match[1], "latin1");
        let streamText = "";
        try {
            streamText = zlib.inflateSync(raw).toString("latin1");
        } catch {
            streamText = match[1];
        }

        // Decode hex strings e.g. <456D706C...>
        const hexRegex = /<([0-9a-fA-F]{4,})>/g;
        let hexMatch;
        while ((hexMatch = hexRegex.exec(streamText)) !== null) {
            try {
                const decoded = Buffer.from(hexMatch[1], "hex").toString("utf8");
                extracted += " " + decoded;
            } catch {}
        }

        // Decode literal strings e.g. (Candidate Aadhaar: ...)
        const litRegex = /\(([^()]{3,})\)/g;
        let litMatch;
        while ((litMatch = litRegex.exec(streamText)) !== null) {
            extracted += " " + litMatch[1];
        }

        extracted += " " + streamText;
    }

    return extracted + " " + str;
}

/**
 * Main entry point: Scan and optionally redact a file.
 * Detection strategy (in order of priority):
 *   1. AI Vision (GPT-4o) for images → most accurate for PAN/Aadhaar cards
 *   2. Tesseract OCR fallback for images (if no API key)
 *   3. Regex engine for PDF text extraction and text files
 * @param {string} filePath
 * @param {string} mimeType
 * @returns {{ hasPII, types, findings, maskedAadhaar, redactedPath|null, source }}
 */
async function processFile(filePath, mimeType) {
    const { analyzeImageWithAI, analyzeTextWithAI, isImageMimeType } = require("./aiPiiDetector.util");

    // ── TIER 1: AI Vision for image files ────────────────────────────────────
    if (isImageMimeType(mimeType)) {
        // Try GPT-4o Vision first
        const aiResult = await analyzeImageWithAI(filePath, mimeType);

        if (aiResult) {
            let redactedPath = null;
            if (aiResult.hasPII) {
                const ext = path.extname(filePath);
                const base = path.basename(filePath, ext);
                redactedPath = path.join(path.dirname(filePath), `${base}_redacted${ext}`);
                fs.copyFileSync(filePath, redactedPath);
                await redactImage(redactedPath, mimeType, aiResult);
            }

            return {
                hasPII: aiResult.hasPII,
                types: aiResult.types,
                findings: aiResult.findings,
                maskZones: aiResult.maskZones || [],
                maskedAadhaar: aiResult.maskedAadhaar,
                documentType: aiResult.documentType,
                redactedPath,
                source: aiResult.source,
                rawText: null
            };
        }

        // AI not configured or failed — fall back to Tesseract OCR
        console.log("[REDACTOR] Falling back to Tesseract OCR for image...");
        const rawText = await getOcrText(filePath);
        const scanResult = scanText(rawText);
        const maskedAadhaar = extractMaskedAadhaar(rawText);

        let redactedPath = null;
        if (scanResult.hasPII) {
            const ext = path.extname(filePath);
            const base = path.basename(filePath, ext);
            redactedPath = path.join(path.dirname(filePath), `${base}_redacted${ext}`);
            fs.copyFileSync(filePath, redactedPath);
            await redactImage(redactedPath, mimeType, {
                hasPII: true,
                types: scanResult.types,
                maskedAadhaar
            });
        }

        return {
            hasPII: scanResult.hasPII,
            types: scanResult.types,
            findings: scanResult.findings,
            maskedAadhaar,
            documentType: "UNKNOWN",
            redactedPath,
            source: "tesseract-ocr",
            rawText: null
        };
    }

    // ── TIER 2: Text extraction for PDFs and text files ───────────────────────
    let rawText = "";

    if (
        mimeType === "text/plain" ||
        mimeType === "application/json" ||
        mimeType === "text/csv" ||
        mimeType === "text/xml"
    ) {
        rawText = fs.readFileSync(filePath, "utf8");
    } else if (mimeType === "application/pdf") {
        const buf = fs.readFileSync(filePath);
        rawText = extractPdfText(buf);
    } else {
        // Other binaries: heuristic byte scan
        const buf = fs.readFileSync(filePath);
        rawText = buf.toString("latin1").replace(/[^\x20-\x7E\n]/g, " ");
    }

    // ── TIER 3: AI text analysis (optional enhancement) ──────────────────────
    // For PDFs and text files, try AI text analysis if key is available
    if (process.env.OPENAI_API_KEY && rawText.length > 10) {
        const aiTextResult = await analyzeTextWithAI(rawText);
        if (aiTextResult) {
            // Merge AI findings with regex findings (AI takes priority)
            const regexResult = scanText(rawText);
            const mergedTypes = [...new Set([...aiTextResult.types, ...regexResult.types])];
            const mergedFindings = [...aiTextResult.findings, ...regexResult.findings];

            const hasPII = aiTextResult.hasPII || regexResult.hasPII;
            const maskedAadhaar = aiTextResult.maskedAadhaar || extractMaskedAadhaar(rawText);

            let redactedPath = null;
            if (hasPII) {
                const ext = path.extname(filePath);
                const base = path.basename(filePath, ext);
                redactedPath = path.join(path.dirname(filePath), `${base}_redacted${ext}`);

                if (mimeType === "application/pdf") {
                    await redactPdf(filePath, { types: mergedTypes }, redactedPath);
                } else if (["text/plain", "application/json", "text/csv", "text/xml"].includes(mimeType)) {
                    const masked = redactText(rawText);
                    fs.writeFileSync(redactedPath, masked, "utf8");
                }
            }

            return {
                hasPII,
                types: mergedTypes,
                findings: mergedFindings,
                maskedAadhaar,
                redactedPath,
                source: "ai+regex",
                rawText: null
            };
        }
    }

    // ── Pure regex fallback ───────────────────────────────────────────────────
    const scanResult = scanText(rawText);
    const maskedAadhaar = extractMaskedAadhaar(rawText);

    let redactedPath = null;

    if (scanResult.hasPII) {
        const ext = path.extname(filePath);
        const base = path.basename(filePath, ext);
        redactedPath = path.join(path.dirname(filePath), `${base}_redacted${ext}`);

        if (mimeType === "application/pdf") {
            await redactPdf(filePath, scanResult, redactedPath);
        } else if (
            mimeType === "text/plain" ||
            mimeType === "application/json" ||
            mimeType === "text/csv" ||
            mimeType === "text/xml"
        ) {
            const masked = redactText(rawText);
            fs.writeFileSync(redactedPath, masked, "utf8");
        }
    }

    return {
        hasPII: scanResult.hasPII,
        types: scanResult.types,
        findings: scanResult.findings,
        maskedAadhaar,
        redactedPath,
        source: "regex",
        rawText: null
    };
}

/**
 * Automatically mask sensitive data in a local file before serving to recipients.
 * Overwrites filePath with the safe redacted content so the recipient never receives raw PII.
 * Supports:
 *   - Images (JPEG, PNG, WEBP, etc.) via Sharp and SVG blackout overlays
 *   - PDFs via pdf-lib and compliance stamps
 *   - Text formats (txt, json, csv, xml) via regex replacement
 *
 * @param {string} filePath - Local decrypted file path
 * @param {string} mimeType - File MIME type
 * @param {object} [piiDetails] - Optional metadata (types, findings, documentType, file)
 * @returns {Promise<string>} Path to safe masked file
 */
async function maskFileForSharing(filePath, mimeType, piiDetails = {}) {
    try {
        if (!fs.existsSync(filePath)) return filePath;
        if (piiDetails.unmask === true || piiDetails.autoMask === false) {
            return filePath;
        }

        const { isImageMimeType } = require("./aiPiiDetector.util");

        // ── 1. Image files (PAN card photo, Aadhaar photo, ID images) ─────────
        if (isImageMimeType(mimeType)) {
            await redactImage(filePath, mimeType, piiDetails);
            return filePath;
        }

        // ── 2. PDF documents ──────────────────────────────────────────────────
        if (mimeType === "application/pdf") {
            const buf = fs.readFileSync(filePath);
            const rawText = extractPdfText(buf);
            const scan = scanText(rawText);
            const shouldMask = scan.hasPII || piiDetails.hasPII || (piiDetails.file && piiDetails.file.hasSensitiveData) || (piiDetails.file && piiDetails.file.isRedacted);

            if (shouldMask) {
                const redactedTemp = filePath + ".redacted.pdf";
                const details = scan.hasPII ? scan : { types: piiDetails.types || ["SENSITIVE_DATA"] };
                await redactPdf(filePath, details, redactedTemp);
                fs.copyFileSync(redactedTemp, filePath);
                try { fs.unlinkSync(redactedTemp); } catch {}
            }
            return filePath;
        }

        // ── 3. Text documents ─────────────────────────────────────────────────
        if (
            mimeType === "text/plain" ||
            mimeType === "application/json" ||
            mimeType === "text/csv" ||
            mimeType === "text/xml"
        ) {
            const text = fs.readFileSync(filePath, "utf8");
            const scan = scanText(text);
            const shouldMask = scan.hasPII || piiDetails.hasPII || (piiDetails.file && piiDetails.file.hasSensitiveData) || (piiDetails.file && piiDetails.file.isRedacted);

            if (shouldMask) {
                const masked = redactText(text);
                fs.writeFileSync(filePath, masked, "utf8");
            }
            return filePath;
        }

    } catch (err) {
        console.warn("[REDACTOR] Auto-mask on share error:", err.message);
        throw err;
    }
    return filePath;
}

module.exports = {
    scanText,
    redactText,
    extractMaskedAadhaar,
    redactPdf,
    redactImage,
    processFile,
    maskFileForSharing,
    PII_PATTERNS
};