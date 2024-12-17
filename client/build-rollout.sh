#!/bin/bash

# Build the image
./build-local.sh

# Restart the deployment and wait for rollout to complete
kubectl rollout restart deployment client -n client
kubectl rollout status deployment client -n client

# Follow logs only after rollout is complete
kubectl logs -n client -l app=client -f --max-log-requests 10