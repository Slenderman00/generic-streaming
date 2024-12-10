import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Camera } from 'lucide-react';
import { auth } from '@/frameworks/auth';
import PostFeed from '../components/video/postFeed';
import UserAvatar from '@/components/user/avatar';
import ProfileDescription from '@/components/user/description';
import ProfileImageUpload from '@/components/user/image';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Page from '../components/pages/page';

const UserProfilePage = () => {
    const { userId } = useParams();
    const [profile, setProfile] = useState(null);
    const [error, setError] = useState(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [showImageUpload, setShowImageUpload] = useState(false);
    const [showBannerUpload, setShowBannerUpload] = useState(false);
    const [bannerUrl, setBannerUrl] = useState(null);
    const [bannerKey, setBannerKey] = useState(0); // Add a key to force image refresh

    const VITE_USER_SETTINGS_URL = import.meta.env.VITE_USER_SETTINGS_URL;
    const VITE_IMAGE_SERVICE_URL = import.meta.env.VITE_IMAGE_SERVICE_URL;

    useEffect(() => {
        const currentUser = auth.getUser();
        setIsOwnProfile(currentUser?.id === userId);
        fetchProfile();
    }, [userId]);

    const fetchProfile = async () => {
        try {
            const response = await auth.doRequest(`${VITE_USER_SETTINGS_URL}/profiles/${userId}`);
            if (!response.ok) throw new Error('Failed to fetch profile');

            const data = await response.json();
            setProfile(data.profile);

            if (data.profile.bannerId) {
                await fetchBannerImage(data.profile.bannerId);
            } else {
                setBannerUrl(null);
            }
        } catch (err) {
            setError('No profile data found');
        }
    };

    const fetchBannerImage = async (bannerId) => {
        try {
            const bannerResponse = await auth.doRequest(
                `${VITE_IMAGE_SERVICE_URL}/images/${bannerId}`
            );
            if (bannerResponse.ok) {
                const blob = await bannerResponse.blob();
                const url = URL.createObjectURL(blob);
                setBannerUrl(url);
                return url;
            }
            return null;
        } catch (err) {
            console.error('Error fetching banner image:', err);
            return null;
        }
    };

    const handleImageUploadSuccess = async () => {
        await fetchProfile();
        setBannerKey(prev => prev + 1); // Increment key to force image refresh
        setShowBannerUpload(false);
        setShowImageUpload(false);
    };

    // Cleanup function for the banner URL object
    useEffect(() => {
        return () => {
            if (bannerUrl) {
                URL.revokeObjectURL(bannerUrl);
            }
        };
    }, [bannerUrl]);

    return (
        <Page title={profile?.username || 'Profile'}>
            <div className="max-w-4xl mx-auto">
                <div className="relative">
                    <div
                        className="h-48 bg-gradient-to-r from-purple-500 to-blue-500 relative group cursor-pointer"
                        onClick={() => isOwnProfile && setShowBannerUpload(true)}
                    >
                        {bannerUrl && (
                            <img
                                key={bannerKey} // Add key to force re-render
                                src={bannerUrl}
                                alt="Profile banner"
                                className="w-full h-full object-cover"
                            />
                        )}
                        {isOwnProfile && (
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-all duration-300 flex items-center justify-center opacity-0 group-hover:opacity-100">
                                <Camera className="w-8 h-8 text-white" />
                            </div>
                        )}
                    </div>
                    <div className="absolute -bottom-16 left-8">
                        <div
                            className="cursor-pointer"
                            onClick={() => isOwnProfile && setShowImageUpload(true)}
                        >
                            <UserAvatar size="lg" userId={userId} className="w-32 h-32 border-4 border-white" />
                        </div>
                    </div>
                </div>
                <div className="mt-20 px-8">
                    {error && (
                        <Alert variant="destructive" className="mb-4">
                            <AlertDescription>{error}</AlertDescription>
                        </Alert>
                    )}
                    <div className="mb-8">
                        {isOwnProfile ? (
                            <ProfileDescription />
                        ) : (
                            <p className="text-gray-700">{profile?.description || 'No description available.'}</p>
                        )}
                    </div>
                    {showImageUpload && isOwnProfile && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded-lg max-w-md w-full">
                                <h2 className="text-xl font-semibold mb-4">Update Profile Picture</h2>
                                <ProfileImageUpload onSuccess={handleImageUploadSuccess} />
                                <button
                                    onClick={() => setShowImageUpload(false)}
                                    className="mt-4 w-full py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    {showBannerUpload && isOwnProfile && (
                        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                            <div className="bg-white p-6 rounded-lg max-w-md w-full">
                                <h2 className="text-xl font-semibold mb-4">Update Banner Image</h2>
                                <ProfileImageUpload isBanner onSuccess={handleImageUploadSuccess} />
                                <button
                                    onClick={() => setShowBannerUpload(false)}
                                    className="mt-4 w-full py-2 bg-gray-200 rounded-lg hover:bg-gray-300"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    )}

                    <PostFeed userId={userId} />
                </div>
            </div>
        </Page>
    );
};

export default UserProfilePage;