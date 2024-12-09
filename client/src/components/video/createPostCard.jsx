import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Video,
  X,
  Upload,
  CheckCircle,
  AlertCircle,
  RefreshCw,
  Clock
} from 'lucide-react';
import { auth } from '../../frameworks/auth';
import UserAvatar from '../user/avatar.jsx';

const SUPPORTED_FORMATS = [
  'video/mp4',
  'video/quicktime',
  'video/x-msvideo',
  'video/x-matroska',
  'video/x-ms-wmv',
  'video/x-flv',
  'video/webm',
  'video/x-m4v',
  'video/MP2T'
];

const MAX_VIDEOS = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10GB

const CreatePostCard = () => {
  const [postText, setPostText] = useState('');
  const [videos, setVideos] = useState([]);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const videoIdsRef = useRef(new Set());

  const VIDEO_UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL;
  const VIDEO_STATUS_URL = import.meta.env.VITE_VIDEO_STATUS_URL;
  const POSTS_API_URL = import.meta.env.VITE_POST_SERVICE_URL;

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return { 
        valid: false, 
        error: 'Unsupported video format. Please upload MP4, MOV, AVI, MKV, WMV, FLV, WebM, M4V, or TS file.' 
      };
    }
    if (file.size > MAX_FILE_SIZE) {
      return { valid: false, error: 'File size exceeds 10GB limit' };
    }
    return { valid: true };
  };

  const handleVideoSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const validation = validateFile(file);
    if (!validation.valid) {
      setError(validation.error);
      return;
    }

    if (videos.length >= MAX_VIDEOS) {
      setError(`Maximum ${MAX_VIDEOS} videos allowed`);
      return;
    }

    const newVideo = {
      file,
      id: null,
      previewUrl: URL.createObjectURL(file),
      status: 'idle',
      progress: 0,
      processingProgress: {}
    };

    setVideos(prev => [...prev, newVideo]);
    setError(null);
    fileInputRef.current.value = '';
  };

  const removeVideo = (index) => {
    setVideos(prev => {
      const newVideos = [...prev];
      const removedVideo = newVideos[index];
      URL.revokeObjectURL(removedVideo.previewUrl);
      
      if (removedVideo.id) {
        videoIdsRef.current.delete(removedVideo.id);
      }
      
      newVideos.splice(index, 1);
      return newVideos;
    });
  };

  const updateVideoState = (index, updates) => {
    setVideos(prev => {
      const newVideos = [...prev];
      newVideos[index] = { ...newVideos[index], ...updates };
      return newVideos;
    });
  };

  const uploadVideo = async (video, index) => {
    const formData = new FormData();
    formData.append('video', video.file);

    try {
      updateVideoState(index, { status: 'uploading', progress: 0 });

      const response = await auth.doRequest(`${VIDEO_UPLOAD_URL}/upload`, {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = Math.round((progressEvent.loaded / progressEvent.total) * 100);
          updateVideoState(index, { progress });
        }
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Upload failed');
      }

      const { videoId } = await response.json();
      if (!videoId) throw new Error('No video ID received from server');

      videoIdsRef.current.add(videoId);
      
      updateVideoState(index, {
        id: videoId,
        status: 'processing',
        progress: 100,
        processingProgress: {}
      });

      await pollProcessingStatus(videoId, index);
      return videoId;
    } catch (error) {
      updateVideoState(index, { status: 'error', error: error.message });
      throw error;
    }
  };

  const pollProcessingStatus = async (videoId, index) => {
    const checkStatus = async () => {
      try {
        const response = await auth.doRequest(`${VIDEO_STATUS_URL}/videos/${videoId}`);
        if (!response.ok) throw new Error('Failed to check video status');

        const data = await response.json();
        const { status, errorMessage, progress } = data;

        switch (status) {
          case 'COMPLETED':
            updateVideoState(index, { status: 'completed', id: videoId });
            return true;
          
          case 'FAILED':
            updateVideoState(index, {
              status: 'error',
              error: errorMessage || 'Processing failed'
            });
            videoIdsRef.current.delete(videoId);
            return true;
          
          default:
            updateVideoState(index, {
              status: 'processing',
              id: videoId,
              processingProgress: progress?.byResolution || {}
            });
            return false;
        }
      } catch (error) {
        updateVideoState(index, { 
          status: 'error', 
          error: 'Failed to check processing status' 
        });
        videoIdsRef.current.delete(videoId);
        return true;
      }
    };

    while (true) {
      if (await checkStatus()) break;
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
  };

  const createPost = async (content, videoIds) => {
    const response = await auth.doRequest(`${POSTS_API_URL}/posts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content, videoIds })
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to create post');
    }

    return response.json();
  };

  const handleSubmit = async () => {
    if (!postText && videos.length === 0) return;

    try {
      setIsSubmitting(true);
      setError(null);

      // Upload any pending videos
      const pendingUploads = videos
        .map((video, index) => ({ video, index }))
        .filter(({ video }) => video.status === 'idle');

      for (const { video, index } of pendingUploads) {
        await uploadVideo(video, index);
      }

      // Validate video ownership
      const appendResponse = await auth.doRequest(`${VIDEO_STATUS_URL}/append-videos`);
      if (!appendResponse.ok) {
        throw new Error('Failed to validate video ownership');
      }

      // Create the post with collected video IDs
      const videoIds = Array.from(videoIdsRef.current);
      await createPost(postText, videoIds);

      // Reset state after successful post
      setPostText('');
      setVideos([]);
      videoIdsRef.current = new Set();
      setError(null);
    } catch (error) {
      setError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderVideoStatus = (video) => {
    const statusConfig = {
      uploading: {
        icon: Upload,
        text: 'Uploading',
        color: 'text-blue-600',
        content: (
          <div className="space-y-1">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Upload Progress</span>
              <span>{video.progress}%</span>
            </div>
            <Progress value={video.progress} className="w-full" />
          </div>
        )
      },
      processing: {
        icon: RefreshCw,
        text: 'Processing Video',
        color: 'text-yellow-600',
        iconClass: 'animate-spin',
        content: Object.entries(video.processingProgress).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(video.processingProgress).map(([resolution, data]) => (
              <div key={resolution} className="space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                  <span>{resolution}</span>
                  <span>{data.progress}%</span>
                </div>
                <Progress value={data.progress} className="w-full h-1.5" />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-xs text-gray-500">Preparing video formats...</div>
        )
      },
      completed: {
        icon: CheckCircle,
        text: 'Ready',
        color: 'text-green-600'
      },
      error: {
        icon: AlertCircle,
        text: video.error,
        color: 'text-red-600'
      },
      idle: {
        icon: Clock,
        text: 'Ready to upload',
        color: 'text-gray-500'
      }
    };

    const config = statusConfig[video.status];
    const Icon = config.icon;

    return (
      <div className="space-y-2">
        <div className={`text-sm flex items-center ${config.color}`}>
          <Icon className={`w-4 h-4 mr-1 ${config.iconClass || ''}`} />
          <span>{config.text}</span>
        </div>
        {config.content}
      </div>
    );
  };

  const renderVideoPreview = (video, index) => (
    <div key={index} className="mt-3 space-y-2">
      <div className="relative">
        <video
          src={video.previewUrl}
          className="w-full rounded-lg max-h-48 object-cover"
          controls
        />
        <button
          onClick={() => removeVideo(index)}
          className="absolute top-2 right-2 p-1 bg-gray-900 bg-opacity-50 rounded-full text-white hover:bg-opacity-70"
          disabled={video.status === 'uploading' || video.status === 'processing'}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      <div className="p-2 bg-gray-50 rounded-lg">
        {renderVideoStatus(video)}
      </div>
    </div>
  );

  return (
    <Card className="mb-6 overflow-hidden bg-white border border-gray-200">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <UserAvatar size="lg" />
          <div className="flex-1">
            <textarea
              placeholder="Share your thoughts..."
              value={postText}
              onChange={(e) => setPostText(e.target.value)}
              className="w-full min-h-[100px] p-2 text-gray-800 placeholder-gray-400 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            />

            {videos.map((video, index) => renderVideoPreview(video, index))}

            {error && (
              <Alert variant="destructive" className="mt-3">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept={SUPPORTED_FORMATS.join(',')}
                  onChange={handleVideoSelect}
                  className="hidden"
                  ref={fileInputRef}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={videos.length >= MAX_VIDEOS}
                  className={`flex items-center space-x-2 text-gray-600 hover:text-purple-600 ${
                    videos.length >= MAX_VIDEOS ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                >
                  <Video className="w-5 h-5" />
                  <span className="text-sm">Video ({videos.length}/{MAX_VIDEOS})</span>
                </button>
              </div>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting || (!postText && videos.length === 0)}
                className={`px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium transition-colors ${
                  isSubmitting || (!postText && videos.length === 0)
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-purple-700'
                }`}
              >
                {isSubmitting ? 'Processing...' : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CreatePostCard;