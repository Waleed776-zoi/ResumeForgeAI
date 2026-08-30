import type { ResumeJson, JobJson, TailoredOutput } from "@/lib/types";

/**
 * The candidates the landing page argues about.
 *
 * ONE fixture is chosen per request and drives every demonstration on the
 * page — the skills in the hero card, the bullet that rewrites itself, and
 * the readiness score are always the same person applying for the same job.
 * Three unrelated examples would each be a mock-up; one is a walkthrough.
 *
 * There are five of them because a single hard-coded resume quietly implies
 * the product only understands software engineers. Rotating through
 * architecture, bioinformatics, analytical chemistry, structural engineering
 * and ML says the opposite in the only way a landing page can — by showing
 * it — and costs a returning visitor nothing to discover.
 *
 * They exist mainly so the readiness figure can be COMPUTED rather than
 * typed. A landing page that hardcodes "87 / 100" is making a claim about the
 * product; one that runs the product's own function on a visible resume is
 * showing the product working. tests/demo-application.test.ts runs every
 * guarantee against EVERY fixture, so a new domain cannot be added carelessly:
 * it has to survive the change ledger with nothing flagged, score in the
 * eighties, and keep its animated sentence character-identical to the bullet
 * the audit scored.
 *
 * The numbers are not tuned. Each resume scores in the mid-to-high eighties
 * because it is a decent resume with one real weakness — three of the five
 * skills its posting names — and that weakness is the honest thing to show.
 */

export type DemoMark = "posting" | "kept";

export type DemoSegment = {
  text: string;
  mark?: DemoMark;
  /** Provenance line shown in the chain. Only marked segments carry one. */
  note?: string;
};

export interface DemoApplication {
  /** Stable key — also what a test failure names when a fixture regresses. */
  id: string;
  /** Shown nowhere; it is here so the set is legibly diverse at a glance. */
  field: string;
  original: ResumeJson;
  job: JobJson;
  tailored: TailoredOutput;
  /**
   * The first tailored bullet, split so the page can mark which phrases came
   * from the posting and which are the candidate's own.
   *
   * It lives beside the resume rather than beside the animation because it
   * has to stay character-for-character identical to `tailored`'s first
   * bullet, and a test in lib is the cheap way to guarantee that. Two copies
   * of one sentence in two files is exactly the drift that ends with a demo
   * contradicting itself.
   */
  rewrite: DemoSegment[];
}

const KEPT_NOTE = "Your own number, carried over unchanged";

