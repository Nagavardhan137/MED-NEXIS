import { Router, type Request, type Response } from 'express';
import mongoose from 'mongoose';
import {
  Patient,
  preferredLanguages,
  type PatientRecord,
} from '../models/Patient';
import { isMongoConnected } from '../database';

const router = Router();
const phonePattern = /^[6-9]\d{9}$/;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validatePatientBody(body: unknown): { data?: PatientRecord; error?: string } {
  if (!isRecord(body)) {
    return { error: 'A patient profile is required.' };
  }

  const fullName = typeof body.fullName === 'string' ? body.fullName.trim() : '';
  const age = body.age;
  const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
  const language = body.language;
  const emergencyContactName =
    typeof body.emergencyContactName === 'string' ? body.emergencyContactName.trim() : '';
  const emergencyContactPhone =
    typeof body.emergencyContactPhone === 'string' ? body.emergencyContactPhone.trim() : '';
  const caregiverSupport = body.caregiverSupport ?? false;

  if (!fullName || fullName.length > 100) {
    return { error: 'Full name is required and must be 100 characters or fewer.' };
  }
  if (typeof age !== 'number' || !Number.isInteger(age) || age < 1 || age > 120) {
    return { error: 'Age must be a whole number between 1 and 120.' };
  }
  if (phone && !phonePattern.test(phone)) {
    return { error: 'Phone must be a valid 10-digit Indian mobile number when provided.' };
  }
  if (
    typeof language !== 'string' ||
    !preferredLanguages.includes(language as (typeof preferredLanguages)[number])
  ) {
    return { error: 'Choose a supported preferred language.' };
  }
  if (emergencyContactName.length > 100) {
    return { error: 'Emergency contact name must be 100 characters or fewer.' };
  }
  if (emergencyContactPhone && !phonePattern.test(emergencyContactPhone)) {
    return { error: 'Emergency contact phone must be a valid 10-digit Indian mobile number.' };
  }
  if (typeof caregiverSupport !== 'boolean') {
    return { error: 'Caregiver support must be a boolean value.' };
  }

  return {
    data: {
      fullName,
      age,
      phone,
      language: language as PatientRecord['language'],
      emergencyContactName,
      emergencyContactPhone,
      caregiverSupport,
    },
  };
}

function serializePatient(patient: PatientRecord & { _id: mongoose.Types.ObjectId }) {
  return {
    id: patient._id.toString(),
    fullName: patient.fullName,
    age: patient.age,
    phone: patient.phone,
    language: patient.language,
    emergencyContactName: patient.emergencyContactName,
    emergencyContactPhone: patient.emergencyContactPhone,
    caregiverSupport: patient.caregiverSupport,
  };
}

function requireMongo(response: Response): boolean {
  if (isMongoConnected()) {
    return true;
  }

  response.status(503).json({ error: 'Patient profile storage is temporarily unavailable.' });
  return false;
}

router.post('/', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }

  const { data, error } = validatePatientBody(request.body);
  if (!data) {
    response.status(400).json({ error });
    return;
  }

  const patient = await Patient.create(data);
  response.status(201).json({ patient: serializePatient(patient) });
});

router.get('/:id', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: 'Patient profile ID is invalid.' });
    return;
  }

  const patient = await Patient.findById(request.params.id).lean();
  if (!patient) {
    response.status(404).json({ error: 'Patient profile was not found.' });
    return;
  }

  response.json({ patient: serializePatient(patient) });
});

router.put('/:id', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: 'Patient profile ID is invalid.' });
    return;
  }

  const { data, error } = validatePatientBody(request.body);
  if (!data) {
    response.status(400).json({ error });
    return;
  }

  const patient = await Patient.findByIdAndUpdate(request.params.id, data, {
    new: true,
    runValidators: true,
    lean: true,
  });
  if (!patient) {
    response.status(404).json({ error: 'Patient profile was not found.' });
    return;
  }

  response.json({ patient: serializePatient(patient) });
});

export default router;
