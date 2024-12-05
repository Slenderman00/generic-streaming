import React, { useState, useEffect } from 'react';
import { Upload, CheckCircle, AlertCircle, Clock, RefreshCw } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { auth } from '../../frameworks/auth';

// Supported formats from the backend
const SUPPORTED_FORMATS = [
  'video/mp4',     // .mp4
  'video/quicktime', // .mov
  'video/x-msvideo', // .avi
  'video/x-matroska', // .mkv
  'video/x-ms-wmv',   // .wmv
  'video/x-flv',      // .flv
  'video/webm',       // .webm
  'video/x-m4v',      // .m4v
  'video/MP2T'        // .ts, .mts
];

const SUPPORTED_EXTENSIONS = ['.mp4', '.mov', '.avi', '.mkv', '.wmv', '.flv', '.webm', '.m4v', '.ts', '.mts'];

const VideoUploader = () => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState('idle');
  const [videoId, setVideoId] = useState(null);
  const [encodingProgress, setEncodingProgress] = useState({});
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);

  const video_upload_url = import.meta.env.VITE_UPLOAD_URL;
  const video_status_url = import.meta.env.VITE_VIDEO_STATUS_URL;

  useEffect(() => {
    let intervalId;
    
    if (videoId && uploadStatus === 'processing') {
      intervalId = setInterval(async () => {
        try {
          const response = await auth.doRequest(`${video_status_url}/videos/${videoId}`);
          const data = await response.json();
          
          if (data.status === 'COMPLETED') {
            setUploadStatus('completed');
            clearInterval(intervalId);
          } else if (data.status === 'FAILED') {
            setError(data.errorMessage || 'Video processing failed');
            setUploadStatus('error');
            clearInterval(intervalId);
          } else if (data.status === 'VALIDATING') {
            // Add handling for validation status
            setEncodingProgress({ validating: { progress: 0 } });
          } else {
            setEncodingProgress(data.progress?.byResolution || {});
          }
        } catch (error) {
          console.error('Error fetching encoding status:', error);
        }
      }, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [videoId, uploadStatus]);

  const validateFile = (file) => {
    if (!file) return false;
    
    // Check file type
    const isValidType = SUPPORTED_FORMATS.includes(file.type);
    
    // Check file extension as fallback
    const fileExtension = `.${file.name.split('.').pop().toLowerCase()}`;
    const isValidExtension = SUPPORTED_EXTENSIONS.includes(fileExtension);
    
    // Check file size (10GB limit)
    const isValidSize = file.size <= 10 * 1024 * 1024 * 1024;

    if (!isValidType && !isValidExtension) {
      setError('Unsupported file format. Please upload a video in one of the following formats: ' + 
        SUPPORTED_EXTENSIONS.join(', '));
      return false;
    }

    if (!isValidSize) {
      setError('File size exceeds 100MB limit');
      return false;
    }

    return true;
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setError(null);
      setUploadStatus('idle');
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && validateFile(file)) {
      setSelectedFile(file);
      setError(null);
      setUploadStatus('idle');
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append('video', selectedFile);
    setUploadStatus('uploading');
    setUploadProgress(0);

    try {
      const response = await auth.doRequest(`${video_upload_url}/upload`, {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setUploadProgress(Math.round(progress));
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setVideoId(data.videoId);
      setUploadStatus('processing');
    } catch (error) {
      console.error('Upload error:', error);
      setError(error.message);
      setUploadStatus('error');
    }
  };

  const renderStatus = () => {
    switch (uploadStatus) {
      case 'uploading':
        return (
          <div className="space-y-4">
            <Alert className="bg-blue-50">
              <Upload className="w-4 h-4" />
              <AlertTitle>Uploading Video</AlertTitle>
              <AlertDescription>
                Uploading {selectedFile?.name} ({Math.round(uploadProgress)}%)
              </AlertDescription>
            </Alert>
            <Progress value={uploadProgress} className="w-full" />
          </div>
        );

      case 'processing':
        return (
          <div className="space-y-4">
            <Alert className="bg-yellow-50">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <AlertTitle>Processing Video</AlertTitle>
              <AlertDescription>
                Creating different resolutions for optimal playback
              </AlertDescription>
            </Alert>
            {Object.entries(encodingProgress).map(([resolution, data]) => (
              <div key={resolution} className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>{resolution}</span>
                  <span>{data.progress}%</span>
                </div>
                <Progress value={data.progress} className="w-full" />
              </div>
            ))}
          </div>
        );

      case 'completed':
        return (
          <Alert className="bg-green-50">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <AlertTitle>Upload Complete</AlertTitle>
            <AlertDescription>
              Your video has been successfully processed and is ready for viewing
            </AlertDescription>
          </Alert>
        );

      case 'error':
        return (
          <Alert variant="destructive">
            <AlertCircle className="w-4 h-4" />
            <AlertTitle>Upload Failed</AlertTitle>
            <AlertDescription>{error || 'An unexpected error occurred'}</AlertDescription>
          </Alert>
        );

      default:
        return null;
    }
  };

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="flex items-center justify-center w-full">
        <label 
          className={`flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer 
            ${isDragging ? 'border-blue-500 bg-blue-50' : 'bg-gray-50 hover:bg-gray-100'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <div className="flex flex-col items-center justify-center pt-5 pb-6">
            <Upload className="w-8 h-8 mb-4 text-gray-500" />
            <p className="mb-2 text-sm text-gray-500">
              <span className="font-semibold">Click to upload</span> or drag and drop
            </p>
            <p className="text-xs text-gray-500">
              Supported formats: MP4, MOV, AVI, MKV, WMV, FLV, WebM, M4V, TS, MTS
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Maximum file size: 10GB
            </p>
          </div>
          <input
            type="file"
            className="hidden"
            accept={SUPPORTED_FORMATS.join(',')}
            onChange={handleFileSelect}
          />
        </label>
      </div>

      {selectedFile && uploadStatus === 'idle' && (
        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-2">
            <Clock className="w-4 h-4 text-gray-500" />
            <span className="text-sm text-gray-700">{selectedFile.name}</span>
          </div>
          <button
            onClick={handleUpload}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Upload
          </button>
        </div>
      )}

      {renderStatus()}
    </div>
  );
};

export default VideoUploader;