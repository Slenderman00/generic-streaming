docker run \
  --name firefox \
  -e WAYLAND_DISPLAY=$WAYLAND_DISPLAY \
  -e XDG_RUNTIME_DIR=/tmp \
  -v $XDG_RUNTIME_DIR/$WAYLAND_DISPLAY:/tmp/$WAYLAND_DISPLAY \
  --security-opt seccomp=unconfined \
  --dns $(minikube ip) \
  --dns 8.8.8.8 \
  --network host \
  jess/firefox --no-sandbox
docker rm firefox