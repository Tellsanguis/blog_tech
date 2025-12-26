---
slug: monitoring-externe-zabbix
title: "External Monitoring with Zabbix"
authors: [tellserv]
tags: [zabbix, monitoring, proxmox, vps, homelab, security]
date: 2025-12-26
---

How I set up an external monitoring system with Zabbix to be alerted even if my Proxmox cluster goes down completely, using a local proxy, a remote VPS server, and a PSK encrypted connection.

<p align="center">
  <img src="/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix_logo.png" alt="Zabbix Logo" width="300" />
</p>

<!--truncate-->

## The monitoring paradox: monitoring the monitor

When building a homelab, you quickly install a monitoring system. It's essential: it lets you keep an eye on CPU usage, RAM, disk space, and get alerted before a service crashes.

I was using **Beszel** until now. A simple, lightweight, efficient tool. Perfect for a homelab. Everything works great.

Except there's a problem.

**If my Proxmox cluster goes down, Beszel goes down with it.**

And therefore, my notifications go down too. I'll never be notified that my services are down, since the system supposed to warn me is itself out of service.

### Problematic scenarios

Here are some scenarios where my current monitoring becomes useless:

- **Power outage**: No cluster → No monitoring → No alert
- **Main node crash**: The one hosting Beszel → Radio silence
- **Network issue**: The switch dies → Unable to communicate with monitoring
- **Storage corruption**: Linstor DRBD hosting the VMs becomes inaccessible → Nothing works

In all these cases, I'm **never notified**. I discover the problem hours (or days) later when I try to access a service.

For a personal homelab, it's annoying. For critical infrastructure, it's unacceptable.

## The solution: a complementary approach

Rather than replacing Beszel, I decided to implement a **complementary architecture**:

- **Beszel stays in place** for real-time monitoring of VMs and LXCs on a daily basis. It's simple, lightweight, and perfect for monitoring resource usage in real-time.

- **Zabbix complements it** for global Proxmox cluster monitoring, long-term history, and especially **critical alerts** (like complete cluster failure).

This approach combines the best of both worlds: Beszel's simplicity for daily use, and Zabbix's resilience for critical situations.

### Offsite architecture with distributed monitoring

To solve the resilience problem, I need an architecture that respects three constraints:

### 1. The monitoring server must be **elsewhere**

If my cluster goes down, the monitoring server must remain operational. The solution: host it on a **VPS**, completely independent from my homelab.

Even if all my home infrastructure goes down, the VPS server continues to run and can send me an alert.

### 2. No open ports on the homelab

I **don't** want to open inbound ports on my local network. This increases the attack surface and security risks.

I want an architecture where:
- The central server (VPS) listens on a port
- A **local proxy** (in my homelab) collects data and **pushes** it to the server
- The connection is **initiated from inside** (no NAT port opening)

The proxy contacts the server, not the other way around. This way, no need for VPN or port forwarding.

### 3. Encrypted communication

Monitoring metrics can reveal sensitive information:
- How many servers I have
- Which services are running
- When I'm away (no activity)

I want communication between the proxy and server to be **end-to-end encrypted**, with a **Pre-Shared Key (PSK)** to prevent any interception or identity spoofing.

## Zabbix: the solution that checks all boxes

After evaluating several solutions (Prometheus + Grafana, Netdata, InfluxDB + Telegraf), I chose **Zabbix** for several reasons:

- **Native proxy architecture**: Zabbix was designed from the start to handle proxies that collect locally and send to the central server
- **Active/passive mode**: The proxy can push (active) or be queried (passive)
- **Integrated PSK encryption**: No need to add a VPN tunnel or reverse proxy
- **Proxmox VE template**: Native support for Proxmox REST API
- **Complete interface**: Dashboards, alerts, notifications, graphs... everything is included
- **Mature solution**: Used in enterprises for years, abundant documentation

### Final architecture

Here's what my setup looks like:

![Complete distributed Zabbix monitoring architecture](/img/blog/2025-12-26-monitoring-externe-zabbix/architecture-diagram.png)

### Data flow

