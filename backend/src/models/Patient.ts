import { model, models, Schema, type Model } from 'mongoose';

export const preferredLanguages = ['English', 'Telugu', 'Hindi', 'Kannada'] as const;

export type PreferredLanguage = (typeof preferredLanguages)[number];

export interface PatientRecord {
  fullName: string;
  age: number;
  phone: string;
  language: PreferredLanguage;
  emergencyContactName: string;
  emergencyContactPhone: string;
  caregiverSupport: boolean;
}

const patientSchema = new Schema<PatientRecord>(
  {
    fullName: { type: String, required: true, trim: true, maxlength: 100 },
    age: { type: Number, required: true, min: 1, max: 120, validate: Number.isInteger },
    phone: {
      type: String,
      default: '',
      validate: {
        validator: (value: string) => value === '' || /^[6-9]\d{9}$/.test(value),
        message: 'Phone must be a valid 10-digit Indian mobile number.',
      },
    },
    language: { type: String, required: true, enum: preferredLanguages },
    emergencyContactName: { type: String, trim: true, maxlength: 100, default: '' },
    emergencyContactPhone: {
      type: String,
      default: '',
      validate: {
        validator: (value: string) => value === '' || /^[6-9]\d{9}$/.test(value),
        message: 'Emergency contact phone must be a valid 10-digit Indian mobile number.',
      },
    },
    caregiverSupport: { type: Boolean, default: false },
  },
  { timestamps: true, versionKey: false },
);

export const Patient: Model<PatientRecord> = models.Patient
  ? (models.Patient as Model<PatientRecord>)
  : model<PatientRecord>('Patient', patientSchema);
