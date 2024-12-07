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
PEAKDNS_IMAGE="localhost:5000/peakdns:latest" PEAKDNS_PULLPOL="Never" ./restart-pods.sh