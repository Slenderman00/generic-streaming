import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Heart, MessageCircle, ThumbsDown, MoreHorizontal, Image, Video, Smile } from 'lucide-react';

const Tag = ({ text }) => (
  <span className="inline-block bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded-full text-sm font-medium mr-1">
    #{text}
  </span>
);

const CreatePostCard = () => {
  const [postText, setPostText] = useState('');

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
            <div className="mt-3 flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <button className="flex items-center space-x-2 text-gray-600 hover:text-purple-600">
                  <Video className="w-5 h-5" />
                  <span className="text-sm">Video</span>
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
              <button className="px-4 py-2 bg-purple-600 text-white rounded-full text-sm font-medium hover:bg-purple-700 transition-colors">
                Post
              </button>
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default CreatePostCard;