Cloudflared systemd service (example)

Steps to install

1) Copy the example unit to systemd and edit the token

```bash
sudo cp ops/cloudflared.service /etc/systemd/system/cloudflared.service
sudo nano /etc/systemd/system/cloudflared.service
```

Replace the placeholder value for CF_TUNNEL_TOKEN with your token.

2) Reload systemd and enable the service

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now cloudflared.service
```

3) Check status and follow logs

```bash
sudo systemctl status cloudflared.service
sudo journalctl -u cloudflared -f
```

Alternative: manage the container with Docker restart policy (no systemd unit)

```bash
sudo docker rm -f cloudflared-tunnel || true
sudo docker run -d --name cloudflared-tunnel --network host --restart unless-stopped cloudflare/cloudflared:latest tunnel --no-autoupdate run --token REPLACE_WITH_YOUR_TOKEN
```

Note: If you use Docker's restart policy, do not use `--rm`.
