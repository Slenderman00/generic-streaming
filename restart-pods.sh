#!/bin/bash
# Run cleanup and deployment in background while watching pods
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

# Create a temporary directory for processed configs
TEMP_DIR=$(mktemp -d)
trap 'rm -rf "$TEMP_DIR"' EXIT


# Process and apply configs in the root directory
if [ -d "./configs" ]; then
    for file in ./configs/*.yaml; do
        if [ -f "$file" ]; then
            echo "Processing $file..."
            processed_file="$TEMP_DIR/$(basename "$file")"
            envsubst < "$file" > "$processed_file"
            cat $processed_file
            kubectl apply -f "$processed_file"
        fi
    done
fi

# Process and apply configs in subdirectories
for dir in ./configs/*/; do
    if [ -d "$dir" ]; then
        echo "Processing configurations in $dir..."
        subdir="$TEMP_DIR/$(basename "$dir")"
        mkdir -p "$subdir"
        
        for file in "$dir"*.yaml; do
            if [ -f "$file" ]; then
                processed_file="$subdir/$(basename "$file")"
                envsubst < "$file" > "$processed_file"
                cat $processed_file
                kubectl apply -f "$processed_file"
            fi
        done
    fi
done

# Apply external configurations (these don't need envsubst)
kubectl apply -f https://github.com/kubernetes-sigs/metrics-server/releases/latest/download/components.yaml
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

echo "Waiting for pod to be ready..."
kubectl wait --for=condition=ready pod/peakdns-0 --timeout=60s
kubectl logs peakdns-0 -f