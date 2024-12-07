#!/bin/bash

# Build the image
./build-local.sh

# Restart the deployment and wait for rollout to complete
kubectl rollout restart deployment image-upload -n image
kubectl rollout status deployment image-upload -n image

# Follow logs only after rollout is complete
kubectl logs -n image -l app=image-upload -f --max-log-requests 10
