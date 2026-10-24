import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import * as ImagePicker from 'expo-image-picker';
import {
  ActivityIndicator,
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  View,
  Platform,
  useWindowDimensions,
} from 'react-native';
import {
  LanguageProvider,
  LanguageSelector,
  LocalizedPressable as Pressable,
  LocalizedText as Text,
  LocalizedTextInput as TextInput,
  translateCopy,
  translateKey,
  UntranslatedText,
  useLanguage,
  localeOptions,
} from './src/i18n';

type AppStage = 'login' | 'verification' | 'registration' | 'dashboard';

type PreferredLanguage = 'English' | 'Telugu' | 'Hindi' | 'Kannada';

type PatientProfile = {
  id?: string;
  fullName: string;
  age: string;
  phone: string;
  language: PreferredLanguage;
  emergencyContactName: string;
  emergencyContactPhone: string;
  caregiverSupport: boolean;
};

const API_BASE_URL =
  Platform.OS === 'android' ? 'http://10.0.2.2:5000' : 'http://localhost:5000';
const supportedLanguages: PreferredLanguage[] = ['English', 'Telugu', 'Hindi', 'Kannada'];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

async function requestPatient(
  path: string,
  method: 'GET' | 'POST' | 'PUT',
  body?: Record<string, unknown>,
): Promise<PatientProfile> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/patients${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(
      'Could not reach the MED-NEXIS API. Check that the backend is running and the app can reach this device.',
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The MED-NEXIS API returned an unreadable response.');
  }

  if (!response.ok) {
    const message =
      isObject(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'The profile request could not be completed.';
    throw new Error(message);
  }

  if (!isObject(payload) || !isObject(payload.patient)) {
    throw new Error('The MED-NEXIS API returned an invalid profile response.');
  }

  const patient = payload.patient;
  if (
    typeof patient.id !== 'string' ||
    typeof patient.fullName !== 'string' ||
    typeof patient.age !== 'number' ||
    typeof patient.phone !== 'string' ||
    typeof patient.language !== 'string' ||
    !supportedLanguages.includes(patient.language as PreferredLanguage) ||
    typeof patient.emergencyContactName !== 'string' ||
    typeof patient.emergencyContactPhone !== 'string' ||
    typeof patient.caregiverSupport !== 'boolean'
  ) {
    throw new Error('The MED-NEXIS API returned an invalid profile response.');
  }

  return {
    id: patient.id,
    fullName: patient.fullName,
    age: String(patient.age),
    phone: patient.phone,
    language: patient.language as PreferredLanguage,
    emergencyContactName: patient.emergencyContactName,
    emergencyContactPhone: patient.emergencyContactPhone,
    caregiverSupport: patient.caregiverSupport,
  };
}

function medicationFromResponse(value: unknown): Medication {
  if (!isObject(value)) {
    throw new Error('The MED-NEXIS API returned an invalid medication response.');
  }
  const medication = value;
  if (
    typeof medication.id !== 'string' ||
    typeof medication.patientId !== 'string' ||
    typeof medication.medicationName !== 'string' ||
    typeof medication.dosage !== 'string' ||
    typeof medication.frequency !== 'string' ||
    !Array.isArray(medication.scheduledTimes) ||
    !medication.scheduledTimes.every((time) => typeof time === 'string') ||
    typeof medication.startDate !== 'string' ||
    typeof medication.createdAt !== 'string' ||
    typeof medication.updatedAt !== 'string'
  ) {
    throw new Error('The MED-NEXIS API returned an invalid medication response.');
  }

  return {
    id: medication.id,
    patientId: medication.patientId,
    medicationName: medication.medicationName,
    dosage: medication.dosage,
    frequency: medication.frequency,
    scheduledTimes: medication.scheduledTimes,
    startDate: medication.startDate,
    ...(typeof medication.endDate === 'string' ? { endDate: medication.endDate } : {}),
    ...(typeof medication.refillQuantity === 'number'
      ? { refillQuantity: medication.refillQuantity }
      : {}),
    ...(typeof medication.remainingQuantity === 'number'
      ? { remainingQuantity: medication.remainingQuantity }
      : {}),
    createdAt: medication.createdAt,
    updatedAt: medication.updatedAt,
  };
}

async function requestMedication(
  path: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  body?: Record<string, unknown>,
): Promise<Medication | null> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/medications${path}`, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('Could not reach the MED-NEXIS API. Check that the backend is running.');
  }

  if (response.status === 204 && method === 'DELETE') {
    return null;
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The MED-NEXIS API returned an unreadable response.');
  }

  if (!response.ok) {
    throw new Error(
      isObject(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'The medication request could not be completed.',
    );
  }
  if (!isObject(payload)) {
    throw new Error('The MED-NEXIS API returned an invalid response.');
  }

  return method === 'GET' && path.startsWith('/patient/')
    ? null
    : medicationFromResponse(payload.medication);
}

async function fetchPatientMedications(patientId: string): Promise<Medication[]> {
  const path = `/patient/${encodeURIComponent(patientId)}`;
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/medications${path}`);
  } catch {
    throw new Error('Could not reach the MED-NEXIS API. Check that the backend is running.');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The MED-NEXIS API returned an unreadable medication list.');
  }

  if (!response.ok) {
    throw new Error(
      isObject(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'Could not load medications.',
    );
  }
  if (!isObject(payload) || !Array.isArray(payload.medications)) {
    throw new Error('The MED-NEXIS API returned an invalid medication list.');
  }
  return payload.medications.map(medicationFromResponse);
}

