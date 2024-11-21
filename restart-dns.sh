#!/bin/bash

# Run cleanup and deployment in background while watching pods
{
    echo "Cleaning up existing resources..."
    kubectl delete statefulset peakdns
    kubectl delete service peakdns
    kubectl delete configmap peakdns-settings
    kubectl delete serviceaccount peakdns
    kubectl delete clusterrole peakdns-role
    kubectl delete clusterrolebinding peakdns-binding
    
    echo "Waiting for pods to terminate..."
    kubectl wait --for=delete pod/peakdns-0 --timeout=60s 2>/dev/null || true
    
    echo "Applying new configuration..."
    # Apply configs in the root directory
    #if ls ./configs/*.yaml 1> /dev/null 2>&1; then
    kubectl apply -f ./configs
    #fi
    
    # Apply configs in subdirectories
    for dir in ./configs/*/; do
        if [ -d "$dir" ]; then
            echo "Applying configurations in $dir..."
            kubectl apply -f "$dir"
        fi
    done
    
    echo "Waiting for pod to be ready..."
    kubectl wait --for=condition=ready pod/peakdns-0 --timeout=60s
} &

# Watch pods in foreground
kubectl get pods -w | grep --line-buffered peakdns
