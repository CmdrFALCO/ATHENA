import { useState, useRef, useEffect } from 'react';
import { useSelector } from '@legendapp/state/react';
import { X, Upload, FileText, Image, FileSpreadsheet, File } from 'lucide-react';
import { uploadResource, setResourceAdapter } from '@/store/resourceActions';
import { resourceState$ } from '@/store/resourceState';
import { useResourceAdapter } from '@/adapters';

// Accepted file types
const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
  'application/vnd.ms-excel': ['.xls'],
  'text/markdown': ['.md'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/gif': ['.gif'],
  'image/webp': ['.webp'],
};

const ACCEPT_STRING = Object.entries(ACCEPTED_TYPES)
  .flatMap(([mime, exts]) => [mime, ...exts])
  .join(',');

interface ResourceUploadDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (resourceId: string) => void;
  initialPosition?: { x: number; y: number };
}

export function ResourceUploadDialog({
  isOpen,
  onClose,
  onSuccess,
  initialPosition,
}: ResourceUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [userNotes, setUserNotes] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadProgress = useSelector(() => resourceState$.uploadProgress.get());
  const resourceAdapter = useResourceAdapter();

  // Set adapter reference for actions
  useEffect(() => {
    setResourceAdapter(resourceAdapter);
  }, [resourceAdapter]);

  if (!isOpen) return null;

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file size (max 50MB)
      if (file.size > 50 * 1024 * 1024) {
        setError('File too large. Maximum size is 50MB.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      if (file.size > 50 * 1024 * 1024) {
        setError('File too large. Maximum size is 50MB.');
        return;
      }
      setSelectedFile(file);
      setError(null);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setError(null);

    try {
      const resource = await uploadResource(selectedFile, {
        userNotes: userNotes || undefined,
        positionX: initialPosition?.x,
        positionY: initialPosition?.y,
      });

      onSuccess?.(resource.id);
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setUserNotes('');
    setError(null);
    onClose();
  };

  const getFileIcon = (file: File) => {
    const type = file.type;
    if (type === 'application/pdf')
      return <FileText className="w-8 h-8 text-red-500" />;
    if (type.includes('word'))
      return <FileText className="w-8 h-8 text-blue-500" />;
    if (type.includes('sheet') || type.includes('excel'))
      return <FileSpreadsheet className="w-8 h-8 text-green-500" />;
    if (type.startsWith('image/'))
      return <Image className="w-8 h-8 text-purple-500" />;
    return <File className="w-8 h-8 text-gray-500" />;
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-athena-surface rounded-lg shadow-xl w-full max-w-md mx-4 border border-athena-border">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-athena-border">
          <h2 className="text-lg font-semibold text-athena-text">Upload Resource</h2>
          <button
            onClick={handleClose}
            className="p-1 hover:bg-athena-bg rounded text-athena-muted hover:text-athena-text"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Drop zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className={`
              border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
              transition-colors
              ${
                selectedFile
                  ? 'border-blue-400 bg-blue-500/10'
                  : 'border-athena-border hover:border-blue-400 hover:bg-athena-bg/50'
              }
            `}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPT_STRING}
              onChange={handleFileSelect}
              className="hidden"
            />

            {selectedFile ? (
              <div className="flex flex-col items-center gap-2">
                {getFileIcon(selectedFile)}
                <div className="font-medium text-athena-text">{selectedFile.name}</div>
                <div className="text-sm text-athena-muted">
                  {formatFileSize(selectedFile.size)}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedFile(null);
                  }}
                  className="text-sm text-blue-400 hover:underline"
                >
                  Choose different file
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-athena-muted">
                <Upload className="w-10 h-10" />
                <div>Drop a file here or click to browse</div>
                <div className="text-sm">PDF, DOCX, XLSX, MD, or images (max 50MB)</div>
              </div>
            )}
          </div>

          {/* User notes */}
          <div>
            <label className="block text-sm font-medium text-athena-muted mb-1">
              Notes (optional)
            </label>
            <textarea
              value={userNotes}
              onChange={(e) => setUserNotes(e.target.value)}
              placeholder="Add notes about this resource..."
              className="w-full px-3 py-2 bg-athena-bg border border-athena-border rounded-lg resize-none h-20 focus:outline-none focus:ring-2 focus:ring-blue-500 text-athena-text placeholder:text-athena-muted"
            />
          </div>

          {/* Progress bar */}
          {uploadProgress !== null && (
            <div className="space-y-1">
              <div className="text-sm text-athena-muted">Uploading...</div>
              <div className="h-2 bg-athena-bg rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {error && (
            <div className="text-sm text-red-400 bg-red-500/10 px-3 py-2 rounded border border-red-500/20">
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-athena-border bg-athena-bg/50 rounded-b-lg">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-athena-muted hover:text-athena-text hover:bg-athena-surface rounded transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`
              px-4 py-2 rounded font-medium transition-colors
              ${
                selectedFile && !isUploading
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-athena-border text-athena-muted cursor-not-allowed'
              }
            `}
          >
            {isUploading ? 'Uploading...' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
