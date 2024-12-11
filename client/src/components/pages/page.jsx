import React, { useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, Users, User } from 'lucide-react';
import UserProfile from '../user/userProfile';
import { Link, useLocation } from 'react-router-dom';
import { auth } from '../../frameworks/auth';

const Navbar = () => {
  const location = useLocation();
  const isPersonalFeed = location.pathname.startsWith('/profile/');
  
  return (
    <nav className="w-full max-w-6xl bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-200 flex items-center justify-between px-4 md:px-8 h-16 md:h-20">
      <div className="flex items-center">
        <Play className="text-purple-500 w-5 h-5 md:w-6 md:h-6" />
        <span className="text-xl md:text-2xl font-bold text-purple-600 ml-2">peak</span>
      </div>
      <div className="flex items-center space-x-4 md:space-x-12">
        <ul className="flex space-x-2 md:space-x-6">
          <li>
            <Link
              to="/"
              className={`flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors ${
                location.pathname === '/'
                  ? 'bg-purple-100 text-purple-800'
                  : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
              }`}
            >
              <Users className="w-4 h-4" />
              <span className="text-sm md:text-base">General Feed</span>
            </Link>
          </li>
          <li>
            <Link
              to={`/profile/${auth.getUser()?.id}`}
              className={`flex items-center space-x-1 md:space-x-2 px-3 md:px-4 py-2 rounded-lg transition-colors ${
                isPersonalFeed
                  ? 'bg-purple-100 text-purple-800'
                  : 'text-purple-600 hover:text-purple-800 hover:bg-purple-50'
              }`}
            >
              <User className="w-4 h-4" />
              <span className="text-sm md:text-base">My Feed</span>
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
    <div className="min-h-screen flex flex-col items-center bg-gradient-to-b from-purple-100 via-purple-50 to-white py-4 md:py-8 px-4 space-y-4 md:space-y-8">
      <div className="w-full max-w-6xl mx-auto">
        <Navbar />
      </div>
      <Card className="w-full max-w-6xl mx-auto bg-white shadow-xl rounded-2xl overflow-hidden border border-purple-200">
        <CardContent className="p-4 md:p-8">{children}</CardContent>
      </Card>
    </div>
  );
};

export default Page;