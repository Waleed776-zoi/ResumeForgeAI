export interface ExperienceEntry {
  title: string;
  company: string;
  dates: string;
  bullets: string[];
}

export interface ResumeJson {
  name: string;
  contact: string;
  summary: string;
  skills: string[];
  experience: ExperienceEntry[];
  education: string[];
  certifications: string[];
}

export interface JobJson {
  role: string;
  company: string;
  seniority: string;
  required_skills: string[];
  responsibilities: string[];
}

export interface GapAnalysisResult {
  matched: string[];
  missing: string[];
  extra: string[];
  matchRate: number;
  // Optional: rows saved before categorisation existed don't carry it.
  breakdown?: {
    coreMatched: string[];
    coreMissing: string[];
    softMissing: string[];
    foundationalMissing: string[];
  };
}

export interface TailoredOutput {
  summary: string;
  experience: ExperienceEntry[];
  skills: string[];
  cover_letter: string;
}

export interface IntegrityCheckResult {
  passed: boolean;
  flagged_items: string[]; // anything in the tailored output not traceable to the original resume
  notes: string;
}

export interface ExplainabilityResult {
  addedKeywords: string[];
  reorderedSections: boolean;
  bulletChanges: number; // count of bullets that changed wording
}

export interface Application {
  id: string;
  user_id: string;
  base_resume_id: string;
  company: string;
  role: string;
  job_posting_text: string;
  job_json: JobJson;
  gap_analysis: GapAnalysisResult;
  tailored_resume_json: TailoredOutput;
  cover_letter: string;
  explainability: ExplainabilityResult;
  integrity_passed: boolean;
  integrity_flagged_items: string[];
  integrity_notes: string;
  resume_pdf_url: string | null;
  resume_docx_url: string | null;
  created_at: string;
}
