import type { ResumeJson, JobJson, TailoredOutput } from "@/lib/types";

/**
 * The candidate the landing page argues about.
 *
 * One fixture, shared by every demonstration on the page, so the skills in
 * the hero card, the bullet that rewrites itself, and the readiness score all
 * belong to the same person. Three unrelated examples would each be a
 * mock-up; one is a walkthrough.
 *
 * It exists mainly so the readiness figure can be COMPUTED rather than typed.
 * A landing page that hardcodes "87 / 100" is making a claim about the
 * product; one that runs the product's own function on a visible resume is
 * showing the product working. The check that follows from that is in
 * tests/demo-application.test.ts, which fails if the marketing number and the
 * code ever drift apart.
 *
 * The numbers are therefore not tuned. This resume scores in the mid-eighties
 * because it is a decent resume with one real weakness — three of the five
 * skills the posting names — and that weakness is the honest thing to show.
 */

export const DEMO_ORIGINAL: ResumeJson = {
  name: "Alex Mercer",
  contact: "alex.mercer@example.com · +1 415 555 0142 · San Francisco, CA",
  summary:
    "Software engineer working on backend services and medical imaging tooling.",
  skills: ["Python", "React", "AWS", "Docker", "SQL"],
  experience: [
    {
      title: "Software Engineer",
      company: "Northline Health",
      dates: "2022 – 2025",
      bullets: [
        "Worked on a medical imaging project. Built the backend and helped get it running in the hospital — about 1.2 s per image.",
        "Set up the imaging service in Docker and ran it on AWS.",
        "Wrote the Python jobs that pulled scans from the archive each night.",
        "Cut the nightly export from 40 minutes to 9 by batching the queries.",
        "Helped the radiology team review results and fix the cases it got wrong.",
        "Wrote internal documentation for the deployment process.",
      ],
    },
  ],
  education: ["BS Computer Science — UC Davis"],
  certifications: [],
  publications: [],
};

export const DEMO_JOB: JobJson = {
  role: "Machine Learning Engineer",
  company: "Halcyon Diagnostics",
  seniority: "Mid",
  required_skills: ["Python", "PyTorch", "MLOps", "Docker", "AWS"],
  responsibilities: [
    "Deploy deep learning systems to production",
    "Own inference latency and reliability",
  ],
};

/**
 * The tailored version. Every figure and employer here appears in
 * DEMO_ORIGINAL above — this fixture has to obey the product's own rule,
 * because the change ledger's own example is built from it.
 */
export const DEMO_TAILORED: TailoredOutput = {
  summary:
    "Software engineer building and deploying Python services for medical imaging and deep learning workloads.",
  skills: ["Python", "Docker", "AWS", "React", "SQL"],
  experience: [
    {
      title: "Software Engineer",
      company: "Northline Health",
      dates: "2022 – 2025",
      bullets: [
        "Built and deployed a deep learning medical imaging system to production, holding inference latency at 1.2 s per image.",
        "Containerised the imaging service with Docker and ran it on AWS.",
        "Automated nightly scan ingestion with Python jobs against the hospital archive.",
        "Reduced the nightly export window from 40 minutes to 9 by batching queries.",
        "Supported radiology review of model output and corrected failing cases.",
        "Documented the deployment process for the platform team.",
      ],
    },
  ],
  cover_letter: "",
};

/**
 * The first tailored bullet, split so the landing page can mark which phrases
 * came from the posting and which are the candidate's own.
 *
 * It lives here rather than beside the animation because it has to stay
 * character-for-character identical to the bullet in DEMO_TAILORED above, and
 * a test in lib is the cheap way to guarantee that. Two copies of the same
 * sentence in two files is exactly the kind of drift that ends with a demo
 * contradicting itself.
 */
export type DemoMark = "posting" | "kept";

export type DemoSegment = {
  text: string;
  mark?: DemoMark;
  /** Provenance line shown in the chain. Only marked segments carry one. */
  note?: string;
};

export const DEMO_REWRITE: DemoSegment[] = [
  { text: "Built and " },
  {
    text: "deployed a deep learning",
    mark: "posting",
    note: "Verb and framing taken from the posting",
  },
  { text: " medical imaging system to " },
  {
    text: "production",
    mark: "posting",
    note: "The word the posting uses for shipped work",
  },
  { text: ", holding inference latency at " },
  {
    text: "1.2 s per image",
    mark: "kept",
    note: "Your own number, carried over unchanged",
  },
  { text: "." },
];
