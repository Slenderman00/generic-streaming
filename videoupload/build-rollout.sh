#!/bin/bash

# Build the image
./build-local.sh

# Restart the deployment and wait for rollout to complete
kubectl rollout restart deployment video-upload -n video
kubectl rollout status deployment video-upload -n video

# Follow logs only after rollout is complete
kubectl logs -n video -l app=video-upload -f --max-log-requests 10