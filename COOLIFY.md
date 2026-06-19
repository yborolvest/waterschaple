# Coolify deploy / NL-EN

## Domein: https://rijkdle.nl

De publieke 404 (`404 page not found`, 19 bytes) komt van **Traefik**, niet van Astro.
De health check slaagt in de container; Traefik routeert verkeer niet naar de juiste poort.

### Verplichte Coolify-instellingen

1. **Build Pack** → Dockerfile (of Nixpacks)
2. **Is it a static site?** → **UIT**
3. **Is it a SPA?** → **UIT**
4. **Ports Exposes** → **`80`** (moet gelijk zijn aan `PORT` in de container)
5. **Domains** → `https://rijkdle.nl`  
   - Als 404 blijft: probeer tijdelijk `https://rijkdle.nl:80` en **Save + Redeploy**  
   - (Coolify zet dan het Traefik `loadbalancer.server.port`-label)
6. **Health check port** → **`80`**, path `/api/health`
7. Na elke wijziging: **Save** → **Redeploy**

### Cloudflare

DNS mag via Cloudflare (oranje wolk). Origin moet naar je Coolify-server wijzen.
Traefik op Coolify regelt SSL; gebruik in Cloudflare meestal **Full** of **Full (strict)**.

## Diagnose

| Response | Betekenis |
|----------|-----------|
| `404 page not found` (19 bytes, `text/plain`) | Traefik heeft geen route / verkeerde poort |
| `nginx` in headers | Static site modus nog aan |
| App-HTML van Rijkdle | Werkt |

## Logs (OK)

```
[rijkdle] Starting SSR server on 0.0.0.0:80
[@astrojs/node] Server listening on
  network: http://172.x.x.x:80
```

## Omgevingsvariabelen

| Variabele | Doel |
|-----------|------|
| `PORT` | `80` (zelfde als Ports Exposes) |
| `HOST` | `0.0.0.0` |
| `UPSTASH_REDIS_REST_URL` | Solve-teller |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token |
| `NS_API_SUBSCRIPTION_KEY` | Overstaple NS-routes |

---

Your Digital Agency
