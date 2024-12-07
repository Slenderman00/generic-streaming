import React, { useState, useEffect } from 'react';
import { AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { RefreshCw, CheckCircle, XCircle } from "lucide-react";

const ServiceHealthMonitor = () => {
  const [healthStatus, setHealthStatus] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const services = {
    'Authentication': `${import.meta.env.VITE_AUTH_URL}/auth`,
    'Video Upload Service': import.meta.env.VITE_UPLOAD_URL,
    'Video Status': import.meta.env.VITE_VIDEO_STATUS_URL,
    'User Settings': import.meta.env.VITE_USER_SETTINGS_URL,
    'Image Service': import.meta.env.VITE_IMAGE_SERVICE_URL
  };

  const checkHealth = async () => {
    setIsLoading(true);
    const newStatus = {};
    
    for (const [name, baseUrl] of Object.entries(services)) {
      try {
        const response = await fetch(`${baseUrl}/health`, {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
          },
        });
        newStatus[name] = response.ok;
      } catch (error) {
        newStatus[name] = false;
      }
    }
    
    setHealthStatus(newStatus);
    setIsLoading(false);
    
    // Check if any service is down
    const hasDownServices = Object.values(newStatus).some(status => !status);
    setIsModalOpen(hasDownServices);
  };

  useEffect(() => {
    // Initial check
    checkHealth();
    
    // Set up polling every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return (
    <AlertDialog open={isModalOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center justify-between">
            Service Status
            <RefreshCw
              className={`cursor-pointer ${isLoading ? 'animate-spin' : ''}`}
              size={20}
              onClick={checkHealth}
            />
          </AlertDialogTitle>
        </AlertDialogHeader>
        
        <div className="space-y-2">
          {Object.entries(healthStatus).map(([service, isHealthy]) => (
            <Alert key={service} variant={isHealthy ? "default" : "destructive"}>
              <div className="flex items-center">
                {isHealthy ? (
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 mr-2" />
                )}
                <AlertDescription>
                  {service}: {isHealthy ? 'Operational' : 'Down'}
                </AlertDescription>
              </div>
            </Alert>
          ))}
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ServiceHealthMonitor;