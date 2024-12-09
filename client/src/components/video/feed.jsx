import React from 'react';
import VideoCard from './card';
import CreatePostCard from './createPostCard';
import VideoUploader from './videoUploader';
import VideoPlayer from './videoPlayer';

const VideoFeed = ({ videos }) => {
  return (
    <div className="w-full">
      <div className="sticky top-0 z-10 bg-white pb-4">
        <CreatePostCard/>
        <VideoPlayer videoId={"da666183-75ae-4b50-b06a-dd2306f4229f"}/>
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