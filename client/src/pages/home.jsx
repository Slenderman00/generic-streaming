import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const HomePage = () => {

  return (
    <div className="h-[calc(100vh-0.01px)] flex items-center justify-center bg-gradient-to-b from-purple-900 via-purple-800 to-black">
      <Card className="max-w-md w-full p-6 bg-black/60 backdrop-blur-sm border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl text-white text-center">Welcome to Peak</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-zinc-400 mb-6">
            Peak is a powerful platform for analytics and insights. Get started today.
          </p>
          <div className="space-y-4">
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HomePage;