import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, User, Loader } from 'lucide-react';
import { auth } from '../../frameworks/auth';

const UserProfile = () => {
  const user = auth.getUser();
  const [imageUrl, setImageUrl] = useState(null);
  const [loading, setLoading] = useState(true);
  const VITE_IMAGE_SERVICE_URL = import.meta.env.VITE_IMAGE_SERVICE_URL;
  const VITE_USER_SETTINGS_URL = import.meta.env.VITE_USER_SETTINGS_URL;

  useEffect(() => {
    const fetchProfileImage = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // First fetch the user's profile to get the image ID
        const profileResponse = await auth.doRequest(`${VITE_USER_SETTINGS_URL}/profile`);
        if (!profileResponse.ok) {
          throw new Error('Failed to fetch profile');
        }

        const profileData = await profileResponse.json();
        
        if (profileData.profile.imageId) {
          // Then fetch the actual image using the image ID
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
    
    // Cleanup URL object on unmount
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, [user?.id]); // Refetch when user ID changes

  return (
    <div className="flex items-center space-x-3">
      <div className="relative w-9 h-9 rounded-full overflow-hidden bg-purple-100 ring-2 ring-purple-200 flex items-center justify-center">
        {loading ? (
          <Loader className="w-4 h-4 text-purple-500 animate-spin" />
        ) : imageUrl ? (
          <img 
            src={imageUrl} 
            alt={user?.username} 
            className="w-full h-full object-cover"
          />
        ) : (
          <User className="w-5 h-5 text-purple-500" />
        )}
      </div>
      <span className="text-sm font-medium text-purple-600">
        {user?.username || 'Guest'}
      </span>
    </div>
  );
};

const Navbar = () => {
  return (
    <nav className="w-[80vw] h-[80px] bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-200 flex items-center justify-between px-8">
      <div className="flex items-center">
        <Play className="text-purple-500 w-6 h-6" />
        <span className="text-2xl font-bold text-purple-600 ml-2">peak</span>
      </div>
      
      <div className="flex items-center space-x-12">
        <ul className="flex space-x-6">
          <li>
            <a href="/" className="text-purple-600 hover:text-purple-800">
              Home
            </a>
          </li>
          <li>
            <a href="#" className="text-purple-600 hover:text-purple-800">
              About
            </a>
          </li>
          <li>
            <a href="#" className="text-purple-600 hover:text-purple-800">
              Contact
            </a>
          </li>
        </ul>

        <UserProfile />
      </div>
    </nav>
  );
};

const Page = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-purple-100 via-purple-50 to-white py-8 space-y-8">
      <Navbar />
      <Card className="w-[80vw] bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-200">
        <CardContent className="p-8">{children}</CardContent>
      </Card>
    </div>
  );
};

export default Page;