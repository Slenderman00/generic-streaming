import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Page from '@/components/pages/page';
import PostFeed from '../components/video/postFeed';

const HomePage = () => {
    return (
        <Page title="General Feed">
            <PostFeed/>
        </Page>
    );
};

export default HomePage;