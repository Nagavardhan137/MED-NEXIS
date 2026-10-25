# MED-NEXIS

MED-NEXIS is a medication routine and prescription companion prototype built for a hackathon setting. It gives users a place to enter medication information from an existing prescription, review basic refill quantities, and save a reviewed prescription scan. It does not provide medical advice, diagnose conditions, or recommend medication changes.

> **Prototype and privacy notice:** Authentication and authorization are not implemented. Do not use real patient information or prescriptions, and do not expose this backend publicly. See [Privacy and security](#privacy-and-security).

## Project objectives

- Make manually entered medication and refill information easier to organize.
- Explore an OCR-assisted prescription review flow while keeping the user responsible for checking extracted text.
- Provide a simple mobile interface with English, Telugu, Hindi, and Kannada language choices.

## Implemented features and status

| Area | Current status |
|---|---|
| Patient profile | Implemented: create, view, and update a profile through the API. Profile fields include preferred language, emergency contact, and a caregiver-support preference. |
| Medication records | Implemented: create, list by patient, view, update, and delete records, including scheduled times and optional refill/remaining quantities. |
| Refill view | Implemented: displays quantities that users entered. It does not calculate a refill date or contact a pharmacy. |
| Prescription scanning | Implemented: select or capture a supported image, run English OCR, review/edit extracted fields, and explicitly confirm before saving reviewed details. |
| Language selection | Implemented in the mobile UI for English, Telugu, Hindi, and Kannada; the selection is persisted locally. |
| Phone sign-in screens | UI demonstration only. Phone numbers are not authenticated, no verification code is sent or checked, and there is no authentication API. Guest access is also available. |
| Medication reminders and caregiver sharing | Not implemented. A saved schedule is information only; no notifications are generated. The caregiver-support preference does not share data with another person. |
| Prescription-to-medication scheduling | Not implemented. Saving a reviewed prescription does not create or change medication records. |

## Technology stack

- **Mobile:** Expo, React Native, and TypeScript; Expo Image Picker handles camera and image-library selection.
- **Backend:** Node.js, Express, and TypeScript.
- **Database:** MongoDB via Mongoose. The current backend configuration validates a MongoDB Atlas URI for its configured cluster host and `mednexis` database.
- **OCR:** Tesseract.js with the English (`eng`) language model. It runs in the backend; no cloud OCR account or API key is used. Tesseract.js may need to download English language data the first time it runs.

## Project structure

```text
MED-NEXIS/
├── README.md
├── backend/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── src/
│       ├── app.ts
│       ├── config.ts
│       ├── database.ts
│       ├── server.ts
│       ├── models/
│       │   ├── Medication.ts
│       │   ├── Patient.ts
│       │   └── Prescription.ts
│       ├── routes/
│       │   ├── medications.ts
│       │   ├── patients.ts
│       │   └── prescriptions.ts
│       └── services/
│           └── prescriptionOcr.ts
└── mobile/
    ├── App.tsx
    ├── app.json
    ├── package.json
    ├── index.ts
    ├── src/
    │   └── i18n.tsx
    └── assets/
```

Generated folders such as `node_modules/`, `dist/`, and Expo's local cache are omitted.

## Run locally

### Prerequisites

- Node.js and npm installed.
- MongoDB Atlas access for persistent patient, medication, and prescription records. Without a valid database URI the API starts, but database-backed requests return a service-unavailable response.
- For mobile testing, use Expo's web target, an Android emulator, or a compatible device. iOS simulator builds require macOS and the relevant Apple tooling.

### 1. Configure the backend

The backend reads `MONGODB_URI` and `PORT` from `backend/.env`. The example below is safe to keep in a tracked `.env.example` because it contains placeholders only:

```dotenv
MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.yfvsksd.mongodb.net/mednexis?retryWrites=true&w=majority
PORT=5000
```

Create `backend/.env` with these settings and replace the username and password placeholders with your own MongoDB Atlas database credentials. The current configuration accepts the configured Atlas host and the `mednexis` database; it rejects other hosts or database names. URL-encode special characters in credentials. Keep real credentials in the git-ignored `backend/.env`, never in README.md or a tracked example file.

**Repository setup warning:** The currently tracked `backend/.env.example` does not use placeholder-only MongoDB credentials. This README-only update does not modify that file. Do not copy or share its current URI; replace it with the placeholder-only example above and rotate the associated database credentials before using or distributing the repository.

In a terminal:

```powershell
cd backend
npm install
npm run dev
```

The API listens on port `5000` by default. Check its status at <http://localhost:5000/api/health>; the response reports whether MongoDB is connected.

### 2. Start the mobile app

Open a second terminal from the repository root:

```powershell
cd mobile
npm install
npm start
```

Use the Expo CLI options to open the app in a browser, Android emulator, or compatible device. The API URL is currently hard-coded in `mobile/App.tsx`: web and iOS use `http://localhost:5000`, while the Android emulator uses `http://10.0.2.2:5000`. A physical device cannot use those loopback addresses to reach a computer's backend; configure a reachable development-machine address in the app and allow the connection through your local firewall if testing on a physical device.

The application can be explored as a guest, but saving a patient profile, medication, or reviewed prescription requires the backend to be connected to MongoDB.

## API endpoints

All endpoints are served by the Express backend. JSON request bodies are expected except for the multipart image upload.

| Method | Path | Purpose |
|---|---|---|
| `GET` | `/api/health` | Report API and MongoDB connection status. |
| `POST` | `/api/patients` | Create a patient profile. |
| `GET` | `/api/patients/:id` | Retrieve a profile by its MongoDB ID. |
| `PUT` | `/api/patients/:id` | Replace/update a profile by ID. |
| `POST` | `/api/medications` | Create a medication record for an existing patient. |
| `GET` | `/api/medications/patient/:patientId` | List a patient's medication records. |
| `GET` | `/api/medications/:id` | Retrieve a medication by ID. |
| `PUT` | `/api/medications/:id` | Replace/update a medication record. |
| `DELETE` | `/api/medications/:id` | Delete a medication record. |
| `POST` | `/api/prescriptions/ocr` | Process one prescription image. Send multipart form data with the image field named `prescription`. |
| `POST` | `/api/prescriptions` | Save reviewed prescription details after explicit confirmation. |

Patient profile and medication endpoints validate input and return JSON. Database-backed endpoints return `503` when MongoDB is disconnected. There is currently no endpoint to list, retrieve, update, or delete saved prescriptions, and no patient-list endpoint.

## Prescription scanning workflow

1. Select an image from the gallery/files or use the camera.
2. The app accepts JPEG, PNG, and WebP images up to 8 MB. The backend checks the image type and size, then processes the image in memory.
3. Tesseract.js extracts English text and the backend provides a best-effort draft of fields such as patient name, prescription date, and numbered medicine lines. Some fields may remain blank; confidence or extracted values are not a guarantee of accuracy.
4. Review and edit every field against the original prescription. The app requires the user to confirm that the details were checked before saving.
5. Only the reviewed fields and original OCR text are stored in MongoDB after confirmation. The uploaded image itself is not saved as an image file. Guest scans are not saved.

OCR may misread printed or handwritten text, including medicine names, strengths, timing, and quantities. Always verify the result against the original prescription or consult a qualified pharmacist or doctor. Enter medication details only as prescribed. Saving a reviewed prescription does not create a medication schedule.

## Privacy and security

MED-NEXIS is a prototype, not a production health-data service:

- There is no authentication or authorization. Knowing or guessing a record ID is not a substitute for access control; API requests are not tied to an authenticated user.
- The mobile app uses plain HTTP for its local API connections. The project does not implement secure transport for deployment.
- Patient profile details, medication information, reviewed prescription fields, and OCR text are stored in MongoDB after the applicable save action. The image is processed in backend memory and not saved as an image file.
- The phone/verification flow is a UI demo only; it must not be treated as identity verification or protection for records.

Do not upload real patient information or prescriptions, expose the backend publicly, or use this prototype for clinical decisions. Public or real-data use requires properly designed authentication and authorization, secure transport, and appropriate data-protection controls.

## Future enhancements

These are planned ideas only and are **not implemented**:

- Authentication and authorization with secure account and record access.
- Medication reminders and refill notifications.
- Caregiver sharing with explicit permissions and access controls.
- Prescription history retrieval and management.
- Production-ready deployment, secure transport, and privacy safeguards.
