import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, ThumbsDown, MoreHorizontal, Lock } from 'lucide-react';


const Tag = ({ text }) => (
  <span className="inline-block bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-sm font-medium">
    #{text}
  </span>
);

const VideoCard = ({ video }) => {
  const [likes, setLikes] = useState(video.likes);
  const [dislikes, setDislikes] = useState(video.dislikes);
  const [comments, setComments] = useState(video.comments);
  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [newComment, setNewComment] = useState('');

  const handleLike = () => {
    if (!isLiked) {
      setLikes(likes + 1);
      if (isDisliked) {
        setDislikes(dislikes - 1);
        setIsDisliked(false);
      }
    } else {
      setLikes(likes - 1);
    }
    setIsLiked(!isLiked);
  };

  const handleDislike = () => {
    if (!isDisliked) {
      setDislikes(dislikes + 1);
      if (isLiked) {
        setLikes(likes - 1);
        setIsLiked(false);
      }
    } else {
      setDislikes(dislikes - 1);
    }
    setIsDisliked(!isDisliked);
  };

  const handleAddComment = (e) => {
    e.preventDefault();
    if (newComment.trim()) {
      setComments([
        { id: Date.now(), user: 'Current User', text: newComment, timestamp: new Date() },
        ...comments
      ]);
      setNewComment('');
    }
  };

  const formatTimeAgo = (date) => {
    // Simple time formatting - could be enhanced with a proper library
    return '2h ago';
  };

  return (
    <Card className="mb-6 overflow-hidden bg-white border border-gray-200">
      {/* Creator Header */}
      <div className="p-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src={video.authorAvatar}
            className="w-12 h-12 rounded-full border-2 border-purple-500"
          />
          <div>
            <div className="flex items-center space-x-2">
              <h3 className="font-bold text-gray-900">{video.author}</h3>
              <span className="text-gray-500 text-sm">@{video.author.toLowerCase().replace(' ', '')}</span>
            </div>
            <p className="text-sm text-gray-500">{formatTimeAgo(video.timestamp)}</p>
          </div>
        </div>
        <button className="text-gray-500 hover:text-gray-700">
          <MoreHorizontal className="w-5 h-5" />
        </button>
      </div>

      {/* Post Content */}
      <div className="px-4 pb-3">
        <p className="text-gray-800 mb-2">{video.description}</p>
        <div className="flex flex-wrap gap-2 mb-3">
          {video.tags.map((tag, index) => (
            <Tag key={index} text={tag} />
          ))}
        </div>
      </div>

      {/* Video Content */}
      <div className="aspect-video bg-gray-100 relative">
        <img 
          src={video.thumbnail} 
          alt={video.title}
          className="w-full h-full object-cover"
        />
        <div className="absolute bottom-4 right-4 bg-black bg-opacity-50 px-2 py-1 rounded text-white text-sm">
          {video.duration}
        </div>
      </div>

      {/* Engagement Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-6">
            <button 
              onClick={handleLike}
              className={`flex items-center space-x-1 ${isLiked ? 'text-purple-600' : 'text-gray-600'}`}
            >
              <Heart className="w-5 h-5" fill={isLiked ? 'currentColor' : 'none'} />
              <span className="text-sm">{likes}</span>
            </button>

            <button 
              onClick={handleDislike}
              className={`flex items-center space-x-1 ${isDisliked ? 'text-purple-600' : 'text-gray-600'}`}
            >
              <ThumbsDown className="w-5 h-5" />
              <span className="text-sm">{dislikes}</span>
            </button>

            <button 
              onClick={() => setShowComments(!showComments)}
              className="flex items-center space-x-1 text-gray-600"
            >
              <MessageCircle className="w-5 h-5" />
              <span className="text-sm">{comments.length}</span>
            </button>
          </div>

          <div className="text-sm text-gray-500">
            {video.views.toLocaleString()} views
          </div>
        </div>

        {/* Comments Section */}
        {showComments && (
          <div className="border-t pt-4">
            <form onSubmit={handleAddComment} className="mb-4">
              <input
                type="text"
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Add a comment..."
                className="w-full px-3 py-2 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </form>
            <div className="space-y-4">
              {comments.map(comment => (
                <div key={comment.id} className="flex space-x-3">
                  <img
                    src="/api/placeholder/32/32"
                    alt={comment.user}
                    className="w-8 h-8 rounded-full"
                  />
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium text-gray-900">{comment.user}</span>
                      <span className="text-gray-500 text-sm">{formatTimeAgo(comment.timestamp)}</span>
                    </div>
                    <p className="text-gray-800 text-sm">{comment.text}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

export default VideoCard