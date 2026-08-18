/**
 * Not a test — a rendering harness for eyeballing layout changes.
 *
 * Skipped by default so `npm test` stays assertion-only and doesn't litter
 * the project root. To render:
 *
 *   RENDER_SAMPLES=1 npx vitest run tests/render-sample.spec.ts
 *
 * Then open sample-resume.pdf / sample-resume.docx (both gitignored).
 */
import { describe, it } from "vitest";
import { writeFileSync } from "node:fs";
import { generateResumePdf } from "../generators/exportPdf";
import { generateResumeDocx } from "../generators/exportDocx";
import { TEMPLATE_IDS } from "../generators/templates";

const tailored = {
  summary:
    "Research-driven AI engineer with over five years of experience spanning applied research, qualitative inquiry, and production machine learning. Designs and executes end-to-end research workflows — transcription, thematic coding, and analytical reporting — while shipping deep learning systems into clinical use. Proven record of translating complex data into decisions that hold up under scrutiny.",
  skills: [
    "Python", "C/C++", "Java", "C#", "PyTorch", "Deep Learning Architecture Design",
    "CNNs", "LSTMs", "Transformers", "Time-Series Modeling", "Model Optimization",
    "Hyperparameter Tuning", "Transfer Learning", "GANs (DCGAN, StyleGAN)", "VAEs",
    "Diffusion Models", "LLM Fine-tuning", "Prompt Engineering", "Inference Optimization",
    "Data Preprocessing", "Feature Engineering", "Statistical Analysis",
    "Thematic Coding", "Flask", "FastAPI", "REST APIs", "Docker", "AWS (EC2, S3)",
    "MLflow", "Weights & Biases", "Matplotlib", "Tableau",
  ],
  experience: [
    {
      title: "AI & Machine Learning Engineer",
      company: "BNIP x NUST University",
      dates: "February 2025 – Present",
      bullets: [
        "Developed a full-stack AI-driven breast tumour detection medical imaging system supporting DICOM/PNG/JPEG/MP4 ingestion, automated preprocessing, and real-time inference.",
        "Delivered ~1.2 s/image inference latency and improved clinical screening triage efficiency by 60%, trained on a CT dataset and deployed at the NUST School of Health Sciences.",
        "Produced technical breakdowns, summaries, and comprehensive deployment guides for advanced AI papers, increasing engagement by 40%+.",
      ],
    },
    {
      title: "Researcher",
      company: "NUST University, Islamabad",
      dates: "October 2023 – October 2025",
      bullets: [
        "Conducted transcription and translation of semi-structured interviews exploring patient perceptions of AI in medical decision-making, then performed thematic coding to identify trust factors, ethical concerns, and acceptance patterns.",
        "Coordinated and led 6+ AI/ML projects between industry partners and the university, ensuring technical feasibility and deployment readiness.",
        "Translated Urdu responses into English and organised qualitative data supporting structured, policy-oriented reporting while maintaining strict confidentiality.",
      ],
    },
    {
      title: "Qualitative Researcher",
      company: "PSEF Ultrasoft Software House, Quetta",
      dates: "November 2021 – January 2024",
      bullets: [
        "Supported API development, multiple MLOps workflows, and documentation for client-facing applications.",
        "Contributed to data-driven dashboards and operational analytics for health system performance.",
      ],
    },
  ],
  cover_letter: "",
};

const meta = {
  name: "Muhammad Waleed Khan",
  contact:
    "+92-303-2332114  |  engr.waleed.45342@gmail.com  |  PEC Reg No: COMP/23091  |  linkedin.com/in/muhammad-waleed-khan",
  summary: "",
  skills: [],
  experience: [],
  education: [
    "MS in Computational Science Engineering (CSE), CGPA 3.45 — NUST University, Islamabad (Fall 2023 – Fall 2025)",
    "BS in Computer Engineering, CGPA 3.86, Gold Medalist — BUITEMS, Quetta (Fall 2018 – Spring 2022)",
  ],
  publications: [
    'Edison, E., D. Awaiz, S. Sehr, A. Asraf, H. Tahir, M. Aslam, M.W. Khan, "Impact of Artificial Intelligence on Clinical Decision-Making and Support Systems in Hospital Environments," Insights Journal of Health and Rehabilitation (IJHR), Jun 2025. [DOI: 10.71000/zhqwm010]',
    'Khan, I.U., U. Rehman, S. Hanif, H. Mehwish, W.T. Almagharbeh, M. Shahid, M.W. Khan, "Patient Perspectives on the Use of AI in Medical Decision-Making — Exploring Patient Trust and Acceptance of AI-Driven Healthcare Services," Insights Journal of Health and Rehabilitation (IJHR), May 2025. [DOI: 10.71000/e5q9ey91]',
    'Ayub, S., I.A. Shah, Z. Mashar, M.W. Khan, "Enhanced Signature Recognition and Fraud Detection with Deep Learning," IEEE Xplore, ICETECC, Apr 2025. [DOI: 10.1109/icetecc65365.2025.11070295]',
  ],
  certifications: [
    "AWS Certified Solutions Architect",
    "AWS Certified Machine Learning – Specialty",
    "Hugging Face Transformers Certification",
    "Gold Medalist, BS Computer Engineering Fall-18 Batch",
    "Second Runner-up, National Digital Pakistan CyberHackathon",
  ],
};

describe.skipIf(process.env.RENDER_SAMPLES !== "1")("sample render", () => {
  it("writes a PDF and a DOCX for every template", async () => {
    for (const id of TEMPLATE_IDS) {
      writeFileSync(
        `sample-resume-${id}.pdf`,
        await generateResumePdf(tailored, meta, id)
      );
      writeFileSync(
        `sample-resume-${id}.docx`,
        await generateResumeDocx(tailored, meta, id)
      );
    }
  });
});
