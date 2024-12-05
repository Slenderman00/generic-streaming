import React from 'react';
import VideoCard from './card';
import CreatePostCard from './createPostCard';
import VideoUploader from './videoUploader';

const VideoFeed = ({ videos }) => {
  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 bg-white pb-4">
        <CreatePostCard onSubmit={(data) => {
          console.log('Create post:', data);
        }}/>
      </div>
      <div className="space-y-6">
        {videos.map(video => (
          <VideoCard key={video.id} video={video} />
        ))}
      </div>
    </div>
  );
};

export default VideoFeed;