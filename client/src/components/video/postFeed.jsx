import React, { useState, useEffect, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Heart, MessageCircle, Trash2, MoreHorizontal } from 'lucide-react';
import { auth } from '../../frameworks/auth';
import CreatePostCard from './createPostCard';
import UserAvatar from '../user/avatar';
import VideoPlayer from './videoPlayer';

const PostCard = ({ post, onDelete, onLike }) => {
  const [username, setUsername] = useState(null);
  const [usernameError, setUsernameError] = useState(false);

  useEffect(() => {
    const fetchUsername = async () => {
      try {
        const username = await auth.fetchUsername(post.userId);
        setUsername(username);
      } catch (err) {
        setUsernameError(true);
      }
    };

    fetchUsername();
  }, [post.userId]);

  return (
    <Card className="mb-4 overflow-hidden bg-white border border-gray-200">
      <div className="p-4">
        <div className="flex items-start space-x-3">
          <UserAvatar size="md" />
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <p className="font-semibold text-gray-900">
                {username || (usernameError ? `User ${post.userId.slice(0, 8)}` : 'Loading...')}
              </p>
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
            </div>

            {post.content && (
              <p className="mt-2 text-gray-800">{post.content}</p>
            )}

            {post.videoIds && post.videoIds.length > 0 && (
              <div className="mt-3 space-y-2">
                {post.videoIds.map((videoId) => (
                    <VideoPlayer key={videoId} videoId={videoId} />
                ))}
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
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};

const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef();
  const lastPostRef = useRef();

  const POSTS_API_URL = import.meta.env.VITE_POST_SERVICE_URL;

  const fetchPosts = async (pageNum) => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await auth.doRequest(`${POSTS_API_URL}/posts?page=${pageNum}&limit=10`);
      const data = await response.json();

      if (data.status === 'SUCCESS') {
        const newPosts = data.posts;
        setPosts(prev => pageNum === 1 ? newPosts : [...prev, ...newPosts]);
        setHasMore(newPosts.length === 10);
      } else {
        throw new Error(data.error || 'Failed to fetch posts');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (postId) => {
    try {
      const response = await auth.doRequest(`${POSTS_API_URL}/posts/${postId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setPosts(prev => prev.filter(post => post.id !== postId));
      } else {
        throw new Error('Failed to delete post');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLike = async (postId) => {
    try {
      const response = await auth.doRequest(`${POSTS_API_URL}/posts/${postId}/like`, {
        method: 'POST'
      });

      if (response.ok) {
        setPosts(posts.map(post => {
          if (post.id === postId) {
            return {
              ...post,
              liked_by_user: !post.liked_by_user,
              likes_count: post.liked_by_user ? post.likes_count - 1 : post.likes_count + 1
            };
          }
          return post;
        }));
      } else {
        throw new Error('Failed to like/unlike post');
      }
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    fetchPosts(1);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          setPage(prev => prev + 1);
        }
      },
      { threshold: 0.5 }
    );

    observerRef.current = observer;

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loading]);

  useEffect(() => {
    if (page > 1) {
      fetchPosts(page);
    }
  }, [page]);

  useEffect(() => {
    const observer = observerRef.current;
    const lastPost = lastPostRef.current;

    if (observer && lastPost) {
      observer.observe(lastPost);
    }

    return () => {
      if (observer && lastPost) {
        observer.unobserve(lastPost);
      }
    };
  }, [posts]);

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="mb-6">
        <CreatePostCard onPostCreated={() => {
          setPage(1);
          fetchPosts(1);
        }} />
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 text-red-700 rounded-lg">
          {error}
        </div>
      )}

      <div className="space-y-4">
        {posts.map((post, index) => (
          <div
            key={post.id}
            ref={index === posts.length - 1 ? lastPostRef : null}
          >
            <PostCard
              post={post}
              onDelete={handleDelete}
              onLike={handleLike}
            />
          </div>
        ))}
      </div>

      {loading && (
        <div className="flex justify-center items-center h-20">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
        </div>
      )}
    </div>
  );
};

export default PostFeed;