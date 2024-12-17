docker stop peak-dind
docker rm peak-dind
docker build -t peak-dind .
docker run --memory=8g -p 5800:5800 --privileged --name peak-dind peak-dind