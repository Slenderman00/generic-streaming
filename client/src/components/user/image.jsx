import React, { useState, useRef, useEffect } from 'react';
import { Camera, Loader, AlertCircle, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { auth } from '../../frameworks/auth';

const ProfileImageUpload = ({ isBanner = false, onClose, onImageUpdate }) => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const fileInputRef = useRef(null);
  const VITE_IMAGE_SERVICE_URL = import.meta.env.VITE_IMAGE_SERVICE_URL;
  const VITE_USER_SETTINGS_URL = import.meta.env.VITE_USER_SETTINGS_URL;

  const fetchImage = async () => {
    try {
      const response = await auth.doRequest(`${VITE_USER_SETTINGS_URL}/profile`);
      if (response.ok) {
        const data = await response.json();
        const imageId = isBanner ? data.profile.bannerId : data.profile.imageId;
        if (imageId) {
          const imageResponse = await auth.doRequest(`${VITE_IMAGE_SERVICE_URL}/images/${imageId}`);
          if (imageResponse.ok) {
            const blob = await imageResponse.blob();
            const url = URL.createObjectURL(blob);
            setImageUrl(url);
            // Only call onImageUpdate if this is NOT the initial load
            if (onImageUpdate && !isInitialLoad) {
              onImageUpdate(url);
            }
          }
        }
      }
    } catch (err) {
      setError(`Failed to load ${isBanner ? 'banner' : 'profile'} image`);
      setStatus('error');
    }
  };

  useEffect(() => {
    fetchImage();
    // After initial fetch, set isInitialLoad to false
    setIsInitialLoad(false);
    
    // Cleanup function to revoke object URLs
    return () => {
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl);
      }
    };
  }, []);

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file');
      setStatus('error');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be smaller than 5MB');
      setStatus('error');
      return;
    }

    setStatus('loading');
    setError('');

    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadResponse = await auth.doRequest(`${VITE_IMAGE_SERVICE_URL}/upload`, {
        method: 'POST',
        body: formData
      });

      if (!uploadResponse.ok) {
        throw new Error('Failed to upload image');
      }

      const { imageId } = await uploadResponse.json();

      const updateResponse = await auth.doRequest(`${VITE_USER_SETTINGS_URL}/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          [isBanner ? 'bannerId' : 'imageId']: imageId 
        })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      const imageResponse = await auth.doRequest(`${VITE_IMAGE_SERVICE_URL}/images/${imageId}`);
      if (imageResponse.ok) {
        const blob = await imageResponse.blob();
        const newUrl = URL.createObjectURL(blob);
        setImageUrl(newUrl);
        // Always call onImageUpdate for manual uploads
        if (onImageUpdate) onImageUpdate(newUrl);
      }

      setStatus('success');
      setTimeout(() => {
        setStatus('idle');
        if (onClose) onClose();
      }, 2000);
    } catch (err) {
      setError(`Failed to update ${isBanner ? 'banner' : 'profile'} image`);
      setStatus('error');
    }
  };

  const containerClassName = isBanner 
    ? "w-full min-h-[200px] aspect-[3/1] rounded-lg"
    : "w-40 h-40 rounded-full";

  return (
    <div className={`flex flex-col items-center ${isBanner ? 'w-full' : 'space-y-6'}`}>
      <div className="relative group w-full">
        <div className={`
          relative overflow-hidden bg-gray-50 
          ring-4 transition-all duration-300
          ${status === 'success' ? 'ring-green-500 scale-105' : 'ring-gray-100 group-hover:ring-gray-200'}
          shadow-lg
          ${containerClassName}
        `}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt={isBanner ? "Banner" : "Profile"}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Camera className={`${isBanner ? 'w-20 h-20' : 'w-12 h-12'} text-gray-400`} />
            </div>
          )}
          
          {status === 'loading' && (
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
              <Loader className="w-8 h-8 text-white animate-spin" />
            </div>
          )}

          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-2 bg-white/90 hover:bg-white text-gray-800 px-6 py-3 rounded-full shadow-lg transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
              disabled={status === 'loading'}
            >
              <Upload className="w-5 h-5" />
              <span className={`${isBanner ? 'text-base' : 'text-sm'} font-medium`}>Upload {isBanner ? 'Banner' : 'Photo'}</span>
            </button>
          </div>
        </div>

        <input
          type="file"
          ref={fileInputRef}
          onChange={handleImageUpload}
          accept="image/*"
          className="hidden"
        />
      </div>

      {status === 'error' && (
        <Alert variant="destructive" className="max-w-md mt-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ProfileImageUpload;