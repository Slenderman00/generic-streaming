import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Users, User } from 'lucide-react';
import UserProfile from '../user/userProfile';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../../frameworks/auth';

const Navbar = () => {
  const location = useLocation();
  const currentUser = auth.getUser();
  
  // Check if the profile path matches the current user's ID
  const isPersonalFeed = location.pathname === `/profile/${currentUser.id}`;

  return (
    <nav className="w-[80vw] h-[80px] bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-200 flex items-center justify-between px-8">
      <div className="flex items-center">
        <Play className="text-purple-500 w-6 h-6" />
        <span className="text-2xl font-bold text-purple-600 ml-2">peak</span>
      </div>
      <div className="flex items-center space-x-12">
        <ul className="flex space-x-6">
          <li>
            <Link
              to="/"
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/'
                  ? 'bg-purple-100 text-purple-800'
                  : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>General Feed</span>
            </Link>
          </li>
          <li>
            <Link
              to={`/profile/${currentUser.id}`}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                isPersonalFeed
                  ? 'bg-purple-100 text-purple-800'
                  : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
              }`}
            >
              <User className="w-4 h-4" />
              <span>My Feed</span>
            </Link>
          </li>
        </ul>
        <UserProfile />
      </div>
    </nav>
  );
};

const Page = ({ children, title }) => {
  useEffect(() => {
    document.title = title;
  }, [title]);

  return (
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-purple-100 via-purple-50 to-white py-8 space-y-8">
      <Navbar />
      <Card className="w-[80vw] max-w-4xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-200">
        <CardContent className="p-8">{children}</CardContent>
      </Card>
    </div>
  );
};

export default Page;