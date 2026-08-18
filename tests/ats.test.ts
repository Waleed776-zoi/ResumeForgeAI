import { describe, it, expect } from "vitest";
import { atsReport, type AtsInput } from "../lib/ats";
import { gapAnalysis } from "../lib/gap-analysis";

function input(overrides: Partial<AtsInput> = {}): AtsInput {
  const tailored = {
    summary:
      "AI engineer who built and deployed PyTorch models in Python for clinical imaging.",
    skills: ["Python", "PyTorch", "Docker"],
    experience: [
      {
        title: "Machine Learning Engineer",
        company: "NUST",
        dates: "2023 – 2025",
        bullets: [
          "Developed a PyTorch imaging system, reducing inference latency by 60%.",
          "Deployed the Python service to production for 12 clinics.",
        ],
      },
    ],
    cover_letter: "",
  };

  return {
    tailored,
    job: { role: "Machine Learning Engineer", company: "", seniority: "", required_skills: ["Python", "PyTorch"], responsibilities: [] },
    gap: gapAnalysis(tailored.skills, ["Python", "PyTorch"]),
    contact: "waleed@example.com | +92-303-2332114",
    education: ["MS CSE — NUST"],
    ...overrides,
  };
}

const check = (report: ReturnType<typeof atsReport>, id: string) => {
  const found = report.checks.find((c) => c.id === id);
  if (!found) throw new Error(`no check "${id}"`);
  return found;
};

describe("atsReport", () => {
  it("scores a well-formed, well-matched resume highly", () => {
    const report = atsReport(input());
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.band).toBe("strong");
  });

  it("never exceeds 100 or drops below 0", () => {
    for (const r of [atsReport(input()), atsReport(input({ contact: "" }))]) {
      expect(r.score).toBeGreaterThanOrEqual(0);
      expect(r.score).toBeLessThanOrEqual(100);
    }
  });

  it("excludes unevaluable checks from the denominator rather than failing them", () => {
    // A posting with no stated skills and no title must not cost the
    // candidate points for the employer's thin job ad.
    const report = atsReport(
      input({
        job: { role: "", company: "", seniority: "", required_skills: [], responsibilities: [] },
        gap: gapAnalysis(["Python", "PyTorch", "Docker"], []),
      })
    );

    expect(check(report, "keyword-coverage").status).toBe("skipped");
    expect(check(report, "title-alignment").status).toBe("skipped");
    // 30 + 15 + 10 of weight removed from the 100 available.
    expect(report.available).toBe(45);
  });

  it("flags skills that appear only in the skills list", () => {
    const report = atsReport(
      input({
        tailored: {
          summary: "Engineer.",
          skills: ["Python", "Kubernetes"],
          experience: [
            {
              title: "Engineer",
              company: "Acme",
              dates: "2024",
              bullets: ["Developed a Python service handling 40 requests/sec."],
            },
          ],
          cover_letter: "",
        },
        job: { role: "Engineer", company: "", seniority: "", required_skills: ["Python", "Kubernetes"], responsibilities: [] },
        gap: gapAnalysis(["Python", "Kubernetes"], ["Python", "Kubernetes"]),
      })
    );

    const evidence = check(report, "keyword-evidence");
    expect(evidence.items).toEqual(["Kubernetes"]);
    expect(evidence.earned).toBeLessThan(evidence.weight);
  });

  it("fails contact parsing when email or phone is absent", () => {
    const missing = check(atsReport(input({ contact: "" })), "contact");
    expect(missing.status).toBe("fail");
    expect(missing.items).toEqual(["email address", "phone number"]);

    const emailOnly = check(
      atsReport(input({ contact: "waleed@example.com" })),
      "contact"
    );
    expect(emailOnly.items).toEqual(["phone number"]);
  });

  it("does not count a bare year as a quantified result", () => {
    const report = atsReport(
      input({
        tailored: {
          summary: "Engineer.",
          skills: ["Python"],
          experience: [
            {
              title: "Engineer",
              company: "Acme",
              dates: "2024",
              bullets: [
                "Joined the team in 2021.", // a year, not a metric
                "Maintained the deployment pipeline.",
              ],
            },
          ],
          cover_letter: "",
        },
      })
    );

    expect(check(report, "quantified").earned).toBe(0);
  });

  it("rewards bullets that open with an action verb", () => {
    const weak = atsReport(
      input({
        tailored: {
          summary: "Engineer.",
          skills: ["Python"],
          experience: [
            {
              title: "Engineer",
              company: "Acme",
              dates: "2024",
              bullets: [
                "Responsible for the Python pipeline.",
                "Was involved in Python deployments.",
              ],
            },
          ],
          cover_letter: "",
        },
      })
    );

    expect(check(weak, "action-verbs").earned).toBe(0);
    expect(check(atsReport(input()), "action-verbs").earned).toBeGreaterThan(0);
  });

  it("reports every check with a readable explanation", () => {
    // The whole premise is that a score you can't interrogate is worthless.
    for (const c of atsReport(input()).checks) {
      expect(c.detail.length).toBeGreaterThan(20);
      expect(c.earned).toBeLessThanOrEqual(c.weight);
    }
  });
});
