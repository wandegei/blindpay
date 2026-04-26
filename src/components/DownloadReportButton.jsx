import { useState } from "react";
import { Download, FileText, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { exportOrders, exportTransactions, exportKyc } from "@/lib/exportReport";
import { toast } from "sonner";

/**
 * @param {object} props
 * @param {"orders"|"transactions"|"kyc"} props.type
 * @param {Array} props.data
 * @param {string} [props.className]
 */
export default function DownloadReportButton({ type, data, className }) {
  const [open, setOpen] = useState(false);

  function handle(format) {
    setOpen(false);
    if (!data?.length) { toast.error("No data to export"); return; }
    if (type === "orders")       exportOrders(data, format);
    if (type === "transactions") exportTransactions(data, format);
    if (type === "kyc")          exportKyc(data, format);
    toast.success(`${format.toUpperCase()} export started`);
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className={`gap-2 ${className}`}>
          <Download className="w-3.5 h-3.5" /> Export
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-44 bg-card border-border">
        <DropdownMenuLabel className="text-xs text-muted-foreground">Download Report</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handle("csv")} className="gap-2 cursor-pointer">
          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" /> Export CSV
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handle("pdf")} className="gap-2 cursor-pointer">
          <FileText className="w-3.5 h-3.5 text-blue-400" /> Export PDF
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}