# MED-NEXIS

MED-NEXIS is a medication routine and refill companion prototype. Medication details are entered by the user and must follow the existing prescription; the app does not provide medical advice.

## Prescription scanning prototype

The mobile app uploads a selected JPEG, PNG, or WebP image (up to 8 MB) to `POST /api/prescriptions/ocr`. The backend uses Tesseract.js for English OCR; no cloud OCR account or API key is required. Tesseract.js may download its English language data on first use. The prescription image is processed in backend memory and is not stored as an image. OCR text and reviewed prescription fields are saved to MongoDB only after the user confirms the review.

OCR can misread printed or handwritten text. Verify every field against the original prescription or with a pharmacist/doctor. Saving a reviewed prescription does not create a medication schedule.

## Privacy and security

This prototype does not implement authentication or authorization. Patient and prescription APIs are not safe for real patient information or public deployment. Do not expose the backend publicly or upload real prescriptions until access control, transport security, and appropriate data-protection measures are implemented. Caregiver sharing and reminders are not currently implemented.
