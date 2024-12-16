# Reflections
My choice of topic was building a video streaming service using microservices and load-balancing / routing using DNS.
I chose this topic because I have a keen interest in DNS and a strong belief that the current proxy based routing systems
are not sustainable. IPv6 opens up a lot of possibilities due to the large address space (2^128).
My project consists of three parts, Peak the video streaming service, PeakDNS the DNS server that does service discovery and
routing. And an article named "PEAK: Leveraging Proven Technologies to Create
the Distributed System of the Future".
When I was well into the project I started looking for papers that presented similar architectures as mine, and I quickly
found out that there were none. This caught me off guard as DNS based routing and service discoverability is more efficient
than proxy based routing. Because of this I felt that I had to write an article to explain my choice of architecture and
the benefits of it.
The video sub system, follows an extremely common architecture, where videos are added to a shared file system and put into a queue,
after this one of the multiple instances of video encoders will pick up the video and encode it. The video is encoded onto the 
same shared file system so that the streaming endpoint can pick it up and stream it to the user, the message queue is an example of 
two microservices communicating directly with each other using asynchronous messaging. The Prometheus data collection system
is an example of multiple services communicating with each other using synchrounous messaging. Prometheus pulls data from each pod
and stores it in a time series database, this data is used for the metric based record management. The system does not implement any 
service mesh as PeakDNS using the kubernetes API does the service discovery and routing.