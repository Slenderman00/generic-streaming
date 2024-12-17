FROM docker:latest

RUN echo "http://dl-cdn.alpinelinux.org/alpine/edge/testing" >> /etc/apk/repositories

RUN apk add --no-cache \
    curl \
    bash \
    jq \
    git \
    python3 \
    py3-pip \
    sudo\
    minikube

#Pip stuff
RUN pip install python-dotenv PyYAML --break-system-packages

#Install kubectl
RUN curl -LO "https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl" \
    && install -o root -g root -m 0755 kubectl /usr/local/bin/kubectl

#Install helm
RUN curl https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 | bash

COPY . /app
WORKDIR /app
RUN chmod +x entrypoint.sh

CMD ["./entrypoint.sh"]