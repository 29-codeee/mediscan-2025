export type AppLang = "en-IN" | "hi-IN" | "kn-IN";

export const APP_LANG_STORAGE_KEY = "mediscan_app_language";

type Dict = Record<string, string>;

const en: Dict = {
  back: "← Back",
  backToDashboard: "← Back to Dashboard",
  loading: "Loading...",
  loadingMediScan: "Loading MediScan...",
  settings: "Settings",
  saveSettings: "Save Settings",
  saving: "Saving...",
  language: "Language",
  allergies: "Allergies (comma separated)",
  emergencyCard: "Emergency Card",
  doctorVisit: "Doctor Visit",
  printSavePdf: "Print / Save as PDF",
  exportPdf: "Export (Print → Save as PDF)",
  pillReminder: "Pill Reminder",
  prescriptionScanner: "MediScan AI",
  chatbot: "Healix AI Assistant",
};

const hi: Dict = {
  back: "← वापस",
  backToDashboard: "← डैशबोर्ड पर वापस",
  loading: "लोड हो रहा है...",
  loadingMediScan: "MediScan लोड हो रहा है...",
  settings: "सेटिंग्स",
  saveSettings: "सेटिंग्स सहेजें",
  saving: "सहेजा जा रहा है...",
  language: "भाषा",
  allergies: "एलर्जी (कॉमा से अलग करें)",
  emergencyCard: "इमरजेंसी कार्ड",
  doctorVisit: "डॉक्टर विज़िट",
  printSavePdf: "प्रिंट / PDF सेव करें",
  exportPdf: "एक्सपोर्ट (प्रिंट → PDF सेव)",
  pillReminder: "दवा रिमाइंडर",
  prescriptionScanner: "MediScan AI",
  chatbot: "Healix AI सहायक",
};

const kn: Dict = {
  back: "← ಹಿಂದೆ",
  backToDashboard: "← ಡ್ಯಾಶ್‌ಬೋರ್ಡ್‌ಗೆ ಹಿಂದಿರುಗಿ",
  loading: "ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
  loadingMediScan: "MediScan ಲೋಡ್ ಆಗುತ್ತಿದೆ...",
  settings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳು",
  saveSettings: "ಸೆಟ್ಟಿಂಗ್‌ಗಳನ್ನು ಉಳಿಸಿ",
  saving: "ಉಳಿಸಲಾಗುತ್ತಿದೆ...",
  language: "ಭಾಷೆ",
  allergies: "ಅಲರ್ಜಿಗಳು (ಕಾಮಾದಿಂದ ಬೇರ್ಪಡಿಸಿ)",
  emergencyCard: "ತುರ್ತು ಕಾರ್ಡ್",
  doctorVisit: "ಡಾಕ್ಟರ್ ಭೇಟಿ",
  printSavePdf: "ಪ್ರಿಂಟ್ / PDF ಉಳಿಸಿ",
  exportPdf: "ಎಕ್ಸ್ಪೋರ್ಟ್ (ಪ್ರಿಂಟ್ → PDF ಉಳಿಸಿ)",
  pillReminder: "ಔಷಧ ರಿಮೈಂಡರ್",
  prescriptionScanner: "MediScan AI",
  chatbot: "Healix AI ಸಹಾಯಕ",
};

export function getDict(lang: AppLang): Dict {
  if (lang === "hi-IN") return hi;
  if (lang === "kn-IN") return kn;
  return en;
}

export function t(key: string, lang: AppLang): string {
  const dict = getDict(lang);
  return dict[key] || en[key] || key;
}


