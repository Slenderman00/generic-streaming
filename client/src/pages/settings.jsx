import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import Page from '@/components/pages/page';
import ProfileDescription from '@/components/user/description.jsx';

const SettingsPage = () => {
    return (
        <Page>
            <h2>Edit Profile</h2>
            <ProfileDescription />
        </Page>
    );
};

export default SettingsPage;