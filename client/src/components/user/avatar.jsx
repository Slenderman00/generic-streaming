import React, { useState, useEffect } from 'react';
import { User, Loader } from 'lucide-react';
import { auth } from '../../frameworks/auth';

const UserAvatar = ({ 
  size = 'md',  // sm, md, lg
  showLoading = true,
  className = '' 
}) => {
  const user = auth.getUser();
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const VITE_IMAGE_SERVICE_URL = import.meta.env.VITE_IMAGE_SERVICE_URL;
  const VITE_USER_SETTINGS_URL = import.meta.env.VITE_USER_SETTINGS_URL;

  // Size mappings
  const sizes = {
    sm: {
      container: 'w-8 h-8',
      icon: 'w-4 h-4',
      loader: 'w-3 h-3'
    },
    md: {
      container: 'w-10 h-10',
      icon: 'w-5 h-5',
      loader: 'w-4 h-4'
    },
    lg: {
      container: 'w-16 h-16',
      icon: 'w-8 h-8',
      loader: 'w-6 h-6'
    }
  };

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const profileResponse = await auth.doRequest(`${VITE_USER_SETTINGS_URL}/profile`);
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }

        const profileData = await profileResponse.json();
        
        if (profileData.profile.imageId) {
          const imageResponse = await auth.doRequest(
            `${VITE_IMAGE_SERVICE_URL}/images/${profileData.profile.imageId}`
          );
          
          if (imageResponse.ok) {
            const blob = await imageResponse.blob();
            setImageUrl(URL.createObjectURL(blob));
          }
        }
      } catch (error) {
        console.error('Error fetching profile image:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileImage();
    
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [user?.id]);

  const sizeClasses = sizes[size] || sizes.md;

  return (
    <div 
      className={`
        relative rounded-full overflow-hidden bg-purple-100 
        ring-2 ring-purple-200 flex items-center justify-center
        ${sizeClasses.container} ${className}
      `}
      title={user?.username || 'Guest'}
    >
      {loading && showLoading ? (
        <Loader className={`text-purple-500 animate-spin ${sizeClasses.loader}`} />
      ) : imageUrl ? (
        <img 
          src={imageUrl} 
          alt={user?.username || 'User avatar'} 
          className="w-full h-full object-cover"
        />
      ) : (
        <User className={`text-purple-500 ${sizeClasses.icon}`} />
      )}
    </div>
  );
};

export default UserAvatar;