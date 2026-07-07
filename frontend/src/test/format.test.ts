import { describe, expect, it } from "vitest";

import { formatDA } from "@/lib/format";

// fr-DZ grouping may use a regular, no-break or narrow no-break space.
const SEP = "[\\s\\u00a0\\u202f]?";

describe("formatDA", () => {
  it("formats numbers with the DA suffix", () => {
    expect(formatDA(2500)).toMatch(new RegExp(`2${SEP}500 DA`));
  });

  it("accepts decimal strings from the API", () => {
    expect(formatDA("2800.00")).toMatch(new RegExp(`2${SEP}800 DA`));
  });
});
