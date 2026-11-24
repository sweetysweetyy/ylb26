import { describe, expect, it } from "vitest";
import { sanitizeDocument } from "./sanitize-document";

describe("document execution protection", () => {
  it("removes unquoted and quoted executable attributes and scripts", () => {
    const safe = sanitizeDocument('<img src=x onerror=alert(1)><p onclick="alert(2)">Text</p><script>alert(3)</script>');
    const root = document.createElement("div"); root.innerHTML = safe;
    expect(root.querySelector("script")).toBeNull();
    expect(root.querySelector("img")?.hasAttribute("onerror")).toBe(false);
    expect(root.querySelector("p")?.hasAttribute("onclick")).toBe(false);
  });
  it("removes executable URLs and embedded active content", () => {
    const root = document.createElement("div");
    root.innerHTML = sanitizeDocument('<a href="javascript:alert(1)">Link</a><iframe srcdoc="bad"></iframe><svg><foreignObject><p onload=alert(1)>bad</p></foreignObject></svg>');
    expect(root.querySelector("a")?.hasAttribute("href")).toBe(false);
    expect(root.querySelector("iframe, foreignObject, [onload]")).toBeNull();
  });
  it("preserves legitimate document formatting and safe icons", () => {
    const root = document.createElement("div");
    root.innerHTML = sanitizeDocument('<section class="doc-card" style="color:red"><h2>Title</h2><svg viewBox="0 0 24 24"><path d="M0 0 L24 24" /></svg></section>');
    expect(root.querySelector("section")?.className).toBe("doc-card");
    expect(root.querySelector("h2")?.textContent).toBe("Title");
    expect(root.querySelector("svg path")).not.toBeNull();
  });
});