import { Router, type Request, type Response } from 'express';
import mongoose, { Types } from 'mongoose';
import { isMongoConnected } from '../database';
import { Medication, type MedicationRecord } from '../models/Medication';
import { Patient } from '../models/Patient';

const router = Router();

type MedicationInput = Omit<MedicationRecord, 'patientId' | 'createdAt' | 'updatedAt'> & {
  patientId: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function validateMedicationBody(body: unknown): { data?: MedicationInput; error?: string } {
  if (!isRecord(body)) {
    return { error: 'A medication record is required.' };
  }

  const patientId = typeof body.patientId === 'string' ? body.patientId.trim() : '';
  const medicationName =
    typeof body.medicationName === 'string' ? body.medicationName.trim() : '';
  const dosage = typeof body.dosage === 'string' ? body.dosage.trim() : '';
  const frequency = typeof body.frequency === 'string' ? body.frequency.trim() : '';
  const scheduledTimes = body.scheduledTimes;
  const startDate = typeof body.startDate === 'string' ? body.startDate : '';
  const endDate = typeof body.endDate === 'string' ? body.endDate : undefined;
  const refillQuantity = body.refillQuantity;
  const remainingQuantity = body.remainingQuantity;

  if (!mongoose.isValidObjectId(patientId)) {
    return { error: 'Patient ID is invalid.' };
  }
  if (!medicationName || medicationName.length > 120) {
    return { error: 'Medication name is required and must be 120 characters or fewer.' };
  }
  if (!dosage || dosage.length > 120) {
    return { error: 'Dosage is required and must be 120 characters or fewer.' };
  }
  if (!frequency || frequency.length > 120) {
    return { error: 'Frequency is required and must be 120 characters or fewer.' };
  }
  if (
    !Array.isArray(scheduledTimes) ||
    scheduledTimes.length === 0 ||
    scheduledTimes.length > 24 ||
    !scheduledTimes.every(
      (time) => typeof time === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(time),
    )
  ) {
    return { error: 'Provide one or more scheduled times in HH:mm format.' };
  }
  if (!isCalendarDate(startDate)) {
    return { error: 'Start date must be a valid YYYY-MM-DD date.' };
  }
  if (endDate !== undefined && (!isCalendarDate(endDate) || endDate < startDate)) {
    return { error: 'End date must be a valid date on or after the start date.' };
  }
  if (
    refillQuantity !== undefined &&
    (!Number.isInteger(refillQuantity) || (refillQuantity as number) < 0)
  ) {
    return { error: 'Refill quantity must be a non-negative whole number.' };
  }
  if (
    remainingQuantity !== undefined &&
    (!Number.isInteger(remainingQuantity) || (remainingQuantity as number) < 0)
  ) {
    return { error: 'Remaining quantity must be a non-negative whole number.' };
  }

  return {
    data: {
      patientId,
      medicationName,
      dosage,
      frequency,
      scheduledTimes: scheduledTimes as string[],
      startDate,
      ...(endDate ? { endDate } : {}),
      ...(refillQuantity !== undefined ? { refillQuantity: refillQuantity as number } : {}),
      ...(remainingQuantity !== undefined
        ? { remainingQuantity: remainingQuantity as number }
        : {}),
    },
  };
}

function serializeMedication(medication: {
  _id: Types.ObjectId;
  patientId: Types.ObjectId;
  medicationName: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  startDate: string;
  endDate?: string;
  refillQuantity?: number;
  remainingQuantity?: number;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: medication._id.toString(),
    patientId: medication.patientId.toString(),
    medicationName: medication.medicationName,
    dosage: medication.dosage,
    frequency: medication.frequency,
    scheduledTimes: medication.scheduledTimes,
    startDate: medication.startDate,
    ...(medication.endDate ? { endDate: medication.endDate } : {}),
    ...(medication.refillQuantity !== undefined
      ? { refillQuantity: medication.refillQuantity }
      : {}),
    ...(medication.remainingQuantity !== undefined
      ? { remainingQuantity: medication.remainingQuantity }
      : {}),
    createdAt: medication.createdAt.toISOString(),
    updatedAt: medication.updatedAt.toISOString(),
  };
}

function requireMongo(response: Response): boolean {
  if (isMongoConnected()) {
    return true;
  }

  response.status(503).json({ error: 'Medication storage is temporarily unavailable.' });
  return false;
}

router.post('/', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }

  const { data, error } = validateMedicationBody(request.body);
  if (!data) {
    response.status(400).json({ error });
    return;
  }
  if (!(await Patient.exists({ _id: data.patientId }))) {
    response.status(404).json({ error: 'Patient profile was not found.' });
    return;
  }

  const medication = await Medication.create({
    ...data,
    patientId: new Types.ObjectId(data.patientId),
  });
  response.status(201).json({ medication: serializeMedication(medication) });
});

router.get('/patient/:patientId', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }
  const { patientId } = request.params;
  if (!mongoose.isValidObjectId(patientId)) {
    response.status(400).json({ error: 'Patient ID is invalid.' });
    return;
  }

  const medications = await Medication.find({ patientId })
    .sort({ createdAt: -1 })
    .lean();
  response.json({ medications: medications.map(serializeMedication) });
});

router.get('/:id', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: 'Medication ID is invalid.' });
    return;
  }

  const medication = await Medication.findById(request.params.id).lean();
  if (!medication) {
    response.status(404).json({ error: 'Medication was not found.' });
    return;
  }

  response.json({ medication: serializeMedication(medication) });
});

router.put('/:id', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: 'Medication ID is invalid.' });
    return;
  }

  const { data, error } = validateMedicationBody(request.body);
  if (!data) {
    response.status(400).json({ error });
    return;
  }
  if (!(await Patient.exists({ _id: data.patientId }))) {
    response.status(404).json({ error: 'Patient profile was not found.' });
    return;
  }

  const medication = await Medication.findByIdAndUpdate(
    request.params.id,
    { ...data, patientId: new Types.ObjectId(data.patientId) },
    { new: true, runValidators: true, lean: true },
  );
  if (!medication) {
    response.status(404).json({ error: 'Medication was not found.' });
    return;
  }

  response.json({ medication: serializeMedication(medication) });
});

router.delete('/:id', async (request: Request, response: Response) => {
  if (!requireMongo(response)) {
    return;
  }
  if (!mongoose.isValidObjectId(request.params.id)) {
    response.status(400).json({ error: 'Medication ID is invalid.' });
    return;
  }

  const medication = await Medication.findByIdAndDelete(request.params.id);
  if (!medication) {
    response.status(404).json({ error: 'Medication was not found.' });
    return;
  }

  response.status(204).send();
});

export default router;
