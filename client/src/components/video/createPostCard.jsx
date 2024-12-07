import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { 
  Heart, 
  MessageCircle, 
  ThumbsDown, 
  MoreHorizontal, 
  Image, 
  Video, 
  Smile, 
  X, 
  Loader2, 
  Upload, 
  CheckCircle, 
  AlertCircle, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { auth } from '../../frameworks/auth';

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

const MAX_VIDEOS = 3;
const MAX_FILE_SIZE = 10 * 1024 * 1024 * 1024; // 10

const CreatePostCard = () => {
  const [postText, setPostText] = useState('');
  const [videos, setVideos] = useState([]);
  const [uploadStatus, setUploadStatus] = useState({});
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  const VIDEO_UPLOAD_URL = import.meta.env.VITE_UPLOAD_URL;
  const VIDEO_STATUS_URL = import.meta.env.VITE_VIDEO_STATUS_URL;

  const validateFile = (file) => {
    if (!file) return { valid: false, error: 'No file selected' };
    
    if (!SUPPORTED_FORMATS.includes(file.type)) {
      return { valid: false, error: 'Unsupported video format. Please upload MP4, MOV, AVI, MKV, WMV, FLV, WebM, M4V, or TS file.' };
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

    setVideos(prev => [...prev, {
      file,
      id: null,
      previewUrl: URL.createObjectURL(file),
      status: 'idle',
      processingProgress: {}
    }]);
    setError(null);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeVideo = (index) => {
    setVideos(prev => {
      const newVideos = [...prev];
      URL.revokeObjectURL(newVideos[index].previewUrl);
      newVideos.splice(index, 1);
      return newVideos;
    });
  };

  const uploadVideo = async (video, index) => {
    const formData = new FormData();
    formData.append('video', video.file);

    try {
      setVideos(prev => {
        const newVideos = [...prev];
        newVideos[index] = { ...newVideos[index], status: 'uploading', progress: 0 };
        return newVideos;
      });

      const response = await auth.doRequest(`${VIDEO_UPLOAD_URL}/upload`, {
        method: 'POST',
        body: formData,
        onUploadProgress: (progressEvent) => {
          const progress = (progressEvent.loaded / progressEvent.total) * 100;
          setVideos(prev => {
            const newVideos = [...prev];
            newVideos[index] = { ...newVideos[index], progress: Math.round(progress) };
            return newVideos;
          });
        }
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }

      setVideos(prev => {
        const newVideos = [...prev];
        newVideos[index] = { 
          ...newVideos[index], 
          id: data.videoId,
          status: 'processing',
          progress: 100,
          processingProgress: {}
        };
        return newVideos;
      });

      pollProcessingStatus(data.videoId, index);
      return data.videoId;
    } catch (error) {
      setVideos(prev => {
        const newVideos = [...prev];
        newVideos[index] = { ...newVideos[index], status: 'error', error: error.message };
        return newVideos;
      });
      throw error;
    }
  };

  const pollProcessingStatus = async (videoId, index) => {
    const poll = async () => {
      try {
        const response = await auth.doRequest(`${VIDEO_STATUS_URL}/videos/${videoId}`);
        const data = await response.json();

        if (data.status === 'COMPLETED') {
          setVideos(prev => {
            const newVideos = [...prev];
            newVideos[index] = { ...newVideos[index], status: 'completed' };
            return newVideos;
          });
          return true;
        } else if (data.status === 'FAILED') {
          setVideos(prev => {
            const newVideos = [...prev];
            newVideos[index] = { 
              ...newVideos[index], 
              status: 'error',
              error: data.errorMessage || 'Processing failed' 
            };
            return newVideos;
          });
          return true;
        }
        
        setVideos(prev => {
          const newVideos = [...prev];
          newVideos[index] = { 
            ...newVideos[index],
            processingProgress: data.progress?.byResolution || {}
          };
          return newVideos;
        });

        return false;
      } catch (error) {
        console.error('Error polling status:', error);
        return false;
      }
    };

    const interval = setInterval(async () => {
      const isDone = await poll();
      if (isDone) clearInterval(interval);
    }, 2000);

    return () => clearInterval(interval);
  };

  const handleSubmit = async () => {
    if (!postText && videos.length === 0) return;
    
    try {
      const videoIds = [];
      
      // Upload all videos
      for (let i = 0; i < videos.length; i++) {
        const video = videos[i];
        if (video.status !== 'completed') {
          const videoId = await uploadVideo(video, i);
          videoIds.push(videoId);
        } else {
          videoIds.push(video.id);
        }
      }

      // Wait for all videos to complete processing
      const processingInterval = setInterval(() => {
        const allCompleted = videos.every(v => 
          v.status === 'completed' || v.status === 'error'
        );

        if (allCompleted) {
          clearInterval(processingInterval);
          const successfulIds = videos
            .filter(v => v.status === 'completed')
            .map(v => v.id);
          
          // submit post
          auth.doRequest(`${VIDEO_STATUS_URL}/append-videos`).then(response => {
            if (!response.ok) {
              throw new Error('Failed to submit post');
            }
            //check if the token contains the ids of the videos that were uploaded
            //if it does, the video upload is valid
            let tokenContent = auth.getTokenContents();
            //the token should contain all the ids of videos that belong to the user
            //therefor we must check if each of the uploaded ids are in the token video ids
            let valid = true;
            for (let i = 0; i < videoIds.length; i++) {
              if (!tokenContent.videoIds.includes(videoIds[i])) {
                valid = false;
                break;
              }
            }

            if (!valid) {
              throw new Error('Invalid token');
            }

            console.log('Post submitted successfully');
          }).catch(error => {
            console.error('Error submitting post:', error);
            setError(error.message);
          });


        }
      }, 1000);
    } catch (error) {
      setError(error.message);
    }
  };

  const renderVideoStatus = (video) => {
    switch (video.status) {
      case 'uploading':
        return (
          <div className="space-y-2">
            <div className="text-sm text-blue-600 flex items-center">
              <Upload className="w-4 h-4 mr-1" />
              <span>Uploading</span>
            </div>
            <div className="space-y-1">
              <div className="flex justify-between text-sm text-gray-600">
                <span>Upload Progress</span>
                <span>{video.progress}%</span>
              </div>
              <Progress value={video.progress} className="w-full" />
            </div>
          </div>
        );

      case 'processing':
        return (
          <div className="space-y-2">
            <div className="text-sm text-yellow-600 flex items-center">
              <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
              <span>Processing Video</span>
            </div>
            {Object.entries(video.processingProgress).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(video.processingProgress).map(([resolution, data]) => (
                  <div key={resolution} className="space-y-1">
                    <div className="flex justify-between text-xs text-gray-600">
                      <span>{resolution}</span>
                      <span>{data.progress}%</span>
                    </div>
                    <Progress 
                      value={data.progress} 
                      className="w-full h-1.5" 
                    />
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-xs text-gray-500">
                Preparing video formats...
              </div>
            )}
          </div>
        );

      case 'completed':
        return (
          <div className="text-sm text-green-600 flex items-center">
            <CheckCircle className="w-4 h-4 mr-1" />
            <span>Ready</span>
          </div>
        );

      case 'error':
        return (
          <div className="text-sm text-red-600 flex items-center">
            <AlertCircle className="w-4 h-4 mr-1" />
            <span>{video.error}</span>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-500 flex items-center">
            <Clock className="w-4 h-4 mr-1" />
            <span>Ready to upload</span>
          </div>
        );
    }
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
          <div className="w-12 h-12 rounded-full border-2 border-purple-500 bg-purple-100 flex items-center justify-center">
            <span className="text-xl font-bold text-purple-500">U</span>
          </div>
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
                <button className="flex items-center space-x-2 text-gray-600 hover:text-purple-600">
                  <Image className="w-5 h-5" />
                  <span className="text-sm">Photo</span>
                </button>
                <button className="flex items-center space-x-2 text-gray-600 hover:text-purple-600">
                  <Smile className="w-5 h-5" />
                  <span className="text-sm">Emoji</span>
                </button>
              </div>
              <button 
                onClick={handleSubmit}
                disabled={(!postText && videos.length === 0) || videos.some(v => 
                  v.status === 'uploading' || v.status === 'processing'
                )}
                className={`px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium transition-colors ${
                  (!postText && videos.length === 0) || videos.some(v => 
                    v.status === 'uploading' || v.status === 'processing'
                  )
                    ? 'opacity-50 cursor-not-allowed'
                    : 'hover:bg-purple-700'
                }`}
              >
                {videos.some(v => v.status === 'uploading' || v.status === 'processing') 
                  ? 'Processing...' 
                  : 'Post'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CreatePostCard;