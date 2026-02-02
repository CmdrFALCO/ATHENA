import { useState, useRef, useEffect } from 'react';
import {
  Download,
  FileText,
  Braces,
  Table,
  Globe,
  ChevronDown,
  Settings2,
} from 'lucide-react';
import { exportActions } from '../store/exportActions';
import { FORMAT_INFO, type ExportFormat, type ExportSource } from '../types';

interface ExportDropdownProps {
  entityIds: string[];
  source?: ExportSource;
  disabled?: boolean;
  className?: string;
}

const FORMAT_ICONS: Record<ExportFormat, React.ReactNode> = {
  markdown: <FileText size={16} />,
  json: <Braces size={16} />,
  csv: <Table size={16} />,
  html: <Globe size={16} />,
};

export function ExportDropdown({
  entityIds,
  source = 'selection',
  disabled = false,
  className = '',
}: ExportDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleQuickExport = async (format: ExportFormat) => {
    setIsOpen(false);
    await exportActions.quickExport(entityIds, format, source);
  };

  const handleOpenDialog = () => {
    setIsOpen(false);
    exportActions.openDialog(source, { entityIds });
  };

  if (entityIds.length === 0) return null;

  return (
    <div ref={dropdownRef} className={`relative ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-athena-surface
                   border border-athena-border rounded-lg text-sm
                   hover:bg-athena-border/50 disabled:opacity-50
                   disabled:cursor-not-allowed transition-colors"
        title="Export selected notes"
      >
        <Download size={16} />
        <span>Export</span>
        <ChevronDown
          size={14}
          className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {isOpen && (
        <div
          className="absolute right-0 top-full mt-1 w-48 bg-athena-surface
                        border border-athena-border rounded-lg shadow-lg z-50 py-1"
        >
          {(Object.keys(FORMAT_INFO) as ExportFormat[]).map((format) => (
            <button
              key={format}
              onClick={() => handleQuickExport(format)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm
                         hover:bg-athena-border/50 transition-colors text-left"
            >
              {FORMAT_ICONS[format]}
              <span>{FORMAT_INFO[format].name}</span>
              <span className="ml-auto text-athena-muted text-xs">
                {FORMAT_INFO[format].fileExtension}
              </span>
            </button>
          ))}

          <div className="h-px bg-athena-border my-1" />

          <button
            onClick={handleOpenDialog}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm
                       hover:bg-athena-border/50 transition-colors text-left"
          >
            <Settings2 size={16} />
            <span>More options...</span>
          </button>
        </div>
      )}
    </div>
  );
}