1. **The Zabbix Proxy** (LXC on the cluster) collects data:
   - It queries Proxmox's REST API to retrieve cluster metrics
   - It monitors itself via the local agent (CPU, RAM, disk)
   - It can also collect data from other Zabbix agents on the network

2. **The Proxy pushes data** to the VPS server:
   - Outbound HTTPS connection (no inbound port opening)
   - TLS encryption with Pre-Shared Key (PSK)
   - "Active" mode: the proxy contacts the server, not the other way around

3. **The Zabbix Server** (VPS):
   - Receives and stores metrics in PostgreSQL
   - Triggers alerts if a threshold is exceeded
   - Exposes the web interface via Cloudflare Tunnel

## Implementation: from VPS to complete monitoring

### Step 1: Zabbix Server on VPS

I deployed Zabbix via Docker Compose on my VPS. Here's the `compose.yaml` file:

```yaml
services:
  zabbix-db:
    image: postgres:16-alpine
    container_name: zabbix-db
    restart: always
    volumes:
      - ./zbx_db_data:/var/lib/postgresql/data
    env_file: .env
    networks:
      - zabbix-tier

  zabbix-server:
    image: zabbix/zabbix-server-pgsql:7.0-alpine-latest
    container_name: zabbix-server
    restart: always
    depends_on:
      - zabbix-db
    env_file: .env
    ports:
      - "10051:10051"
    networks:
      - zabbix-tier
      - public-tier

  zabbix-web:
    image: zabbix/zabbix-web-nginx-pgsql:7.0-alpine-latest
    container_name: zabbix-web
    restart: always
    depends_on:
      - zabbix-db
      - zabbix-server
    env_file: .env
    networks:
      - zabbix-tier
      - public-tier

  tunnel:
    image: cloudflare/cloudflared:latest
    container_name: cloudflare-tunnel
    restart: always
    command: tunnel run
    env_file: .env
    networks:
      - public-tier

networks:
  zabbix-tier:
    internal: true
  public-tier:
    driver: bridge
```

And the corresponding `.env` file:

```bash
# --- Database Configuration ---
POSTGRES_USER=zabbix
POSTGRES_PASSWORD=REPLACEME
POSTGRES_DB=zabbix

# --- Zabbix Server Configuration ---
DB_SERVER_HOST=zabbix-db
ZBX_POSTGRES_USER=zabbix
ZBX_POSTGRES_PASSWORD=REPLACEME

# --- Zabbix Web Configuration ---
ZBX_DBHOST=zabbix-db
ZBX_SERVER_HOST=zabbix-server
PHP_TZ=Europe/Paris

# Cloudflare Key
TUNNEL_TOKEN="REPLACEME"
```

:::tip[Generating a strong password]
To generate a strong and secure password for your PostgreSQL database, you can use the following OpenSSL command:

```bash
openssl rand -base64 32
```

This command generates a random 32-byte string encoded in base64, producing an extremely robust ~44 character password. Then replace the `REPLACEME` values in the `.env` file with this generated password.
:::

**Important points**:
- The `zabbix-tier` network is **internal**: the database is not accessible from outside
- The Zabbix server exposes port **10051** to receive data from proxies
- The web interface is accessible only via **Cloudflare Tunnel** (no exposed public IP)

**Deployment**:

```bash
docker compose up -d
```

After a few seconds, the Zabbix interface is accessible. Default login: `Admin` / `zabbix` (change immediately!).

### Step 2: Zabbix Proxy in LXC

I created a Debian 13 LXC container on the Proxmox cluster to host the proxy.

**LXC configuration**:
- CPU: 1 vCore
- RAM: 512 MB
- Disk: 4 GB
- Static IP

**Complete installation**:

