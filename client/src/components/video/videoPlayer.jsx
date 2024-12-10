import React, { useState, useRef, useEffect } from 'react';
import { Settings, Info, Play, Pause, Volume2, VolumeX, Maximize } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { auth } from '../../frameworks/auth';

const VideoPlayer = ({ videoId }) => {
  const [videoData, setVideoData] = useState(null);
  const [currentResolution, setCurrentResolution] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [aspectRatio, setAspectRatio] = useState(16/9);
  const [containerDimensions, setContainerDimensions] = useState({ width: 0, height: 0 });
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const controlsTimeoutRef = useRef(null);

  const VIDEO_STATUS_URL = import.meta.env.VITE_VIDEO_STATUS_URL;
  const VITE_VIDEO_STREAM_URL = import.meta.env.VITE_VIDEO_STREAM_URL;

  useEffect(() => {
    const fetchVideoData = async () => {
      try {
        const response = await auth.doRequest(`${VIDEO_STATUS_URL}/videos/${videoId}`);
        const data = await response.json();
        setVideoData(data);
        if (data.encodings.length > 0) {
          const sortedEncodings = [...data.encodings].sort((a, b) => b.height - a.height);
          setCurrentResolution(sortedEncodings[0]);
          const originalAspect = data.originalQuality.width / data.originalQuality.height;
          setAspectRatio(originalAspect);
        }
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching video data:', error);
        setIsLoading(false);
      }
    };

    fetchVideoData();
  }, [videoId]);

  useEffect(() => {
    const updateContainerDimensions = () => {
      if (containerRef.current) {
        setContainerDimensions({
          width: containerRef.current.offsetWidth,
          height: containerRef.current.offsetHeight
        });
      }
    };

    updateContainerDimensions();

    const resizeObserver = new ResizeObserver(updateContainerDimensions);
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current);
    }

    return () => {
      if (containerRef.current) {
        resizeObserver.unobserve(containerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleMouseMove = () => {
      setShowControls(true);
      clearTimeout(controlsTimeoutRef.current);
      controlsTimeoutRef.current = setTimeout(() => {
        if (isPlaying) {
          setShowControls(false);
        }
      }, 3000);
    };

    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    const container = containerRef.current;
    container?.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    
    return () => {
      container?.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      clearTimeout(controlsTimeoutRef.current);
    };
  }, [isPlaying]);

  const togglePlay = () => {
    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  const handleVolumeChange = (e) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
    videoRef.current.volume = newVolume;
    setIsMuted(newVolume === 0);
  };

  const toggleMute = () => {
    if (isMuted) {
      videoRef.current.volume = volume;
      setIsMuted(false);
    } else {
      videoRef.current.volume = 0;
      setIsMuted(true);
    }
  };

  const handleTimeUpdate = (e) => {
    setCurrentTime(e.target.currentTime);
  };

  const handleLoadedMetadata = () => {
    setDuration(videoRef.current.duration);
  };

  const handleSeek = (e) => {
    const time = (e.target.value / 100) * duration;
    setCurrentTime(time);
    videoRef.current.currentTime = time;
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const calculateContentStyles = () => {
    if (!containerDimensions.width || !containerDimensions.height) return {};
    
    const containerAspect = containerDimensions.width / containerDimensions.height;
    
    if (aspectRatio > containerAspect) {
      const contentWidth = containerDimensions.width;
      const contentHeight = contentWidth / aspectRatio;
      return {
        width: '100%',
        height: `${contentHeight}px`,
        maxHeight: '100%'
      };
    } else {
      const contentHeight = containerDimensions.height;
      const contentWidth = contentHeight * aspectRatio;
      return {
        width: `${contentWidth}px`,
        height: '100%',
        maxWidth: '100%'
      };
    }
  };

  if (isLoading) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-black rounded-lg">
        <span className="text-gray-500">Loading video...</span>
      </div>
    );
  }

  if (!videoData || !currentResolution) {
    return (
      <div className="w-full h-64 flex items-center justify-center bg-black rounded-lg">
        <span className="text-gray-500">Error loading video</span>
      </div>
    );
  }

  const contentStyles = calculateContentStyles();

  return (
    <Card className="w-full bg-black border-0">
      <CardContent className="p-0">
        <div ref={containerRef} className="relative group w-full aspect-video">
          <div className="absolute inset-0 flex items-center justify-center bg-black aspect-w-16 aspect-h-9">
            <video
              ref={videoRef}
              className="rounded-t-lg cursor-pointer bg-transparent object-contain w-full h-full"
              style={contentStyles}
              src={`${VITE_VIDEO_STREAM_URL}/${videoId}/${currentResolution.resolution}.mp4`}
              poster={`${VITE_VIDEO_STREAM_URL}/${videoId}/thumbnail.jpg`}
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              preload="metadata"
            />
          </div>
          
          {!isPlaying && (
            <div 
              className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer" 
              onClick={togglePlay}
              style={contentStyles}
            >
              <Play className="w-16 h-16 text-white opacity-80" />
            </div>
          )}
          
          <div className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
            <input
              type="range"
              className="w-full h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
              value={(currentTime / duration) * 100 || 0}
              onChange={handleSeek}
            />
            
            <div className="flex items-center justify-between mt-2">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="icon" className="text-white bg-black/50" onClick={togglePlay}>
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>

                <div className="flex items-center space-x-2">
                  <Button variant="ghost" size="icon" className="text-white bg-black/50" onClick={toggleMute}>
                    {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                  </Button>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.1"
                    value={isMuted ? 0 : volume}
                    onChange={handleVolumeChange}
                    className="w-20 h-1 bg-gray-600 rounded-lg appearance-none cursor-pointer"
                  />
                </div>

                <span className="text-white text-sm">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                {!isFullscreen && (
                  <Select
                    value={currentResolution.resolution}
                    onValueChange={(resolution) => {
                      const encoding = videoData.encodings.find(e => e.resolution === resolution);
                      if (encoding) {
                        const currentTime = videoRef.current.currentTime;
                        const wasPlaying = !videoRef.current.paused;
                        setCurrentResolution(encoding);
                        videoRef.current.addEventListener('loadedmetadata', () => {
                          videoRef.current.currentTime = currentTime;
                          if (wasPlaying) videoRef.current.play();
                        }, { once: true });
                      }
                    }}
                  >
                    <SelectTrigger className="w-[80px] h-8 bg-black/50 text-white border-none">
                      <SelectValue placeholder="Quality" />
                    </SelectTrigger>
                    <SelectContent>
                      {videoData.encodings.map((encoding) => (
                        <SelectItem key={encoding.resolution} value={encoding.resolution}>
                          {encoding.height}p
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}

                {!isFullscreen && (
                  <Sheet>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon" className="text-white bg-black/50">
                        <Info className="h-4 w-4" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent>
                      <SheetHeader>
                        <SheetTitle>Video Information</SheetTitle>
                        <SheetDescription>Technical details about the video</SheetDescription>
                      </SheetHeader>
                      <div className="mt-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-medium">Original Quality</h4>
                          <p className="text-sm text-gray-500">
                            {videoData.originalQuality.width}x{videoData.originalQuality.height}
                          </p>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium">Available Qualities</h4>
                          <div className="space-y-2 mt-2">
                            {videoData.encodings.map((encoding) => (
                              <div key={encoding.resolution} className="text-sm">
                                <p className="font-medium">{encoding.height}p ({encoding.width}x{encoding.height})</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </SheetContent>
                  </Sheet>
                )}

                <Button variant="ghost" size="icon" className="text-white bg-black/50" onClick={toggleFullscreen}>
                  <Maximize className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default VideoPlayer;