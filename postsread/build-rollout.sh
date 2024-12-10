#!/bin/bash

# Build the image
./build-local.sh

# Restart the deployment and wait for rollout to complete
kubectl rollout restart deployment post-service-read -n post-service
kubectl rollout status deployment post-service-read -n post-service

# Follow logs only after rollout is complete
kubectl logs -n post-service -l app=post-service -f --max-log-requests 10
