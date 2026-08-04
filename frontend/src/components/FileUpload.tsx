'use client';

import { useState, useRef } from 'react';
import { UploadCloud, File, CheckCircle2, AlertCircle, Loader2, X } from 'lucide-react';
import { apiFetch } from '@/lib/api';

interface FileUploadProps {
  onUploadComplete: (publicUrl: string, fileKey: string) => void;
  folder?: 'lessons' | 'courses' | 'institutes' | 'tests';
  accept?: string;
  label?: string;
  description?: string;
}

interface PresignedUrlResponse {
  message: string;
  uploadUrl: string;
  fileKey: string;
  publicUrl: string;
  expiresIn: number;
  maxSizeBytes: number;
  isDevFallback?: boolean;
}

const FILE_SIZE_LABELS: Record<string, string> = {
  'video/mp4': '500 MB',
  'video/webm': '500 MB',
  'application/pdf': '50 MB',
  'image/png': '25 MB',
  'image/jpeg': '25 MB',
  'image/webp': '25 MB',
};

export default function FileUpload({
  onUploadComplete,
  folder = 'lessons',
  accept = 'video/mp4,video/webm,application/pdf,image/png,image/jpeg,image/webp',
  label = 'Upload Media File',
  description = 'Drag & drop your file here, or click to browse (MP4, PDF, PNG, JPG, WEBP)',
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (selectedFile: File) => {
    setError(null);
    setUploadedUrl(null);
    setProgress(0);
    setFile(selectedFile);
  };

  const handleUpload = async () => {
    if (!file) return;

    setUploading(true);
    setError(null);
    setProgress(5);

    try {
      // 1. Get pre-signed URL from backend
      const presignedData = await apiFetch<PresignedUrlResponse>(
        `/uploads/presigned-url?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type || 'application/octet-stream')}&folder=${folder}`
      );

      // 2. Client-side size check against backend's accepted max
      if (file.size > presignedData.maxSizeBytes) {
        const maxLabel = FILE_SIZE_LABELS[file.type] || `${Math.round(presignedData.maxSizeBytes / (1024 * 1024))} MB`;
        throw new Error(`File too large. Maximum allowed is ${maxLabel}.`);
      }

      setProgress(20);

      // 3. Direct upload
      if (presignedData.isDevFallback) {
        // Dev fallback — uploadUrl is already a relative path
        await apiFetch(presignedData.uploadUrl, { method: 'POST' });
        setProgress(100);
      } else {
        // Real S3 upload with progress tracking via XHR
        await new Promise<void>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', presignedData.uploadUrl, true);
          xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');

          xhr.upload.onprogress = (e) => {
            if (e.lengthComputable) {
              const percent = Math.round((e.loaded / e.total) * 80) + 20;
              setProgress(Math.min(percent, 99));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              setProgress(100);
              resolve();
            } else {
              reject(new Error(`Upload failed with status ${xhr.status}`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during file upload'));
          xhr.send(file);
        });
      }

      setUploadedUrl(presignedData.publicUrl);
      onUploadComplete(presignedData.publicUrl, presignedData.fileKey);
    } catch (err: any) {
      setError(err.message || 'File upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  return (
    <div className="w-full space-y-3">
      {label && <label className="block text-xs font-semibold text-slate-300">{label}</label>}

      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-blue-500 bg-blue-500/10 scale-[1.01]'
            : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/60'
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center">
            <UploadCloud className="w-6 h-6" />
          </div>
          <div>
            <p className="text-sm font-bold text-white">{file ? file.name : 'Select file for direct upload'}</p>
            <p className="text-xs text-slate-400 mt-1">{description}</p>
          </div>
        </div>
      </div>

      {/* Selected file info + upload trigger */}
      {file && !uploadedUrl && (
        <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 overflow-hidden">
            <File className="w-5 h-5 text-blue-400 shrink-0" />
            <div className="truncate">
              <p className="text-xs font-semibold text-slate-200 truncate">{file.name}</p>
              <p className="text-[11px] text-slate-400">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleUpload}
              disabled={uploading}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-emerald-500 hover:from-blue-500 hover:to-emerald-400 text-white text-xs font-bold transition shadow-lg shadow-blue-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Uploading ({progress}%)</span>
                </>
              ) : (
                <span>Upload to Cloud</span>
              )}
            </button>
            <button
              type="button"
              onClick={() => setFile(null)}
              className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Progress bar */}
      {uploading && (
        <div className="w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div
            className="bg-gradient-to-r from-blue-500 to-emerald-400 h-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

      {/* Success */}
      {uploadedUrl && (
        <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>Upload complete</span>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
