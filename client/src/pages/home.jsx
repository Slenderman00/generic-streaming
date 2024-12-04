import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Page from '@/components/pages/page';
import VideoFeed from '@/components/video/feed';

const HomePage = () => {

    const videoData = [
        {
            id: 1,
            title: "Not pornography💪",
            description: "I promise this is not porn 🔥",
            author: "FitnessGuru",
            authorAvatar: "/api/placeholder/40/40",
            thumbnail: "/api/placeholder/640/360",
            duration: "10:30",
            timestamp: new Date(),
            likes: 1200,
            dislikes: 30,
            views: 15000,
            isPremium: true,
            tags: ["Not", "Porn", "Thisisatag"],
            comments: [
              { id: 1, user: "John", text: "Amazing content!", timestamp: new Date() },
              { id: 2, user: "Sarah", text: "Can't wait to try this", timestamp: new Date() }
            ]
          }
    ];

    return (
        <Page>
            <VideoFeed videos={videoData} />
        </Page>
    );
};

export default HomePage;