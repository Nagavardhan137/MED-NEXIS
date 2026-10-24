import { createWorker } from 'tesseract.js';

export interface ExtractedPrescriptionMedicine {
  sourceText: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  quantity: string;
  needsManualReview: string[];
}

export interface ExtractedPrescription {
  originalOcrText: string;
  patientName: string;
  prescriptionDate: string;
  medicines: ExtractedPrescriptionMedicine[];
  confidence: number | null;
}

const dosePattern = /\b\d+(?:\.\d+)?\s*(?:mg|mcg|g|ml|mL|units?|iu)\b/i;
const frequencyPattern =
  /\b(?:once|twice|thrice)\s+(?:a\s+)?(?:day|daily)|\b(?:OD|BD|BID|TDS|TID|QID|HS|SOS)\b/i;
const timingPattern = /\b(?:before|after|with)\s+(?:food|meal|meals)|\b(?:morning|afternoon|evening|night|bedtime)\b/i;
const durationPattern = /\bfor\s+\d+\s*(?:days?|weeks?|months?)\b/i;
const quantityPattern = /\b(?:qty|quantity)\s*[:=-]?\s*\d+\b/i;

function extractLabeledValue(text: string, label: RegExp): string {
  const match = text.match(label);
  return match?.[1]?.trim() ?? '';
}

function extractMedicineCandidates(text: string): ExtractedPrescriptionMedicine[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^\d{1,2}[.)]\s+\S/.test(line))
    .slice(0, 20)
    .map((sourceText) => {
      const line = sourceText.replace(/^\d{1,2}[.)]\s+/, '').trim();
      const dosage = line.match(dosePattern)?.[0] ?? '';
      const frequency = line.match(frequencyPattern)?.[0] ?? '';
      const timing = line.match(timingPattern)?.[0] ?? '';
      const duration = line.match(durationPattern)?.[0] ?? '';
      const quantity = line.match(quantityPattern)?.[0]?.match(/\d+/)?.[0] ?? '';
      const medicationName = dosage
        ? line.slice(0, line.search(dosePattern)).replace(/[\s,;:-]+$/, '').trim()
        : '';

      return {
        sourceText,
        medicationName,
        dosage,
        frequency,
        timing,
        duration,
        quantity,
        needsManualReview: [
          'medicationName',
          'dosage',
          'frequency',
          'timing',
          'duration',
          'quantity',
        ],
      };
    });
}

export function extractPrescriptionFields(
  originalOcrText: string,
  confidence: number | null,
): ExtractedPrescription {
  const patientName = extractLabeledValue(
    originalOcrText,
    /^(?:patient(?:\s+name)?|name)\s*[:\-]\s*(.+)$/im,
  );
  const rawDate = extractLabeledValue(
    originalOcrText,
    /^(?:prescription\s+date|date)\s*[:\-]\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[/-]\d{1,2}[/-]\d{2,4})\b/im,
  );

  return {
    originalOcrText,
    patientName,
    prescriptionDate: rawDate,
    medicines: extractMedicineCandidates(originalOcrText),
    confidence,
  };
}

export async function recognizePrescription(image: Buffer): Promise<ExtractedPrescription> {
  const worker = await createWorker('eng');
  try {
    const {
      data: { text, confidence },
    } = await worker.recognize(image);
    return extractPrescriptionFields(text.trim(), Number.isFinite(confidence) ? confidence : null);
  } finally {
    await worker.terminate();
  }
}
