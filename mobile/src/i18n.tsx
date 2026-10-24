import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  type PropsWithChildren,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable as NativePressable,
  Text as NativeText,
  TextInput as NativeTextInput,
  type PressableProps,
  type TextInputProps,
  type TextProps,
  View,
} from 'react-native';

export type Locale = 'en' | 'te' | 'hi' | 'kn';

export const localeOptions: readonly {
  code: Locale;
  nativeName: string;
  profileName: 'English' | 'Telugu' | 'Hindi' | 'Kannada';
}[] = [
  { code: 'en', nativeName: 'English', profileName: 'English' },
  { code: 'te', nativeName: 'తెలుగు', profileName: 'Telugu' },
  { code: 'hi', nativeName: 'हिन्दी', profileName: 'Hindi' },
  { code: 'kn', nativeName: 'ಕನ್ನಡ', profileName: 'Kannada' },
];

const rows = {
  'common.language': ['Language', 'భాష', 'भाषा', 'ಭಾಷೆ'],
  'common.selectLanguage': ['Select language', 'భాషను ఎంచుకోండి', 'भाषा चुनें', 'ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ'],
  'common.back': ['‹  Back', '‹  వెనుకకు', '‹  वापस', '‹  ಹಿಂದೆ'],
  'common.cancel': ['Cancel', 'రద్దు చేయండి', 'रद्द करें', 'ರದ್ದುಮಾಡಿ'],
  'common.save': ['Save', 'సేవ్ చేయండి', 'सहेजें', 'ಉಳಿಸಿ'],
  'common.tryAgain': ['Try again', 'మళ్లీ ప్రయత్నించండి', 'फिर कोशिश करें', 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ'],
  'common.createProfile': ['Create profile', 'ప్రొఫైల్ సృష్టించండి', 'प्रोफ़ाइल बनाएँ', 'ಪ್ರೊಫೈಲ್ ರಚಿಸಿ'],
  'common.backHome': ['Back to home', 'హోమ్‌కు తిరిగి వెళ్లండి', 'होम पर वापस जाएँ', 'ಮುಖಪುಟಕ್ಕೆ ಹಿಂತಿರುಗಿ'],
  'common.notProvided': ['Not provided', 'ఇవ్వలేదు', 'नहीं दिया गया', 'ನೀಡಲಾಗಿಲ್ಲ'],
  'common.required': ['required', 'అవసరం', 'ज़रूरी', 'ಅಗತ್ಯ'],
  'common.optional': ['optional', 'ఐచ్ఛికం', 'वैकल्पिक', 'ಐಚ್ಛಿಕ'],
  'common.notEnabled': ['Not enabled', 'ప్రారంభించలేదు', 'चालू नहीं है', 'ಸಕ್ರಿಯಗೊಳಿಸಿಲ್ಲ'],
  'common.enabled': ['Enabled', 'ప్రారంభించబడింది', 'चालू है', 'ಸಕ್ರಿಯವಾಗಿದೆ'],
  'common.selected': ['selected', 'ఎంచుకున్నారు', 'चयनित', 'ಆಯ್ಕೆಮಾಡಲಾಗಿದೆ'],
  'common.or': ['OR', 'లేదా', 'या', 'ಅಥವಾ'],
  'common.loadingProfile': ['Loading profile…', 'ప్రొఫైల్ లోడ్ అవుతోంది…', 'प्रोफ़ाइल लोड हो रही है…', 'ಪ್ರೊಫೈಲ್ ಲೋಡ್ ಆಗುತ್ತಿದೆ…'],
  'common.loadingMedications': ['Loading medications…', 'మందులు లోడ్ అవుతున్నాయి…', 'दवाइयाँ लोड हो रही हैं…', 'ಔಷಧಿಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ…'],
  'common.loadingRefills': ['Loading refill details…', 'రీఫిల్ వివరాలు లోడ్ అవుతున్నాయి…', 'रीफ़िल विवरण लोड हो रहे हैं…', 'ಮರುಪೂರಣ ವಿವರಗಳು ಲೋಡ್ ಆಗುತ್ತಿವೆ…'],
  'common.deleting': ['Deleting…', 'తొలగిస్తోంది…', 'हटाया जा रहा है…', 'ಅಳಿಸಲಾಗುತ್ತಿದೆ…'],
  'common.confirmDelete': ['Confirm delete', 'తొలగింపును నిర్ధారించండి', 'हटाने की पुष्टि करें', 'ಅಳಿಸುವುದನ್ನು ದೃಢೀಕರಿಸಿ'],
  'common.deleteQuestion': ['Delete this medication?', 'ఈ మందును తొలగించాలా?', 'क्या यह दवा हटाएँ?', 'ಈ ಔಷಧಿಯನ್ನು ಅಳಿಸಬೇಕೇ?'],
  'common.remaining': ['remaining', 'మిగిలి ఉన్నాయి', 'शेष', 'ಉಳಿದಿವೆ'],
  'common.starts': ['Starts', 'ప్రారంభం', 'शुरू', 'ಪ್ರಾರಂಭ'],
  'common.remainingNotEntered': ['Remaining quantity not entered', 'మిగిలిన పరిమాణం నమోదు కాలేదు', 'शेष मात्रा दर्ज नहीं की गई', 'ಉಳಿದ ಪ್ರಮಾಣ ನಮೂದಿಸಿಲ್ಲ'],
  'common.refillQuantity': ['refill quantity', 'రీఫిల్ పరిమాణం', 'रीफ़िल मात्रा', 'ಮರುಪೂರಣ ಪ್ರಮಾಣ'],
  'common.home': ['Home', 'హోమ్', 'होम', 'ಮುಖಪುಟ'],
  'common.medicines': ['Medicines', 'మందులు', 'दवाइयाँ', 'ಔಷಧಿಗಳು'],
  'common.refills': ['Refills', 'రీఫిల్‌లు', 'रीफ़िल', 'ಮರುಪೂರಣಗಳು'],
  'common.profile': ['Profile', 'ప్రొఫైల్', 'प्रोफ़ाइल', 'ಪ್ರೊಫೈಲ್'],
  'common.readOnly': ['READ ONLY', 'చదవడానికి మాత్రమే', 'केवल पढ़ने के लिए', 'ಓದಲು ಮಾತ್ರ'],
  'auth.welcome': ['Welcome back', 'తిరిగి స్వాగతం', 'वापसी पर स्वागत है', 'ಮರಳಿ ಸ್ವಾಗತ'],
  'auth.signInSubtitle': ['Sign in to manage your medication routine.', 'మీ మందుల దినచర్యను నిర్వహించడానికి సైన్ ఇన్ చేయండి.', 'अपनी दवा दिनचर्या प्रबंधित करने के लिए साइन इन करें।', 'ನಿಮ್ಮ ಔಷಧಿ ದಿನಚರಿಯನ್ನು ನಿರ್ವಹಿಸಲು ಸೈನ್ ಇನ್ ಮಾಡಿ.'],
  'auth.phoneNumber': ['Phone number', 'ఫోన్ నంబర్', 'फ़ोन नंबर', 'ಫೋನ್ ಸಂಖ್ಯೆ'],
  'auth.phonePlaceholder': ['Mobile number', 'మొబైల్ నంబర్', 'मोबाइल नंबर', 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ'],
  'auth.enterPhoneHint': ['Enter your 10-digit mobile number.', 'మీ 10 అంకెల మొబైల్ నంబర్‌ను నమోదు చేయండి.', 'अपना 10 अंकों का मोबाइल नंबर दर्ज करें।', 'ನಿಮ್ಮ 10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.'],
  'auth.continuePhone': ['Continue with phone', 'ఫోన్‌తో కొనసాగించండి', 'फ़ोन से जारी रखें', 'ಫೋನ್ ಮೂಲಕ ಮುಂದುವರಿಯಿರಿ'],
  'auth.privacy': ['Your health information should stay private and secure.', 'మీ ఆరోగ్య సమాచారం గోప్యంగా, సురక్షితంగా ఉండాలి.', 'आपकी स्वास्थ्य जानकारी निजी और सुरक्षित रहनी चाहिए।', 'ನಿಮ್ಮ ಆರೋಗ್ಯ ಮಾಹಿತಿ ಖಾಸಗಿ ಮತ್ತು ಸುರಕ್ಷಿತವಾಗಿರಬೇಕು.'],
  'auth.guest': ['Continue as guest', 'అతిథిగా కొనసాగించండి', 'अतिथि के रूप में जारी रखें', 'ಅತಿಥಿಯಾಗಿ ಮುಂದುವರಿಯಿರಿ'],
  'auth.footer': ['MED-NEXIS helps you organize medication routines and refills.', 'మందుల దినచర్యలు, రీఫిల్‌లను క్రమబద్ధీకరించడంలో MED-NEXIS సహాయపడుతుంది.', 'MED-NEXIS दवा दिनचर्या और रीफ़िल व्यवस्थित करने में मदद करता है।', 'ಔಷಧಿ ದಿನಚರಿ ಮತ್ತು ಮರುಪೂರಣಗಳನ್ನು ವ್ಯವಸ್ಥೆಗೊಳಿಸಲು MED-NEXIS ಸಹಾಯ ಮಾಡುತ್ತದೆ.'],
  'auth.verifyNumber': ['Verify your number', 'మీ నంబర్‌ను ధృవీకరించండి', 'अपना नंबर सत्यापित करें', 'ನಿಮ್ಮ ಸಂಖ್ಯೆಯನ್ನು ಪರಿಶೀಲಿಸಿ'],
  'auth.codeFor': ['Enter the six-digit code for', 'ఆరు అంకెల కోడ్‌ను నమోదు చేయండి:', 'छह अंकों का कोड दर्ज करें:', 'ಆರು ಅಂಕಿಯ ಕೋಡ್ ನಮೂದಿಸಿ:'],
  'auth.demoCode': ['Demo code (optional)', 'డెమో కోడ్ (ఐచ్ఛికం)', 'डेमो कोड (वैकल्पिक)', 'ಡೆಮೋ ಕೋಡ್ (ಐಚ್ಛಿಕ)'],
  'auth.demoOnly': ['Demo verification only. Phone authentication is not connected yet. No code is sent or checked.', 'ఇది డెమో ధృవీకరణ మాత్రమే. ఫోన్ ప్రమాణీకరణ ఇంకా అనుసంధానించలేదు. కోడ్ పంపబడదు లేదా తనిఖీ చేయబడదు.', 'यह केवल डेमो सत्यापन है। फ़ोन प्रमाणीकरण अभी जुड़ा नहीं है। कोई कोड भेजा या जाँचा नहीं जाता।', 'ಇದು ಡೆಮೋ ಪರಿಶೀಲನೆ ಮಾತ್ರ. ಫೋನ್ ದೃಢೀಕರಣ ಇನ್ನೂ ಸಂಪರ್ಕಗೊಂಡಿಲ್ಲ. ಕೋಡ್ ಕಳುಹಿಸುವುದಿಲ್ಲ ಅಥವಾ ಪರಿಶೀಲಿಸುವುದಿಲ್ಲ.'],
  'auth.completeProfile': ['Complete profile', 'ప్రొఫైల్ పూర్తి చేయండి', 'प्रोफ़ाइल पूरी करें', 'ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ'],
  'auth.guestInstead': ['Explore as guest instead', 'అతిథిగా అన్వేషించండి', 'अतिथि के रूप में देखें', 'ಅತಿಥಿಯಾಗಿ ಅನ್ವೇಷಿಸಿ'],
  'auth.noCodeSent': ['No verification code has been sent.', 'ధృవీకరణ కోడ్ పంపబడలేదు.', 'कोई सत्यापन कोड नहीं भेजा गया है।', 'ಪರಿಶೀಲನಾ ಕೋಡ್ ಕಳುಹಿಸಿಲ್ಲ.'],
  'profile.complete': ['Complete your profile', 'మీ ప్రొఫైల్‌ను పూర్తి చేయండి', 'अपनी प्रोफ़ाइल पूरी करें', 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಪೂರ್ಣಗೊಳಿಸಿ'],
  'profile.edit': ['Edit profile', 'ప్రొఫైల్ సవరించండి', 'प्रोफ़ाइल संपादित करें', 'ಪ್ರೊಫೈಲ್ ಸಂಪಾದಿಸಿ'],
  'profile.subtitle': ['Add a few details to personalize your experience.', 'మీ అనుభవాన్ని వ్యక్తిగతీకరించడానికి కొన్ని వివరాలను జోడించండి.', 'अपने अनुभव को व्यक्तिगत बनाने के लिए कुछ विवरण जोड़ें।', 'ನಿಮ್ಮ ಅನುಭವವನ್ನು ವೈಯಕ್ತಿಕಗೊಳಿಸಲು ಕೆಲವು ವಿವರಗಳನ್ನು ಸೇರಿಸಿ.'],
  'profile.fullName': ['Full name *', 'పూర్తి పేరు *', 'पूरा नाम *', 'ಪೂರ್ಣ ಹೆಸರು *'],
  'profile.age': ['Age *', 'వయస్సు *', 'आयु *', 'ವಯಸ್ಸು *'],
  'profile.ageLabel': ['Age', 'వయస్సు', 'आयु', 'ವಯಸ್ಸು'],
  'profile.mobile': ['Mobile number', 'మొబైల్ నంబర్', 'मोबाइल नंबर', 'ಮೊಬೈಲ್ ಸಂಖ್ಯೆ'],
  'profile.readOnly': ['READ ONLY', 'చదవడానికి మాత్రమే', 'केवल पढ़ने के लिए', 'ಓದಲು ಮಾತ್ರ'],
  'profile.preferredLanguage': ['Preferred language', 'ప్రాధాన్య భాష', 'पसंदीदा भाषा', 'ಆದ್ಯತೆಯ ಭಾಷೆ'],
  'profile.emergencyName': ['Emergency contact name', 'అత్యవసర సంప్రదింపు పేరు', 'आपातकालीन संपर्क का नाम', 'ತುರ್ತು ಸಂಪರ್ಕದ ಹೆಸರು'],
  'profile.emergencyPhone': ['Emergency contact phone', 'అత్యవసర సంప్రదింపు ఫోన్', 'आपातकालीन संपर्क फ़ोन', 'ತುರ್ತು ಸಂಪರ್ಕ ಫೋನ್'],
  'profile.caregiver': ['Caregiver support', 'సంరక్షకుని మద్దతు', 'देखभालकर्ता सहायता', 'ಆರೈಕೆದಾರರ ಬೆಂಬಲ'],
  'profile.changeLater': ['You can change this preference later.', 'ఈ ప్రాధాన్యతను తర్వాత మార్చవచ్చు.', 'आप इस पसंद को बाद में बदल सकते हैं।', 'ಈ ಆದ್ಯತೆಯನ್ನು ನಂತರ ಬದಲಾಯಿಸಬಹುದು.'],
  'profile.privacy': ['Profile details are sent to the MED-NEXIS backend. Demo login is not authentication; do not use real personal information yet.', 'ప్రొఫైల్ వివరాలు MED-NEXIS బ్యాకెండ్‌కు పంపబడతాయి. డెమో లాగిన్ ప్రమాణీకరణ కాదు; నిజమైన వ్యక్తిగత సమాచారాన్ని ఉపయోగించవద్దు.', 'प्रोफ़ाइल विवरण MED-NEXIS बैकएंड को भेजे जाते हैं। डेमो लॉगिन प्रमाणीकरण नहीं है; अभी वास्तविक व्यक्तिगत जानकारी का उपयोग न करें।', 'ಪ್ರೊಫೈಲ್ ವಿವರಗಳನ್ನು MED-NEXIS ಬ್ಯಾಕೆಂಡ್‌ಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ. ಡೆಮೋ ಲಾಗಿನ್ ದೃಢೀಕರಣವಲ್ಲ; ನಿಜವಾದ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಈಗ ಬಳಸಬೇಡಿ.'],
  'profile.save': ['Save profile', 'ప్రొఫైల్ సేవ్ చేయండి', 'प्रोफ़ाइल सहेजें', 'ಪ್ರೊಫೈಲ್ ಉಳಿಸಿ'],
  'profile.saved': ['Profile saved to the backend.', 'ప్రొఫైల్ బ్యాకెండ్‌లో సేవ్ చేయబడింది.', 'प्रोफ़ाइल बैकएंड में सहेजी गई।', 'ಪ್ರೊಫೈಲ್ ಬ್ಯಾಕೆಂಡ್‌ನಲ್ಲಿ ಉಳಿಸಲಾಗಿದೆ.'],
  'profile.changesSaved': ['Profile changes saved.', 'ప్రొఫైల్ మార్పులు సేవ్ చేయబడ్డాయి.', 'प्रोफ़ाइल में बदलाव सहेजे गए।', 'ಪ್ರೊಫೈಲ್ ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಲಾಗಿದೆ.'],
  'profile.yourProfile': ['Your profile', 'మీ ప్రొఫైల్', 'आपकी प्रोफ़ाइल', 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್'],
  'profile.fromBackend': ['Profile details retrieved from the backend.', 'ప్రొఫైల్ వివరాలు బ్యాకెండ్ నుండి పొందబడ్డాయి.', 'प्रोफ़ाइल विवरण बैकएंड से प्राप्त किए गए।', 'ಪ್ರೊಫೈಲ್ ವಿವರಗಳನ್ನು ಬ್ಯಾಕೆಂಡ್‌ನಿಂದ ಪಡೆಯಲಾಗಿದೆ.'],
  'profile.patientName': ['Patient name', 'రోగి పేరు', 'मरीज़ का नाम', 'ರೋಗಿಯ ಹೆಸರು'],
  'profile.registeredPhone': ['Registered phone', 'నమోదైన ఫోన్', 'पंजीकृत फ़ोन', 'ನೋಂದಾಯಿತ ಫೋನ್'],
  'profile.emergencyContact': ['Emergency contact', 'అత్యవసర సంప్రదింపు', 'आपातकालीन संपर्क', 'ತುರ್ತು ಸಂಪರ್ಕ'],
  'profile.noProfile': ['No profile saved', 'ప్రొఫైల్ సేవ్ కాలేదు', 'कोई प्रोफ़ाइल सहेजी नहीं गई', 'ಯಾವುದೇ ಪ್ರೊಫೈಲ್ ಉಳಿಸಿಲ್ಲ'],
  'profile.guestDetails': ['You are exploring as a guest. Create a profile to keep your details available during this session.', 'మీరు అతిథిగా అన్వేషిస్తున్నారు. ఈ సెషన్‌లో వివరాలను అందుబాటులో ఉంచడానికి ప్రొఫైల్ సృష్టించండి.', 'आप अतिथि के रूप में देख रहे हैं। इस सत्र में विवरण उपलब्ध रखने के लिए प्रोफ़ाइल बनाएँ।', 'ನೀವು ಅತಿಥಿಯಾಗಿ ಅನ್ವೇಷಿಸುತ್ತಿದ್ದೀರಿ. ಈ ಸೆಷನ್‌ನಲ್ಲಿ ವಿವರಗಳನ್ನು ಲಭ್ಯವಾಗಿರಿಸಲು ಪ್ರೊಫೈಲ್ ರಚಿಸಿ.'],
  'profile.noAuthWarning': ['This prototype has no authentication. Do not use real personal information until access controls are implemented.', 'ఈ నమూనాలో ప్రమాణీకరణ లేదు. యాక్సెస్ నియంత్రణలు అమలు చేసే వరకు నిజమైన వ్యక్తిగత సమాచారాన్ని ఉపయోగించవద్దు.', 'इस प्रोटोटाइप में प्रमाणीकरण नहीं है। पहुँच नियंत्रण लागू होने तक वास्तविक व्यक्तिगत जानकारी का उपयोग न करें।', 'ಈ ಮಾದರಿಯಲ್ಲಿ ದೃಢೀಕರಣವಿಲ್ಲ. ಪ್ರವೇಶ ನಿಯಂತ್ರಣಗಳನ್ನು ಜಾರಿಗೊಳಿಸುವವರೆಗೆ ನಿಜವಾದ ವೈಯಕ್ತಿಕ ಮಾಹಿತಿಯನ್ನು ಬಳಸಬೇಡಿ.'],
  'medication.schedule': ['Medication schedule', 'మందుల షెడ్యూల్', 'दवा अनुसूची', 'ಔಷಧಿ ವೇಳಾಪಟ್ಟಿ'],
  'medication.manageSubtitle': ['Manage medication details from your prescription.', 'మీ ప్రిస్క్రిప్షన్ ప్రకారం మందుల వివరాలను నిర్వహించండి.', 'अपने पर्चे के अनुसार दवा विवरण प्रबंधित करें।', 'ನಿಮ್ಮ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಂತೆ ಔಷಧಿ ವಿವರಗಳನ್ನು ನಿರ್ವಹಿಸಿ.'],
  'medication.add': ['Add medication', 'మందును జోడించండి', 'दवा जोड़ें', 'ಔಷಧಿ ಸೇರಿಸಿ'],
  'medication.edit': ['Edit medication', 'మందును సవరించండి', 'दवा संपादित करें', 'ಔಷಧಿ ಸಂಪಾದಿಸಿ'],
  'medication.name': ['Medication name *', 'మందు పేరు *', 'दवा का नाम *', 'ಔಷಧಿಯ ಹೆಸರು *'],
  'medication.dosage': ['Dosage as prescribed *', 'ప్రిస్క్రిప్షన్‌లోని మోతాదు *', 'पर्चे के अनुसार खुराक *', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಲ್ಲಿರುವ ಡೋಸ್ *'],
  'medication.frequency': ['Frequency *', 'ఎంత తరచుగా *', 'आवृत्ति *', 'ಆವರ್ತನೆ *'],
  'medication.scheduledTimes': ['Scheduled times *', 'షెడ్యూల్ చేసిన సమయాలు *', 'निर्धारित समय *', 'ನಿಗದಿತ ಸಮಯಗಳು *'],
  'medication.timesHint': ['Use 24-hour HH:mm times separated by commas.', '24-గంటల HH:mm సమయాలను కామాలతో వేరు చేసి నమోదు చేయండి.', '24-घंटे HH:mm समयों को अल्पविराम से अलग करें।', '24-ಗಂಟೆಗಳ HH:mm ಸಮಯಗಳನ್ನು ಅಲ್ಪವಿರಾಮದಿಂದ ಬೇರ್ಪಡಿಸಿ.'],
  'medication.startDate': ['Start date *', 'ప్రారంభ తేదీ *', 'शुरू होने की तारीख *', 'ಪ್ರಾರಂಭ ದಿನಾಂಕ *'],
  'medication.endDateOptional': ['End date (optional)', 'ముగింపు తేదీ (ఐచ్ఛికం)', 'समाप्ति तारीख (वैकल्पिक)', 'ಮುಕ್ತಾಯ ದಿನಾಂಕ (ಐಚ್ಛಿಕ)'],
  'medication.refillOptional': ['Refill quantity (optional)', 'రీఫిల్ పరిమాణం (ఐచ్ఛికం)', 'रीफ़िल मात्रा (वैकल्पिक)', 'ಮರುಪೂರಣ ಪ್ರಮಾಣ (ಐಚ್ಛಿಕ)'],
  'medication.remainingOptional': ['Remaining quantity (optional)', 'మిగిలిన పరిమాణం (ఐచ్ఛికం)', 'शेष मात्रा (वैकल्पिक)', 'ಉಳಿದ ಪ್ರಮಾಣ (ಐಚ್ಛಿಕ)'],
  'medication.note': ['Enter the name, dosage, and schedule exactly as prescribed. MED-NEXIS does not recommend or change treatment.', 'పేరు, మోతాదు, షెడ్యూల్‌ను ప్రిస్క్రిప్షన్‌లో ఉన్నట్లే నమోదు చేయండి. MED-NEXIS చికిత్సను సూచించదు లేదా మార్చదు.', 'नाम, खुराक और समय पर्चे के अनुसार ही दर्ज करें। MED-NEXIS उपचार की सलाह या बदलाव नहीं करता।', 'ಹೆಸರು, ಡೋಸ್ ಮತ್ತು ವೇಳಾಪಟ್ಟಿಯನ್ನು ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಂತೆಯೇ ನಮೂದಿಸಿ. MED-NEXIS ಚಿಕಿತ್ಸೆಯನ್ನು ಶಿಫಾರಸು ಮಾಡುವುದಿಲ್ಲ ಅಥವಾ ಬದಲಾಯಿಸುವುದಿಲ್ಲ.'],
  'medication.enteredNotice': ['Entered medication details. Follow the prescription from your healthcare professional.', 'నమోదు చేసిన మందుల వివరాలు. మీ ఆరోగ్య నిపుణుడి ప్రిస్క్రిప్షన్‌ను అనుసరించండి.', 'दवा विवरण दर्ज किए गए। अपने स्वास्थ्य पेशेवर के पर्चे का पालन करें।', 'ಔಷಧಿ ವಿವರಗಳನ್ನು ನಮೂದಿಸಲಾಗಿದೆ. ನಿಮ್ಮ ಆರೋಗ್ಯ ವೃತ್ತಿಪರರ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅನುಸರಿಸಿ.'],
  'medication.noSaved': ['No medications saved yet. Add details exactly as written on the prescription.', 'ఇంకా మందులు సేవ్ కాలేదు. ప్రిస్క్రిప్షన్‌లో ఉన్నట్లే వివరాలను జోడించండి.', 'अभी कोई दवा सहेजी नहीं गई। पर्चे में लिखे अनुसार विवरण जोड़ें।', 'ಇನ್ನೂ ಯಾವುದೇ ಔಷಧಿಗಳನ್ನು ಉಳಿಸಿಲ್ಲ. ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಲ್ಲಿರುವಂತೆ ವಿವರಗಳನ್ನು ಸೇರಿಸಿ.'],
  'medication.createProfileFirst': ['Create a patient profile before adding medications. Guest access remains available, but medication records need a saved profile.', 'మందులను జోడించే ముందు రోగి ప్రొఫైల్ సృష్టించండి. అతిథి యాక్సెస్ అందుబాటులో ఉంటుంది, కానీ మందుల రికార్డులకు ప్రొఫైల్ అవసరం.', 'दवाइयाँ जोड़ने से पहले मरीज़ की प्रोफ़ाइल बनाएँ। अतिथि पहुँच उपलब्ध है, लेकिन दवा रिकॉर्ड के लिए सहेजी गई प्रोफ़ाइल चाहिए।', 'ಔಷಧಿಗಳನ್ನು ಸೇರಿಸುವ ಮೊದಲು ರೋಗಿಯ ಪ್ರೊಫೈಲ್ ರಚಿಸಿ. ಅತಿಥಿ ಪ್ರವೇಶ ಲಭ್ಯವಿದೆ, ಆದರೆ ಔಷಧಿ ದಾಖಲೆಗಳಿಗೆ ಉಳಿಸಿದ ಪ್ರೊಫೈಲ್ ಅಗತ್ಯ.'],
  'medication.createProfileDetails': ['Create a patient profile before saving medication details.', 'మందుల వివరాలను సేవ్ చేయడానికి ముందు రోగి ప్రొఫైల్ సృష్టించండి.', 'दवा विवरण सहेजने से पहले मरीज़ की प्रोफ़ाइल बनाएँ।', 'ಔಷಧಿ ವಿವರಗಳನ್ನು ಉಳಿಸುವ ಮೊದಲು ರೋಗಿಯ ಪ್ರೊಫೈಲ್ ರಚಿಸಿ.'],
  'medication.detailsRequired': ['Medication name, dosage, and frequency are required.', 'మందు పేరు, మోతాదు, ఎంత తరచుగా అనే వివరాలు అవసరం.', 'दवा का नाम, खुराक और आवृत्ति आवश्यक हैं।', 'ಔಷಧಿಯ ಹೆಸರು, ಡೋಸ್ ಮತ್ತು ಆವರ್ತನೆ ಅಗತ್ಯ.'],
  'medication.timeValidation': ['Enter one or more times using 24-hour HH:mm format, separated by commas.', '24-గంటల HH:mm ఆకృతిలో ఒకటి లేదా అంతకంటే ఎక్కువ సమయాలను కామాలతో వేరు చేసి నమోదు చేయండి.', '24-घंटे HH:mm प्रारूप में एक या अधिक समय अल्पविराम से अलग करके दर्ज करें।', '24-ಗಂಟೆಗಳ HH:mm ಸ್ವರೂಪದಲ್ಲಿ ಒಂದು ಅಥವಾ ಹೆಚ್ಚು ಸಮಯಗಳನ್ನು ಅಲ್ಪವಿರಾಮದಿಂದ ಬೇರ್ಪಡಿಸಿ ನಮೂದಿಸಿ.'],
  'medication.startDateValidation': ['Enter the start date as YYYY-MM-DD.', 'ప్రారంభ తేదీని YYYY-MM-DD ఆకృతిలో నమోదు చేయండి.', 'शुरू होने की तारीख YYYY-MM-DD प्रारूप में दर्ज करें।', 'ಪ್ರಾರಂಭ ದಿನಾಂಕವನ್ನು YYYY-MM-DD ಸ್ವರೂಪದಲ್ಲಿ ನಮೂದಿಸಿ.'],
  'medication.endDateValidation': ['End date must be YYYY-MM-DD and on or after the start date.', 'ముగింపు తేదీ YYYY-MM-DD ఆకృతిలో ఉండాలి మరియు ప్రారంభ తేదీకి సమానంగా లేదా తర్వాత ఉండాలి.', 'समाप्ति तारीख YYYY-MM-DD प्रारूप में और शुरू होने की तारीख के बराबर या बाद की होनी चाहिए।', 'ಮುಕ್ತಾಯ ದಿನಾಂಕ YYYY-MM-DD ಸ್ವರೂಪದಲ್ಲಿದ್ದು ಪ್ರಾರಂಭ ದಿನಾಂಕದಂದು ಅಥವಾ ನಂತರ ಇರಬೇಕು.'],
  'medication.quantityValidation': ['Quantities must be non-negative whole numbers.', 'పరిమాణాలు సున్నా లేదా అంతకంటే ఎక్కువ పూర్ణ సంఖ్యలు అయి ఉండాలి.', 'मात्राएँ शून्य या उससे अधिक पूर्ण संख्या होनी चाहिए।', 'ಪ್ರಮಾಣಗಳು ಶೂನ್ಯ ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ಪೂರ್ಣ ಸಂಖ್ಯೆಗಳಾಗಿರಬೇಕು.'],
  'medication.save': ['Save medication', 'మందును సేవ్ చేయండి', 'दवा सहेजें', 'ಔಷಧಿ ಉಳಿಸಿ'],
  'medication.saveChanges': ['Save changes', 'మార్పులను సేవ్ చేయండి', 'बदलाव सहेजें', 'ಬದಲಾವಣೆಗಳನ್ನು ಉಳಿಸಿ'],
  'medication.saved': ['Medication saved.', 'మందు సేవ్ చేయబడింది.', 'दवा सहेजी गई।', 'ಔಷಧಿ ಉಳಿಸಲಾಗಿದೆ.'],
  'medication.updated': ['Medication updated.', 'మందు నవీకరించబడింది.', 'दवा अपडेट की गई।', 'ಔಷಧಿ ನವೀಕರಿಸಲಾಗಿದೆ.'],
  'medication.deleted': ['Medication deleted.', 'మందు తొలగించబడింది.', 'दवा हटा दी गई।', 'ಔಷಧಿ ಅಳಿಸಲಾಗಿದೆ.'],
  'medication.tryDelete': ['Delete', 'తొలగించండి', 'हटाएँ', 'ಅಳಿಸಿ'],
  'medication.editAction': ['Edit', 'సవరించండి', 'संपादित करें', 'ಸಂಪಾದಿಸಿ'],
  'medication.scheduleTab': ['Medicines', 'మందులు', 'दवाइयाँ', 'ಔಷಧಿಗಳು'],
  'refill.title': ['Upcoming refills', 'రాబోయే రీఫిల్‌లు', 'आगामी रीफ़िल', 'ಮುಂಬರುವ ಮರುಪೂರಣಗಳು'],
  'refill.subtitle': ['Refill quantities entered for your saved medications.', 'సేవ్ చేసిన మందుల కోసం నమోదు చేసిన రీఫిల్ పరిమాణాలు.', 'आपकी सहेजी गई दवाओं के लिए दर्ज रीफ़िल मात्राएँ।', 'ಉಳಿಸಿದ ಔಷಧಿಗಳಿಗಾಗಿ ನಮೂದಿಸಿದ ಮರುಪೂರಣ ಪ್ರಮಾಣಗಳು.'],
  'refill.createProfile': ['Create a profile to view saved refill quantities.', 'సేవ్ చేసిన రీఫిల్ పరిమాణాలను చూడటానికి ప్రొఫైల్ సృష్టించండి.', 'सहेजी गई रीफ़िल मात्रा देखने के लिए प्रोफ़ाइल बनाएँ।', 'ಉಳಿಸಿದ ಮರುಪೂರಣ ಪ್ರಮಾಣಗಳನ್ನು ನೋಡಲು ಪ್ರೊಫೈಲ್ ರಚಿಸಿ.'],
  'refill.none': ['No refill quantities have been entered for your medications.', 'మీ మందుల కోసం రీఫిల్ పరిమాణాలు నమోదు చేయలేదు.', 'आपकी दवाओं के लिए कोई रीफ़िल मात्रा दर्ज नहीं की गई।', 'ನಿಮ್ಮ ಔಷಧಿಗಳಿಗೆ ಯಾವುದೇ ಮರುಪೂರಣ ಪ್ರಮಾಣಗಳನ್ನು ನಮೂದಿಸಿಲ್ಲ.'],
  'refill.viewAll': ['View all', 'అన్నీ చూడండి', 'सभी देखें', 'ಎಲ್ಲವನ್ನೂ ನೋಡಿ'],
  'dashboard.greeting': ['Good morning', 'శుభోదయం', 'सुप्रभात', 'ಶುಭೋದಯ'],
  'dashboard.subtitle': ['Your medication routine, in one place.', 'మీ మందుల దినచర్య, ఒకే చోట.', 'आपकी दवा दिनचर्या, एक ही जगह।', 'ನಿಮ್ಮ ಔಷಧಿ ದಿನಚರಿ, ಒಂದೇ ಸ್ಥಳದಲ್ಲಿ.'],
  'dashboard.today': ["Today's medications", 'ఈరోజు మందులు', 'आज की दवाइयाँ', 'ಇಂದಿನ ಔಷಧಿಗಳು'],
  'dashboard.saved': ['saved', 'సేవ్ అయ్యాయి', 'सहेजी गईं', 'ಉಳಿಸಲಾಗಿದೆ'],
  'dashboard.quickActions': ['Quick actions', 'త్వరిత చర్యలు', 'त्वरित कार्य', 'ತ್ವರಿತ ಕ್ರಿಯೆಗಳು'],
  'dashboard.scheduleAction': ['Medication schedule', 'మందుల షెడ్యూల్', 'दवा अनुसूची', 'ಔಷಧಿ ವೇಳಾಪಟ್ಟಿ'],
  'dashboard.scanAction': ['Scan prescription', 'ప్రిస్క్రిప్షన్ స్కాన్ చేయండి', 'पर्चा स्कैन करें', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಸ್ಕ್ಯಾನ್ ಮಾಡಿ'],
  'dashboard.caregiverAction': ['Caregiver support', 'సంరక్షకుని మద్దతు', 'देखभालकर्ता सहायता', 'ಆರೈಕೆದಾರರ ಬೆಂಬಲ'],
  'dashboard.footer': ["Demo only. Follow your healthcare professional's instructions.", 'డెమో మాత్రమే. మీ ఆరోగ్య నిపుణుల సూచనలను అనుసరించండి.', 'केवल डेमो। अपने स्वास्थ्य पेशेवर के निर्देशों का पालन करें।', 'ಡೆಮೋ ಮಾತ್ರ. ನಿಮ್ಮ ಆರೋಗ್ಯ ವೃತ್ತಿಪರರ ಸೂಚನೆಗಳನ್ನು ಅನುಸರಿಸಿ.'],
  'navigation.home': ['Home', 'హోమ్', 'होम', 'ಮುಖಪುಟ'],
  'navigation.medicines': ['Medicines', 'మందులు', 'दवाइयाँ', 'ಔಷಧಿಗಳು'],
  'navigation.refills': ['Refills', 'రీఫిల్‌లు', 'रीफ़िल', 'ಮರುಪೂರಣಗಳು'],
  'navigation.profile': ['Profile', 'ప్రొఫైల్', 'प्रोफ़ाइल', 'ಪ್ರೊಫೈಲ್'],
  'navigation.notifications': ['Notifications', 'నోటిఫికేషన్‌లు', 'सूचनाएँ', 'ಅಧಿಸೂಚನೆಗಳು'],
  'navigation.openProfile': ['Open profile', 'ప్రొఫైల్ తెరవండి', 'प्रोफ़ाइल खोलें', 'ಪ್ರೊಫೈಲ್ ತೆರೆಯಿರಿ'],
  'scan.subtitle': ['Extracted text is only a draft. Check every detail against the original.', 'సేకరించిన వచనం ముసాయిదా మాత్రమే. ప్రతి వివరాన్ని అసలుతో సరిపోల్చండి.', 'निकाला गया पाठ केवल मसौदा है। हर विवरण को मूल से जाँचें।', 'ಹೊರತೆಗೆದ ಪಠ್ಯ ಕರಡು ಮಾತ್ರ. ಪ್ರತಿಯೊಂದು ವಿವರವನ್ನು ಮೂಲದೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿ.'],
  'scan.privacy': ['The selected image is sent to the MED-NEXIS backend for OCR and is not stored as an image. Do not upload real patient information; this prototype has no sign-in or access controls.', 'ఎంచుకున్న చిత్రం OCR కోసం MED-NEXIS బ్యాకెండ్‌కు పంపబడుతుంది; చిత్రంగా నిల్వ చేయబడదు. నిజమైన రోగి సమాచారాన్ని అప్‌లోడ్ చేయవద్దు; ఈ నమూనాలో సైన్-ఇన్ లేదా యాక్సెస్ నియంత్రణలు లేవు.', 'चुनी गई छवि OCR के लिए MED-NEXIS बैकएंड को भेजी जाती है और छवि के रूप में संग्रहीत नहीं होती। वास्तविक मरीज़ की जानकारी अपलोड न करें; इस प्रोटोटाइप में साइन-इन या पहुँच नियंत्रण नहीं हैं।', 'ಆಯ್ದ ಚಿತ್ರವನ್ನು OCR ಗಾಗಿ MED-NEXIS ಬ್ಯಾಕೆಂಡ್‌ಗೆ ಕಳುಹಿಸಲಾಗುತ್ತದೆ ಮತ್ತು ಚಿತ್ರವಾಗಿ ಸಂಗ್ರಹಿಸುವುದಿಲ್ಲ. ನಿಜವಾದ ರೋಗಿಯ ಮಾಹಿತಿಯನ್ನು ಅಪ್‌ಲೋಡ್ ಮಾಡಬೇಡಿ; ಈ ಮಾದರಿಯಲ್ಲಿ ಸೈನ್-ಇನ್ ಅಥವಾ ಪ್ರವೇಶ ನಿಯಂತ್ರಣಗಳಿಲ್ಲ.'],
  'scan.chooseImage': ['Choose a prescription image', 'ప్రిస్క్రిప్షన్ చిత్రాన్ని ఎంచుకోండి', 'पर्चे की छवि चुनें', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಚಿತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ'],
  'scan.imageRequirements': ['Use a clear, well-lit JPEG, PNG, or WebP image up to 8 MB.', '8 MB వరకు ఉన్న స్పష్టమైన, మంచి వెలుతురులో తీసిన JPEG, PNG లేదా WebP చిత్రాన్ని ఉపయోగించండి.', '8 MB तक की स्पष्ट, अच्छी रोशनी वाली JPEG, PNG या WebP छवि चुनें।', '8 MB ವರೆಗಿನ ಸ್ಪಷ್ಟ, ಉತ್ತಮ ಬೆಳಕಿನ JPEG, PNG ಅಥವಾ WebP ಚಿತ್ರವನ್ನು ಬಳಸಿ.'],
  'scan.useCamera': ['Use camera', 'కెమెరాను ఉపయోగించండి', 'कैमरा इस्तेमाल करें', 'ಕ್ಯಾಮೆರಾ ಬಳಸಿ'],
  'scan.chooseFiles': ['Choose from gallery or files', 'గ్యాలరీ లేదా ఫైళ్ల నుంచి ఎంచుకోండి', 'गैलरी या फ़ाइलों से चुनें', 'ಗ್ಯಾಲರಿ ಅಥವಾ ಫೈಲ್‌ಗಳಿಂದ ಆಯ್ಕೆಮಾಡಿ'],
  'scan.retake': ['Retake', 'మళ్లీ తీయండి', 'फिर से लें', 'ಮತ್ತೆ ತೆಗೆದುಕೊಳ್ಳಿ'],
  'scan.processing': ['Reading image…', 'చిత్రం చదువుతోంది…', 'छवि पढ़ी जा रही है…', 'ಚಿತ್ರವನ್ನು ಓದಲಾಗುತ್ತಿದೆ…'],
  'scan.process': ['Process image', 'చిత్రాన్ని ప్రాసెస్ చేయండి', 'छवि संसाधित करें', 'ಚಿತ್ರವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಿ'],
  'scan.review': ['Review extracted details', 'సేకరించిన వివరాలను సమీక్షించండి', 'निकाले गए विवरण की समीक्षा करें', 'ಹೊರತೆಗೆದ ವಿವರಗಳನ್ನು ಪರಿಶೀಲಿಸಿ'],
  'scan.warning': ['OCR can misread printed or handwritten text. Verify the information using the original prescription or a pharmacist/doctor. Nothing here creates a medication schedule.', 'OCR ముద్రిత లేదా చేతిరాత వచనాన్ని తప్పుగా చదవవచ్చు. అసలు ప్రిస్క్రిప్షన్ లేదా ఫార్మసిస్ట్/వైద్యుడితో సమాచారాన్ని ధృవీకరించండి. ఇక్కడ ఏదీ మందుల షెడ్యూల్‌ను సృష్టించదు.', 'OCR छपे या हस्तलिखित पाठ को गलत पढ़ सकता है। मूल पर्चे या फार्मासिस्ट/डॉक्टर से जानकारी सत्यापित करें। यहाँ कुछ भी दवा अनुसूची नहीं बनाता।', 'OCR ಮುದ್ರಿತ ಅಥವಾ ಕೈಬರಹದ ಪಠ್ಯವನ್ನು ತಪ್ಪಾಗಿ ಓದಬಹುದು. ಮೂಲ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಅಥವಾ ಔಷಧಿಕಾರ/ವೈದ್ಯರೊಂದಿಗೆ ಮಾಹಿತಿಯನ್ನು ಪರಿಶೀಲಿಸಿ. ಇಲ್ಲಿ ಯಾವುದೂ ಔಷಧಿ ವೇಳಾಪಟ್ಟಿಯನ್ನು ರಚಿಸುವುದಿಲ್ಲ.'],
  'scan.patientName': ['Patient name (if shown)', 'రోగి పేరు (ఉంటే)', 'मरीज़ का नाम (यदि हो)', 'ರೋಗಿಯ ಹೆಸರು (ಇದ್ದರೆ)'],
  'scan.prescriptionDate': ['Prescription date (if shown)', 'ప్రిస్క్రిప్షన్ తేదీ (ఉంటే)', 'पर्चे की तारीख (यदि हो)', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ದಿನಾಂಕ (ಇದ್ದರೆ)'],
  'scan.medicine': ['Medicine', 'మందు', 'दवा', 'ಔಷಧಿ'],
  'scan.medicineName': ['Medicine name', 'మందు పేరు', 'दवा का नाम', 'ಔಷಧಿಯ ಹೆಸರು'],
  'scan.dosage': ['Dosage', 'మోతాదు', 'खुराक', 'ಡೋಸ್'],
  'scan.frequency': ['Frequency', 'ఎంత తరచుగా', 'आवृत्ति', 'ಆವರ್ತನೆ'],
  'scan.timing': ['Timing or instructions', 'సమయం లేదా సూచనలు', 'समय या निर्देश', 'ಸಮಯ ಅಥವಾ ಸೂಚನೆಗಳು'],
  'scan.duration': ['Duration', 'వ్యవధి', 'अवधि', 'ಅವಧಿ'],
  'scan.quantity': ['Quantity', 'పరిమాణం', 'मात्रा', 'ಪ್ರಮಾಣ'],
  'scan.verify': ['— verify', '— ధృవీకరించండి', '— जाँचें', '— ಪರಿಶೀಲಿಸಿ'],
  'scan.remove': ['Remove', 'తొలగించండి', 'हटाएँ', 'ತೆಗೆದುಹಾಕಿ'],
  'scan.addMedicine': ['Add medicine entry', 'మందు వివరాన్ని జోడించండి', 'दवा प्रविष्टि जोड़ें', 'ಔಷಧಿ ನಮೂದನ್ನು ಸೇರಿಸಿ'],
  'scan.originalOcr': ['Original OCR text (for comparison)', 'పోల్చడానికి అసలు OCR వచనం', 'तुलना के लिए मूल OCR पाठ', 'ಹೋಲಿಕೆಗಾಗಿ ಮೂಲ OCR ಪಠ್ಯ'],
  'scan.confirmation': ['I have checked these details against the original prescription.', 'ఈ వివరాలను అసలు ప్రిస్క్రిప్షన్‌తో సరిపోల్చి తనిఖీ చేశాను.', 'मैंने इन विवरणों को मूल पर्चे से जाँच लिया है।', 'ಈ ವಿವರಗಳನ್ನು ಮೂಲ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಿದ್ದೇನೆ.'],
  'scan.saved': ['Reviewed prescription details saved. No medication schedule was created.', 'సమీక్షించిన ప్రిస్క్రిప్షన్ వివరాలు సేవ్ చేయబడ్డాయి. మందుల షెడ్యూల్ సృష్టించబడలేదు.', 'समीक्षित पर्चे के विवरण सहेजे गए। कोई दवा अनुसूची नहीं बनाई गई।', 'ಪರಿಶೀಲಿಸಿದ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ವಿವರಗಳನ್ನು ಉಳಿಸಲಾಗಿದೆ. ಯಾವುದೇ ಔಷಧಿ ವೇಳಾಪಟ್ಟಿಯನ್ನು ರಚಿಸಲಾಗಿಲ್ಲ.'],
  'scan.save': ['Save reviewed prescription', 'సమీక్షించిన ప్రిస్క్రిప్షన్‌ను సేవ్ చేయండి', 'समीक्षित पर्चा सहेजें', 'ಪರಿಶೀಲಿಸಿದ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಉಳಿಸಿ'],
  'scan.saving': ['Saving reviewed details…', 'సమీక్షించిన వివరాలు సేవ్ అవుతున్నాయి…', 'समीक्षित विवरण सहेजे जा रहे हैं…', 'ಪರಿಶೀಲಿಸಿದ ವಿವರಗಳನ್ನು ಉಳಿಸಲಾಗುತ್ತಿದೆ…'],
  'scan.guest': ['Create a patient profile to save reviewed prescription metadata. Guest scans are not saved.', 'సమీక్షించిన ప్రిస్క్రిప్షన్ వివరాలను సేవ్ చేయడానికి రోగి ప్రొఫైల్ సృష్టించండి. అతిథి స్కాన్‌లు సేవ్ కావు.', 'समीक्षित पर्चे का विवरण सहेजने के लिए मरीज़ की प्रोफ़ाइल बनाएँ। अतिथि स्कैन सहेजे नहीं जाते।', 'ಪರಿಶೀಲಿಸಿದ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ವಿವರಗಳನ್ನು ಉಳಿಸಲು ರೋಗಿಯ ಪ್ರೊಫೈಲ್ ರಚಿಸಿ. ಅತಿಥಿ ಸ್ಕ್ಯಾನ್‌ಗಳನ್ನು ಉಳಿಸಲಾಗುವುದಿಲ್ಲ.'],
  'scan.createPatient': ['Create patient profile', 'రోగి ప్రొఫైల్ సృష్టించండి', 'मरीज़ की प्रोफ़ाइल बनाएँ', 'ರೋಗಿಯ ಪ್ರೊಫೈಲ್ ರಚಿಸಿ'],
  'scan.selectedPreview': ['Selected prescription image preview', 'ఎంచుకున్న ప్రిస్క్రిప్షన్ చిత్ర ప్రివ్యూ', 'चुनी गई पर्चे की छवि का पूर्वावलोकन', 'ಆಯ್ದ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಚಿತ್ರದ ಪೂರ್ವವೀಕ್ಷಣೆ'],
  'scan.reviewPatient': ['Review patient name', 'రోగి పేరును సమీక్షించండి', 'मरीज़ का नाम जाँचें', 'ರೋಗಿಯ ಹೆಸರನ್ನು ಪರಿಶೀಲಿಸಿ'],
  'scan.reviewDate': ['Review prescription date', 'ప్రిస్క్రిప్షన్ తేదీని సమీక్షించండి', 'पर्चे की तारीख जाँचें', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ದಿನಾಂಕ ಪರಿಶೀಲಿಸಿ'],
  'scan.notIdentified': ['Not identified', 'గుర్తించలేదు', 'पहचान नहीं हुई', 'ಗುರುತಿಸಲಾಗಿಲ್ಲ'],
  'scan.ocrLine': ['OCR line:', 'OCR పంక్తి:', 'OCR पंक्ति:', 'OCR ಸಾಲು:'],
  'scan.reviewLabel': ['Review', 'సమీక్షించండి', 'जाँचें', 'ಪರಿಶೀಲಿಸಿ'],
  'scan.forMedicine': ['for medicine', 'మందుకు', 'दवा के लिए', 'ಔಷಧಿಗಾಗಿ'],
  'scan.enterFromOriginal': ['Not identified — enter only from the prescription', 'గుర్తించలేదు — ప్రిస్క్రిప్షన్‌లో ఉన్నదే నమోదు చేయండి', 'पहचान नहीं हुई — केवल पर्चे से दर्ज करें', 'ಗುರುತಿಸಲಾಗಿಲ್ಲ — ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಿಂದ ಮಾತ್ರ ನಮೂದಿಸಿ'],
  'scan.addNameError': ['Enter a medicine name for each reviewed entry, or remove entries that are not medicines.', 'ప్రతి సమీక్షించిన నమోదుకు మందు పేరు నమోదు చేయండి లేదా మందులు కాని నమోదులను తొలగించండి.', 'हर समीक्षित प्रविष्टि के लिए दवा का नाम दर्ज करें या गैर-दवा प्रविष्टियाँ हटाएँ।', 'ಪ್ರತಿ ಪರಿಶೀಲಿಸಿದ ನಮೂದಿಗೆ ಔಷಧಿಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ ಅಥವಾ ಔಷಧಿಯಲ್ಲದ ನಮೂದುಗಳನ್ನು ತೆಗೆದುಹಾಕಿ.'],
  'errors.phoneInvalid': ['Enter a valid 10-digit Indian mobile number starting with 6–9.', '6–9తో ప్రారంభమయ్యే సరైన 10 అంకెల భారతీయ మొబైల్ నంబర్‌ను నమోదు చేయండి.', '6–9 से शुरू होने वाला सही 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।', '6–9ರಿಂದ ಪ್ರಾರಂಭವಾಗುವ ಸರಿಯಾದ 10 ಅಂಕಿಯ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.'],
  'errors.nameRequired': ['Enter your full name.', 'మీ పూర్తి పేరును నమోదు చేయండి.', 'अपना पूरा नाम दर्ज करें।', 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ.'],
  'errors.age': ['Enter an age between 1 and 120.', '1 మరియు 120 మధ్య వయస్సును నమోదు చేయండి.', '1 से 120 के बीच आयु दर्ज करें।', '1 ಮತ್ತು 120ರ ನಡುವಿನ ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ.'],
  'errors.mobileInvalid': ['Enter a valid 10-digit Indian mobile number.', 'సరైన 10 అంకెల భారతీయ మొబైల్ నంబర్‌ను నమోదు చేయండి.', 'सही 10 अंकों का भारतीय मोबाइल नंबर दर्ज करें।', 'ಸರಿಯಾದ 10 ಅಂಕಿಯ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯನ್ನು ನಮೂದಿಸಿ.'],
  'errors.saveProfile': ['Could not save your profile. Please try again.', 'మీ ప్రొఫైల్‌ను సేవ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి.', 'आपकी प्रोफ़ाइल सहेजी नहीं जा सकी। फिर कोशिश करें।', 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಉಳಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'],
  'errors.saveMedication': ['Could not save medication. Please try again.', 'మందును సేవ్ చేయలేకపోయాం. మళ్లీ ప్రయత్నించండి.', 'दवा सहेजी नहीं जा सकी। फिर कोशिश करें।', 'ಔಷಧಿ ಉಳಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'],
  'errors.loadProfile': ['Could not load your profile.', 'మీ ప్రొఫైల్‌ను లోడ్ చేయలేకపోయాం.', 'आपकी प्रोफ़ाइल लोड नहीं हो सकी।', 'ನಿಮ್ಮ ಪ್ರೊಫೈಲ್ ಲೋಡ್ ಆಗಲಿಲ್ಲ.'],
  'errors.loadMedications': ['Could not load medications.', 'మందులను లోడ్ చేయలేకపోయాం.', 'दवाइयाँ लोड नहीं हो सकीं।', 'ಔಷಧಿಗಳನ್ನು ಲೋಡ್ ಮಾಡಲಾಗಲಿಲ್ಲ.'],
  'errors.noMedicationReturned': ['The medication was not returned by the API.', 'API మందుల వివరాలను తిరిగి ఇవ్వలేదు.', 'API ने दवा विवरण वापस नहीं किया।', 'API ಔಷಧಿ ವಿವರವನ್ನು ಹಿಂತಿರುಗಿಸಲಿಲ್ಲ.'],
  'errors.deleteMedication': ['Could not delete medication.', 'మందును తొలగించలేకపోయాం.', 'दवा हटाई नहीं जा सकी।', 'ಔಷಧಿಯನ್ನು ಅಳಿಸಲಾಗಲಿಲ್ಲ.'],
  'errors.backendUnavailable': ['Could not reach the MED-NEXIS API. Check that the backend is running.', 'MED-NEXIS APIని చేరుకోలేకపోయాం. బ్యాకెండ్ నడుస్తోందో తనిఖీ చేయండి.', 'MED-NEXIS API से संपर्क नहीं हो सका। बैकएंड चल रहा है या नहीं जाँचें।', 'MED-NEXIS API ತಲುಪಲಾಗಲಿಲ್ಲ. ಬ್ಯಾಕೆಂಡ್ ಚಾಲನೆಯಲ್ಲಿದೆಯೇ ಪರಿಶೀಲಿಸಿ.'],
  'errors.backendUnavailableDevice': ['Could not reach the MED-NEXIS API. Check that the backend is running and the app can reach this device.', 'MED-NEXIS APIని చేరుకోలేకపోయాం. బ్యాకెండ్ నడుస్తోందో మరియు యాప్ ఈ పరికరాన్ని చేరుకోగలదో తనిఖీ చేయండి.', 'MED-NEXIS API से संपर्क नहीं हो सका। बैकएंड और ऐप की डिवाइस तक पहुँच जाँचें।', 'MED-NEXIS API ತಲುಪಲಾಗಲಿಲ್ಲ. ಬ್ಯಾಕೆಂಡ್ ಮತ್ತು ಅಪ್ಲಿಕೇಶನ್ ಈ ಸಾಧನವನ್ನು ತಲುಪಬಹುದೇ ಪರಿಶೀಲಿಸಿ.'],
  'errors.unreadableResponse': ['The MED-NEXIS API returned an unreadable response.', 'MED-NEXIS API చదవలేని ప్రతిస్పందనను ఇచ్చింది.', 'MED-NEXIS API ने अपठनीय उत्तर दिया।', 'MED-NEXIS API ಓದಲು ಸಾಧ್ಯವಿಲ್ಲದ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಿದೆ.'],
  'errors.invalidProfileResponse': ['The MED-NEXIS API returned an invalid profile response.', 'MED-NEXIS API చెల్లని ప్రొఫైల్ ప్రతిస్పందనను ఇచ్చింది.', 'MED-NEXIS API ने अमान्य प्रोफ़ाइल उत्तर दिया।', 'MED-NEXIS API ಅಮಾನ್ಯ ಪ್ರೊಫೈಲ್ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಿದೆ.'],
  'errors.invalidMedicationResponse': ['The MED-NEXIS API returned an invalid medication response.', 'MED-NEXIS API చెల్లని మందుల ప్రతిస్పందనను ఇచ్చింది.', 'MED-NEXIS API ने अमान्य दवा उत्तर दिया।', 'MED-NEXIS API ಅಮಾನ್ಯ ಔಷಧಿ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಿದೆ.'],
  'errors.unreadableMedicationList': ['The MED-NEXIS API returned an unreadable medication list.', 'MED-NEXIS API చదవలేని మందుల జాబితాను ఇచ్చింది.', 'MED-NEXIS API ने अपठनीय दवा सूची दी।', 'MED-NEXIS API ಓದಲು ಸಾಧ್ಯವಿಲ್ಲದ ಔಷಧಿ ಪಟ್ಟಿಯನ್ನು ನೀಡಿದೆ.'],
  'errors.invalidMedicationList': ['The MED-NEXIS API returned an invalid medication list.', 'MED-NEXIS API చెల్లని మందుల జాబితాను ఇచ్చింది.', 'MED-NEXIS API ने अमान्य दवा सूची दी।', 'MED-NEXIS API ಅಮಾನ್ಯ ಔಷಧಿ ಪಟ್ಟಿಯನ್ನು ನೀಡಿದೆ.'],
  'errors.invalidApiResponse': ['The MED-NEXIS API returned an invalid response.', 'MED-NEXIS API చెల్లని ప్రతిస్పందనను ఇచ్చింది.', 'MED-NEXIS API ने अमान्य उत्तर दिया।', 'MED-NEXIS API ಅಮಾನ್ಯ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಿದೆ.'],
  'errors.couldNotReadImage': ['Could not read the selected image. Please select it again.', 'ఎంచుకున్న చిత్రాన్ని చదవలేకపోయాం. మళ్లీ ఎంచుకోండి.', 'चुनी गई छवि पढ़ी नहीं जा सकी। फिर से चुनें।', 'ಆಯ್ದ ಚಿತ್ರವನ್ನು ಓದಲಾಗಲಿಲ್ಲ. ಮತ್ತೆ ಆಯ್ಕೆಮಾಡಿ.'],
  'errors.ocrUnreadable': ['The OCR service returned an unreadable response.', 'OCR సేవ చదవలేని ప్రతిస్పందనను ఇచ్చింది.', 'OCR सेवा ने अपठनीय उत्तर दिया।', 'OCR ಸೇವೆ ಓದಲು ಸಾಧ್ಯವಿಲ್ಲದ ಪ್ರತಿಕ್ರಿಯೆ ನೀಡಿದೆ.'],
  'errors.ocrInvalid': ['The OCR service returned invalid extraction data.', 'OCR సేవ చెల్లని సేకరణ డేటాను ఇచ్చింది.', 'OCR सेवा ने अमान्य निकाला गया डेटा दिया।', 'OCR ಸೇವೆ ಅಮಾನ್ಯ ಹೊರತೆಗೆಯಲಾದ ಡೇಟಾವನ್ನು ನೀಡಿದೆ.'],
  'errors.ocrInvalidEntry': ['The OCR service returned an invalid medicine entry.', 'OCR సేవ చెల్లని మందు నమోదును ఇచ్చింది.', 'OCR सेवा ने अमान्य दवा प्रविष्टि दी।', 'OCR ಸೇವೆ ಅಮಾನ್ಯ ಔಷಧಿ ನಮೂದನ್ನು ನೀಡಿದೆ.'],
  'errors.processImage': ['Could not process this image. Try another image.', 'ఈ చిత్రాన్ని ప్రాసెస్ చేయలేకపోయాం. మరో చిత్రాన్ని ప్రయత్నించండి.', 'यह छवि संसाधित नहीं हो सकी। दूसरी छवि आज़माएँ।', 'ಈ ಚಿತ್ರವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗಲಿಲ್ಲ. ಮತ್ತೊಂದು ಚಿತ್ರ ಪ್ರಯತ್ನಿಸಿ.'],
  'errors.savePrescription': ['Could not save the reviewed prescription.', 'సమీక్షించిన ప్రిస్క్రిప్షన్‌ను సేవ్ చేయలేకపోయాం.', 'समीक्षित पर्चा सहेजा नहीं जा सका।', 'ಪರಿಶೀಲಿಸಿದ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಉಳಿಸಲಾಗಲಿಲ್ಲ.'],
  'errors.languageStorage': ['Language preference could not be saved on this device.', 'భాష ప్రాధాన్యతను ఈ పరికరంలో సేవ్ చేయలేకపోయాం.', 'इस डिवाइस पर भाषा पसंद सहेजी नहीं जा सकी।', 'ಈ ಸಾಧನದಲ್ಲಿ ಭಾಷೆಯ ಆದ್ಯತೆಯನ್ನು ಉಳಿಸಲಾಗಲಿಲ್ಲ.'],
  'errors.profileStorage': ['Could not load the saved language preference.', 'సేవ్ చేసిన భాష ప్రాధాన్యతను లోడ్ చేయలేకపోయాం.', 'सहेजी गई भाषा पसंद लोड नहीं हो सकी।', 'ಉಳಿಸಿದ ಭಾಷೆಯ ಆದ್ಯತೆಯನ್ನು ಲೋಡ್ ಮಾಡಲಾಗಲಿಲ್ಲ.'],
  'errors.cameraPermission': ['Camera permission is unavailable. You can choose an image from your files instead.', 'కెమెరా అనుమతి అందుబాటులో లేదు. బదులుగా ఫైళ్ల నుంచి చిత్రాన్ని ఎంచుకోండి.', 'कैमरा अनुमति उपलब्ध नहीं है। इसके बजाय फ़ाइलों से छवि चुनें।', 'ಕ್ಯಾಮೆರಾ ಅನುಮತಿ ಲಭ್ಯವಿಲ್ಲ. ಬದಲಿಗೆ ಫೈಲ್‌ಗಳಿಂದ ಚಿತ್ರ ಆಯ್ಕೆಮಾಡಿ.'],
  'errors.unsupportedImage': ['Choose a JPEG, PNG, or WebP image.', 'JPEG, PNG లేదా WebP చిత్రాన్ని ఎంచుకోండి.', 'JPEG, PNG या WebP छवि चुनें।', 'JPEG, PNG ಅಥವಾ WebP ಚಿತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.'],
  'errors.imageTooLarge': ['Choose an image that is 8 MB or smaller.', '8 MB లేదా అంతకంటే చిన్న చిత్రాన్ని ఎంచుకోండి.', '8 MB या उससे छोटी छवि चुनें।', '8 MB ಅಥವಾ ಅದಕ್ಕಿಂತ ಚಿಕ್ಕ ಚಿತ್ರವನ್ನು ಆಯ್ಕೆಮಾಡಿ.'],
  'errors.cameraUnavailable': ['The camera is unavailable in this browser or device. Choose an image from your files instead.', 'ఈ బ్రౌజర్ లేదా పరికరంలో కెమెరా అందుబాటులో లేదు. ఫైళ్ల నుంచి చిత్రాన్ని ఎంచుకోండి.', 'इस ब्राउज़र या डिवाइस में कैमरा उपलब्ध नहीं है। फ़ाइलों से छवि चुनें।', 'ಈ ಬ್ರೌಸರ್ ಅಥವಾ ಸಾಧನದಲ್ಲಿ ಕ್ಯಾಮೆರಾ ಲಭ್ಯವಿಲ್ಲ. ಫೈಲ್‌ಗಳಿಂದ ಚಿತ್ರ ಆಯ್ಕೆಮಾಡಿ.'],
  'errors.pickerFailed': ['Could not open the image picker. Check browser or device permissions and try again.', 'చిత్ర ఎంపికను తెరవలేకపోయాం. బ్రౌజర్ లేదా పరికర అనుమతులను తనిఖీ చేసి మళ్లీ ప్రయత్నించండి.', 'छवि चयनकर्ता नहीं खुला। ब्राउज़र या डिवाइस अनुमतियाँ जाँचकर फिर कोशिश करें।', 'ಚಿತ್ರ ಆಯ್ಕೆಗಾರವನ್ನು ತೆರೆಯಲಾಗಲಿಲ್ಲ. ಬ್ರೌಸರ್ ಅಥವಾ ಸಾಧನ ಅನುಮತಿಗಳನ್ನು ಪರಿಶೀಲಿಸಿ ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'],
  'errors.medicineNameReview': ['Enter a medicine name for each reviewed entry, or remove entries that are not medicines.', 'ప్రతి సమీక్షించిన నమోదుకు మందు పేరు నమోదు చేయండి లేదా మందులు కాని నమోదులను తొలగించండి.', 'हर समीक्षित प्रविष्टि के लिए दवा का नाम दर्ज करें या गैर-दवा प्रविष्टियाँ हटाएँ।', 'ಪ್ರತಿ ಪರಿಶೀಲಿಸಿದ ನಮೂದಿಗೆ ಔಷಧಿಯ ಹೆಸರನ್ನು ನಮೂದಿಸಿ ಅಥವಾ ಔಷಧಿಯಲ್ಲದ ನಮೂದುಗಳನ್ನು ತೆಗೆದುಹಾಕಿ.'],
  'errors.patientRequired': ['A patient profile is required.', 'రోగి ప్రొఫైల్ అవసరం.', 'मरीज़ की प्रोफ़ाइल आवश्यक है।', 'ರೋಗಿಯ ಪ್ರೊಫೈಲ್ ಅಗತ್ಯವಿದೆ.'],
  'errors.fullNameInvalid': ['Full name is required and must be 100 characters or fewer.', 'పూర్తి పేరు అవసరం; 100 అక్షరాలకు మించకూడదు.', 'पूरा नाम आवश्यक है और 100 अक्षरों से अधिक नहीं होना चाहिए।', 'ಪೂರ್ಣ ಹೆಸರು ಅಗತ್ಯವಿದೆ ಮತ್ತು 100 ಅಕ್ಷರಗಳಿಗಿಂತ ಹೆಚ್ಚಿರಬಾರದು.'],
  'errors.ageInvalid': ['Age must be a whole number between 1 and 120.', 'వయస్సు 1 నుండి 120 మధ్య పూర్ణ సంఖ్య అయి ఉండాలి.', 'आयु 1 से 120 के बीच पूर्ण संख्या होनी चाहिए।', 'ವಯಸ್ಸು 1 ರಿಂದ 120ರೊಳಗಿನ ಪೂರ್ಣ ಸಂಖ್ಯೆಯಾಗಿರಬೇಕು.'],
  'errors.phoneInvalidOptional': ['Phone must be a valid 10-digit Indian mobile number when provided.', 'ఫోన్ ఇచ్చినట్లయితే సరైన 10 అంకెల భారతీయ మొబైల్ నంబర్ అయి ఉండాలి.', 'फ़ोन देने पर सही 10 अंकों का भारतीय मोबाइल नंबर होना चाहिए।', 'ಫೋನ್ ನೀಡಿದ್ದರೆ ಅದು ಸರಿಯಾದ 10 ಅಂಕಿಯ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯಾಗಿರಬೇಕು.'],
  'errors.chooseLanguage': ['Choose a supported preferred language.', 'మద్దతు ఉన్న ప్రాధాన్య భాషను ఎంచుకోండి.', 'समर्थित पसंदीदा भाषा चुनें।', 'ಬೆಂಬಲಿತ ಆದ್ಯತೆಯ ಭಾಷೆಯನ್ನು ಆಯ್ಕೆಮಾಡಿ.'],
  'errors.emergencyNameInvalid': ['Emergency contact name must be 100 characters or fewer.', 'అత్యవసర సంప్రదింపు పేరు 100 అక్షరాలకు మించకూడదు.', 'आपातकालीन संपर्क का नाम 100 अक्षरों से अधिक नहीं होना चाहिए।', 'ತುರ್ತು ಸಂಪರ್ಕದ ಹೆಸರು 100 ಅಕ್ಷರಗಳಿಗಿಂತ ಹೆಚ್ಚಿರಬಾರದು.'],
  'errors.emergencyPhoneInvalid': ['Emergency contact phone must be a valid 10-digit Indian mobile number.', 'అత్యవసర సంప్రదింపు ఫోన్ సరైన 10 అంకెల భారతీయ మొబైల్ నంబర్ అయి ఉండాలి.', 'आपातकालीन संपर्क फ़ोन सही 10 अंकों का भारतीय मोबाइल नंबर होना चाहिए।', 'ತುರ್ತು ಸಂಪರ್ಕ ಫೋನ್ ಸರಿಯಾದ 10 ಅಂಕಿಯ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆಯಾಗಿರಬೇಕು.'],
  'errors.caregiverBoolean': ['Caregiver support must be a boolean value.', 'సంరక్షకుని మద్దతు విలువ అవును లేదా కాదు అయి ఉండాలి.', 'देखभालकर्ता सहायता का मान सही या गलत होना चाहिए।', 'ಆರೈಕೆದಾರರ ಬೆಂಬಲ ಮೌಲ್ಯ ಸರಿ ಅಥವಾ ತಪ್ಪು ಆಗಿರಬೇಕು.'],
  'errors.patientUnavailable': ['Patient profile storage is temporarily unavailable.', 'రోగి ప్రొఫైల్ నిల్వ తాత్కాలికంగా అందుబాటులో లేదు.', 'मरीज़ की प्रोफ़ाइल संग्रहण सेवा अस्थायी रूप से उपलब्ध नहीं है।', 'ರೋಗಿಯ ಪ್ರೊಫೈಲ್ ಸಂಗ್ರಹಣೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ.'],
  'errors.invalidPatientId': ['Patient profile ID is invalid.', 'రోగి ప్రొఫైల్ ID చెల్లదు.', 'मरीज़ प्रोफ़ाइल ID अमान्य है।', 'ರೋಗಿಯ ಪ್ರೊಫೈಲ್ ID ಅಮಾನ್ಯವಾಗಿದೆ.'],
  'errors.profileNotFound': ['Patient profile was not found.', 'రోగి ప్రొఫైల్ కనుగొనబడలేదు.', 'मरीज़ की प्रोफ़ाइल नहीं मिली।', 'ರೋಗಿಯ ಪ್ರೊಫೈಲ್ ಕಂಡುಬಂದಿಲ್ಲ.'],
  'errors.medicationRequired': ['A medication record is required.', 'మందుల రికార్డు అవసరం.', 'दवा रिकॉर्ड आवश्यक है।', 'ಔಷಧಿ ದಾಖಲೆ ಅಗತ್ಯವಿದೆ.'],
  'errors.patientIdInvalid': ['Patient ID is invalid.', 'రోగి ID చెల్లదు.', 'मरीज़ ID अमान्य है।', 'ರೋಗಿಯ ID ಅಮಾನ್ಯವಾಗಿದೆ.'],
  'errors.medicationNameInvalid': ['Medication name is required and must be 120 characters or fewer.', 'మందు పేరు అవసరం; 120 అక్షరాలకు మించకూడదు.', 'दवा का नाम आवश्यक है और 120 अक्षरों से अधिक नहीं होना चाहिए।', 'ಔಷಧಿಯ ಹೆಸರು ಅಗತ್ಯವಿದೆ ಮತ್ತು 120 ಅಕ್ಷರಗಳಿಗಿಂತ ಹೆಚ್ಚಿರಬಾರದು.'],
  'errors.dosageInvalid': ['Dosage is required and must be 120 characters or fewer.', 'మోతాదు అవసరం; 120 అక్షరాలకు మించకూడదు.', 'खुराक आवश्यक है और 120 अक्षरों से अधिक नहीं होनी चाहिए।', 'ಡೋಸ್ ಅಗತ್ಯವಿದೆ ಮತ್ತು 120 ಅಕ್ಷರಗಳಿಗಿಂತ ಹೆಚ್ಚಿರಬಾರದು.'],
  'errors.frequencyInvalid': ['Frequency is required and must be 120 characters or fewer.', 'ఎంత తరచుగా అనే వివరాలు అవసరం; 120 అక్షరాలకు మించకూడదు.', 'आवृत्ति आवश्यक है और 120 अक्षरों से अधिक नहीं होनी चाहिए।', 'ಆವರ್ತನೆ ಅಗತ್ಯವಿದೆ ಮತ್ತು 120 ಅಕ್ಷರಗಳಿಗಿಂತ ಹೆಚ್ಚಿರಬಾರದು.'],
  'errors.scheduledTimesInvalid': ['Provide one or more scheduled times in HH:mm format.', 'HH:mm ఆకృతిలో ఒకటి లేదా అంతకంటే ఎక్కువ షెడ్యూల్ సమయాలను నమోదు చేయండి.', 'HH:mm प्रारूप में एक या अधिक निर्धारित समय दें।', 'HH:mm ಸ್ವರೂಪದಲ್ಲಿ ಒಂದು ಅಥವಾ ಹೆಚ್ಚು ನಿಗದಿತ ಸಮಯಗಳನ್ನು ನೀಡಿ.'],
  'errors.startDateInvalid': ['Start date must be a valid YYYY-MM-DD date.', 'ప్రారంభ తేదీ సరైన YYYY-MM-DD తేదీ అయి ఉండాలి.', 'शुरू होने की तारीख सही YYYY-MM-DD तारीख होनी चाहिए।', 'ಪ್ರಾರಂಭ ದಿನಾಂಕ ಸರಿಯಾದ YYYY-MM-DD ದಿನಾಂಕವಾಗಿರಬೇಕು.'],
  'errors.endDateInvalid': ['End date must be a valid date on or after the start date.', 'ముగింపు తేదీ సరైనదై, ప్రారంభ తేదీకి సమానంగా లేదా తర్వాత ఉండాలి.', 'समाप्ति तारीख सही होनी चाहिए और शुरू होने की तारीख के बराबर या बाद की होनी चाहिए।', 'ಮುಕ್ತಾಯ ದಿನಾಂಕ ಸರಿಯಾಗಿದ್ದು ಪ್ರಾರಂಭ ದಿನಾಂಕದಂದು ಅಥವಾ ನಂತರ ಇರಬೇಕು.'],
  'errors.refillInvalid': ['Refill quantity must be a non-negative whole number.', 'రీఫిల్ పరిమాణం సున్నా లేదా అంతకంటే ఎక్కువ పూర్ణ సంఖ్య అయి ఉండాలి.', 'रीफ़िल मात्रा शून्य या उससे अधिक पूर्ण संख्या होनी चाहिए।', 'ಮರುಪೂರಣ ಪ್ರಮಾಣ ಶೂನ್ಯ ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ಪೂರ್ಣ ಸಂಖ್ಯೆಯಾಗಿರಬೇಕು.'],
  'errors.remainingInvalid': ['Remaining quantity must be a non-negative whole number.', 'మిగిలిన పరిమాణం సున్నా లేదా అంతకంటే ఎక్కువ పూర్ణ సంఖ్య అయి ఉండాలి.', 'शेष मात्रा शून्य या उससे अधिक पूर्ण संख्या होनी चाहिए।', 'ಉಳಿದ ಪ್ರಮಾಣ ಶೂನ್ಯ ಅಥವಾ ಅದಕ್ಕಿಂತ ಹೆಚ್ಚಿನ ಪೂರ್ಣ ಸಂಖ್ಯೆಯಾಗಿರಬೇಕು.'],
  'errors.medicationUnavailable': ['Medication storage is temporarily unavailable.', 'మందుల నిల్వ తాత్కాలికంగా అందుబాటులో లేదు.', 'दवा संग्रहण सेवा अस्थायी रूप से उपलब्ध नहीं है।', 'ಔಷಧಿ ಸಂಗ್ರಹಣೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ.'],
  'errors.invalidMedicationId': ['Medication ID is invalid.', 'మందు ID చెల్లదు.', 'दवा ID अमान्य है।', 'ಔಷಧಿ ID ಅಮಾನ್ಯವಾಗಿದೆ.'],
  'errors.medicationNotFound': ['Medication was not found.', 'మందు కనుగొనబడలేదు.', 'दवा नहीं मिली।', 'ಔಷಧಿ ಕಂಡುಬಂದಿಲ್ಲ.'],
  'errors.prescriptionUnavailable': ['Prescription storage is temporarily unavailable.', 'ప్రిస్క్రిప్షన్ నిల్వ తాత్కాలికంగా అందుబాటులో లేదు.', 'पर्चा संग्रहण सेवा अस्थायी रूप से उपलब्ध नहीं है।', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಸಂಗ್ರಹಣೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ.'],
  'errors.uploadTooLarge': ['Prescription images must be 8 MB or smaller.', 'ప్రిస్క్రిప్షన్ చిత్రాలు 8 MB లేదా అంతకంటే చిన్నవిగా ఉండాలి.', 'पर्चे की छवियाँ 8 MB या उससे छोटी होनी चाहिए।', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಚಿತ್ರಗಳು 8 MB ಅಥವಾ ಅದಕ್ಕಿಂತ ಚಿಕ್ಕದಾಗಿರಬೇಕು.'],
  'errors.selectPrescription': ['Select a prescription image to process.', 'ప్రాసెస్ చేయడానికి ప్రిస్క్రిప్షన్ చిత్రాన్ని ఎంచుకోండి.', 'संसाधित करने के लिए पर्चे की छवि चुनें।', 'ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲು ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಚಿತ್ರ ಆಯ್ಕೆಮಾಡಿ.'],
  'errors.imageSignature': ['The image contents do not match a supported image type.', 'చిత్ర కంటెంట్ మద్దతు ఉన్న చిత్ర రకానికి సరిపోలడం లేదు.', 'छवि की सामग्री समर्थित छवि प्रकार से मेल नहीं खाती।', 'ಚಿತ್ರದ ವಿಷಯವು ಬೆಂಬಲಿತ ಚಿತ್ರ ಪ್ರಕಾರಕ್ಕೆ ಹೊಂದಿಕೆಯಾಗುವುದಿಲ್ಲ.'],
  'errors.ocrUnavailable': ['OCR could not process this image. Try a clearer JPEG, PNG, or WebP image.', 'OCR ఈ చిత్రాన్ని ప్రాసెస్ చేయలేకపోయింది. మరింత స్పష్టమైన JPEG, PNG లేదా WebP చిత్రాన్ని ప్రయత్నించండి.', 'OCR इस छवि को संसाधित नहीं कर सका। अधिक स्पष्ट JPEG, PNG या WebP छवि आज़माएँ।', 'OCR ಈ ಚಿತ್ರವನ್ನು ಪ್ರಕ್ರಿಯೆಗೊಳಿಸಲಾಗಲಿಲ್ಲ. ಹೆಚ್ಚು ಸ್ಪಷ್ಟವಾದ JPEG, PNG ಅಥವಾ WebP ಚಿತ್ರ ಪ್ರಯತ್ನಿಸಿ.'],
  'errors.noReadableText': ['No readable text was found. Try a sharper, well-lit image or enter details manually.', 'చదవగలిగే వచనం కనుగొనబడలేదు. స్పష్టమైన, మంచి వెలుతురు ఉన్న చిత్రాన్ని ప్రయత్నించండి లేదా వివరాలను చేతితో నమోదు చేయండి.', 'पढ़ने योग्य पाठ नहीं मिला। अधिक स्पष्ट, अच्छी रोशनी वाली छवि आज़माएँ या विवरण स्वयं दर्ज करें।', 'ಓದಬಹುದಾದ ಪಠ್ಯ ಕಂಡುಬಂದಿಲ್ಲ. ಹೆಚ್ಚು ಸ್ಪಷ್ಟವಾದ, ಚೆನ್ನಾಗಿ ಬೆಳಗಿದ ಚಿತ್ರ ಪ್ರಯತ್ನಿಸಿ ಅಥವಾ ವಿವರಗಳನ್ನು ಕೈಯಾರೆ ನಮೂದಿಸಿ.'],
  'errors.prescriptionRequired': ['A reviewed prescription record is required.', 'సమీక్షించిన ప్రిస్క్రిప్షన్ రికార్డు అవసరం.', 'समीक्षित पर्चा रिकॉर्ड आवश्यक है।', 'ಪರಿಶೀಲಿಸಿದ ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ದಾಖಲೆ ಅಗತ್ಯವಿದೆ.'],
  'errors.prescriptionLength': ['Prescription metadata exceeds the allowed length.', 'ప్రిస్క్రిప్షన్ మెటాడేటా అనుమతించిన పొడవును మించింది.', 'पर्चे का मेटाडेटा अनुमत लंबाई से अधिक है।', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಮೆಟಾಡೇಟಾ ಅನುಮತಿತ ಉದ್ದವನ್ನು ಮೀರಿದೆ.'],
  'errors.ocrTextRequired': ['Original OCR text is required and must be 30,000 characters or fewer.', 'అసలు OCR వచనం అవసరం; 30,000 అక్షరాలకు మించకూడదు.', 'मूल OCR पाठ आवश्यक है और 30,000 अक्षरों से अधिक नहीं होना चाहिए।', 'ಮೂಲ OCR ಪಠ್ಯ ಅಗತ್ಯವಿದೆ ಮತ್ತು 30,000 ಅಕ್ಷರಗಳಿಗಿಂತ ಹೆಚ್ಚಿರಬಾರದು.'],
  'errors.medicineEntriesRequired': ['Provide at least one reviewed medicine with a medication name.', 'మందు పేరుతో కనీసం ఒక సమీక్షించిన మందు నమోదును ఇవ్వండి.', 'दवा के नाम के साथ कम से कम एक समीक्षित दवा प्रविष्टि दें।', 'ಔಷಧಿಯ ಹೆಸರಿನೊಂದಿಗೆ ಕನಿಷ್ಠ ಒಂದು ಪರಿಶೀಲಿಸಿದ ಔಷಧಿ ನಮೂದನ್ನು ನೀಡಿ.'],
  'errors.confirmationRequired': ['Explicit confirmation that the details were checked against the prescription is required.', 'వివరాలను ప్రిస్క్రిప్షన్‌తో తనిఖీ చేశామని స్పష్టమైన నిర్ధారణ అవసరం.', 'विवरण पर्चे से जाँचे गए हैं, इसकी स्पष्ट पुष्टि आवश्यक है।', 'ವಿವರಗಳನ್ನು ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನೊಂದಿಗೆ ಪರಿಶೀಲಿಸಲಾಗಿದೆ ಎಂಬ ಸ್ಪಷ್ಟ ದೃಢೀಕರಣ ಅಗತ್ಯವಿದೆ.'],
  'error.profileRequest': ['The profile request could not be completed.', 'ప్రొఫైల్ అభ్యర్థనను పూర్తి చేయలేకపోయాం.', 'प्रोफ़ाइल अनुरोध पूरा नहीं हो सका।', 'ಪ್ರೊಫೈಲ್ ವಿನಂತಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲಾಗಲಿಲ್ಲ.'],
  'error.medicationRequest': ['The medication request could not be completed.', 'మందుల అభ్యర్థనను పూర్తి చేయలేకపోయాం.', 'दवा अनुरोध पूरा नहीं हो सका।', 'ಔಷಧಿ ವಿನಂತಿಯನ್ನು ಪೂರ್ಣಗೊಳಿಸಲಾಗಲಿಲ್ಲ.'],
  'error.genericRetry': ['Please try again.', 'మళ్లీ ప్రయత్నించండి.', 'फिर कोशिश करें।', 'ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.'],
  'screen.caregiver': ['Caregiver support', 'సంరక్షకుని మద్దతు', 'देखभालकर्ता सहायता', 'ಆರೈಕೆದಾರರ ಬೆಂಬಲ'],
  'screen.caregiverUnavailable': ['Caregiver access is not available yet.', 'సంరక్షకుని యాక్సెస్ ఇంకా అందుబాటులో లేదు.', 'देखभालकर्ता पहुँच अभी उपलब्ध नहीं है।', 'ಆರೈಕೆದಾರರ ಪ್ರವೇಶ ಇನ್ನೂ ಲಭ್ಯವಿಲ್ಲ.'],
  'screen.notifications': ['Notifications', 'నోటిఫికేషన్‌లు', 'सूचनाएँ', 'ಅಧಿಸೂಚನೆಗಳು'],
  'screen.notificationsUnavailable': ['Notification settings are not available in this preview.', 'ఈ ప్రివ్యూలో నోటిఫికేషన్ సెట్టింగ్‌లు అందుబాటులో లేవు.', 'इस पूर्वावलोकन में सूचना सेटिंग उपलब्ध नहीं हैं।', 'ಈ ಪೂರ್ವವೀಕ್ಷಣೆಯಲ್ಲಿ ಅಧಿಸೂಚನೆ ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಲಭ್ಯವಿಲ್ಲ.'],
  'screen.profileUnavailable': ['Profile settings are not available in this preview.', 'ఈ ప్రివ్యూలో ప్రొఫైల్ సెట్టింగ్‌లు అందుబాటులో లేవు.', 'इस पूर्वावलोकन में प्रोफ़ाइल सेटिंग उपलब्ध नहीं हैं।', 'ಈ ಪೂರ್ವವೀಕ್ಷಣೆಯಲ್ಲಿ ಪ್ರೊಫೈಲ್ ಸೆಟ್ಟಿಂಗ್‌ಗಳು ಲಭ್ಯವಿಲ್ಲ.'],
  'screen.scanUnavailable': ['Select a prescription image to review its extracted text.', 'సేకరించిన వచనాన్ని సమీక్షించడానికి ప్రిస్క్రిప్షన్ చిత్రాన్ని ఎంచుకోండి.', 'निकाले गए पाठ की समीक्षा के लिए पर्चे की छवि चुनें।', 'ಹೊರತೆಗೆದ ಪಠ್ಯವನ್ನು ಪರಿಶೀಲಿಸಲು ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್ ಚಿತ್ರ ಆಯ್ಕೆಮಾಡಿ.'],
  'scan.ocrShort': ['OCR line:', 'OCR పంక్తి:', 'OCR पंक्ति:', 'OCR ಸಾಲು:'],
  'input.mobileAccessibility': ['10-digit Indian mobile number', '10 అంకెల భారతీయ మొబైల్ నంబర్', '10 अंकों का भारतीय मोबाइल नंबर', '10 ಅಂಕಿಯ ಭಾರತೀಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ'],
  'input.demoCodeAccessibility': ['Optional six-digit demo code', 'ఐచ్ఛిక ఆరు అంకెల డెమో కోడ్', 'वैकल्पिक छह अंकों का डेमो कोड', 'ಐಚ್ಛಿಕ ಆರು ಅಂಕಿಯ ಡೆಮೋ ಕೋಡ್'],
  'input.fullNameAccessibility': ['Full name, required', 'పూర్తి పేరు, అవసరం', 'पूरा नाम, आवश्यक', 'ಪೂರ್ಣ ಹೆಸರು, ಅಗತ್ಯ'],
  'input.enterFullName': ['Enter your full name', 'మీ పూర్తి పేరును నమోదు చేయండి', 'अपना पूरा नाम दर्ज करें', 'ನಿಮ್ಮ ಪೂರ್ಣ ಹೆಸರನ್ನು ನಮೂದಿಸಿ'],
  'input.ageAccessibility': ['Age, required', 'వయస్సు, అవసరం', 'आयु, आवश्यक', 'ವಯಸ್ಸು, ಅಗತ್ಯ'],
  'input.enterAge': ['Enter your age', 'మీ వయస్సును నమోదు చేయండి', 'अपनी आयु दर्ज करें', 'ನಿಮ್ಮ ವಯಸ್ಸನ್ನು ನಮೂದಿಸಿ'],
  'input.emergencyNameAccessibility': ['Emergency contact name, optional', 'అత్యవసర సంప్రదింపు పేరు, ఐచ్ఛికం', 'आपातकालीन संपर्क का नाम, वैकल्पिक', 'ತುರ್ತು ಸಂಪರ್ಕದ ಹೆಸರು, ಐಚ್ಛಿಕ'],
  'input.enterContactName': ['Enter a contact name', 'సంప్రదింపు పేరును నమోదు చేయండి', 'संपर्क का नाम दर्ज करें', 'ಸಂಪರ್ಕದ ಹೆಸರನ್ನು ನಮೂದಿಸಿ'],
  'input.emergencyPhoneAccessibility': ['Emergency contact phone, optional', 'అత్యవసర సంప్రదింపు ఫోన్, ఐచ్ఛికం', 'आपातकालीन संपर्क फ़ोन, वैकल्पिक', 'ತುರ್ತು ಸಂಪರ್ಕ ಫೋನ್, ಐಚ್ಛಿಕ'],
  'input.mobilePlaceholder': ['10-digit mobile number', '10 అంకెల మొబైల్ నంబర్', '10 अंकों का मोबाइल नंबर', '10 ಅಂಕಿಯ ಮೊಬೈಲ್ ಸಂಖ್ಯೆ'],
  'input.medicationNameAccessibility': ['Medication name', 'మందు పేరు', 'दवा का नाम', 'ಔಷಧಿಯ ಹೆಸರು'],
  'input.prescribedName': ['Enter prescribed name', 'ప్రిస్క్రిప్షన్‌లోని పేరును నమోదు చేయండి', 'पर्चे में दिया नाम दर्ज करें', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಲ್ಲಿರುವ ಹೆಸರನ್ನು ನಮೂದಿಸಿ'],
  'input.dosageAccessibility': ['Dosage as prescribed', 'ప్రిస్క్రిప్షన్‌లోని మోతాదు', 'पर्चे के अनुसार खुराक', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಲ್ಲಿರುವ ಡೋಸ್'],
  'input.prescribedDosage': ['Enter the prescribed dosage', 'ప్రిస్క్రిప్షన్‌లోని మోతాదును నమోదు చేయండి', 'पर्चे में दी गई खुराक दर्ज करें', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಲ್ಲಿರುವ ಡೋಸ್ ನಮೂದಿಸಿ'],
  'input.frequencyAccessibility': ['Frequency as prescribed', 'ప్రిస్క్రిప్షన్‌లోని తరచుదనం', 'पर्चे के अनुसार आवृत्ति', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಲ್ಲಿರುವ ಆವರ್ತನೆ'],
  'input.frequency': ['Enter frequency as prescribed', 'ప్రిస్క్రిప్షన్‌లోని తరచుదనాన్ని నమోదు చేయండి', 'पर्चे के अनुसार आवृत्ति दर्ज करें', 'ಪ್ರಿಸ್ಕ್ರಿಪ್ಷನ್‌ನಲ್ಲಿರುವ ಆವರ್ತನೆಯನ್ನು ನಮೂದಿಸಿ'],
  'input.timesAccessibility': ['Scheduled times in 24-hour format', '24-గంటల ఆకృతిలో షెడ్యూల్ సమయాలు', '24-घंटे प्रारूप में निर्धारित समय', '24-ಗಂಟೆಗಳ ಸ್ವರೂಪದಲ್ಲಿ ನಿಗದಿತ ಸಮಯಗಳು'],
  'input.startDateAccessibility': ['Medication start date', 'మందు ప్రారంభ తేదీ', 'दवा शुरू होने की तारीख', 'ಔಷಧಿ ಪ್ರಾರಂಭ ದಿನಾಂಕ'],
  'input.endDateAccessibility': ['Medication end date, optional', 'మందు ముగింపు తేదీ, ఐచ్ఛికం', 'दवा समाप्ति तारीख, वैकल्पिक', 'ಔಷಧಿ ಮುಕ್ತಾಯ ದಿನಾಂಕ, ಐಚ್ಛಿಕ'],
  'input.refillAccessibility': ['Refill quantity, optional', 'రీఫిల్ పరిమాణం, ఐచ్ఛికం', 'रीफ़िल मात्रा, वैकल्पिक', 'ಮರುಪೂರಣ ಪ್ರಮಾಣ, ಐಚ್ಛಿಕ'],
  'input.remainingAccessibility': ['Remaining quantity, optional', 'మిగిలిన పరిమాణం, ఐచ్ఛికం', 'शेष मात्रा, वैकल्पिक', 'ಉಳಿದ ಪ್ರಮಾಣ, ಐಚ್ಛಿಕ'],
  'input.quantity': ['Enter quantity', 'పరిమాణాన్ని నమోదు చేయండి', 'मात्रा दर्ज करें', 'ಪ್ರಮಾಣವನ್ನು ನಮೂದಿಸಿ'],
} satisfies Record<string, readonly [string, string, string, string]>;

type TranslationKey = keyof typeof rows;
const localeIndex: Record<Locale, number> = { en: 0, te: 1, hi: 2, kn: 3 };
const sourceTextKeys = new Map<string, TranslationKey>();
for (const [key, values] of Object.entries(rows) as [TranslationKey, readonly string[]][]) {
  sourceTextKeys.set(values[0], key);
}

export function translateCopy(value: string, locale: Locale): string {
  const key = sourceTextKeys.get(value.trim());
  if (!key) {
    return value;
  }
  const translated = rows[key][localeIndex[locale]];
  if (!translated) {
    return rows[key][0];
  }
  const leading = value.match(/^\s*/)?.[0] ?? '';
  const trailing = value.match(/\s*$/)?.[0] ?? '';
  return `${leading}${translated}${trailing}`;
}

export function translateKey(key: TranslationKey, locale: Locale): string {
  return rows[key][localeIndex[locale]] || rows[key][0];
}

export function translationKeyCount(): number {
  return Object.keys(rows).length;
}

export function translationCoverage(): Record<Locale, number> {
  let completeKeys = 0;
  for (const values of Object.values(rows)) {
    if (values.length === localeOptions.length && values.every(Boolean)) {
      completeKeys += 1;
    }
  }
  return {
    en: completeKeys,
    te: completeKeys,
    hi: completeKeys,
    kn: completeKeys,
  };
}

type LanguageContextValue = {
  locale: Locale;
  ready: boolean;
  storageError: string;
  setLocale: (locale: Locale) => Promise<void>;
  applyProfileLanguage: (language: string) => void;
};

const LanguageContext = createContext<LanguageContextValue | null>(null);
const storageKey = 'med-nexis.locale.v1';

export function LanguageProvider({ children }: PropsWithChildren) {
  const [locale, setLocaleState] = useState<Locale>('en');
  const [ready, setReady] = useState(false);
  const [storageError, setStorageError] = useState('');
  const hasStoredChoice = useRef(false);
  const userSelectedLanguage = useRef(false);

  useEffect(() => {
    let active = true;
    void AsyncStorage.getItem(storageKey)
      .then((saved) => {
        if (!active) return;
        const option = localeOptions.find((entry) => entry.code === saved);
        if (option) {
          hasStoredChoice.current = true;
          setLocaleState(option.code);
        }
      })
      .catch(() => {
        if (active) {
          setStorageError(rows['errors.profileStorage'][0]);
        }
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, []);

  const setLocale = useCallback(async (nextLocale: Locale) => {
    userSelectedLanguage.current = true;
    setLocaleState(nextLocale);
    setStorageError('');
    try {
      await AsyncStorage.setItem(storageKey, nextLocale);
      hasStoredChoice.current = true;
    } catch {
      setStorageError(rows['errors.languageStorage'][0]);
    }
  }, []);

  const applyProfileLanguage = useCallback((language: string) => {
    if (hasStoredChoice.current || userSelectedLanguage.current) return;
    const option = localeOptions.find((entry) => entry.profileName === language);
    if (option) setLocaleState(option.code);
  }, []);

  const value = useMemo(
    () => ({ locale, ready, storageError, setLocale, applyProfileLanguage }),
    [locale, ready, storageError, setLocale, applyProfileLanguage],
  );
  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('Language controls must be used inside LanguageProvider.');
  }
  return context;
}

function translateChild(child: ReactNode, locale: Locale): ReactNode {
  if (typeof child === 'string') {
    return translateCopy(child, locale);
  }
  if (Array.isArray(child)) {
    return child.map((item, index) => (
      <React.Fragment key={index}>{translateChild(item, locale)}</React.Fragment>
    ));
  }
  return child;
}

export function LocalizedText(props: TextProps) {
  const { locale } = useLanguage();
  return (
    <NativeText {...props}>
      {translateChild(props.children, locale)}
    </NativeText>
  );
}

export function UntranslatedText(props: TextProps) {
  return <NativeText {...props} />;
}

export function LocalizedTextInput(props: TextInputProps) {
  const { locale } = useLanguage();
  return (
    <NativeTextInput
      {...props}
      accessibilityLabel={
        props.accessibilityLabel
          ? translateCopy(props.accessibilityLabel, locale)
          : undefined
      }
      placeholder={
        props.placeholder ? translateCopy(props.placeholder, locale) : undefined
      }
    />
  );
}

export function LocalizedPressable(props: PressableProps) {
  const { locale } = useLanguage();
  return (
    <NativePressable
      {...props}
      accessibilityLabel={
        props.accessibilityLabel
          ? translateCopy(props.accessibilityLabel, locale)
          : undefined
      }
      accessibilityHint={
        props.accessibilityHint
          ? translateCopy(props.accessibilityHint, locale)
          : undefined
      }
    />
  );
}

export function LanguageSelector() {
  const { locale, setLocale, storageError } = useLanguage();
  return (
    <View style={{ marginTop: 18 }}>
      <NativeText style={{ color: '#536574', fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
        {translateCopy(rows['common.language'][0], locale)}
      </NativeText>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
        {localeOptions.map((option) => {
          const selected = locale === option.code;
          return (
            <NativePressable
              key={option.code}
              accessibilityRole="button"
              accessibilityLabel={`${translateCopy(rows['common.selectLanguage'][0], locale)} ${option.nativeName}`}
              accessibilityState={{ selected }}
              onPress={() => void setLocale(option.code)}
              style={{
                minWidth: 66,
                minHeight: 42,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 5,
                paddingHorizontal: 10,
                borderWidth: 1,
                borderColor: selected ? '#147E76' : '#DCE3E7',
                borderRadius: 9,
                backgroundColor: selected ? '#EAF4F2' : '#FFFFFF',
              }}
            >
              <NativeText
                style={{
                  color: selected ? '#176D67' : '#344B5C',
                  fontSize: 13,
                  fontWeight: selected ? '700' : '500',
                }}
              >
                {option.nativeName}
              </NativeText>
              {selected ? (
                <NativeText accessibilityLabel={translateCopy('selected', locale)} style={{ color: '#147E76', fontSize: 12, fontWeight: '700' }}>
                  ✓
                </NativeText>
              ) : null}
            </NativePressable>
          );
        })}
      </View>
      {storageError ? (
        <NativeText accessibilityRole="alert" style={{ marginTop: 7, color: '#A23C3C', fontSize: 12, lineHeight: 17 }}>
          {translateCopy(storageError, locale)}
        </NativeText>
      ) : null}
    </View>
  );
}