export const DEMO_APPLICATIONS: DemoApplication[] = [
  // ── Machine learning ────────────────────────────────────────────────────
  {
    id: "ml-imaging",
    field: "Machine learning",
    original: {
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
    },
    job: {
      role: "Machine Learning Engineer",
      company: "Halcyon Diagnostics",
      seniority: "Mid",
      required_skills: ["Python", "PyTorch", "MLOps", "Docker", "AWS"],
      responsibilities: [
        "Deploy deep learning systems to production",
        "Own inference latency and reliability",
      ],
    },
    tailored: {
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
    },
    rewrite: [
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
      { text: "1.2 s per image", mark: "kept", note: KEPT_NOTE },
      { text: "." },
    ],
  },

  // ── Architecture ────────────────────────────────────────────────────────
  {
    id: "architecture-bim",
    field: "Architecture",
    original: {
      name: "Priya Raman",
      contact: "priya.raman@example.com · +44 161 496 0208 · Manchester, UK",
      summary:
        "Architectural technologist working on healthcare and civic buildings.",
      skills: ["Revit", "AutoCAD", "Navisworks", "Rhino", "SketchUp"],
      experience: [
        {
          title: "Architectural Technologist",
          company: "Ardwick Studio",
          dates: "2021 – 2025",
          bullets: [
            "Worked on a hospital wing. Put the drawing set together and helped sort out the clashes — about 120 in the first federated model.",
            "Set up the shared Revit model and handed it over to the consultant teams.",
            "Ran the weekly BIM clash checks in Navisworks across the structural and MEP models.",
            "Cut the drawing issue cycle from 5 days to 2 by templating the sheets.",
            "Helped the site team with details that could not be built as drawn.",
            "Wrote the practice standard for model naming and kept the AutoCAD backgrounds current.",
          ],
        },
      ],
      education: ["BSc Architectural Technology — University of Salford"],
      certifications: [],
      publications: [],
    },
    job: {
      role: "BIM Coordinator",
      company: "Halden Partnership",
      seniority: "Mid",
      required_skills: ["Revit", "AutoCAD", "Navisworks", "Dynamo", "Solibri"],
      responsibilities: [
        "Produce coordinated Revit models across disciplines",
        "Run clash detection before site issue",
      ],
    },
    tailored: {
      summary:
        "Architectural technologist producing coordinated Revit and AutoCAD drawing sets for healthcare projects, with weekly BIM clash detection in Navisworks.",
      skills: ["Revit", "AutoCAD", "Navisworks", "Rhino", "SketchUp"],
      experience: [
        {
          title: "Architectural Technologist",
          company: "Ardwick Studio",
          dates: "2021 – 2025",
          bullets: [
            "Delivered a coordinated Revit model for a hospital wing, resolving 120 clashes before site issue.",
            "Established the shared Revit model and its handover to consultant teams.",
            "Ran weekly BIM clash detection in Navisworks across structural and MEP models.",
            "Reduced the drawing issue cycle from 5 days to 2 by templating sheets.",
            "Supported the site team on details that could not be built as drawn.",
            "Authored the practice standard for model naming and maintained AutoCAD backgrounds.",
          ],
        },
      ],
      cover_letter: "",
    },
    rewrite: [
      { text: "Delivered a " },
      {
        text: "coordinated Revit model",
        mark: "posting",
        note: "The phrasing the posting uses for a federated model",
      },
      { text: " for a hospital wing, resolving " },
      { text: "120 clashes", mark: "kept", note: KEPT_NOTE },
      { text: " before " },
      {
        text: "site issue",
        mark: "posting",
        note: "The posting's term for drawings going to site",
      },
      { text: "." },
    ],
  },

  // ── Bioinformatics ──────────────────────────────────────────────────────
  {
    id: "bioinformatics-pipeline",
    field: "Bioinformatics",
    original: {
      name: "Daniel Okafor",
      contact: "d.okafor@example.com · +1 617 555 0184 · Boston, MA",
      summary:
        "Computational biologist working on genomic variant calling pipelines.",
      skills: ["Python", "Nextflow", "Docker", "Bash", "Samtools"],
      experience: [
        {
          title: "Research Associate",
          company: "Charles River Genomics",
          dates: "2021 – 2025",
          bullets: [
            "Worked on the variant calling pipeline. Wrote most of it in Nextflow and got it running on the cluster — about 40 genomes a night.",
            "Wrote the Python scripts that pulled reads out of the archive and ran Samtools over them.",
            "Did the statistical analysis and the figures for two of the lab's papers.",
            "Brought the per-genome runtime down from 90 minutes to 35 by rewriting the join step.",
            "Helped the wet lab team read the QC reports and re-run the samples that failed.",
            "Wrote the pipeline documentation for new starters, including the Docker setup.",
          ],
        },
      ],
      education: ["MSc Bioinformatics — Boston University"],
      certifications: [],
      publications: [],
    },
    job: {
      role: "Computational Biologist",
      company: "Vireo Therapeutics",
      seniority: "Mid",
      required_skills: [
        "Python",
        "Nextflow",
        "Docker",
        "Snakemake",
        "Machine Learning",
      ],
      responsibilities: [
        "Scale reproducible genomic pipelines in production",
        "Own pipeline throughput and runtime",
      ],
    },
    tailored: {
      summary:
        "Computational biologist building reproducible Nextflow pipelines in Python and Docker for genomic variant calling.",
      skills: ["Python", "Nextflow", "Docker", "Bash", "Samtools"],
      experience: [
        {
          title: "Research Associate",
          company: "Charles River Genomics",
          dates: "2021 – 2025",
          bullets: [
            "Built and scaled a reproducible Nextflow variant calling pipeline in production, processing 40 genomes a night.",
            "Automated read extraction from the archive with Python and Samtools.",
            "Produced the statistical analysis and figures for two lab publications.",
            "Reduced per-genome runtime from 90 minutes to 35 by rewriting the join step.",
            "Supported wet lab colleagues in interpreting QC reports and re-running failed samples.",
            "Documented the pipeline and its Docker setup for new starters.",
          ],
        },
      ],
      cover_letter: "",
    },
    rewrite: [
      { text: "Built and " },
      {
        text: "scaled a reproducible Nextflow",
        mark: "posting",
        note: "Framing lifted from the posting",
      },
      { text: " variant calling pipeline " },
      {
        text: "in production",
        mark: "posting",
        note: "The posting's word for a deployed pipeline",
      },
      { text: ", processing " },
      { text: "40 genomes a night", mark: "kept", note: KEPT_NOTE },
      { text: "." },
    ],
  },

  // ── Analytical chemistry ────────────────────────────────────────────────
  {
    id: "chemistry-analytical",
    field: "Analytical chemistry",
    original: {
      name: "Elena Marchetti",
      contact: "e.marchetti@example.com · +39 02 8734 1160 · Milan, Italy",
      summary:
        "Analytical chemist working on small-molecule method development under GMP.",
      skills: [
        "HPLC",
        "Mass Spectrometry",
        "Method Validation",
        "GMP",
        "Dissolution Testing",
      ],
      experience: [
        {
          title: "Analytical Chemist",
          company: "Brera Pharmaceuticals",
          dates: "2020 – 2025",
          bullets: [
            "Worked on a tablet reformulation. Ran the HPLC methods and got the assay to a usable run time — about 12 minutes per sample.",
            "Set up the mass spectrometry work for impurity identification.",
            "Did the method validation package for two products and handled the GMP paperwork.",
            "Brought the dissolution testing backlog from 60 samples to 15 over one quarter.",
            "Helped the QC team troubleshoot runs that drifted out of spec — about 40 batches that year.",
            "Wrote the standard operating procedure for column conditioning.",
          ],
        },
      ],
      education: ["MSc Chemistry — Università degli Studi di Milano"],
      certifications: [],
      publications: [],
    },
    job: {
      role: "Analytical Development Scientist",
      company: "Ostrea Bio",
      seniority: "Mid",
      required_skills: [
        "HPLC",
        "Mass Spectrometry",
        "Method Validation",
        "GC-MS",
        "Stability Testing",
      ],
      responsibilities: [
        "Develop and validate stability-indicating HPLC methods",
        "Own assay run time and throughput",
      ],
    },
    tailored: {
      summary:
        "Analytical chemist leading HPLC method development under GMP, with mass spectrometry support for impurity work.",
      skills: [
        "HPLC",
        "Mass Spectrometry",
        "Method Validation",
        "GMP",
        "Dissolution Testing",
      ],
      experience: [
        {
          title: "Analytical Chemist",
          company: "Brera Pharmaceuticals",
          dates: "2020 – 2025",
          bullets: [
            "Developed a validated HPLC assay for a tablet reformulation, holding run time at 12 minutes per sample.",
            "Established mass spectrometry workflows for impurity identification.",
            "Delivered the method validation package for two products, including GMP documentation.",
            "Reduced the dissolution testing backlog from 60 samples to 15 in one quarter.",
            "Supported QC troubleshooting across 40 batches drifting out of specification.",
            "Authored the standard operating procedure for column conditioning.",
          ],
        },
      ],
      cover_letter: "",
    },
    rewrite: [
      { text: "Developed a " },
      {
        text: "validated HPLC assay",
        mark: "posting",
        note: "The posting's phrasing for a released method",
      },
      { text: " for a tablet reformulation, holding " },
      {
        text: "run time",
        mark: "posting",
        note: "The metric the posting names",
      },
      { text: " at " },
      { text: "12 minutes per sample", mark: "kept", note: KEPT_NOTE },
      { text: "." },
    ],
  },

  // ── Structural engineering ──────────────────────────────────────────────
  {
    id: "structural-bridge",
    field: "Structural engineering",
    original: {
      name: "Tomás Rivera",
      contact: "tomas.rivera@example.com · +34 91 555 0173 · Madrid, Spain",
      summary:
        "Structural engineer working on bridges and civic infrastructure.",
      skills: [
        "SAP2000",
        "AutoCAD",
        "Eurocode",
        "ETABS",
        "Reinforced Concrete",
      ],
      experience: [
        {
          title: "Structural Engineer",
          company: "Puente Ingeniería",
          dates: "2020 – 2025",
          bullets: [
            "Worked on a road bridge replacement. Did the deck analysis and checked it against Eurocode — the design took about 14% off the steel tonnage.",
            "Built the SAP2000 models for the deck and the piers.",
            "Produced the AutoCAD general arrangement drawings for tender — 22 sheets in all.",
            "Took the analysis turnaround from 6 days to 2 by scripting the load cases.",
            "Helped the contractor resolve details that clashed on site.",
            "Wrote the internal guidance on Eurocode load combinations.",
          ],
        },
      ],
      education: ["MEng Civil Engineering — Universidad Politécnica de Madrid"],
      certifications: [],
      publications: [],
    },
    job: {
      role: "Structural Bridge Engineer",
      company: "Arcadia Infrastructure",
      seniority: "Mid",
      required_skills: [
        "SAP2000",
        "AutoCAD",
        "Eurocode",
        "LUSAS",
        "Seismic Design",
      ],
      responsibilities: [
        "Deliver bridge deck design to Eurocode",
        "Own steel tonnage and buildability",
      ],
    },
    tailored: {
      summary:
        "Structural engineer delivering bridge deck design to Eurocode, with SAP2000 analysis and AutoCAD tender drawings.",
      skills: [
        "SAP2000",
        "AutoCAD",
        "Eurocode",
        "ETABS",
        "Reinforced Concrete",
      ],
      experience: [
        {
          title: "Structural Engineer",
          company: "Puente Ingeniería",
          dates: "2020 – 2025",
          bullets: [
            "Delivered the deck design for a road bridge replacement to Eurocode, reducing steel tonnage by 14%.",
            "Built SAP2000 models for the bridge deck and piers.",
            "Produced 22 AutoCAD general arrangement drawing sheets for tender.",
            "Reduced analysis turnaround from 6 days to 2 by scripting load cases.",
            "Supported the contractor in resolving details that clashed on site.",
            "Authored internal guidance on Eurocode load combinations.",
          ],
        },
      ],
      cover_letter: "",
    },
    rewrite: [
      { text: "Delivered the " },
      {
        text: "deck design",
        mark: "posting",
        note: "The posting's term for the scope",
      },
      { text: " for a road bridge replacement to Eurocode, reducing " },
      {
        text: "steel tonnage",
        mark: "posting",
        note: "The metric the posting names",
      },
      { text: " by " },
      { text: "14%", mark: "kept", note: KEPT_NOTE },
      { text: "." },
    ],
  },
];

/**
 * One application per page load.
 *
 * Called from a Server Component, so the choice is made once per request and
 * reaches the client as ordinary props — the animation and the score are
 * therefore always describing the same person, and there is no hydration
 * mismatch to guard against because the client never picks anything itself.
 *
 * `index` exists for tests and for anyone who wants to pin a demo while
 * working on it; out-of-range values wrap rather than throwing, because a
 * bad index should never be able to break the landing page.
 */
export function pickDemoApplication(index?: number): DemoApplication {
  const count = DEMO_APPLICATIONS.length;
  const chosen =
    index === undefined
      ? Math.floor(Math.random() * count)
      : ((index % count) + count) % count;

  return DEMO_APPLICATIONS[chosen];
}
