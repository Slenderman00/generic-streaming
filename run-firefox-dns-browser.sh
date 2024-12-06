docker run \
    --name=firefox \
    -p 5800:5800 \
    -v /docker/appdata/firefox:/config:rw \
    --dns $(minikube ip) \
    --dns 8.8.8.8 \
    --network host \
    jlesage/firefox
docker rm firefox

# Notes: Remember to disable IPv6 and browser fixup suffix and prefix