cd PeakDNS
./build-local.sh
cd ..
PEAKDNS_IMAGE="localhost:5000/peakdns:latest" PEAKDNS_PULLPOL="Never" ./restart-pods.sh