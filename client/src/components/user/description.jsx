import { useState, useEffect } from 'react';
import { AlertCircle, Check, Loader } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { auth } from '../../frameworks/auth';

const ProfileDescription = () => {
  const [description, setDescription] = useState('');
  const [originalDescription, setOriginalDescription] = useState('');
  const [status, setStatus] = useState('idle'); // idle, loading, success, error
  const [error, setError] = useState('');
  const [saveTimeout, setSaveTimeout] = useState(null);

  const VITE_USER_SETTINGS_URL = import.meta.env.VITE_USER_SETTINGS_URL;

  useEffect(() => {
    const fetchDescription = async () => {
      try {
        const response = await auth.doRequest(`${VITE_USER_SETTINGS_URL}/profile`);
        if (response.ok) {
          const data = await response.json();
          setDescription(data.profile.description || '');
          setOriginalDescription(data.profile.description || '');
        } else {
          throw new Error('Failed to fetch profile');
        }
      } catch (err) {
        setError('Failed to load description');
        setStatus('error');
      }
    };

    fetchDescription();
  }, []);

  const handleDescriptionChange = (newDescription) => {
    setDescription(newDescription);
    setStatus('loading');

    if (saveTimeout) {
      clearTimeout(saveTimeout);
    }

    const timeoutId = setTimeout(async () => {
      try {
        const response = await auth.doRequest(`${VITE_USER_SETTINGS_URL}/profile`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ description: newDescription }),
        });

        if (response.ok) {
          setStatus('success');
          setOriginalDescription(newDescription);
          setTimeout(() => setStatus('idle'), 2000);
        } else {
          throw new Error('Failed to update description');
        }
      } catch (err) {
        setError('Failed to save changes');
        setStatus('error');
      }
    }, 500);

    setSaveTimeout(timeoutId);
  };

  return (
    <div className="space-y-4">
      <div className="relative">
        <textarea
          value={description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Add a description..."
          className="w-full min-h-[150px] p-3 rounded-md border focus:outline-none focus:ring-2 focus:ring-blue-500"
          maxLength={1000}
        />
        
        <div className="absolute right-2 top-2">
          {status === 'loading' && (
            <Loader className="h-5 w-5 text-gray-400 animate-spin" />
          )}
          {status === 'success' && (
            <Check className="h-5 w-5 text-green-500" />
          )}
        </div>
      </div>

      <div className="text-sm text-gray-500">
        {description.length}/1000 characters
      </div>

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {description !== originalDescription && status !== 'loading' && status !== 'success' && (
        <div className="text-sm text-amber-600">
          Unsaved changes
        </div>
      )}
    </div>
  );
};

export default ProfileDescription;