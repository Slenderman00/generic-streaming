#!/bin/bash
export DOCKER_HOST=unix:///var/run/docker.sock
sudo /usr/local/bin/dockerd-entrypoint.sh --host unix:///var/run/docker.sock &
sleep 60

minikube start \
  --network-plugin=cni \
  --extra-config=kubeadm.pod-network-cidr=10.244.0.0/16 \
  --extra-config=apiserver.service-node-port-range=53-32767 \
  --cpus=4 \
  --memory=8192 \
  --disk-size=30g \
  --driver=docker \
  --force
sudo ip route add 10.244.0.0/16 via $(minikube ip)
sudo iptables -A FORWARD -s 10.244.0.0/16 -j ACCEPT
sudo iptables -A FORWARD -d 10.244.0.0/16 -j ACCEPT

cd PeakDNS
./build-local.sh
cd ..
cd selfauth
./build-local.sh
cd ..
cd videoupload
./build-local.sh
cd ..
cd videoprocessing
./build-local.sh
cd ..
cd videostatus
./build-local.sh
cd ..
cd userinfo
./build-local.sh
cd ..
cd imageupload
./build-local.sh
cd ..
cd postsread
./build-local.sh
cd ..
cd postswrite
./build-local.sh
cd ..
cd client
./build-local.sh
cd ..

export PEAKDNS_IMAGE="localhost:5000/peakdns:latest" 
export PEAKDNS_PULLPOL="Never"

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

docker run -d \
    --name=firefox \
    -p 5800:5800 \
    -v /docker/appdata/firefox:/config:rw \
    --dns $(minikube ip) \
    --dns 8.8.8.8 \
    --network host \
    jlesage/firefox

kubectl logs peakdns-0 -f