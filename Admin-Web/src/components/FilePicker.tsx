import React, { useRef, useState } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  IconButton,
  Paper,
  Alert,
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DeleteIcon from '@mui/icons-material/Delete';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import type { RequestDocument } from '../types';
import { apiService } from '../services/api';

interface FilePickerProps {
  label: string;
  documentType: string;
  required?: boolean;
  onFileUploaded: (doc: RequestDocument) => void;
  onFileRemoved?: (docId: string) => void;
  existingDocument?: RequestDocument | null;
  helperText?: string;
}

export const FilePicker: React.FC<FilePickerProps> = ({
  label,
  documentType,
  required = false,
  onFileUploaded,
  onFileRemoved,
  existingDocument = null,
  helperText,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [currentDoc, setCurrentDoc] = useState<RequestDocument | null>(existingDocument);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
  };

  const handleProcessFile = async (file: File) => {
    setUploadError(null);

    // Validate size (5 MB limit)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setUploadError(`El archivo supera los 5 MB permitidos (tamaño actual: ${formatBytes(file.size)}).`);
      return;
    }

    // Validate type (PDF, JPG, PNG)
    const allowed = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.type)) {
      setUploadError('Formato no válido. Solo se admiten documentos PDF o imágenes JPG/PNG.');
      return;
    }

    try {
      setUploading(true);
      const uploadedDoc = await apiService.uploadFile(file, documentType);
      setCurrentDoc(uploadedDoc);
      onFileUploaded(uploadedDoc);
    } catch (err: any) {
      setUploadError(err.message || 'Error al procesar el archivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleProcessFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleProcessFile(e.dataTransfer.files[0]);
    }
  };

  const handleRemove = () => {
    if (currentDoc && onFileRemoved) {
      onFileRemoved(currentDoc.id);
    }
    setCurrentDoc(null);
    setUploadError(null);
  };

  return (
    <Box sx={{ mb: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.75 }}>
        <Typography
          variant="subtitle2"
          sx={{ color: '#0F172A', fontWeight: 600, fontSize: '0.875rem' }}
        >
          {label} {required && <span style={{ color: '#DC2626' }}>*</span>}
        </Typography>
        {helperText && (
          <Typography variant="caption" sx={{ ml: 1, color: '#64748B' }}>
            ({helperText})
          </Typography>
        )}
      </Box>

      {currentDoc ? (
        <Paper
          variant="outlined"
          sx={{
            p: 1.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#F8FAFC',
            borderColor: '#CBD5E1',
            borderRadius: '8px',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, overflow: 'hidden' }}>
            <Box
              sx={{
                width: 40,
                height: 40,
                borderRadius: 1.5,
                bgcolor: '#EFF6FF',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#1E3A8A',
                flexShrink: 0,
              }}
            >
              <InsertDriveFileIcon />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="body2"
                sx={{
                  fontWeight: 600,
                  color: '#0F172A',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {currentDoc.name}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="caption" sx={{ color: '#64748B' }}>
                  {formatBytes(currentDoc.sizeBytes)}
                </Typography>
                <Typography variant="caption" sx={{ color: '#166534', display: 'flex', alignItems: 'center' }}>
                  <CheckCircleIcon sx={{ fontSize: 13, mr: 0.3 }} /> Validado
                </Typography>
              </Box>
            </Box>
          </Box>

          <IconButton
            size="small"
            onClick={handleRemove}
            sx={{ color: '#94A3B8', '&:hover': { color: '#EF4444', bgcolor: '#FEF2F2' } }}
            title="Eliminar archivo"
          >
            <DeleteIcon fontSize="small" />
          </IconButton>
        </Paper>
      ) : (
        <Box
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragOver(true);
          }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            border: `2px dashed ${isDragOver ? '#3B82F6' : '#CBD5E1'}`,
            borderRadius: '8px',
            p: 2.5,
            textAlign: 'center',
            cursor: 'pointer',
            backgroundColor: isDragOver ? '#EFF6FF' : '#FFFFFF',
            transition: 'all 0.2s ease',
            '&:hover': {
              borderColor: '#3B82F6',
              backgroundColor: '#F8FAFC',
            },
          }}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleInputChange}
            accept=".pdf,image/jpeg,image/png,image/webp"
            style={{ display: 'none' }}
          />

          <CloudUploadIcon sx={{ fontSize: 36, color: '#3B82F6', mb: 1 }} />
          <Typography variant="body2" sx={{ fontWeight: 600, color: '#0F172A' }}>
            Arrastra tu archivo aquí o haz clic para seleccionarlo
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748B', display: 'block', mt: 0.5 }}>
            Archivos permitidos: PDF, JPG, PNG (Tamaño máximo: 5 MB)
          </Typography>

          {uploading && (
            <Box sx={{ mt: 1.5, width: '100%' }}>
              <LinearProgress sx={{ borderRadius: 1 }} />
              <Typography variant="caption" sx={{ color: '#3B82F6', mt: 0.5, display: 'block' }}>
                Validando y procesando archivo...
              </Typography>
            </Box>
          )}
        </Box>
      )}

      {uploadError && (
        <Alert severity="error" sx={{ mt: 1, py: 0.5, fontSize: '0.8rem', borderRadius: 1.5 }}>
          {uploadError}
        </Alert>
      )}
    </Box>
  );
};
