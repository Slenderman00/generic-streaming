kubectl apply -f https://docs.projectcalico.org/manifests/calico.yaml

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