async function processPrescriptionImage(
  asset: ImagePicker.ImagePickerAsset,
): Promise<PrescriptionExtraction> {
  const formData = new FormData();
  const filename = asset.fileName || 'prescription-image.jpg';
  const mimeType = asset.mimeType || 'image/jpeg';

  if (Platform.OS === 'web') {
    const imageResponse = await fetch(asset.uri);
    if (!imageResponse.ok) {
      throw new Error('Could not read the selected image. Please select it again.');
    }
    formData.append('prescription', await imageResponse.blob(), filename);
  } else {
    const nativeFormData = formData as FormData & {
      append: (name: string, value: { uri: string; name: string; type: string }) => void;
    };
    nativeFormData.append('prescription', {
      uri: asset.uri,
      name: filename,
      type: mimeType,
    });
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/prescriptions/ocr`, {
      method: 'POST',
      body: formData,
    });
  } catch {
    throw new Error('Could not reach the MED-NEXIS API. Check that the backend is running.');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The OCR service returned an unreadable response.');
  }
  if (!response.ok) {
    throw new Error(
      isObject(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'Could not process this image.',
    );
  }
  if (!isObject(payload) || !isObject(payload.extraction)) {
    throw new Error('The OCR service returned invalid extraction data.');
  }

  const extraction = payload.extraction;
  if (
    typeof extraction.originalOcrText !== 'string' ||
    typeof extraction.patientName !== 'string' ||
    typeof extraction.prescriptionDate !== 'string' ||
    !Array.isArray(extraction.medicines)
  ) {
    throw new Error('The OCR service returned invalid extraction data.');
  }

  const medicines = extraction.medicines.map((entry) => {
    if (
      !isObject(entry) ||
      typeof entry.sourceText !== 'string' ||
      typeof entry.medicationName !== 'string' ||
      typeof entry.dosage !== 'string' ||
      typeof entry.frequency !== 'string' ||
      typeof entry.timing !== 'string' ||
      typeof entry.duration !== 'string' ||
      typeof entry.quantity !== 'string' ||
      !Array.isArray(entry.needsManualReview) ||
      !entry.needsManualReview.every((field) => typeof field === 'string')
    ) {
      throw new Error('The OCR service returned an invalid medicine entry.');
    }
    return {
      sourceText: entry.sourceText,
      medicationName: entry.medicationName,
      dosage: entry.dosage,
      frequency: entry.frequency,
      timing: entry.timing,
      duration: entry.duration,
      quantity: entry.quantity,
      needsManualReview: entry.needsManualReview,
    };
  });

  return {
    originalOcrText: extraction.originalOcrText,
    patientName: extraction.patientName,
    prescriptionDate: extraction.prescriptionDate,
    medicines,
    confidence: typeof extraction.confidence === 'number' ? extraction.confidence : null,
  };
}

async function saveReviewedPrescription(
  patientId: string,
  extraction: PrescriptionExtraction,
): Promise<void> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/prescriptions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId,
        patientName: extraction.patientName,
        prescriptionDate: extraction.prescriptionDate,
        originalOcrText: extraction.originalOcrText,
        medicines: extraction.medicines.map(
          ({ medicationName, dosage, frequency, timing, duration, quantity }) => ({
            medicationName,
            dosage,
            frequency,
            timing,
            duration,
            quantity,
          }),
        ),
        userConfirmed: true,
      }),
    });
  } catch {
    throw new Error('Could not reach the MED-NEXIS API. Check that the backend is running.');
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error('The MED-NEXIS API returned an unreadable response.');
  }
  if (!response.ok) {
    throw new Error(
      isObject(payload) && typeof payload.error === 'string'
        ? payload.error
        : 'Could not save the reviewed prescription.',
    );
  }
}

function patientRequestBody(profile: PatientProfile): Record<string, unknown> {
  return {
    fullName: profile.fullName,
    age: Number(profile.age),
    phone: profile.phone,
    language: profile.language,
    emergencyContactName: profile.emergencyContactName,
    emergencyContactPhone: profile.emergencyContactPhone,
    caregiverSupport: profile.caregiverSupport,
  };
}

type Screen =
  | 'Home'
  | 'Medicines'
  | 'Refills'
  | 'Profile'
  | 'Scan prescription'
  | 'Caregiver support'
  | 'Notifications';

type Medication = {
  id: string;
  patientId: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  scheduledTimes: string[];
  startDate: string;
  endDate?: string;
  refillQuantity?: number;
  remainingQuantity?: number;
  createdAt: string;
  updatedAt: string;
};

type MedicationDraft = Omit<Medication, 'id' | 'createdAt' | 'updatedAt'>;

type PrescriptionMedicineDraft = {
  sourceText: string;
  medicationName: string;
  dosage: string;
  frequency: string;
  timing: string;
  duration: string;
  quantity: string;
  needsManualReview: string[];
};

type PrescriptionExtraction = {
  originalOcrText: string;
  patientName: string;
  prescriptionDate: string;
  medicines: PrescriptionMedicineDraft[];
  confidence: number | null;
};

const screens: Screen[] = ['Home', 'Medicines', 'Refills', 'Profile'];

export default function App() {
  return (
    <LanguageProvider>
      <AppContent />
    </LanguageProvider>
  );
}

function AppContent() {
  const { ready, applyProfileLanguage } = useLanguage();
  const [stage, setStage] = useState<AppStage>('login');
  const [phone, setPhone] = useState('');
  const [profile, setProfile] = useState<PatientProfile | null>(null);
  const [profileSaveMessage, setProfileSaveMessage] = useState('');
  const [dashboardInitialScreen, setDashboardInitialScreen] = useState<Screen>('Home');
  const [phoneError, setPhoneError] = useState('');
  const [showPhoneError, setShowPhoneError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [verificationCode, setVerificationCode] = useState('');

  if (!ready) {
    return (
      <SafeAreaView style={styles.loginSafeArea}>
        <View style={styles.languageLoading}>
          <ActivityIndicator color="#147E76" />
        </View>
      </SafeAreaView>
    );
  }

  function continueWithPhone() {
    setShowPhoneError(true);
    if (!/^[6-9]\d{9}$/.test(phone)) {
      setPhoneError('Enter a valid 10-digit Indian mobile number starting with 6–9.');
      return;
    }

    setPhoneError('');
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      setStage('verification');
    }, 450);
  }

  if (stage === 'dashboard') {
    return (
      <Dashboard
        initialScreen={dashboardInitialScreen}
        profile={profile}
        profileSaveMessage={profileSaveMessage}
        phone={phone}
        onApplyProfileLanguage={applyProfileLanguage}
        onEditProfile={(currentProfile) => {
          if (currentProfile) {
            setProfile(currentProfile);
          }
          setProfileSaveMessage('');
          setDashboardInitialScreen('Profile');
          setStage('registration');
        }}
      />
    );
  }

  if (stage === 'registration') {
    return (
      <PatientRegistration
        initialProfile={profile}
        phone={profile?.phone ?? phone}
        onBack={() => setStage(profile ? 'dashboard' : phone ? 'verification' : 'dashboard')}
        onSave={async (savedProfile) => {
          const path = profile?.id ? `/${encodeURIComponent(profile.id)}` : '';
          const saved = await requestPatient(path, profile?.id ? 'PUT' : 'POST', patientRequestBody(savedProfile));
          setProfile(saved);
          setPhone(saved.phone);
          setProfileSaveMessage(profile?.id ? 'Profile changes saved.' : 'Profile saved to the backend.');
          if (!profile) {
            setDashboardInitialScreen('Profile');
          }
          setStage('dashboard');
        }}
      />
    );
  }

  if (stage === 'verification') {
    return (
      <VerificationScreen
        phone={phone}
        code={verificationCode}
        onBack={() => {
          setStage('login');
        }}
        onCodeChange={(value) => {
          setVerificationCode(value.replace(/\D/g, '').slice(0, 6));
        }}
        onCompleteProfile={() => setStage('registration')}
        onGuest={() => {
          setDashboardInitialScreen('Home');
          setStage('dashboard');
        }}
      />
    );
  }

  return (
    <LoginScreen
      phone={phone}
      error={showPhoneError ? phoneError : ''}
      isSubmitting={isSubmitting}
      onPhoneChange={(value) => {
        setPhone(value.replace(/\D/g, '').slice(0, 10));
        setPhoneError('');
      }}
      onContinue={continueWithPhone}
      onGuest={() => {
        setDashboardInitialScreen('Home');
        setStage('dashboard');
      }}
    />
  );
}

function Brand() {
  return (
    <View style={styles.loginBrand}>
      <View style={styles.loginBrandMark}>
        <Text style={styles.loginBrandPlus}>+</Text>
      </View>
      <Text style={styles.loginWordmark}>MED-NEXIS</Text>
    </View>
  );
}

function LoginScreen({
  phone,
  error,
  isSubmitting,
  onPhoneChange,
  onContinue,
  onGuest,
}: {
  phone: string;
  error: string;
  isSubmitting: boolean;
  onPhoneChange: (value: string) => void;
  onContinue: () => void;
  onGuest: () => void;
}) {
  const { width } = useWindowDimensions();

  return (
    <SafeAreaView style={styles.loginSafeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.authScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.authContent, { width: Math.min(width - 48, 440) }]}>
          <Brand />
          <LanguageSelector />

          <View style={styles.authHeading}>
            <Text style={styles.authTitle}>Welcome back</Text>
            <Text style={styles.authSubtitle}>
              Sign in to manage your medication routine.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Phone number</Text>
          <View style={[styles.phoneField, error && styles.phoneFieldError]}>
            <Text style={styles.countryCode}>+91</Text>
            <View style={styles.phoneDivider} />
            <TextInput
              accessibilityLabel="10-digit Indian mobile number"
              autoComplete="tel-national"
              autoCorrect={false}
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={onPhoneChange}
              placeholder="Mobile number"
              placeholderTextColor="#9AA5AE"
              style={styles.phoneInput}
              value={phone}
            />
          </View>
          {error ? (
            <Text accessibilityRole="alert" style={styles.validationMessage}>
              {error}
            </Text>
          ) : (
            <Text style={styles.fieldHint}>Enter your 10-digit mobile number.</Text>
          )}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Continue with phone"
            accessibilityState={{ disabled: phone.length !== 10 || isSubmitting }}
            disabled={phone.length !== 10 || isSubmitting}
            onPress={onContinue}
            style={({ pressed }) => [
              styles.continueButton,
              (phone.length !== 10 || isSubmitting) && styles.continueButtonDisabled,
              pressed && styles.pressed,
            ]}
          >
            {isSubmitting ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Continue with phone</Text>
            )}
          </Pressable>

          <View style={styles.privacyNote}>
            <View style={styles.privacyMark}>
              <Text style={styles.privacyMarkText}>✓</Text>
            </View>
            <Text style={styles.privacyText}>
              Your health information should stay private and secure.
            </Text>
          </View>

          <View style={styles.orDivider}>
            <View style={styles.dividerLine} />
            <Text style={styles.orText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onGuest}
            style={({ pressed }) => [styles.guestButton, pressed && styles.pressed]}
          >
            <Text style={styles.guestButtonText}>Continue as guest</Text>
          </Pressable>

          <Text style={styles.authFooter}>
            MED-NEXIS helps you organize medication routines and refills.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function VerificationScreen({
  phone,
  code,
  onBack,
  onCodeChange,
  onCompleteProfile,
  onGuest,
}: {
  phone: string;
  code: string;
  onBack: () => void;
  onCodeChange: (value: string) => void;
  onCompleteProfile: () => void;
  onGuest: () => void;
}) {
  const { width } = useWindowDimensions();
  const { locale } = useLanguage();

  return (
    <SafeAreaView style={styles.loginSafeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.authScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.authContent, { width: Math.min(width - 48, 440) }]}>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.backToLogin, pressed && styles.pressed]}
          >
            <Text style={styles.backToLoginText}>‹  Back</Text>
          </Pressable>

          <Brand />
          <LanguageSelector />

          <View style={styles.authHeading}>
            <Text style={styles.authTitle}>Verify your number</Text>
            <Text style={styles.authSubtitle}>
              {translateKey('auth.codeFor', locale)} +91 {phone}.
            </Text>
          </View>

          <Text style={styles.fieldLabel}>Demo code (optional)</Text>
          <TextInput
            accessibilityLabel="Optional six-digit demo code"
            autoComplete="one-time-code"
            autoCorrect={false}
            keyboardType="number-pad"
            maxLength={6}
            onChangeText={(value) => onCodeChange(value.replace(/\D/g, '').slice(0, 6))}
            placeholder="••••••"
            placeholderTextColor="#A7B1B9"
            style={styles.codeInput}
            value={code}
          />
          <Text style={styles.demoVerificationNote}>
            Demo verification only. Phone authentication is not connected yet. No code is sent or checked.
          </Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Complete profile"
            onPress={onCompleteProfile}
            style={({ pressed }) => [
              styles.continueButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.continueButtonText}>Complete profile</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onGuest}
            style={({ pressed }) => [styles.guestButton, styles.otpGuestButton, pressed && styles.pressed]}
          >
            <Text style={styles.guestButtonText}>Explore as guest instead</Text>
          </Pressable>

          <Text style={styles.authFooter}>
            No verification code has been sent.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function PatientRegistration({
  initialProfile,
  phone,
  onBack,
  onSave,
}: {
  initialProfile: PatientProfile | null;
  phone: string;
  onBack: () => void;
  onSave: (profile: PatientProfile) => Promise<void>;
}) {
  const { width } = useWindowDimensions();
  const { setLocale } = useLanguage();
  const [fullName, setFullName] = useState(initialProfile?.fullName ?? '');
  const [age, setAge] = useState(initialProfile?.age ?? '');
  const [language, setLanguage] = useState<PreferredLanguage>(
    initialProfile?.language ?? 'English',
  );
  const [emergencyContactName, setEmergencyContactName] = useState(
    initialProfile?.emergencyContactName ?? '',
  );
  const [emergencyContactPhone, setEmergencyContactPhone] = useState(
    initialProfile?.emergencyContactPhone ?? '',
  );
  const [caregiverSupport, setCaregiverSupport] = useState(
    initialProfile?.caregiverSupport ?? false,
  );
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [errors, setErrors] = useState<{ fullName?: string; age?: string; emergencyPhone?: string }>({});
  const languages: PreferredLanguage[] = ['English', 'Telugu', 'Hindi', 'Kannada'];

  async function saveProfile() {
    if (isSaving) {
      return;
    }

    const nextErrors: typeof errors = {};
    const normalizedName = fullName.trim();
    const parsedAge = Number(age);

    if (!normalizedName) {
      nextErrors.fullName = 'Enter your full name.';
    }
    if (!age || !Number.isInteger(parsedAge) || parsedAge < 1 || parsedAge > 120) {
      nextErrors.age = 'Enter an age between 1 and 120.';
    }
    if (emergencyContactPhone && !/^[6-9]\d{9}$/.test(emergencyContactPhone)) {
      nextErrors.emergencyPhone = 'Enter a valid 10-digit Indian mobile number.';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setSaveError('');
    setIsSaving(true);
    try {
      await onSave({
        id: initialProfile?.id,
        fullName: normalizedName,
        age,
        phone,
        language,
        emergencyContactName: emergencyContactName.trim(),
        emergencyContactPhone,
        caregiverSupport,
      });
    } catch (error) {
      setSaveError(
        error instanceof Error ? error.message : 'Could not save your profile. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.loginSafeArea}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.registrationScrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.authContent, { width: Math.min(width - 48, 440) }]}>
          <Pressable
            accessibilityRole="button"
            onPress={onBack}
            style={({ pressed }) => [styles.backToLogin, pressed && styles.pressed]}
          >
            <Text style={styles.backToLoginText}>‹  Back</Text>
          </Pressable>

          <Brand />
          <LanguageSelector />
          <View style={styles.registrationHeading}>
            <Text style={styles.authTitle}>
              {initialProfile ? 'Edit profile' : 'Complete your profile'}
            </Text>
            <Text style={styles.authSubtitle}>
              Add a few details to personalize your experience.
            </Text>
          </View>

          <Text style={styles.formLabel}>Full name *</Text>
          <TextInput
            accessibilityLabel="Full name, required"
            autoComplete="name"
            autoCorrect={false}
            onChangeText={(value) => {
              setFullName(value);
              setErrors((current) => ({ ...current, fullName: undefined }));
            }}
            placeholder="Enter your full name"
            placeholderTextColor="#9AA5AE"
            returnKeyType="next"
            style={[styles.formInput, errors.fullName && styles.formInputError]}
            value={fullName}
          />
          {errors.fullName ? <FieldError message={errors.fullName} /> : null}

          <Text style={styles.formLabel}>Age *</Text>
          <TextInput
            accessibilityLabel="Age, required"
            keyboardType="number-pad"
            maxLength={3}
            onChangeText={(value) => {
              setAge(value.replace(/\D/g, '').slice(0, 3));
              setErrors((current) => ({ ...current, age: undefined }));
            }}
            placeholder="Enter your age"
            placeholderTextColor="#9AA5AE"
            returnKeyType="next"
            style={[styles.formInput, errors.age && styles.formInputError]}
            value={age}
          />
          {errors.age ? <FieldError message={errors.age} /> : null}

          <Text style={styles.formLabel}>Mobile number</Text>
          <View style={styles.readOnlyPhoneField}>
            <Text style={styles.countryCode}>+91</Text>
            <View style={styles.phoneDivider} />
            {phone ? (
              <UntranslatedText style={styles.readOnlyPhoneText}>{phone}</UntranslatedText>
            ) : (
              <Text style={styles.readOnlyPhoneText}>Not provided</Text>
            )}
            <Text style={styles.readOnlyLabel}>READ ONLY</Text>
          </View>

          <Text style={styles.formLabel}>Preferred language</Text>
          <View style={styles.languageOptions}>
            {languages.map((option) => {
              const selected = language === option;
              const nativeName =
                localeOptions.find((entry) => entry.profileName === option)?.nativeName ?? option;

              return (
                <Pressable
                  key={option}
                  accessibilityRole="button"
                  accessibilityLabel={nativeName}
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setLanguage(option);
                    const nextLocale =
                      localeOptions.find((entry) => entry.profileName === option)?.code ?? 'en';
                    void setLocale(nextLocale);
                  }}
                  style={({ pressed }) => [
                    styles.languageOption,
                    selected && styles.languageOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.languageOptionText, selected && styles.languageOptionTextSelected]}>
                    {nativeName}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.formLabel}>Emergency contact name</Text>
          <TextInput
            accessibilityLabel="Emergency contact name, optional"
            autoComplete="name"
            autoCorrect={false}
            onChangeText={setEmergencyContactName}
            placeholder="Enter a contact name"
            placeholderTextColor="#9AA5AE"
            returnKeyType="next"
            style={styles.formInput}
            value={emergencyContactName}
          />

          <Text style={styles.formLabel}>Emergency contact phone</Text>
          <View style={[styles.phoneField, errors.emergencyPhone && styles.phoneFieldError]}>
            <Text style={styles.countryCode}>+91</Text>
            <View style={styles.phoneDivider} />
            <TextInput
              accessibilityLabel="Emergency contact phone, optional"
              autoComplete="tel-national"
              keyboardType="number-pad"
              maxLength={10}
              onChangeText={(value) => {
                setEmergencyContactPhone(value.replace(/\D/g, '').slice(0, 10));
                setErrors((current) => ({ ...current, emergencyPhone: undefined }));
              }}
              placeholder="10-digit mobile number"
              placeholderTextColor="#9AA5AE"
              style={styles.phoneInput}
              value={emergencyContactPhone}
            />
          </View>
          {errors.emergencyPhone ? <FieldError message={errors.emergencyPhone} /> : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Caregiver support"
            accessibilityState={{ checked: caregiverSupport }}
            onPress={() => setCaregiverSupport((current) => !current)}
            style={({ pressed }) => [styles.caregiverRow, pressed && styles.pressed]}
          >
            <View style={styles.caregiverText}>
              <Text style={styles.caregiverTitle}>Caregiver support</Text>
              <Text style={styles.caregiverHint}>You can change this preference later.</Text>
            </View>
            <View style={[styles.toggleTrack, caregiverSupport && styles.toggleTrackActive]}>
              <View style={[styles.toggleThumb, caregiverSupport && styles.toggleThumbActive]} />
            </View>
          </Pressable>

          <View style={styles.sessionPrivacyNote}>
            <Text style={styles.privacyText}>
              Profile details are sent to the MED-NEXIS backend. Demo login is not authentication; do not use real personal information yet.
            </Text>
          </View>

          {saveError ? (
            <Text accessibilityRole="alert" style={styles.formError}>
              {saveError}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: isSaving }}
            disabled={isSaving}
            onPress={saveProfile}
            style={({ pressed }) => [styles.continueButton, styles.saveProfileButton, pressed && styles.pressed]}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <Text style={styles.continueButtonText}>Save profile</Text>
            )}
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

function FieldError({ message }: { message: string }) {
  return (
    <Text accessibilityRole="alert" style={styles.formError}>
      {message}
    </Text>
  );
}

function MedicationEditor({
  initialMedication,
  patientId,
  onCancel,
  onSave,
}: {
  initialMedication: Medication | null;
  patientId: string;
  onCancel: () => void;
  onSave: (medication: MedicationDraft) => Promise<void>;
}) {
  const [medicationName, setMedicationName] = useState(initialMedication?.medicationName ?? '');
  const [dosage, setDosage] = useState(initialMedication?.dosage ?? '');
  const [frequency, setFrequency] = useState(initialMedication?.frequency ?? '');
  const [scheduledTimes, setScheduledTimes] = useState(
    initialMedication?.scheduledTimes.join(', ') ?? '',
  );
  const [startDate, setStartDate] = useState(
    initialMedication?.startDate ?? new Date().toISOString().slice(0, 10),
  );
  const [endDate, setEndDate] = useState(initialMedication?.endDate ?? '');
  const [refillQuantity, setRefillQuantity] = useState(
    initialMedication?.refillQuantity === undefined
      ? ''
      : String(initialMedication.refillQuantity),
  );
  const [remainingQuantity, setRemainingQuantity] = useState(
    initialMedication?.remainingQuantity === undefined
      ? ''
      : String(initialMedication.remainingQuantity),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit() {
    if (isSaving) {
      return;
    }

    const times = scheduledTimes
      .split(',')
      .map((time) => time.trim())
      .filter(Boolean);
    const quantityIsValid = (value: string) => value === '' || /^\d+$/.test(value);

    if (!patientId) {
      setError('Create a patient profile before saving medication details.');
      return;
    }
    if (!medicationName.trim() || !dosage.trim() || !frequency.trim()) {
      setError('Medication name, dosage, and frequency are required.');
      return;
    }
    if (!times.length || !times.every((time) => /^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
      setError('Enter one or more times using 24-hour HH:mm format, separated by commas.');
      return;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setError('Enter the start date as YYYY-MM-DD.');
      return;
    }
    if (endDate && (!/^\d{4}-\d{2}-\d{2}$/.test(endDate) || endDate < startDate)) {
      setError('End date must be YYYY-MM-DD and on or after the start date.');
      return;
    }
    if (!quantityIsValid(refillQuantity) || !quantityIsValid(remainingQuantity)) {
      setError('Quantities must be non-negative whole numbers.');
      return;
    }

    setError('');
    setIsSaving(true);
    try {
      await onSave({
        patientId,
        medicationName: medicationName.trim(),
        dosage: dosage.trim(),
        frequency: frequency.trim(),
        scheduledTimes: times,
        startDate,
        ...(endDate ? { endDate } : {}),
        ...(refillQuantity ? { refillQuantity: Number(refillQuantity) } : {}),
        ...(remainingQuantity ? { remainingQuantity: Number(remainingQuantity) } : {}),
      });
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save medication. Please try again.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View style={styles.medicationEditor}>
      <Text style={styles.medicationEditorTitle}>
        {initialMedication ? 'Edit medication' : 'Add medication'}
      </Text>
      <Text style={styles.medicationEditorNote}>
        Enter the name, dosage, and schedule exactly as prescribed. MED-NEXIS does not recommend or change treatment.
      </Text>

      <Text style={styles.formLabel}>Medication name *</Text>
      <TextInput
        accessibilityLabel="Medication name"
        onChangeText={setMedicationName}
        placeholder="Enter prescribed name"
        placeholderTextColor="#9AA5AE"
        style={styles.formInput}
        value={medicationName}
      />
      <Text style={styles.formLabel}>Dosage as prescribed *</Text>
      <TextInput
        accessibilityLabel="Dosage as prescribed"
        onChangeText={setDosage}
        placeholder="Enter the prescribed dosage"
        placeholderTextColor="#9AA5AE"
        style={styles.formInput}
        value={dosage}
      />
      <Text style={styles.formLabel}>Frequency *</Text>
      <TextInput
        accessibilityLabel="Frequency as prescribed"
        onChangeText={setFrequency}
        placeholder="Enter frequency as prescribed"
        placeholderTextColor="#9AA5AE"
        style={styles.formInput}
        value={frequency}
      />
      <Text style={styles.formLabel}>Scheduled times *</Text>
      <TextInput
        accessibilityLabel="Scheduled times in 24-hour format"
        onChangeText={setScheduledTimes}
        placeholder="08:00, 20:00"
        placeholderTextColor="#9AA5AE"
        style={styles.formInput}
        value={scheduledTimes}
      />
      <Text style={styles.medicationFieldHint}>Use 24-hour HH:mm times separated by commas.</Text>
      <Text style={styles.formLabel}>Start date *</Text>
      <TextInput
        accessibilityLabel="Medication start date"
        onChangeText={setStartDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9AA5AE"
        style={styles.formInput}
        value={startDate}
      />
      <Text style={styles.formLabel}>End date (optional)</Text>
      <TextInput
        accessibilityLabel="Medication end date, optional"
        onChangeText={setEndDate}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#9AA5AE"
        style={styles.formInput}
        value={endDate}
      />
      <Text style={styles.formLabel}>Refill quantity (optional)</Text>
      <TextInput
        accessibilityLabel="Refill quantity, optional"
        keyboardType="number-pad"
        onChangeText={(value) => setRefillQuantity(value.replace(/\D/g, ''))}
        placeholder="Enter quantity"
        placeholderTextColor="#9AA5AE"
        style={styles.formInput}
        value={refillQuantity}
      />
      <Text style={styles.formLabel}>Remaining quantity (optional)</Text>
      <TextInput
        accessibilityLabel="Remaining quantity, optional"
        keyboardType="number-pad"
        onChangeText={(value) => setRemainingQuantity(value.replace(/\D/g, ''))}
        placeholder="Enter quantity"
        placeholderTextColor="#9AA5AE"
        style={styles.formInput}
        value={remainingQuantity}
      />

      {error ? (
        <Text accessibilityRole="alert" style={styles.formError}>
          {error}
        </Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ disabled: isSaving }}
        disabled={isSaving}
        onPress={() => void submit()}
        style={({ pressed }) => [styles.continueButton, styles.medicationSaveButton, pressed && styles.pressed]}
      >
        {isSaving ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.continueButtonText}>
            {initialMedication ? 'Save changes' : 'Save medication'}
          </Text>
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        disabled={isSaving}
        onPress={onCancel}
        style={({ pressed }) => [styles.medicationCancelButton, pressed && styles.pressed]}
      >
        <Text style={styles.medicationActionText}>Cancel</Text>
      </Pressable>
    </View>
  );
}

function Dashboard({
  initialScreen,
  profile,
  profileSaveMessage,
  phone,
  onApplyProfileLanguage,
  onEditProfile,
}: {
  initialScreen: Screen;
  profile: PatientProfile | null;
  profileSaveMessage: string;
  phone: string;
  onApplyProfileLanguage: (language: string) => void;
  onEditProfile: (profile: PatientProfile | null) => void;
}) {
  const { width } = useWindowDimensions();
  const { locale } = useLanguage();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [medicationRecords, setMedicationRecords] = useState<Medication[]>([]);
  const [isLoadingMedications, setIsLoadingMedications] = useState(false);
  const [medicationLoadError, setMedicationLoadError] = useState('');
  const [medicationRefreshKey, setMedicationRefreshKey] = useState(0);
  const [medicationFormMode, setMedicationFormMode] = useState<'closed' | 'create' | 'edit'>('closed');
  const [editingMedication, setEditingMedication] = useState<Medication | null>(null);
  const [medicationSaveMessage, setMedicationSaveMessage] = useState('');
  const [medicationActionError, setMedicationActionError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [deletingMedicationId, setDeletingMedicationId] = useState<string | null>(null);
  const [displayProfile, setDisplayProfile] = useState(profile);
  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [profileLoadError, setProfileLoadError] = useState('');
  const [profileRefreshKey, setProfileRefreshKey] = useState(0);
  const contentWidth = Math.min(width, 560);

  useEffect(() => {
    if (screen !== 'Profile' || !profile?.id) {
      setDisplayProfile(profile);
      return;
    }

    let cancelled = false;
    setIsLoadingProfile(true);
    setProfileLoadError('');

    void requestPatient(`/${encodeURIComponent(profile.id)}`, 'GET')
      .then((savedProfile) => {
        if (!cancelled) {
          setDisplayProfile(savedProfile);
          onApplyProfileLanguage(savedProfile.language);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setProfileLoadError(
            error instanceof Error ? error.message : 'Could not load your profile.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingProfile(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [screen, profile?.id, profileRefreshKey, onApplyProfileLanguage]);

  useEffect(() => {
    if (!['Home', 'Medicines', 'Refills'].includes(screen)) {
      return;
    }
    if (!profile?.id) {
      setMedicationRecords([]);
      setMedicationLoadError('');
      setIsLoadingMedications(false);
      return;
    }

    let cancelled = false;
    setIsLoadingMedications(true);
    setMedicationLoadError('');
    void fetchPatientMedications(profile.id)
      .then((items) => {
        if (!cancelled) {
          setMedicationRecords(items);
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setMedicationLoadError(
            error instanceof Error ? error.message : 'Could not load medications.',
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setIsLoadingMedications(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [screen, profile?.id, medicationRefreshKey]);

  function openMedicationForm(medication: Medication | null = null) {
    setMedicationActionError('');
    setMedicationSaveMessage('');
    setEditingMedication(medication);
    setMedicationFormMode(medication ? 'edit' : 'create');
  }

  async function saveMedication(draft: MedicationDraft) {
    if (!profile?.id) {
      throw new Error('Create a patient profile before saving medications.');
    }

    const input = { ...draft, patientId: profile.id };
    const saved = await requestMedication(
      medicationFormMode === 'edit' && editingMedication
        ? `/${encodeURIComponent(editingMedication.id)}`
        : '',
      medicationFormMode === 'edit' ? 'PUT' : 'POST',
      input,
    );
    if (!saved) {
      throw new Error('The medication was not returned by the API.');
    }

    setMedicationFormMode('closed');
    setEditingMedication(null);
    setMedicationActionError('');
    setMedicationSaveMessage(
      medicationFormMode === 'edit' ? 'Medication updated.' : 'Medication saved.',
    );
    setMedicationRefreshKey((current) => current + 1);
  }

  async function deleteMedication(id: string) {
    setDeletingMedicationId(id);
    setMedicationActionError('');
    try {
      await requestMedication(`/${encodeURIComponent(id)}`, 'DELETE');
      setPendingDeleteId(null);
      setMedicationSaveMessage('Medication deleted.');
      setMedicationRefreshKey((current) => current + 1);
    } catch (error) {
      setMedicationActionError(
        error instanceof Error ? error.message : 'Could not delete medication.',
      );
    } finally {
      setDeletingMedicationId(null);
    }
  }

  function renderMedicationList(items: Medication[], manageable = false) {
    if (isLoadingMedications) {
      return (
        <View style={styles.medicationStatus}>
          <ActivityIndicator color="#147E76" />
          <Text style={styles.profileStatusText}>Loading medications…</Text>
        </View>
      );
    }
    if (medicationLoadError) {
      return (
        <View style={styles.profileErrorBox}>
          <Text accessibilityRole="alert" style={styles.profileErrorText}>
            {medicationLoadError}
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setMedicationRefreshKey((current) => current + 1)}
            style={({ pressed }) => [styles.profileRetryButton, pressed && styles.pressed]}
          >
            <Text style={styles.textActionLabel}>Try again</Text>
          </Pressable>
        </View>
      );
    }
    if (!profile?.id) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.placeholderDescription}>
            Create a patient profile before adding medications. Guest access remains available, but medication records need a saved profile.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onEditProfile(null)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backButtonText}>Create profile</Text>
          </Pressable>
        </View>
      );
    }
    if (items.length === 0) {
      return (
        <View style={styles.emptyState}>
          <Text style={styles.placeholderDescription}>
            No medications saved yet. Add details exactly as written on the prescription.
          </Text>
          {manageable ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => openMedicationForm()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <Text style={styles.backButtonText}>Add medication</Text>
            </Pressable>
          ) : null}
        </View>
      );
    }

    return (
      <View style={styles.listCard}>
        <View style={styles.sampleNotice}>
          <Text style={styles.sampleDot}>i</Text>
          <Text style={styles.sampleNoticeText}>
            Entered medication details. Follow the prescription from your healthcare professional.
          </Text>
        </View>
        {items.map((medication, index) => (
            <View
              key={medication.id}
              style={[
                styles.medicationRow,
                index < items.length - 1 && styles.listDivider,
              ]}
            >
              <View style={styles.medicationDetails}>
                <UntranslatedText style={styles.medicationName}>{medication.medicationName}</UntranslatedText>
                <UntranslatedText style={styles.medicationSchedule}>
                  {medication.dosage} · {medication.frequency}
                </UntranslatedText>
                <Text style={styles.medicationSchedule}>
                  <UntranslatedText>{medication.scheduledTimes.join(', ')} · </UntranslatedText>
                  {translateCopy('Starts', locale)} <UntranslatedText>{medication.startDate}</UntranslatedText>
                </Text>
              </View>
              {manageable ? (
                <View style={styles.medicationActions}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${translateCopy('Edit', locale)} ${medication.medicationName}`}
                    onPress={() => openMedicationForm(medication)}
                    style={({ pressed }) => [styles.medicationActionButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.medicationActionText}>Edit</Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${translateCopy('Delete', locale)} ${medication.medicationName}`}
                    onPress={() => setPendingDeleteId(medication.id)}
                    style={({ pressed }) => [styles.medicationActionButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.medicationDeleteText}>Delete</Text>
                  </Pressable>
                </View>
              ) : null}
              {pendingDeleteId === medication.id ? (
                <View style={styles.deleteConfirm}>
                  <Text style={styles.profileErrorText}>Delete this medication?</Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={deletingMedicationId === medication.id}
                    onPress={() => void deleteMedication(medication.id)}
                    style={({ pressed }) => [styles.profileRetryButton, pressed && styles.pressed]}
                  >
                    <Text style={styles.medicationDeleteText}>
                      {deletingMedicationId === medication.id ? 'Deleting…' : 'Confirm delete'}
                    </Text>
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    onPress={() => setPendingDeleteId(null)}
                    style={styles.profileRetryButton}
                  >
                    <Text style={styles.medicationActionText}>Cancel</Text>
                  </Pressable>
                </View>
              ) : null}
            </View>
          ))}
      </View>
    );
  }

  function renderRefillList(items: Medication[]) {
    const withQuantity = items.filter(
      (item) => item.remainingQuantity !== undefined || item.refillQuantity !== undefined,
    );
    if (!profile?.id) {
      return <Text style={styles.placeholderDescription}>Create a profile to view saved refill quantities.</Text>;
    }
    if (isLoadingMedications) {
      return <View style={styles.medicationStatus}><ActivityIndicator color="#147E76" /><Text style={styles.profileStatusText}>Loading refill details…</Text></View>;
    }
    if (medicationLoadError) {
      return <Text accessibilityRole="alert" style={styles.profileErrorText}>{medicationLoadError}</Text>;
    }
    if (withQuantity.length === 0) {
      return <Text style={styles.placeholderDescription}>No refill quantities have been entered for your medications.</Text>;
    }

    return (
      <View style={styles.listCard}>
        {withQuantity.map((item, index) => (
          <View
            key={item.id}
            style={[styles.refillRow, index < withQuantity.length - 1 && styles.listDivider]}
          >
            <View style={styles.medicationDetails}>
              <UntranslatedText style={styles.medicationName}>{item.medicationName}</UntranslatedText>
              <Text style={styles.medicationSchedule}>
                {item.remainingQuantity !== undefined
                  ? <><UntranslatedText>{item.remainingQuantity} </UntranslatedText>{translateCopy('remaining', locale)}</>
                  : 'Remaining quantity not entered'}
              </Text>
            </View>
            <Text style={styles.supplyLabel}>
              {item.refillQuantity !== undefined
                ? <><UntranslatedText>{item.refillQuantity} </UntranslatedText>{translateCopy('refill quantity', locale)}</>
                : ''}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  function renderDashboard() {
    return (
      <>
        <View style={styles.greeting}>
          <Text style={styles.greetingTitle}>Good morning</Text>
          <Text style={styles.greetingSubtitle}>Your medication routine, in one place.</Text>
        </View>

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Today&apos;s medications</Text>
          <Text style={styles.progressText}>
            <UntranslatedText>{medicationRecords.length} </UntranslatedText>
            {translateCopy('saved', locale)}
          </Text>
        </View>
        {renderMedicationList(medicationRecords.slice(0, 3))}

        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Upcoming refills</Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => setScreen('Refills')}
            style={styles.textAction}
          >
            <Text style={styles.textActionLabel}>View all</Text>
          </Pressable>
        </View>
        {renderRefillList(medicationRecords.slice(0, 3))}

        <Text style={styles.quickActionsHeading}>Quick actions</Text>
        <View style={styles.quickActions}>
          <QuickAction label="Medication schedule" symbol="≡" onPress={() => setScreen('Medicines')} />
          <QuickAction label="Scan prescription" symbol="□" onPress={() => setScreen('Scan prescription')} />
          <QuickAction label="Caregiver support" symbol="♡" onPress={() => setScreen('Caregiver support')} />
        </View>
      </>
    );
  }

  function renderScreen() {
    if (screen === 'Home') {
      return renderDashboard();
    }

    if (screen === 'Medicines') {
      return (
        <>
          <ScreenHeading
            title="Medication schedule"
            subtitle="Manage medication details from your prescription."
          />
          {medicationFormMode === 'closed' ? (
            <>
              {profile?.id ? (
                <Pressable
                  accessibilityRole="button"
                  onPress={() => openMedicationForm()}
                  style={({ pressed }) => [styles.continueButton, styles.addMedicationButton, pressed && styles.pressed]}
                >
                  <Text style={styles.continueButtonText}>Add medication</Text>
                </Pressable>
              ) : null}
              {medicationSaveMessage ? (
                <Text accessibilityRole="alert" style={styles.profileSuccess}>{medicationSaveMessage}</Text>
              ) : null}
              {medicationActionError ? (
                <Text accessibilityRole="alert" style={styles.profileErrorText}>{medicationActionError}</Text>
              ) : null}
              {renderMedicationList(medicationRecords, true)}
            </>
          ) : (
            <MedicationEditor
              initialMedication={medicationFormMode === 'edit' ? editingMedication : null}
              patientId={profile?.id ?? ''}
              onCancel={() => {
                setMedicationFormMode('closed');
                setEditingMedication(null);
              }}
              onSave={saveMedication}
            />
          )}
        </>
      );
    }

    if (screen === 'Refills') {
      return (
        <>
          <ScreenHeading
            title="Upcoming refills"
            subtitle="Refill quantities entered for your saved medications."
          />
          {renderRefillList(medicationRecords)}
        </>
      );
    }

    if (screen === 'Scan prescription') {
      return (
        <PrescriptionScanner
          patientId={profile?.id}
          onBack={() => setScreen('Home')}
          onCreateProfile={() => onEditProfile(null)}
        />
      );
    }

    if (screen === 'Profile') {
      return displayProfile ? (
        <View>
          <ScreenHeading
            title="Your profile"
            subtitle="Profile details retrieved from the backend."
          />
          {isLoadingProfile ? (
            <View style={styles.profileStatus}>
              <ActivityIndicator color="#147E76" />
              <Text style={styles.profileStatusText}>Loading profile…</Text>
            </View>
          ) : null}
          {profileLoadError ? (
            <View style={styles.profileErrorBox}>
              <Text accessibilityRole="alert" style={styles.profileErrorText}>
                {profileLoadError}
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={() => setProfileRefreshKey((current) => current + 1)}
                style={({ pressed }) => [styles.profileRetryButton, pressed && styles.pressed]}
              >
                <Text style={styles.textActionLabel}>Try again</Text>
              </Pressable>
            </View>
          ) : null}
          {profileSaveMessage ? (
            <Text accessibilityRole="alert" style={styles.profileSuccess}>
              {profileSaveMessage}
            </Text>
          ) : null}
          <View style={styles.profileCard}>
            <ProfileDetail label="Patient name" value={displayProfile.fullName} />
            <ProfileDetail label="Age" value={displayProfile.age} />
            <ProfileDetail
              label="Registered phone"
              value={
                displayProfile.phone
                  ? `+91 ${displayProfile.phone}`
                  : translateCopy('Not provided', locale)
              }
            />
            <ProfileDetail
              label="Preferred language"
              value={
                localeOptions.find((option) => option.profileName === displayProfile.language)
                  ?.nativeName ?? displayProfile.language
              }
            />
            {displayProfile.emergencyContactName || displayProfile.emergencyContactPhone ? (
              <ProfileDetail
                label="Emergency contact"
                value={[
                  displayProfile.emergencyContactName,
                  displayProfile.emergencyContactPhone
                    ? `+91 ${displayProfile.emergencyContactPhone}`
                    : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
              />
            ) : null}
            <ProfileDetail
              label="Caregiver support"
              value={translateCopy(
                displayProfile.caregiverSupport ? 'Enabled' : 'Not enabled',
                locale,
              )}
              last
            />
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => onEditProfile(displayProfile)}
            style={({ pressed }) => [styles.continueButton, styles.editProfileButton, pressed && styles.pressed]}
          >
            <Text style={styles.continueButtonText}>Edit profile</Text>
          </Pressable>
          <Text style={styles.profileSessionNote}>
            This prototype has no authentication. Do not use real personal information until access controls are implemented.
          </Text>
        </View>
      ) : (
        <View style={styles.placeholderCard}>
          <Text style={styles.placeholderTitle}>No profile saved</Text>
          <Text style={styles.placeholderDescription}>
            You are exploring as a guest. Create a profile to keep your details available during this session.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => onEditProfile(null)}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <Text style={styles.backButtonText}>Create profile</Text>
          </Pressable>
        </View>
      );
    }

    const placeholderContent: Record<
      Exclude<Screen, 'Home' | 'Medicines' | 'Refills'>,
      { title: string; description: string }
    > = {
      Profile: {
        title: 'Profile',
        description: 'Profile settings are not available in this preview.',
      },
      'Scan prescription': {
        title: 'Scan prescription',
        description: 'Select a prescription image to review its extracted text.',
      },
      'Caregiver support': {
        title: 'Caregiver support',
        description: 'Caregiver access is not available yet.',
      },
      Notifications: {
        title: 'Notifications',
        description: 'Notification settings are not available in this preview.',
      },
    };
    const content = placeholderContent[screen];

    return (
      <View style={styles.placeholderCard}>
        <Text style={styles.placeholderTitle}>{content.title}</Text>
        <Text style={styles.placeholderDescription}>{content.description}</Text>
        <Pressable
          accessibilityRole="button"
          onPress={() => setScreen('Home')}
          style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
        >
          <Text style={styles.backButtonText}>Back to home</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.appFrame}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.page, { width: contentWidth }]}>
            <View style={styles.header}>
              <Text style={styles.wordmark}>MED-NEXIS</Text>
              <View style={styles.headerActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Notifications"
                  onPress={() => setScreen('Notifications')}
                  style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}
                >
                  <View style={styles.bellShape}>
                    <View style={styles.bellClapper} />
                  </View>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Open profile"
                  onPress={() => setScreen('Profile')}
                  style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
                >
                  <Text style={styles.avatarText}>ME</Text>
                </Pressable>
              </View>
            </View>
            <LanguageSelector />

            {renderScreen()}

            <Text style={styles.footerNote}>
              Demo only. Follow your healthcare professional&apos;s instructions.
            </Text>
          </View>
        </ScrollView>

        <View style={styles.navigationBar}>
          <View style={[styles.navigationInner, { width: contentWidth }]}>
            {screens.map((tab) => (
              <Pressable
                key={tab}
                accessibilityRole="button"
                accessibilityLabel={`${translateCopy(tab, locale)}${screen === tab ? `, ${translateCopy('selected', locale)}` : ''}`}
                accessibilityState={{ selected: screen === tab }}
                onPress={() => setScreen(tab)}
                style={styles.navigationItem}
              >
                <Text style={[styles.navigationSymbol, screen === tab && styles.navigationSymbolActive]}>
                  {tab === 'Home' ? '⌂' : tab === 'Medicines' ? '≡' : tab === 'Refills' ? '↻' : '○'}
                </Text>
                <Text style={[styles.navigationLabel, screen === tab && styles.navigationLabelActive]}>
                  {tab}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

function PrescriptionScanner({
  patientId,
  onBack,
  onCreateProfile,
}: {
  patientId?: string;
  onBack: () => void;
  onCreateProfile: () => void;
}) {
  const { locale } = useLanguage();
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [extraction, setExtraction] = useState<PrescriptionExtraction | null>(null);
  const [patientName, setPatientName] = useState('');
  const [prescriptionDate, setPrescriptionDate] = useState('');
  const [medicines, setMedicines] = useState<PrescriptionMedicineDraft[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [userConfirmed, setUserConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [saveComplete, setSaveComplete] = useState(false);

  async function selectImage(useCamera: boolean) {
    setError('');
    try {
      let result: ImagePicker.ImagePickerResult;
      if (useCamera) {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError('Camera permission is unavailable. You can choose an image from your files instead.');
          return;
        }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsEditing: false,
          quality: 0.85,
        });
      }

      if (result.canceled || !result.assets[0]) {
        return;
      }
      const selected = result.assets[0];
      const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (selected.mimeType && !acceptedTypes.includes(selected.mimeType)) {
        setError('Choose a JPEG, PNG, or WebP image.');
        return;
      }
      if (selected.fileSize && selected.fileSize > 8 * 1024 * 1024) {
        setError('Choose an image that is 8 MB or smaller.');
        return;
      }

      setImage(selected);
      setExtraction(null);
      setPatientName('');
      setPrescriptionDate('');
      setMedicines([]);
      setUserConfirmed(false);
      setSaveComplete(false);
    } catch {
      setError(
        useCamera
          ? 'The camera is unavailable in this browser or device. Choose an image from your files instead.'
          : 'Could not open the image picker. Check browser or device permissions and try again.',
      );
    }
  }

  async function processImage() {
    if (!image) {
      return;
    }
    setIsProcessing(true);
    setError('');
    setExtraction(null);
    setMedicines([]);
    setUserConfirmed(false);
    setSaveComplete(false);
    try {
      const result = await processPrescriptionImage(image);
      const entries = result.medicines.length
        ? result.medicines
        : [
            {
              sourceText: '',
              medicationName: '',
              dosage: '',
              frequency: '',
              timing: '',
              duration: '',
              quantity: '',
              needsManualReview: [
                'medicationName',
                'dosage',
                'frequency',
                'timing',
                'duration',
                'quantity',
              ],
            },
          ];
      setExtraction(result);
      setPatientName(result.patientName);
      setPrescriptionDate(result.prescriptionDate);
      setMedicines(entries);
    } catch (processingError) {
      setError(
        processingError instanceof Error
          ? processingError.message
          : 'Could not process this image. Try another image.',
      );
    } finally {
      setIsProcessing(false);
    }
  }

  function updateMedicine(index: number, field: keyof PrescriptionMedicineDraft, value: string) {
    setMedicines((current) =>
      current.map((medicine, medicineIndex) =>
        medicineIndex === index ? { ...medicine, [field]: value } : medicine,
      ),
    );
  }

  async function savePrescription() {
    if (!patientId || !extraction || !userConfirmed || medicines.length === 0) {
      return;
    }
    if (medicines.some((medicine) => !medicine.medicationName.trim())) {
      setError('Enter a medicine name for each reviewed entry, or remove entries that are not medicines.');
      return;
    }

    setIsSaving(true);
    setError('');
    try {
      await saveReviewedPrescription(patientId, {
        ...extraction,
        patientName: patientName.trim(),
        prescriptionDate: prescriptionDate.trim(),
        medicines,
      });
      setSaveComplete(true);
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : 'Could not save the reviewed prescription.',
      );
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <View>
      <ScreenHeading
        title="Scan prescription"
        subtitle="Extracted text is only a draft. Check every detail against the original."
      />
      <Text style={styles.prescriptionPrivacyNote}>
        The selected image is sent to the MED-NEXIS backend for OCR and is not stored as an image. Do not upload real patient information; this prototype has no sign-in or access controls.
      </Text>

      {!image ? (
        <View style={styles.prescriptionPicker}>
          <Text style={styles.prescriptionPickerTitle}>Choose a prescription image</Text>
          <Text style={styles.prescriptionPickerDescription}>
            Use a clear, well-lit JPEG, PNG, or WebP image up to 8 MB.
          </Text>
          <Pressable
            accessibilityRole="button"
            onPress={() => void selectImage(true)}
            style={({ pressed }) => [styles.continueButton, pressed && styles.pressed]}
          >
            <Text style={styles.continueButtonText}>Use camera</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            onPress={() => void selectImage(false)}
            style={({ pressed }) => [styles.prescriptionSecondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.prescriptionSecondaryButtonText}>Choose from gallery or files</Text>
          </Pressable>
        </View>
      ) : (
        <>
          <Image
            accessibilityLabel="Selected prescription image preview"
            source={{ uri: image.uri }}
            resizeMode="contain"
            style={styles.prescriptionPreview}
          />
          <View style={styles.prescriptionImageActions}>
            <Pressable
              accessibilityRole="button"
              disabled={isProcessing || isSaving}
              onPress={() => void selectImage(true)}
              style={({ pressed }) => [styles.prescriptionSecondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.prescriptionSecondaryButtonText}>Retake</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              disabled={isProcessing || isSaving}
              onPress={onBack}
              style={({ pressed }) => [styles.prescriptionSecondaryButton, pressed && styles.pressed]}
            >
              <Text style={styles.prescriptionSecondaryButtonText}>Cancel</Text>
            </Pressable>
          </View>
          {!extraction ? (
            <Pressable
              accessibilityRole="button"
              disabled={isProcessing}
              onPress={() => void processImage()}
              style={({ pressed }) => [
                styles.continueButton,
                isProcessing && styles.continueButtonDisabled,
                pressed && styles.pressed,
              ]}
            >
              {isProcessing ? (
                <View style={styles.prescriptionLoadingRow}>
                  <ActivityIndicator color="#FFFFFF" />
                  <Text style={styles.continueButtonText}>Reading image…</Text>
                </View>
              ) : (
                <Text style={styles.continueButtonText}>Process image</Text>
              )}
            </Pressable>
          ) : null}
        </>
      )}

      {error ? (
        <Text accessibilityRole="alert" style={styles.profileErrorText}>
          {error}
        </Text>
      ) : null}

      {extraction ? (
        <View style={styles.prescriptionReview}>
          <Text style={styles.prescriptionReviewTitle}>Review extracted details</Text>
          <Text style={styles.prescriptionWarning}>
            OCR can misread printed or handwritten text. Verify the information using the original prescription or a pharmacist/doctor. Nothing here creates a medication schedule.
          </Text>
          <Text style={styles.formLabel}>Patient name (if shown)</Text>
          <TextInput
            accessibilityLabel="Review patient name"
            value={patientName}
            onChangeText={setPatientName}
            placeholder="Not identified"
            style={styles.formInput}
          />
          <Text style={styles.formLabel}>Prescription date (if shown)</Text>
          <TextInput
            accessibilityLabel="Review prescription date"
            value={prescriptionDate}
            onChangeText={setPrescriptionDate}
            placeholder="Not identified"
            style={styles.formInput}
          />

          {medicines.map((medicine, index) => (
            <View key={`prescription-medicine-${index}`} style={styles.prescriptionMedicineCard}>
              <View style={styles.prescriptionMedicineHeading}>
                <Text style={styles.prescriptionMedicineTitle}>
                  {translateCopy('Medicine', locale)} {index + 1}
                </Text>
                {medicines.length > 1 ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${translateCopy('Remove', locale)} ${translateCopy('Medicine', locale)} ${index + 1}`}
                    onPress={() => setMedicines((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                    style={styles.textAction}
                  >
                    <Text style={styles.textActionLabel}>Remove</Text>
                  </Pressable>
                ) : null}
              </View>
              {medicine.sourceText ? (
                <Text style={styles.prescriptionSourceText}>
                  {translateCopy('OCR line:', locale)}{' '}
                  <UntranslatedText>{medicine.sourceText}</UntranslatedText>
                </Text>
              ) : null}
              {(
                [
                  ['medicationName', 'Medicine name'],
                  ['dosage', 'Dosage'],
                  ['frequency', 'Frequency'],
                  ['timing', 'Timing or instructions'],
                  ['duration', 'Duration'],
                  ['quantity', 'Quantity'],
                ] as const
              ).map(([field, label]) => (
                <View key={field}>
                  <Text style={styles.formLabel}>
                    {translateCopy(label, locale)} {translateCopy('— verify', locale)}
                  </Text>
                  <TextInput
                    accessibilityLabel={`${translateCopy('Review', locale)} ${translateCopy(label, locale).toLowerCase()} ${translateCopy('for medicine', locale)} ${index + 1}`}
                    value={medicine[field]}
                    onChangeText={(value) => updateMedicine(index, field, value)}
                    placeholder="Not identified — enter only from the prescription"
                    style={styles.formInput}
                  />
                </View>
              ))}
            </View>
          ))}

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              setMedicines((current) => [
                ...current,
                {
                  sourceText: '',
                  medicationName: '',
                  dosage: '',
                  frequency: '',
                  timing: '',
                  duration: '',
                  quantity: '',
                  needsManualReview: [
                    'medicationName',
                    'dosage',
                    'frequency',
                    'timing',
                    'duration',
                    'quantity',
                  ],
                },
              ])
            }
            style={({ pressed }) => [styles.prescriptionSecondaryButton, pressed && styles.pressed]}
          >
            <Text style={styles.prescriptionSecondaryButtonText}>Add medicine entry</Text>
          </Pressable>
          <Text style={styles.formLabel}>Original OCR text (for comparison)</Text>
          <UntranslatedText selectable style={styles.prescriptionOcrText}>
            {extraction.originalOcrText}
          </UntranslatedText>

          {patientId ? (
            <>
              <Pressable
                accessibilityRole="checkbox"
                accessibilityState={{ checked: userConfirmed }}
                onPress={() => setUserConfirmed((current) => !current)}
                style={styles.prescriptionConfirmation}
              >
                <View style={[styles.prescriptionCheckbox, userConfirmed && styles.prescriptionCheckboxChecked]}>
                  {userConfirmed ? <Text style={styles.prescriptionCheckboxMark}>✓</Text> : null}
                </View>
                <Text style={styles.prescriptionConfirmationText}>
                  I have checked these details against the original prescription.
                </Text>
              </Pressable>
              {saveComplete ? (
                <View style={styles.prescriptionSuccessBox}>
                  <Text style={styles.prescriptionSuccessText}>
                    Reviewed prescription details saved. No medication schedule was created.
                  </Text>
                </View>
              ) : (
                <Pressable
                  accessibilityRole="button"
                  disabled={!userConfirmed || isSaving}
                  onPress={() => void savePrescription()}
                  style={({ pressed }) => [
                    styles.continueButton,
                    (!userConfirmed || isSaving) && styles.continueButtonDisabled,
                    pressed && styles.pressed,
                  ]}
                >
                  {isSaving ? (
                    <View style={styles.prescriptionLoadingRow}>
                      <ActivityIndicator color="#FFFFFF" />
                      <Text style={styles.continueButtonText}>Saving reviewed details…</Text>
                    </View>
                  ) : (
                    <Text style={styles.continueButtonText}>Save reviewed prescription</Text>
                  )}
                </Pressable>
              )}
            </>
          ) : (
            <View style={styles.prescriptionWarningBox}>
              <Text style={styles.prescriptionWarning}>
                Create a patient profile to save reviewed prescription metadata. Guest scans are not saved.
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={onCreateProfile}
                style={({ pressed }) => [styles.prescriptionSecondaryButton, pressed && styles.pressed]}
              >
                <Text style={styles.prescriptionSecondaryButtonText}>Create patient profile</Text>
              </Pressable>
            </View>
          )}
        </View>
      ) : null}

      <Pressable
        accessibilityRole="button"
        onPress={onBack}
        style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
      >
        <Text style={styles.backButtonText}>Back to home</Text>
      </Pressable>
    </View>
  );
}

