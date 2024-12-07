#!/bin/bash

# Build the image
./build-local.sh

# Restart the deployment and wait for rollout to complete
kubectl rollout restart deployment auth-service -n auth-service
kubectl rollout status deployment auth-service -n auth-service

# Follow logs only after rollout is complete
kubectl logs -n auth-service -l app=auth-service -f --max-log-requests 10
