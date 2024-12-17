# Disclaimer
While all reports mentions IPv6, we had to disable this and switch back to IPv4 due to the 
difficulty of setting up a local IPv6 network. Using IPv4 makes the instructions easier to follow.
\
This project only works on Linux, using iptables and **not nftables**.
\
We forgot to add the client service to all our diagrams as we were using a development version of the client service until late in the project. The client service is a frontend service that is used to interact with the other services.
It works exactly like the other services except for being containers of nginx.

# Instructions

0. Read the article `PEAK: Leveraging Proven Technologies to Create the Distributed System of the Future` to understand the architecture of the system.

## Using Linux, Minikube, Kubectl, Docker, and Helm
### **Make sure to follow these instructions exactly. The project will NOT work if any of the steps are skipped.**
**8 GB of free RAM is required for this method.**

1. Make sure you have Minikube, Kubectl, Docker, and Helm installed. (Building takes a while, be patient). the `k8s_apply.py` script is dependent on `python-dotenv` and `PyYAML`, you can choose between creating a venv and installing it in that or `pip install python-dotenv PyYAML --break-system-packages`
2. Run the following command:
    ```bash
    ./restart-minikube.sh && ./build-restart-pods.sh
    ```
3. **Recommended Method:** Manually add the server `[minikube ip]:53` to the DNS settings of the host machine. This is done by adding the following line over the standard nameserver `/etc/resolv.conf`:

    ```
    nameserver [minikube ip]
    ```

    The `minikube ip` can be found by running `minikube ip` in the terminal. This will allow the host machine to resolve DNS queries to the PeakDNS server. Ensure you do not remove Linux's default DNS server (`nameserver 127.0.0.1`), as this will disrupt your internet connection.\
    If the minikube is having probles starting this might be because linux is having trouble with switching DNS servers. To fix this you can remove the minikube nameserver from the `/etc/resolv.conf` until the minikube is up and running.\
    When you are doing this the PeakDNS logs will log all of your systems DNS traffic, as it is not meant to be used
    as a recursive DNS server certain webpages might not load.

    **Recommended Method Dnsmasq:** If you are using a Linux distribution that uses `dnsmasq` as a DNS resolver, you can add the following line to `/etc/dnsmasq.conf`:

    ```
    server=/.peak/[minikube ip]
    ```
    This will instruct Dnsmaq to forward all DNS queries for the `.peak` domain to the PeakDNS server. After adding this line, restart the `dnsmasq` service by running:

    ```bash
    sudo systemctl restart dnsmasq
    ```

    **Alternative Method:** To use the service, a web browser existing on the same network using the PeakDNS server must be used. To start it, run the following command:

    ```bash
    ./run-firefox-dns-browser.sh
    ```

    This will start a containerized Firefox browser with the correct DNS settings. A web-based VNC server should be available at [http://127.0.0.1:5800](http://127.0.0.1:5800). For this browser to work, you must enable `network.dns.disableIPv6` under `about:config`, as this browser is sometimes unwilling to send anything other than HTTP AAAA requests.

    Alternatively, if you are using Wayland as your compositor, you can try the following command to get a containerized Firefox browser that uses your host's display:

    ```bash
    ./run-firefox-dns.sh
    ```
4. Visit http://client.peak in the browser to see the service in action.
Be patient as the service might take a while to start up.

## **Using Docker and minikube in Docker (Be patient)**
**Note:** This method won't work on **Windows** as the windows docker driver doesn't support nested virtualization. This method is also not recommended as it is very slow and unstable. 
**8 GB of free RAM is required for this method.**

1. Make sure you have Docker installed.
2. Run the following command:
    ```bash
    ./peak-dind.sh
    ```
A web-based VNC server should be available at [http://127.0.0.1:5800](http://127.0.0.1:5800).
Visit http://client.peak on the browser to see the service in action. You must enable `network.dns.disableIPv6` under `about:config`, as this browser is sometimes unwilling to send anything other than HTTP AAAA requests.


## **Using Windows**
Due to this being server software, it won't work natively on Windows. You can try to run it in WSL2, but due to the complex networking setup I would recommend running 
it on a virtual Ubuntu or Debian machine instead, or even better on a physical Linux
machine.

## **Technical Support**
In the case of any issues I can be contacted at `contact@joar.me`.

## User Stories

### Story 1: User Registration
As a user,  
I want to be able to register an account using a username and a password,  
So that I can access the streaming service.

**Acceptance Criteria:**
1. The registration screen is accessible from the home page.
2. Users can enter a username and password.
3. The system validates that the username is valid.
4. An error message is displayed if the username is not valid.

### Story 2: Feed Browser
As a user,  
I want to be able to browse feeds,  
So that I can access and stream the content.

**Acceptance Criteria:**
1. A login prompt is shown if the user is not logged in.
2. The homepage consists of a list of posts.
3. Users can select the content they want to watch.
4. The user is able to stream and interact with the content.

### Story 3: Like/Unlike Posts
As a user,  
I want to be able to like or unlike posts,  
So that I can express my preferences on the content.

**Acceptance Criteria:**
1. Users must be logged in to like or unlike posts.
2. When a user likes a post, the like count increases.
3. When a user unlikes a post, the like count decreases.
4. The system should reflect the user's like status on each post.
5. An error message is displayed if the like/unlike action fails.

### Architecture
An in depth explanation of the architecture together with diagrams can be found in the article `PEAK: Leveraging Proven Technologies to Create the Distributed System of the Future`.

### Microservices Specific Requirements

1. **Multiple Services:**
   - The project uses multiple services such as `selfauth`, `videoupload`, `videoprocessing`, `videostatus`, `userinfo`, `imageupload`, `postsread`, `client` and `postswrite`.

2. **Synchronous Communication:**
   - Services communicate using synchronous communication, between prometheus and the services.

3. **Asynchronous Communication:**
   - Services communicate using asynchronous message queues, for example, using RabbitMQ for video processing tasks and the client 
   intermediated communication.

4. **Clear Structure and Functionality:**
   - Each service has a clear structure and defined functionality.

5. **Consistent Architecture:**
   - The architecture is consistent with the documentation, and all services are described and documented.

6. **Gateway:**
   - The project uses a custom DNS server acting as a gateway for routing and service discovery.

7. **Load Balancing:**
   - PeakDNS performs metrics-based record management (Load Balancing) by removing unhealthy and overloaded services from the DNS records.
   This can be seen in the PeakDNS stdout logs.

8. **Health Check:**
   - A grafana dashboard is available, it should be accessible at `http://monitoring.peak:3000` after the services have started. The password is `prom-operator` and the username is `admin`.

9. **Central Configuration:**
   - The project uses kubernetes an orchestrator and central configuration manager.

10. **Containerization:**
    - The project uses Docker for containerization, building container images, and running them.