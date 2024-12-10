import React, { useState, useEffect } from 'react';
import VideoPlayer from './videoPlayer';
import { Card } from '@/components/ui/card';
import UserAvatar from '@/components/user/avatar';
import { ChevronLeft, ChevronRight, Trash2, MoreHorizontal, Heart, Clock } from 'lucide-react';
import { auth } from '@/frameworks/auth';

const formatRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
  const diffInMonths = Math.floor(diffInDays / 30);

  if (diffInDays < 1) return 'Today';
  if (diffInDays === 1) return 'Yesterday';
  if (diffInDays < 30) return `${diffInDays} days ago`;
  if (diffInMonths === 1) return '1 month ago';
  return `${diffInMonths} months ago`;
};

const VideoCarousel = ({ videoIds }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const handlePrevious = () => {
    setCurrentIndex((prev) => (prev === 0 ? videoIds.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === videoIds.length - 1 ? 0 : prev + 1));
  };

  if (!videoIds || videoIds.length === 0) return null;

  return (
    <div className="relative">
      <div className="relative aspect-video w-full bg-black rounded-lg overflow-hidden">
        <VideoPlayer videoId={videoIds[currentIndex]} />
      </div>

      {videoIds.length > 1 && (
        <>
          <button
            onClick={handlePrevious}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:text-black hover:bg-white/90 transition-colors"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={handleNext}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full bg-black/50 text-white hover:text-black hover:bg-white/90 transition-colors"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex space-x-1">
            {videoIds.map((_, index) => (
              <div
                role="button"
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors cursor-pointer ${index === currentIndex ? 'bg-white' : 'bg-white/50'
                  }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

const OwnerActions = ({ post, onDelete }) => {
  if (post.userId !== auth.getUser().id) {
    return null;
  }
  return (
    <div className="flex items-center space-x-2">
      <button
        onClick={() => onDelete(post.id)}
        className="p-2 text-gray-500 hover:text-red-500 rounded-full hover:bg-gray-100"
      >
        <Trash2 className="w-5 h-5" />
      </button>
      <button className="p-2 text-gray-500 hover:text-gray-700 rounded-full hover:bg-gray-100">
        <MoreHorizontal className="w-5 h-5" />
      </button>
    </div>
  );
};

const PostCard = ({ post, onDelete, onLike }) => {
  const [username, setUsername] = useState(null);
  const [usernameError, setUsernameError] = useState(false);

  useEffect(() => {
    auth.fetchUsername(post.userId).then((_username) => {
      setUsername(_username);
    }).catch(() => {
      setUsernameError(true);
    });
  }, [post.userId]);

  return (
    <Card className="mb-4 overflow-hidden bg-white border border-gray-200">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <UserAvatar size="md" userId={post.userId} />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">
                {username || (usernameError ? `User ${post.userId.slice(0, 8)}` : 'Loading...')}
              </p>
              <OwnerActions post={post} onDelete={onDelete} />
            </div>

            {post.content && (
              <p className="mt-2 text-gray-800">{post.content}</p>
            )}

            {post.videoIds && post.videoIds.length > 0 && (
              <div className="mt-3">
                <VideoCarousel videoIds={post.videoIds} />
              </div>
            )}

            <div className="mt-4 flex items-center space-x-4 text-gray-500">
              <button
                onClick={() => onLike(post.id)}
                className={`flex items-center space-x-1 ${post.liked_by_user ? 'text-purple-600' : ''}`}
              >
                <Heart
                  className="w-5 h-5"
                  fill={post.liked_by_user ? 'currentColor' : 'none'}
                />
                <span>{post.likes_count}</span>
              </button>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span className="text-sm">{formatRelativeTime(post.createdAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export { VideoCarousel, PostCard };