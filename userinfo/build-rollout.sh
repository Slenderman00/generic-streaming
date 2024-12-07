#!/bin/bash

# Build the image
./build-local.sh

# Restart the deployment and wait for rollout to complete
kubectl rollout restart deployment user-info -n user
kubectl rollout status deployment user-info -n user

# Follow logs only after rollout is complete
kubectl logs -n user -l app=user-info -f --max-log-requests 10
