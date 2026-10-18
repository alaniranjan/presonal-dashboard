import { expect, test } from "@playwright/test";
import { toCsv } from "../../src/lib/csv";

test("escapes quotes, commas, newlines and formula prefixes", () => {
  const csv = toCsv([{ a: 'He said "hi", ok', b: "=SUM(A1)", c: ["x", "y"], d: null }],
    [{ key: "a", label: "A" }, { key: "b", label: "B" }, { key: "c", label: "C" }, { key: "d", label: "D" }]);
  expect(csv).toBe('﻿A,B,C,D\r\n"He said ""hi"", ok",\'=SUM(A1),x; y,\r\n');
});
