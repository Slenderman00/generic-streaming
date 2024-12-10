import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../frameworks/auth';
import CreatePostCard from './createPostCard';
import { PostCard } from './card';

const PostFeed = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const observerRef = useRef();
  const lastPostRef = useRef();

  const POST_READ_URL = import.meta.env.VITE_POST_READ_SERVICE_URL;
  const POST_WRITE_URL = import.meta.env.VITE_POST_WRITE_SERVICE_URL;

  const fetchPosts = async (pageNum) => {
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const response = await auth.doRequest(`${POST_READ_URL}/posts?page=${pageNum}&limit=10`);
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
      const response = await auth.doRequest(`${POST_WRITE_URL}/posts/${postId}`, {
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
      const response = await auth.doRequest(`${POST_READ_URL}/posts/${postId}/like`, {
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
    <div className="mx-auto p-4">
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