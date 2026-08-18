import { describe, it, expect } from "vitest";
import {
  TEMPLATES,
  TEMPLATE_IDS,
  TEMPLATE_LIST,
  DEFAULT_TEMPLATE,
  isTemplateId,
  resolveTemplate,
} from "../generators/templates";

describe("resolveTemplate", () => {
  it("returns the named template", () => {
    for (const id of TEMPLATE_IDS) {
      expect(resolveTemplate(id).id).toBe(id);
    }
  });

  it("falls back to the default for anything unrecognised", () => {
    // These arrive from a query string, so they can be literally anything —
    // a stale bookmark must not break a download.
    for (const junk of [undefined, null, "", "fancy", 7, {}, "CLASSIC"]) {
      expect(resolveTemplate(junk).id).toBe(DEFAULT_TEMPLATE);
    }
  });
});

describe("isTemplateId", () => {
  it("accepts only exact known ids", () => {
    expect(isTemplateId("modern")).toBe(true);
    expect(isTemplateId("Modern")).toBe(false);
    expect(isTemplateId(null)).toBe(false);
  });
});

describe("template specs", () => {
  it("exposes every id in the list, in order", () => {
    expect(TEMPLATE_LIST.map((t) => t.id)).toEqual([...TEMPLATE_IDS]);
  });

  it("gives every template a distinct name and a real description", () => {
    const names = new Set(TEMPLATE_LIST.map((t) => t.name));
    expect(names.size).toBe(TEMPLATE_LIST.length);

    for (const t of TEMPLATE_LIST) {
      expect(t.description.length).toBeGreaterThan(40);
    }
  });

  it("keeps every measurement positive and sane", () => {
    for (const t of TEMPLATE_LIST) {
      expect(t.margin).toBeGreaterThan(20);
      // Margins must leave a usable column on US Letter (612pt wide).
      expect(612 - t.margin * 2).toBeGreaterThan(300);
      expect(t.leading).toBeGreaterThan(1);
      expect(t.leading).toBeLessThan(2);

      for (const [key, size] of Object.entries(t.size)) {
        expect(size, `${t.id}.size.${key}`).toBeGreaterThan(6);
        expect(size, `${t.id}.size.${key}`).toBeLessThan(40);
      }

      // The name should always outrank body text visually.
      expect(t.size.name).toBeGreaterThan(t.size.body);
    }
  });

  it("makes Compact genuinely denser than Classic", () => {
    // The templates have to differ in the way their descriptions promise,
    // or the picker is offering a choice that isn't real.
    const { compact, classic } = TEMPLATES;
    expect(compact.leading).toBeLessThan(classic.leading);
    expect(compact.margin).toBeLessThan(classic.margin);
    expect(compact.size.body).toBeLessThan(classic.size.body);
  });

  it("makes Modern airier and visually distinct from Classic", () => {
    const { modern, classic } = TEMPLATES;
    expect(modern.leading).toBeGreaterThan(classic.leading);
    expect(modern.family).not.toBe(classic.family);
    expect(modern.headerAlign).not.toBe(classic.headerAlign);
  });
});
