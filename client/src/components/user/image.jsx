import { useState, useRef } from 'react';
import { Camera, Loader, AlertCircle, Upload } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { auth } from '../../frameworks/auth';

const ProfileImageUpload = () => {
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [imageUrl, setImageUrl] = useState(null);
  const fileInputRef = useRef(null);
  const VITE_IMAGE_SERVICE_URL = import.meta.env.VITE_IMAGE_SERVICE_URL;
  const VITE_USER_SETTINGS_URL = import.meta.env.VITE_USER_SETTINGS_URL;

  const fetchProfileImage = async () => {
    try {
      const response = await auth.doRequest(`${VITE_USER_SETTINGS_URL}/profile`);
      if (response.ok) {
        const data = await response.json();
        if (data.profile.imageId) {
          const imageResponse = await auth.doRequest(`${VITE_IMAGE_SERVICE_URL}/images/${data.profile.imageId}`);
          if (imageResponse.ok) {
            const blob = await imageResponse.blob();
            setImageUrl(URL.createObjectURL(blob));
          }
        }
      }
    } catch (err) {
      setError('Failed to load profile image');
      setStatus('error');
    }
  };

  useState(() => {
    fetchProfileImage();
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
        body: JSON.stringify({ imageId })
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to update profile');
      }

      const imageResponse = await auth.doRequest(`${VITE_IMAGE_SERVICE_URL}/images/${imageId}`);
      if (imageResponse.ok) {
        const blob = await imageResponse.blob();
        setImageUrl(URL.createObjectURL(blob));
      }

      setStatus('success');
      setTimeout(() => setStatus('idle'), 2000);
    } catch (err) {
      setError('Failed to update profile image');
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col items-center space-y-6">
      <div className="relative group">
        <div className={`
          relative w-40 h-40 rounded-full overflow-hidden bg-gray-50 
          ring-4 transition-all duration-300
          ${status === 'success' ? 'ring-green-500 scale-105' : 'ring-gray-100 group-hover:ring-gray-200'}
          shadow-lg
        `}>
          {imageUrl ? (
            <img 
              src={imageUrl} 
              alt="Profile" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-100">
              <Camera className="w-12 h-12 text-gray-400" />
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
              className="flex items-center space-x-2 bg-white/90 hover:bg-white text-gray-800 px-4 py-2 rounded-full shadow-lg transition-all duration-300 transform translate-y-2 group-hover:translate-y-0"
              disabled={status === 'loading'}
            >
              <Upload className="w-4 h-4" />
              <span className="text-sm font-medium">Upload Photo</span>
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
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
};

export default ProfileImageUpload;