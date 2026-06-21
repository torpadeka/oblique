/**
 * Generates public/sample-credit-memo.pdf — a single-page, uncompressed PDF of a
 * pseudonymised corporate credit memo. Labels are phrased so both the QVAC LLM and
 * the deterministic heuristic parser can extract every field. Run: node scripts/make-sample-pdf.mjs
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const out = join(__dirname, "..", "public", "sample-credit-memo.pdf");

// One "Label: value" per line. No section headers / blank lines: pdf.js flattens
// the page to space-separated text, so any non-label line would interleave with
// the values and confuse the deterministic heuristic parser. The QVAC LLM doesn't
// care, but keeping it clean makes the offline demo extract cleanly too.
const lines = [
  "OBLIQUE CORPORATE CREDIT MEMORANDUM (pseudonymised sample)",
  "Company Name: Northwind Construction Ltd",
  "Debtor Name: Northwind Construction Ltd",
  "Tax ID: 82-4471903",
  "Business Registration No: 10482217",
  "Address: 1200 Harbor Boulevard, Suite 400, Austin, TX 78701",
  "Established: 2019-01-28",
  "Sector: Construction",
  "Industry: Building Construction",
  "Years in Business: 7",
  "Loan Purpose: Working-capital facility to execute the Riverside Logistics Hub joint venture.",
  "Credit Limit Requested: $15,000,000",
  "Credit Limit Approved: $9,000,000",
  "Tenor (months): 12",
  "Interest Rate: 13.5% p.a.",
  "Repayment Scheme: Bullet principal - revolving demand loan",
  "Revenue: $17,000,000",
  "Cost of Goods Sold: $12,920,000",
  "Operating Profit: $3,400,000",
  "Net Income: $2,550,000",
  "EBITDA: $3,570,000",
  "Interest Expense: $212,000",
  "Total Assets: $8,025,000",
  "Total Equity: $7,500,000",
  "Total Liabilities: $525,000",
  "Current Assets: $3,116,800",
  "Current Liabilities: $320,000",
  "Cash and Equivalents: $409,600",
  "Inventory: $2,252,800",
  "DSCR - Optimistic: 4.34",
  "DSCR - Moderate: 1.45",
  "DSCR - Pessimistic: 1.02",
  "Collateral Type: Real estate - land and buildings (2 titled properties, first-ranking charge)",
  "Collateral Market Value: $13,041,400",
  "Collateral Liquidation Value: $9,128,980",
  "Bureau Grade: 1",
  "Active NPL: No",
];

const esc = (s) => s.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

let content = "BT\n/F1 11 Tf\n50 780 Td\n13.5 TL\n";
for (const line of lines) content += `(${esc(line)}) Tj\nT*\n`;
content += "ET";

const objects = [
  "<< /Type /Catalog /Pages 2 0 R >>",
  "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
  "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
  "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
  `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
];

let pdf = "%PDF-1.4\n";
const offsets = [];
objects.forEach((body, i) => {
  offsets.push(pdf.length);
  pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
});

const xrefStart = pdf.length;
pdf += `xref\n0 ${objects.length + 1}\n`;
pdf += "0000000000 65535 f \n";
for (const off of offsets) pdf += `${String(off).padStart(10, "0")} 00000 n \n`;
pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, pdf, "latin1");
console.log(`Wrote ${out} (${pdf.length} bytes, ${lines.length} lines)`);
