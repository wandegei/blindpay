import { formatCurrency } from "./helpers";

// ── CSV ──────────────────────────────────────────────────────────────────────

function toCSV(rows, columns) {
  const header = columns.map(c => `"${c.label}"`).join(",");
  const body = rows.map(row =>
    columns.map(c => {
      const val = c.accessor(row);
      return `"${String(val ?? "").replace(/"/g, '""')}"`;
    }).join(",")
  ).join("\n");
  return header + "\n" + body;
}

function downloadCSV(csvStr, filename) {
  const blob = new Blob([csvStr], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ── PDF (pure HTML → print) ──────────────────────────────────────────────────

function downloadPDF(title, tableHTML) {
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; font-size: 12px; color: #111; padding: 24px; }
    h1 { font-size: 18px; margin-bottom: 4px; }
    p { font-size: 11px; color: #666; margin-bottom: 16px; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #1e293b; color: #fff; text-align: left; padding: 8px 10px; font-size: 11px; text-transform: uppercase; letter-spacing: .05em; }
    td { padding: 7px 10px; border-bottom: 1px solid #e2e8f0; font-size: 11px; }
    tr:nth-child(even) td { background: #f8fafc; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <p>Generated on ${new Date().toLocaleString()}</p>
  ${tableHTML}
</body>
</html>`;

  const win = window.open("", "_blank");
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => { win.print(); win.close(); }, 400);
}

// ── Column definitions ────────────────────────────────────────────────────────

const ORDER_COLS = [
  { label: "Reference",     accessor: o => o.order_ref || o.id?.slice(0,8) },
  { label: "Customer",      accessor: o => o.customer_name },
  { label: "Email",         accessor: o => o.customer_email },
  { label: "Amount",        accessor: o => formatCurrency(o.total_amount, o.currency) },
  { label: "Currency",      accessor: o => o.currency },
  { label: "Status",        accessor: o => o.status },
  { label: "Risk Score",    accessor: o => o.risk_score ?? 0 },
  { label: "Deposit Method",accessor: o => o.deposit_method },
  { label: "Created",       accessor: o => o.created_date ? new Date(o.created_date).toLocaleString() : "" },
];

const TRANSACTION_COLS = [
  { label: "TX Ref",        accessor: t => t.tx_ref || t.id?.slice(0,8) },
  { label: "Order ID",      accessor: t => t.order_id?.slice(0,8) },
  { label: "Type",          accessor: t => t.type },
  { label: "From",          accessor: t => t.from_provider },
  { label: "To",            accessor: t => t.to_provider },
  { label: "Amount",        accessor: t => formatCurrency(t.amount, t.currency) },
  { label: "Currency",      accessor: t => t.currency },
  { label: "Status",        accessor: t => t.status },
  { label: "Created",       accessor: t => t.created_date ? new Date(t.created_date).toLocaleString() : "" },
];

const KYC_COLS = [
  { label: "Full Name",     accessor: k => k.full_name },
  { label: "Email",         accessor: k => k.user_email },
  { label: "ID Type",       accessor: k => k.id_type },
  { label: "ID Number",     accessor: k => k.id_number },
  { label: "Nationality",   accessor: k => k.nationality },
  { label: "Status",        accessor: k => k.status },
  { label: "Risk Level",    accessor: k => k.risk_level },
  { label: "Auto Check",    accessor: k => k.auto_check_passed ? "Passed" : "Failed" },
  { label: "Verified At",   accessor: k => k.verified_at ? new Date(k.verified_at).toLocaleString() : "" },
  { label: "Submitted",     accessor: k => k.created_date ? new Date(k.created_date).toLocaleString() : "" },
];

// ── Public API ────────────────────────────────────────────────────────────────

function buildTableHTML(rows, cols) {
  const header = `<tr>${cols.map(c => `<th>${c.label}</th>`).join("")}</tr>`;
  const body = rows.map(row =>
    `<tr>${cols.map(c => `<td>${c.accessor(row) ?? ""}</td>`).join("")}</tr>`
  ).join("");
  return `<table><thead>${header}</thead><tbody>${body}</tbody></table>`;
}

export function exportOrders(orders, format = "csv") {
  const stamp = new Date().toISOString().slice(0,10);
  if (format === "csv") {
    downloadCSV(toCSV(orders, ORDER_COLS), `blindpay-orders-${stamp}.csv`);
  } else {
    downloadPDF(`BlindPay — Orders Report (${stamp})`, buildTableHTML(orders, ORDER_COLS));
  }
}

export function exportTransactions(transactions, format = "csv") {
  const stamp = new Date().toISOString().slice(0,10);
  if (format === "csv") {
    downloadCSV(toCSV(transactions, TRANSACTION_COLS), `blindpay-transactions-${stamp}.csv`);
  } else {
    downloadPDF(`BlindPay — Transactions Report (${stamp})`, buildTableHTML(transactions, TRANSACTION_COLS));
  }
}

export function exportKyc(submissions, format = "csv") {
  const stamp = new Date().toISOString().slice(0,10);
  if (format === "csv") {
    downloadCSV(toCSV(submissions, KYC_COLS), `blindpay-kyc-${stamp}.csv`);
  } else {
    downloadPDF(`BlindPay — KYC Summary Report (${stamp})`, buildTableHTML(submissions, KYC_COLS));
  }
}