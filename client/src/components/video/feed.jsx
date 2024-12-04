import React from 'react';
import VideoCard from './card';
import CreatePostCard from './createPostCard';

const VideoFeed = ({ videos }) => {
  return (
    <div className="space-y-6">
      <CreatePostCard/>
      {videos.map(video => (
        <VideoCard key={video.id} video={video} />
      ))}
    </div>
  );
};

  
export default VideoFeed;