import { model, models, Schema, Types, type Model } from 'mongoose';

export interface ReviewedPrescriptionMedicine {
  medicationName: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  quantity: string;
}

export interface PrescriptionRecord {
  patientId: Types.ObjectId;
  patientName: string;
  prescriptionDate: string;
  originalOcrText: string;
  medicines: ReviewedPrescriptionMedicine[];
  userConfirmed: boolean;
  confirmedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const reviewedMedicineSchema = new Schema<ReviewedPrescriptionMedicine>(
  {
    medicationName: { type: String, required: true, trim: true, maxlength: 120 },
    dosage: { type: String, trim: true, maxlength: 120, default: '' },
    frequency: { type: String, trim: true, maxlength: 120, default: '' },
    timing: { type: String, trim: true, maxlength: 200, default: '' },
    duration: { type: String, trim: true, maxlength: 120, default: '' },
    quantity: { type: String, trim: true, maxlength: 80, default: '' },
  },
  { _id: false },
);

const prescriptionSchema = new Schema<PrescriptionRecord>(
  {
    patientId: { type: Schema.Types.ObjectId, ref: 'Patient', required: true, index: true },
    patientName: { type: String, trim: true, maxlength: 100, default: '' },
    prescriptionDate: { type: String, trim: true, maxlength: 30, default: '' },
    originalOcrText: { type: String, required: true, maxlength: 30000 },
    medicines: {
      type: [reviewedMedicineSchema],
      required: true,
      validate: {
        validator: (medicines: ReviewedPrescriptionMedicine[]) => medicines.length > 0,
        message: 'At least one reviewed medicine entry is required.',
      },
    },
    userConfirmed: { type: Boolean, required: true, validate: (value: boolean) => value === true },
    confirmedAt: { type: Date, required: true },
  },
  { timestamps: true, versionKey: false },
);

export const Prescription: Model<PrescriptionRecord> = models.Prescription
  ? (models.Prescription as Model<PrescriptionRecord>)
  : model<PrescriptionRecord>('Prescription', prescriptionSchema);
