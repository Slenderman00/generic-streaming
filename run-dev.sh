#!/bin/bash

# Start the mount in background
minikube mount $(pwd)/client:/root/client > mount.log 2>&1 & 
MOUNT_PID=$!
echo $MOUNT_PID > mount.pid

echo "Started mount with PID: $MOUNT_PID"

# Delete old pod if it exists
kubectl delete pod nodejs-dev -n dev-service --ignore-not-found=true

# Apply the kubernetes config
kubectl apply -f configs/dev-client.yaml

# Wait for pod to be running
echo "Waiting for pod to be ready..."
kubectl wait --for=condition=Ready pod/nodejs-dev -n dev-service --timeout=60s

# Stream the logs
echo "Streaming logs..."
kubectl logs -f nodejs-dev -n dev-service