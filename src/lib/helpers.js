export function formatCurrency(amount, currency = "UGX") {
  if (amount === null || amount === undefined) return "—";
  
  const formats = {
    UGX: { locale: "en-UG", options: { style: "currency", currency: "UGX", minimumFractionDigits: 0 } },
    KES: { locale: "en-KE", options: { style: "currency", currency: "KES", minimumFractionDigits: 0 } },
    USD: { locale: "en-US", options: { style: "currency", currency: "USD", minimumFractionDigits: 2 } },
    TZS: { locale: "en-TZ", options: { style: "currency", currency: "TZS", minimumFractionDigits: 0 } },
    RWF: { locale: "en-RW", options: { style: "currency", currency: "RWF", minimumFractionDigits: 0 } },
  };

  const fmt = formats[currency] || formats.UGX;
  return new Intl.NumberFormat(fmt.locale, fmt.options).format(amount);
}

export function generateRef(prefix = "BP") {
  const date = new Date();
  const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}-${dateStr}-${rand}`;
}

export function timeAgo(dateStr) {
  if (!dateStr) return "—";
  const now = new Date();
  const date = new Date(dateStr);
  const diff = Math.floor((now - date) / 1000);
  
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return date.toLocaleDateString();
}