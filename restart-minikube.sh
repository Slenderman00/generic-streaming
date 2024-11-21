minikube delete
minikube start --network-plugin=cni --extra-config=kubeadm.pod-network-cidr=10.244.0.0/16 --extra-config=apiserver.service-node-port-range=53-32767
kubectl apply -f https://raw.githubusercontent.com/flannel-io/flannel/master/Documentation/kube-flannel.yml
sudo ip route add 10.244.0.0/16 via $(minikube ip)
sudo iptables -A FORWARD -s 10.244.0.0/16 -j ACCEPT
sudo iptables -A FORWARD -d 10.244.0.0/16 -j ACCEPT