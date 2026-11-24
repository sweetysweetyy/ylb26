import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { DocumentRenderer } from "../components/plan/DocumentRenderer";
import { isPlanContent, type PlanContent } from "./plan-schema";

describe("stored business plan content", () => {
  it.each([undefined, null, {}, { title: "Plan" }, { title: "Plan", sections: null }, { title: "Plan", sections: {} }, { title: "Plan", sections: [] }])(
    "rejects content without usable sections: %j",
    (content) => {
      expect(isPlanContent(content)).toBe(false);
      expect(() => renderToStaticMarkup(<DocumentRenderer content={content as PlanContent} />)).not.toThrow();
    },
  );

  it("rejects sections missing their block array", () => {
    expect(isPlanContent({ title: "Plan", sections: [{ id: "one", title: "Résumé" }] })).toBe(false);
  });

  it("accepts valid sections without changing their contents", () => {
    const content: PlanContent = {
      title: "Plan",
      sections: [{ id: "one", title: "Résumé", blocks: [{ type: "paragraph", text: "Activité" }] }],
    };
    expect(isPlanContent(content)).toBe(true);
    expect(() => renderToStaticMarkup(<DocumentRenderer content={content} />)).not.toThrow();
    expect(content.sections[0]?.blocks).toEqual([{ type: "paragraph", text: "Activité" }]);
  });
});