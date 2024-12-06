#!/bin/bash
# Run cleanup and deployment in background while watching pods
# echo "Cleaning up existing resources..."
# helm uninstall prometheus -n monitoring
# kubectl delete statefulset peakdns
# kubectl delete service peakdns
# kubectl delete configmap peakdns-settings
# kubectl delete serviceaccount peakdns
# kubectl delete clusterrole peakdns-role
# kubectl delete clusterrolebinding peakdns-binding
# 
# echo "Waiting for pods to terminate..."
# kubectl wait --for=delete pod/peakdns-0 --timeout=60s 2>/dev/null || true

kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml

helm repo add prometheus-community https://prometheus-community.github.io/helm-charts
helm repo update

kubectl create namespace monitoring
helm install prometheus prometheus-community/kube-prometheus-stack \
  --namespace monitoring \
  --set prometheus.prometheusSpec.serviceMonitorSelectorNilUsesHelmValues=false \
  --set prometheus.prometheusSpec.podMonitorSelectorNilUsesHelmValues=false \

python3 k8s_apply.py ./configs

echo "Waiting for pod to be ready..."
kubectl wait --for=condition=ready pod/peakdns-0 --timeout=60s

kubectl logs peakdns-0 -f