```bash
# Update
apt update && apt upgrade -y

# Add Zabbix 7.4 repository
wget https://repo.zabbix.com/zabbix/7.4/debian/pool/main/z/zabbix-release/zabbix-release_7.4-1+debian13_all.deb
dpkg -i zabbix-release_7.4-1+debian13_all.deb
apt update

# Install proxy and agent
apt install zabbix-proxy-sqlite3 zabbix-agent2 -y

# Create SQLite database
mkdir -p /var/lib/zabbix
chown zabbix:zabbix /var/lib/zabbix
zcat -f /usr/share/zabbix-proxy-sqlite3/schema.sql.gz | sqlite3 /var/lib/zabbix/zabbix_proxy.db
chown zabbix:zabbix /var/lib/zabbix/zabbix_proxy.db
chmod 660 /var/lib/zabbix/zabbix_proxy.db

# Generate PSK key
openssl rand -hex 32 | tee /etc/zabbix/zabbix_proxy.psk
chown zabbix:zabbix /etc/zabbix/zabbix_proxy.psk
chmod 600 /etc/zabbix/zabbix_proxy.psk

# Create log directory
mkdir -p /var/log/zabbix-proxy
chown zabbix:zabbix /var/log/zabbix-proxy
```

**Proxy configuration** (`/etc/zabbix/zabbix_proxy.conf`):

Essential parameters:

```ini
# VPS Zabbix server address
Server=<YOUR_VPS_IP>
ServerPort=10051

# Proxy name (must match server config)
Hostname=Proxy-Homelab

# SQLite database
DBName=/var/lib/zabbix/zabbix_proxy.db
DBUser=zabbix

# Files
LogFile=/var/log/zabbix-proxy/zabbix_proxy.log
PidFile=/run/zabbix/zabbix_proxy.pid

# LXC optimizations
ProxyBufferMode=hybrid
ProxyMemoryBufferSize=16M

# PSK security
TLSConnect=psk
TLSPSKIdentity=PSK-PROXY-HOME
TLSPSKFile=/etc/zabbix/zabbix_proxy.psk
```

**Agent configuration** (`/etc/zabbix/zabbix_agent2.conf`):

```ini
# Proxy is local
Server=127.0.0.1
ServerActive=127.0.0.1
Hostname=Proxy-Homelab

# Files
PidFile=/run/zabbix/zabbix_agent2.pid
LogFile=/var/log/zabbix/zabbix_agent2.log
ControlSocket=/run/zabbix/agent.sock
```

**Startup**:

```bash
systemctl enable zabbix-proxy zabbix-agent2
systemctl start zabbix-proxy zabbix-agent2
```

### Step 3: Proxy declaration on server

In the Zabbix interface, go to **Administration → Proxies** → **Create proxy**.

**Configuration**:
- **Proxy name**: `Proxy-Homelab` (identical to the `Hostname` in the config file)
- **Proxy mode**: `Active` (proxy contacts the server)
- **Proxy address**: leave empty

![Basic Zabbix proxy configuration](/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix-proxy/connect_proxy_to_vps.png)

**Encryption tab**:
- **Connection to proxy**: select `PSK`
- **Connections from proxy**: check `PSK`
- **PSK identity**: `PSK-PROXY-HOME`
- **PSK**: copy the content of `/etc/zabbix/zabbix_proxy.psk` from the LXC

![PSK encryption configuration for proxy](/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix-proxy/connect_proxy_to_vps_encryption.png)

After a few seconds, the proxy appears as **connected**. Magic happens!

### Step 4: Monitoring the proxy itself

The proxy is connected, but not yet monitored. I create a new host in Zabbix:

**Configuration → Hosts → Create host**:
- **Host name**: `Proxy-Homelab`
- **Groups**: `Linux servers`
- **Monitored by proxy**: `Proxy-Homelab`
- **Interface**: Agent → DNS `127.0.0.1` port `10050`
- **Templates**: link `Linux by Zabbix agent`

![Creating a host to monitor the proxy itself](/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix-proxy/host_creation.png)

A few minutes later, the first metrics arrive: CPU, RAM, disk, network... The proxy monitors itself!

### Step 5: Monitoring the Proxmox cluster

The final step: monitoring Proxmox via its REST API.

#### Creating user and token in Proxmox

**Datacenter → Permissions → Users → Add**:
- **User name**: `zabbix-monitor@pam`
- **Expire**: `never`
- **Enabled**: checked

![Creating Zabbix user in Proxmox](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/user_creation.png)

**Datacenter → Permissions → API Tokens → Add**:
- **User**: `zabbix-monitor@pam`
- **Token ID**: `zabbix`
- **Privilege Separation**: checked
- **Expire**: `never`

