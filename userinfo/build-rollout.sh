#!/bin/bash

# Build the image
./build-local.sh

# Restart the deployment and wait for rollout to complete
kubectl rollout restart deployment user-info -n video
kubectl rollout status deployment user-info -n video

# Follow logs only after rollout is complete
kubectl logs -n video -l app=user-info -f --max-log-requests 10