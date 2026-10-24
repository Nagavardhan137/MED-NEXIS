import { model, models, Schema, Types, type Model } from 'mongoose';

export interface MedicationRecord {
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
}

const medicationSchema = new Schema<MedicationRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    medicationName: { type: String, required: true, trim: true, maxlength: 120 },
    dosage: { type: String, required: true, trim: true, maxlength: 120 },
    frequency: { type: String, required: true, trim: true, maxlength: 120 },
    scheduledTimes: {
      type: [String],
      required: true,
      validate: {
        validator: (times: string[]) =>
          times.length > 0 && times.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time)),
        message: 'Provide one or more scheduled times in HH:mm format.',
      },
    },
    startDate: {
      type: String,
      required: true,
      validate: {
        validator: (date: string) => isCalendarDate(date),
        message: 'Start date must be a valid YYYY-MM-DD date.',
      },
    },
    endDate: {
      type: String,
      validate: {
        validator: (date: string | undefined) => date === undefined || isCalendarDate(date),
        message: 'End date must be a valid YYYY-MM-DD date.',
      },
    },
    refillQuantity: { type: Number, min: 0, validate: Number.isInteger },
    remainingQuantity: { type: Number, min: 0, validate: Number.isInteger },
  },
  { timestamps: true, versionKey: false },
);

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export const Medication: Model<MedicationRecord> = models.Medication
  ? (models.Medication as Model<MedicationRecord>)
  : model<MedicationRecord>('Medication', medicationSchema);
