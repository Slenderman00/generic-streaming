# Disclaimer
While all reports mentions IPv6, we had to disable this and switch back to IPv4 due to the 
difficulty of setting up a local IPv6 network. Using IPv4 makes the instructions easier to follow.
\
This project only works on Linux, using iptables and **not nftables**. \
Due to the experimental nature of the project, it is 
more difficult to run it in a docker in docker setup than just running it manually. With time i probably would have managed to get this working, but it is 
way out of scope for this project.

# Instructions

0. Read the article `PEAK: Leveraging Proven Technologies to Create the Distributed System of the Future` to understand the architecture of the system.

## Using Linux, Minikube, Kubectl, Docker, and Helm

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

    This will start a containerized Firefox browser with the correct DNS settings. A web-based VNC server should be available at [http://127.0.0.1:5800](http://127.0.0.1:5800). For this browser to work, you might have to disable IPv6, and adjust the `fixup suffix` and `fixup prefix` settings found in `about:config`, as this browser is sometimes unwilling to send anything other than HTTPS AAAA requests.

    Alternatively, if you are using Wayland as your compositor, you can try the following command to get a containerized Firefox browser that uses your host's display:

    ```bash
    ./run-firefox-dns.sh
    ```

## **Using Windows**
Due to this being server software, it won't work natively on Windows. You can try to run it in WSL2, but due to the complex networking setup I would recommend running 
it on a virtual Ubuntu or Debian machine instead.

## **Video**
Due to the complexity of the setup, we have taken the liberty of including a demonstration video of the service in action.

## **Technical Support**
In the case of any issues I can be contacted at `contact@joar.me`.