function ProfileDetail({
  label,
  value,
  last = false,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[styles.profileDetail, !last && styles.profileDetailDivider]}>
      <Text style={styles.profileDetailLabel}>{label}</Text>
      <UntranslatedText style={styles.profileDetailValue}>{value}</UntranslatedText>
    </View>
  );
}

function ScreenHeading({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <View style={styles.screenHeading}>
      <Text style={styles.screenTitle}>{title}</Text>
      <Text style={styles.greetingSubtitle}>{subtitle}</Text>
    </View>
  );
}

function QuickAction({
  label,
  symbol,
  onPress,
}: {
  label: string;
  symbol: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [styles.quickAction, pressed && styles.pressed]}
    >
      <Text style={styles.quickActionSymbol}>{symbol}</Text>
      <Text style={styles.quickActionLabel}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  languageLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginSafeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  authScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  authContent: {
    maxWidth: 440,
  },
  loginBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },
  loginBrandMark: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#E9F4F2',
  },
  loginBrandPlus: {
    color: '#147E76',
    fontSize: 29,
    fontWeight: '600',
    lineHeight: 34,
  },
  loginWordmark: {
    color: '#18334B',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  authHeading: {
    marginTop: 42,
    marginBottom: 28,
  },
  authTitle: {
    color: '#18334B',
    fontSize: 28,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  authSubtitle: {
    marginTop: 8,
    color: '#687784',
    fontSize: 15,
    lineHeight: 22,
  },
  fieldLabel: {
    marginBottom: 9,
    color: '#263D50',
    fontSize: 13,
    fontWeight: '600',
  },
  phoneField: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DCE3E7',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  phoneFieldError: {
    borderColor: '#B84B4B',
  },
  countryCode: {
    color: '#263D50',
    fontSize: 15,
    fontWeight: '600',
  },
  phoneDivider: {
    width: 1,
    height: 23,
    marginHorizontal: 13,
    backgroundColor: '#DCE3E7',
  },
  phoneInput: {
    flex: 1,
    minWidth: 0,
    height: 52,
    padding: 0,
    color: '#18334B',
    fontSize: 15,
  },
  fieldHint: {
    minHeight: 33,
    paddingTop: 7,
    color: '#78858D',
    fontSize: 12,
  },
  validationMessage: {
    minHeight: 33,
    paddingTop: 7,
    color: '#A23C3C',
    fontSize: 12,
    lineHeight: 17,
  },
  continueButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    borderRadius: 10,
    backgroundColor: '#18334B',
  },
  continueButtonDisabled: {
    backgroundColor: '#A7B3BB',
  },
  continueButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  privacyNote: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginTop: 19,
  },
  privacyMark: {
    width: 22,
    height: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: '#E9F4F2',
  },
  privacyMarkText: {
    color: '#147E76',
    fontSize: 12,
    fontWeight: '700',
  },
  privacyText: {
    flex: 1,
    color: '#687784',
    fontSize: 12,
    lineHeight: 18,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    marginTop: 28,
    marginBottom: 17,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E8EDEF',
  },
  orText: {
    color: '#89959D',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.7,
  },
  guestButton: {
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#DCE3E7',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  guestButtonText: {
    color: '#263D50',
    fontSize: 14,
    fontWeight: '600',
  },
  authFooter: {
    marginTop: 27,
    color: '#78858D',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  backToLogin: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginBottom: 15,
    paddingRight: 14,
  },
  backToLoginText: {
    color: '#176D67',
    fontSize: 14,
    fontWeight: '600',
  },
  codeInput: {
    height: 58,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#DCE3E7',
    borderRadius: 10,
    color: '#18334B',
    fontSize: 22,
    fontWeight: '600',
    letterSpacing: 10,
    textAlign: 'center',
  },
  demoVerificationNote: {
    marginTop: 12,
    color: '#687784',
    fontSize: 12,
    lineHeight: 18,
  },
  otpGuestButton: {
    marginTop: 16,
  },
  registrationScrollContent: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 12,
    paddingBottom: 36,
  },
  registrationHeading: {
    marginTop: 26,
    marginBottom: 22,
  },
  formLabel: {
    marginTop: 15,
    marginBottom: 8,
    color: '#263D50',
    fontSize: 13,
    fontWeight: '600',
  },
  formInput: {
    width: '100%',
    minHeight: 50,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#DCE3E7',
    borderRadius: 9,
    color: '#18334B',
    fontSize: 14,
    backgroundColor: '#FFFFFF',
  },
  formInputError: {
    borderColor: '#B84B4B',
  },
  formError: {
    alignSelf: 'stretch',
    marginTop: 5,
    color: '#A23C3C',
    fontSize: 12,
    lineHeight: 17,
  },
  readOnlyPhoneField: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E5E9EB',
    borderRadius: 9,
    backgroundColor: '#F7F9FA',
  },
  readOnlyPhoneText: {
    flex: 1,
    color: '#536574',
    fontSize: 14,
  },
  readOnlyLabel: {
    color: '#89959D',
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  languageOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  languageOption: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#DCE3E7',
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
  },
  languageOptionSelected: {
    borderColor: '#147E76',
    backgroundColor: '#EAF4F2',
  },
  languageOptionText: {
    color: '#4F606D',
    fontSize: 12,
    fontWeight: '500',
  },
  languageOptionTextSelected: {
    color: '#176D67',
    fontWeight: '700',
  },
  caregiverRow: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 20,
    paddingVertical: 9,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#EEF1F2',
  },
  caregiverText: {
    flex: 1,
  },
  caregiverTitle: {
    color: '#263D50',
    fontSize: 13,
    fontWeight: '600',
  },
  caregiverHint: {
    marginTop: 3,
    color: '#78858D',
    fontSize: 11,
  },
  toggleTrack: {
    width: 46,
    height: 27,
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderRadius: 14,
    backgroundColor: '#D5DDE1',
  },
  toggleTrackActive: {
    backgroundColor: '#147E76',
  },
  toggleThumb: {
    width: 21,
    height: 21,
    borderRadius: 11,
    backgroundColor: '#FFFFFF',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  sessionPrivacyNote: {
    marginTop: 15,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 8,
    backgroundColor: '#F7F9FA',
  },
  saveProfileButton: {
    marginTop: 19,
  },
  profileCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  profileDetail: {
    minHeight: 64,
    justifyContent: 'center',
    gap: 4,
    paddingHorizontal: 15,
    paddingVertical: 11,
  },
  profileDetailDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F2',
  },
  profileDetailLabel: {
    color: '#78858D',
    fontSize: 11,
  },
  profileDetailValue: {
    color: '#20384D',
    fontSize: 14,
    fontWeight: '600',
  },
  editProfileButton: {
    marginTop: 16,
  },
  profileSessionNote: {
    marginTop: 12,
    color: '#78858D',
    fontSize: 11,
    lineHeight: 17,
    textAlign: 'center',
  },
  profileStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  profileStatusText: {
    color: '#687784',
    fontSize: 12,
  },
  profileErrorBox: {
    marginBottom: 12,
    padding: 12,
    borderRadius: 9,
    backgroundColor: '#FFF5F4',
  },
  profileErrorText: {
    color: '#A23C3C',
    fontSize: 12,
    lineHeight: 18,
  },
  profileRetryButton: {
    minHeight: 40,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    paddingRight: 10,
  },
  profileSuccess: {
    marginBottom: 12,
    color: '#176D67',
    fontSize: 12,
    fontWeight: '600',
  },
  medicationEditor: {
    marginTop: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  medicationEditorTitle: {
    color: '#18334B',
    fontSize: 18,
    fontWeight: '700',
  },
  medicationEditorNote: {
    marginTop: 7,
    color: '#687784',
    fontSize: 12,
    lineHeight: 18,
  },
  medicationFieldHint: {
    marginTop: 5,
    color: '#78858D',
    fontSize: 11,
  },
  medicationSaveButton: {
    marginTop: 16,
  },
  medicationCancelButton: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
  },
  medicationActionText: {
    color: '#176D67',
    fontSize: 12,
    fontWeight: '700',
  },
  medicationDeleteText: {
    color: '#A23C3C',
    fontSize: 12,
    fontWeight: '700',
  },
  medicationStatus: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 12,
  },
  emptyState: {
    marginTop: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  medicationActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  medicationActionButton: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 7,
  },
  deleteConfirm: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 8,
  },
  addMedicationButton: {
    marginBottom: 13,
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  appFrame: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 24,
  },
  page: {
    maxWidth: 560,
    paddingHorizontal: 20,
  },
  header: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F2',
  },
  wordmark: {
    color: '#18334B',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  notificationButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bellShape: {
    width: 15,
    height: 17,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#526474',
    borderTopLeftRadius: 9,
    borderTopRightRadius: 9,
    borderBottomLeftRadius: 3,
    borderBottomRightRadius: 3,
  },
  bellClapper: {
    position: 'absolute',
    bottom: -4,
    width: 5,
    height: 3,
    borderRadius: 2,
    backgroundColor: '#526474',
  },
  avatar: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: '#EAF4F2',
  },
  avatarText: {
    color: '#176D67',
    fontSize: 11,
    fontWeight: '800',
  },
  greeting: {
    paddingTop: 24,
    paddingBottom: 21,
  },
  greetingTitle: {
    color: '#18334B',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  greetingSubtitle: {
    marginTop: 5,
    color: '#687784',
    fontSize: 14,
    lineHeight: 20,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 10,
  },
  sectionTitle: {
    flexShrink: 1,
    color: '#18334B',
    fontSize: 17,
    fontWeight: '700',
  },
  progressText: {
    color: '#63747F',
    fontSize: 12,
    fontWeight: '600',
  },
  progressTrack: {
    height: 4,
    marginBottom: 12,
    overflow: 'hidden',
    borderRadius: 2,
    backgroundColor: '#E9EFEE',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
    backgroundColor: '#16877D',
  },
  listCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  sampleNotice: {
    minHeight: 43,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#E8EDEF',
    backgroundColor: '#F7FAF9',
  },
  sampleDot: {
    width: 17,
    height: 17,
    overflow: 'hidden',
    borderRadius: 9,
    backgroundColor: '#E4F1EF',
    color: '#176D67',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 17,
    textAlign: 'center',
  },
  sampleNoticeText: {
    flex: 1,
    color: '#5E706F',
    fontSize: 11,
    lineHeight: 16,
  },
  medicationRow: {
    minHeight: 72,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  listDivider: {
    borderBottomWidth: 1,
    borderBottomColor: '#EEF1F2',
  },
  medicationTime: {
    width: 57,
    color: '#697985',
    fontSize: 11,
    fontWeight: '600',
  },
  medicationDetails: {
    flex: 1,
    minWidth: 0,
  },
  medicationName: {
    color: '#20384D',
    fontSize: 14,
    fontWeight: '600',
  },
  medicationSchedule: {
    marginTop: 3,
    color: '#75828B',
    fontSize: 11,
    lineHeight: 15,
  },
  markTakenButton: {
    minWidth: 82,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 9,
    borderRadius: 8,
    backgroundColor: '#147E76',
  },
  markTakenButtonText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  takenButton: {
    minWidth: 68,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    borderRadius: 8,
    backgroundColor: '#EDF5F3',
  },
  takenButtonText: {
    color: '#176D67',
    fontSize: 11,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.72,
  },
  textAction: {
    minHeight: 40,
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  textActionLabel: {
    color: '#147E76',
    fontSize: 12,
    fontWeight: '700',
  },
  refillRow: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
    paddingVertical: 10,
  },
  supplyLabel: {
    color: '#566E70',
    fontSize: 11,
    fontWeight: '600',
  },
  quickActionsHeading: {
    marginTop: 23,
    marginBottom: 10,
    color: '#18334B',
    fontSize: 15,
    fontWeight: '700',
  },
  quickActions: {
    flexDirection: 'row',
    gap: 9,
  },
  quickAction: {
    flex: 1,
    minWidth: 0,
    minHeight: 78,
    justifyContent: 'center',
    gap: 7,
    paddingHorizontal: 10,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  quickActionSymbol: {
    color: '#147E76',
    fontSize: 17,
    fontWeight: '600',
  },
  quickActionLabel: {
    color: '#344B5C',
    fontSize: 11,
    fontWeight: '600',
    lineHeight: 15,
  },
  screenHeading: {
    paddingTop: 25,
    paddingBottom: 19,
  },
  screenTitle: {
    color: '#18334B',
    fontSize: 22,
    fontWeight: '700',
  },
  placeholderCard: {
    marginTop: 26,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  placeholderTitle: {
    color: '#18334B',
    fontSize: 18,
    fontWeight: '700',
  },
  placeholderDescription: {
    marginTop: 8,
    color: '#687784',
    fontSize: 14,
    lineHeight: 21,
  },
  prescriptionPrivacyNote: {
    marginBottom: 14,
    padding: 12,
    borderRadius: 9,
    backgroundColor: '#F5F8F8',
    color: '#5D6E76',
    fontSize: 12,
    lineHeight: 18,
  },
  prescriptionPicker: {
    padding: 16,
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
  },
  prescriptionPickerTitle: {
    color: '#18334B',
    fontSize: 16,
    fontWeight: '700',
  },
  prescriptionPickerDescription: {
    marginTop: 6,
    color: '#687784',
    fontSize: 13,
    lineHeight: 19,
  },
  prescriptionSecondaryButton: {
    minHeight: 46,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#DCE3E7',
    borderRadius: 9,
    backgroundColor: '#FFFFFF',
  },
  prescriptionSecondaryButtonText: {
    color: '#176D67',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
  prescriptionPreview: {
    width: '100%',
    height: 280,
    borderWidth: 1,
    borderColor: '#E8EDEF',
    borderRadius: 10,
    backgroundColor: '#F5F7F7',
  },
  prescriptionImageActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },
  prescriptionLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  prescriptionReview: {
    marginTop: 22,
  },
  prescriptionReviewTitle: {
    color: '#18334B',
    fontSize: 18,
    fontWeight: '700',
  },
  prescriptionWarning: {
    marginTop: 8,
    color: '#765A27',
    fontSize: 12,
    lineHeight: 18,
  },
  prescriptionMedicineCard: {
    marginTop: 18,
    padding: 13,
    borderWidth: 1,
    borderColor: '#E3E9E9',
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
  },
  prescriptionMedicineHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  prescriptionMedicineTitle: {
    color: '#18334B',
    fontSize: 15,
    fontWeight: '700',
  },
  prescriptionSourceText: {
    marginTop: 7,
    color: '#687784',
    fontSize: 12,
    lineHeight: 18,
  },
  prescriptionOcrText: {
    minHeight: 64,
    marginTop: 7,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E3E9E9',
    borderRadius: 8,
    color: '#344B5C',
    fontSize: 12,
    lineHeight: 18,
    backgroundColor: '#F8FAFA',
  },
  prescriptionConfirmation: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 18,
  },
  prescriptionCheckbox: {
    width: 23,
    height: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#A8B5BB',
    borderRadius: 5,
  },
  prescriptionCheckboxChecked: {
    borderColor: '#147E76',
    backgroundColor: '#147E76',
  },
  prescriptionCheckboxMark: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    lineHeight: 20,
  },
  prescriptionConfirmationText: {
    flex: 1,
    color: '#344B5C',
    fontSize: 13,
    lineHeight: 19,
  },
  prescriptionSuccessBox: {
    marginTop: 10,
    padding: 13,
    borderRadius: 8,
    backgroundColor: '#EAF4F2',
  },
  prescriptionSuccessText: {
    color: '#176D67',
    fontSize: 13,
    lineHeight: 19,
  },
  prescriptionWarningBox: {
    marginTop: 14,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#FBF7EE',
  },
  backButton: {
    minHeight: 44,
    alignSelf: 'flex-start',
    justifyContent: 'center',
    marginTop: 15,
    paddingHorizontal: 13,
    borderRadius: 8,
    backgroundColor: '#EAF4F2',
  },
  backButtonText: {
    color: '#176D67',
    fontSize: 12,
    fontWeight: '700',
  },
  footerNote: {
    marginTop: 21,
    marginBottom: 6,
    color: '#78858D',
    fontSize: 10,
    lineHeight: 15,
    textAlign: 'center',
  },
  navigationBar: {
    width: '100%',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#E8EDEF',
    backgroundColor: '#FFFFFF',
  },
  navigationInner: {
    maxWidth: 560,
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 8,
    paddingTop: 5,
    paddingBottom: 4,
  },
  navigationItem: {
    flex: 1,
    minHeight: 54,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  navigationSymbol: {
    color: '#77858E',
    fontSize: 20,
    lineHeight: 23,
  },
  navigationSymbolActive: {
    color: '#147E76',
  },
  navigationLabel: {
    color: '#77858E',
    fontSize: 10,
    fontWeight: '500',
  },
  navigationLabelActive: {
    color: '#147E76',
    fontWeight: '700',
  },
});
