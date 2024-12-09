import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Page from '@/components/pages/page';
import PostFeed from '../components/video/postFeed';

const HomePage = () => {
    return (
        <Page>
            <PostFeed/>
        </Page>
    );
};

export default HomePage;