**Copy the Token Secret** (it won't be shown again).

![Creating API token for Zabbix](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/api_token.png)

#### Assigning permissions

**Datacenter → Permissions → Add → User permission**:

Two entries to create:

| Path | User/API Token | Role | Propagate |
|------|---------------|------|-----------|
| `/` | `zabbix-monitor@pam` | `PVEAuditor` | ✓ |
| `/` | `zabbix-monitor@pam!zabbix` | `PVEAuditor` | ✓ |

The **PVEAuditor** role allows read-only access to all metrics, without any modification rights.

![Assigning permissions to user](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/user_permission.png)

![Overview of permissions for user and API token](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/permissions_for_user_and_api.png)

#### Adding Proxmox host in Zabbix

**Configuration → Hosts → Create host**:
- **Host name**: `Proxmox-Cluster`
- **Groups**: `Hypervisors`
- **Monitored by proxy**: `Proxy-Homelab`
- **Templates**: link `Proxmox VE by HTTP`

![Using Proxmox VE template in Zabbix](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/vps_zabbix_use_proxmox_model_to_monitor.png)

**Macros tab**:

| Macro | Value |
|-------|--------|
| `{$PVE.URL.HOST}` | `192.168.100.10` (your Proxmox node IP) |
| `{$PVE.TOKEN.ID}` | `zabbix-monitor@pam!zabbix` |
| `{$PVE.TOKEN.SECRET}` | The token secret copied previously |

![Configuring macros for Proxmox authentication](/img/blog/2025-12-26-monitoring-externe-zabbix/proxmox/vps_zabbix_macros_to_change_proxmox_model.png)

**A few minutes later**: all Proxmox metrics arrive! CPU, RAM, storage, number of VMs, number of LXCs, cluster status...

## Result: monitoring that survives everything

I now have a resilient monitoring infrastructure:

- **Zabbix server runs on VPS**: even if my entire homelab burns down, monitoring stays active
- **Local proxy collects data**: it queries Proxmox, monitors itself, and pushes everything to the server
- **PSK encrypted connection**: impossible to intercept or spoof communications
- **No open ports**: proxy initiates outbound connection, no NAT opening needed
- **Accessible via Cloudflare Tunnel**: no exposed public IP, secure web interface access

### Concrete advantages

**Resilience**:
- If cluster goes down → VPS server alerts me immediately
- If VPS goes down → Proxy continues collecting and resends data when server returns
- If homelab network goes down → VPS server detects absence of data and alerts me

**Security**:
- No inbound ports open on homelab
- End-to-end TLS/PSK encryption
- Read-only access to Proxmox API (PVEAuditor)
- Web interface accessible only via Cloudflare Tunnel

**Simplicity**:
- Docker Compose installation for server (3 commands)
- Lightweight LXC installation for proxy
- Ready-to-use Proxmox template in Zabbix
- No VPN or complex network configuration

## Next steps

Now that monitoring is in place, I can:

- Configure **custom alerts** (CPU > 80%, RAM > 90%, etc.)
- Set up **notifications** (email, Telegram, Discord...)
- Add other **Zabbix agents** on my VMs and LXCs
- Create **custom dashboards** for an overview
- Monitor other services (databases, web servers, etc.)

If my cluster goes down, I now receive an immediate notification instead of discovering the problem several hours later.

## Conclusion

With this complementary architecture, I now benefit from the best of both worlds:

- **Beszel** for daily monitoring, simple and efficient, with real-time view of my VMs and LXCs
- **Zabbix** for global cluster monitoring, long-term history, and critical alerts that work even if my entire homelab goes down

This approach allows me to keep Beszel's simplicity for daily use while having offsite monitoring resilience for critical situations.

![Zabbix dashboard with monitoring overview](/img/blog/2025-12-26-monitoring-externe-zabbix/zabbix_dashboard.png)

If you have a homelab, setting up offsite monitoring can be a good solution to quickly detect problems, even in case of complete failure of your local infrastructure.

How do you manage monitoring of your infrastructure? Feel free to share your solutions in the comments!
