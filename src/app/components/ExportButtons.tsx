import { motion } from 'motion/react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { exportMultiSheetExcel, exportMultiSectionPdf } from '../utils/exportReport';

interface ExportButtonsProps {
  onExportExcel: () => void;
  onExportPdf: () => void;
  label?: string;
  compact?: boolean;
  variant?: 'default' | 'onDark';
}

/** Excel + PDF export toolbar used on admin and teacher reports */
export function ExportButtons({ onExportExcel, onExportPdf, label, compact, variant = 'default' }: ExportButtonsProps) {
  const onDark = variant === 'onDark';
  return (
    <div className={`flex flex-wrap items-center gap-2 ${compact ? '' : 'justify-end'}`}>
      {label && (
        <span className={`text-xs font-medium mr-1 ${onDark ? 'text-white/80' : 'text-gray-500'}`}>{label}</span>
      )}
      <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={onExportExcel}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${
          onDark
            ? 'bg-white/15 border border-white/30 text-white hover:bg-white/25'
            : 'border border-green-200 bg-green-50 text-green-800 hover:bg-green-100'
        }`}>
        <FileSpreadsheet size={14} /> Excel
      </motion.button>
      <motion.button type="button" whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
        onClick={onExportPdf}
        className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ${
          onDark
            ? 'bg-white/15 border border-white/30 text-white hover:bg-white/25'
            : 'border border-red-200 bg-red-50 text-red-800 hover:bg-red-100'
        }`}>
        <FileText size={14} /> PDF
      </motion.button>
    </div>
  );
}

export function exportAdminDashboardReport(
  sections: ReturnType<typeof import('./adminExport').buildAdminReportSections>,
  format: 'excel' | 'pdf'
) {
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === 'excel') {
    exportMultiSheetExcel(`projecthub-admin-report-${stamp}`, sections);
  } else {
    exportMultiSectionPdf('ProjectHub — Admin Statistics & Report', sections, `admin-report-${stamp}.pdf`);
  }
}
