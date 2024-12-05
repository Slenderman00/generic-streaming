#!/bin/bash

# Build the image
./build-local.sh

# Restart the deployment and wait for rollout to complete
kubectl rollout restart deployment video-processing -n video
kubectl rollout status deployment video-processing -n video

# Follow logs only after rollout is complete
kubectl logs -n video -l app=video-processing -f --max-log-requests 10