import React, { useState, useEffect, useRef } from 'react';
import { auth } from '../../frameworks/auth';
import CreatePostCard from './createPostCard';
import { PostCard } from './card';

const PostFeed = ({ userId }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [myUserId, setMyUserId] = useState(null);
  const observerRef = useRef();
  const lastPostRef = useRef();

  const POST_READ_URL = import.meta.env.VITE_POST_READ_SERVICE_URL;
  const POST_WRITE_URL = import.meta.env.VITE_POST_WRITE_SERVICE_URL;

  const fetchPosts = async (pageNum, force = false) => {
    console.log('fetchPosts called with page:', pageNum, 'force:', force);
    console.log('Current loading state:', loading);
    console.log('Current hasMore state:', hasMore);
    
    if (loading || (!hasMore && !force)) {
      console.log('Exiting fetchPosts early due to:', loading ? 'loading' : 'no more posts');
      return;
    }

    setLoading(true);
    try {
      const baseUrl = `${POST_READ_URL}/posts?page=${pageNum}&limit=10`;
      const url = userId ? `${baseUrl}&userId=${userId}` : baseUrl;
      
      console.log('Fetching from URL:', url);
      const response = await auth.doRequest(url);
      const data = await response.json();
      console.log('Received data:', data);

      if (data.status === 'SUCCESS') {
        const newPosts = data.posts;
        console.log('New posts received:', newPosts.length);
        setPosts(prev => {
          const updatedPosts = pageNum === 1 ? newPosts : [...prev, ...newPosts];
          console.log('Updated posts array:', updatedPosts.length);
          return updatedPosts;
        });
        setHasMore(newPosts.length === 10);
      } else {
        throw new Error(data.error || 'Failed to fetch posts');
      }
    } catch (err) {
      console.error('Error in fetchPosts:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const refreshPosts = async () => {
    console.log('refreshPosts called');
    setHasMore(true);
    setPage(1);
    await fetchPosts(1, true); // Force fetch regardless of hasMore state
    console.log('refreshPosts completed');
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

  const handlePostCreated = async () => {
    console.log('handlePostCreated called');
    try {
      await refreshPosts();
      console.log('Posts refreshed successfully');
    } catch (err) {
      console.error('Error in handlePostCreated:', err);
    }
  };

  useEffect(() => {
    console.log('Initial useEffect running');
    fetchPosts(1, true);  // Force initial fetch
    setMyUserId(auth.getUser().id);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          console.log('Intersection observed, incrementing page');
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
    console.log('Page changed to:', page);
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

  const shouldShowCreatePost = !userId || userId === myUserId;

  return (
    <div className="mx-auto p-4">
      {shouldShowCreatePost && (
        <div className="mb-6">
          <CreatePostCard onPostCreated={handlePostCreated} />
        </div>
      )}

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