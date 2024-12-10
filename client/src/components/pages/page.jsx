import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Play, User, Loader } from 'lucide-react';
import UserProfile from '../user/userProfile';

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