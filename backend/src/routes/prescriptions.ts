import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import mongoose, { Types } from 'mongoose';
import { isMongoConnected } from '../database';
import { Patient } from '../models/Patient';
import { Prescription, type ReviewedPrescriptionMedicine } from '../models/Prescription';
import { recognizePrescription } from '../services/prescriptionOcr';

const router = Router();
const maxUploadBytes = 8 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: maxUploadBytes, files: 1 },
  fileFilter: (_request, file, callback) => {
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.mimetype)) {
      callback(new Error('Choose a JPEG, PNG, or WebP prescription image.'));
      return;
    }
    callback(null, true);
  },
});

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function matchesImageSignature(file: Express.Multer.File): boolean {
  const bytes = file.buffer;
  if (
    file.mimetype === 'image/jpeg' &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff
  ) {
    return true;
  }
  if (
    file.mimetype === 'image/png' &&
    bytes.length >= 8 &&
    bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
  ) {
    return true;
  }
  return (
    file.mimetype === 'image/webp' &&
    bytes.length >= 12 &&
    bytes.toString('ascii', 0, 4) === 'RIFF' &&
    bytes.toString('ascii', 8, 12) === 'WEBP'
  );
}

function requireMongo(response: Response): boolean {
  if (isMongoConnected()) {
    return true;
  }
  response.status(503).json({ error: 'Prescription storage is temporarily unavailable.' });
  return false;
}

function validateReviewedEntries(value: unknown): ReviewedPrescriptionMedicine[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 50) {
    return null;
  }

  const entries: ReviewedPrescriptionMedicine[] = [];
  for (const item of value) {
    if (!isRecord(item)) {
      return null;
    }
    const fields = ['medicationName', 'dosage', 'frequency', 'timing', 'duration', 'quantity'] as const;
    if (
      fields.some(
        (field) =>
          typeof item[field] !== 'string' ||
          item[field].length > (field === 'timing' ? 200 : 120),
      )
    ) {
      return null;
    }
    const medicationName = (item.medicationName as string).trim();
    if (!medicationName) {
      return null;
    }
    entries.push({
      medicationName,
      dosage: (item.dosage as string).trim(),
      frequency: (item.frequency as string).trim(),
      timing: (item.timing as string).trim(),
      duration: (item.duration as string).trim(),
      quantity: (item.quantity as string).trim(),
    });
  }
  return entries;
}

router.post('/ocr', (request: Request, response: Response, next) => {
  upload.single('prescription')(request, response, (error: unknown) => {
    if (error) {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        response.status(413).json({ error: 'Prescription images must be 8 MB or smaller.' });
        return;
      }
      if (error) {
        response.status(400).json({
          error:
            error instanceof Error
              ? error.message
              : 'The prescription image could not be uploaded.',
        });
        return;
      }
    }
    next();
  });
}, async (request: Request, response: Response) => {
  if (!request.file) {
    response.status(400).json({ error: 'Select a prescription image to process.' });
    return;
  }
  if (!matchesImageSignature(request.file)) {
    response.status(400).json({ error: 'The image contents do not match a supported image type.' });
    return;
  }

  let extracted;
  try {
    extracted = await recognizePrescription(request.file.buffer);
  } catch {
    response.status(503).json({
      error: 'OCR could not process this image. Try a clearer JPEG, PNG, or WebP image.',
    });
    return;
  }

  if (!extracted.originalOcrText) {
    response.status(422).json({
      error: 'No readable text was found. Try a sharper, well-lit image or enter details manually.',
      originalOcrText: '',
    });
    return;
  }

  response.json({ extraction: extracted });
});

router.post('/', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }
  if (!isRecord(request.body)) {
    response.status(400).json({ error: 'A reviewed prescription record is required.' });
    return;
  }

  const patientId = typeof request.body.patientId === 'string' ? request.body.patientId : '';
  const patientName =
    typeof request.body.patientName === 'string' ? request.body.patientName.trim() : '';
  const prescriptionDate =
    typeof request.body.prescriptionDate === 'string'
      ? request.body.prescriptionDate.trim()
      : '';
  const originalOcrText =
    typeof request.body.originalOcrText === 'string' ? request.body.originalOcrText : '';
  const medicines = validateReviewedEntries(request.body.medicines);

  if (!mongoose.isValidObjectId(patientId)) {
    response.status(400).json({ error: 'Patient ID is invalid.' });
    return;
  }
  if (!(await Patient.exists({ _id: patientId }))) {
    response.status(404).json({ error: 'Patient profile was not found.' });
    return;
  }
  if (patientName.length > 100 || prescriptionDate.length > 30) {
    response.status(400).json({ error: 'Prescription metadata exceeds the allowed length.' });
    return;
  }
  if (!originalOcrText.trim() || originalOcrText.length > 30000) {
    response.status(400).json({ error: 'Original OCR text is required and must be 30,000 characters or fewer.' });
    return;
  }
  if (!medicines) {
    response.status(400).json({
      error: 'Provide at least one reviewed medicine with a medication name.',
    });
    return;
  }
  if (request.body.userConfirmed !== true) {
    response.status(400).json({
      error: 'Explicit confirmation that the details were checked against the prescription is required.',
    });
    return;
  }

  const prescription = await Prescription.create({
    patientId: new Types.ObjectId(patientId),
    patientName,
    prescriptionDate,
    originalOcrText,
    medicines,
    userConfirmed: true,
    confirmedAt: new Date(),
  });
  response.status(201).json({
    prescription: {
      id: prescription._id.toString(),
      patientId: prescription.patientId.toString(),
      patientName: prescription.patientName,
      prescriptionDate: prescription.prescriptionDate,
      originalOcrText: prescription.originalOcrText,
      medicines: prescription.medicines,
      userConfirmed: prescription.userConfirmed,
      confirmedAt: prescription.confirmedAt.toISOString(),
      createdAt: prescription.createdAt.toISOString(),
      updatedAt: prescription.updatedAt.toISOString(),
    },
  });
});

export default router;
