# Coolify deploy / NL-EN

## Symptoom: 404 page not found (19 bytes)

Dit is **Traefik** op je Coolify-server, niet Astro. De app draait in de container, maar Traefik heeft **geen route** naar `rijkdle.nl`.

Cloudflare (oranje wolk) is OK; DNS wijst naar Cloudflare → origin → Traefik.

---

## Oplossing (aanbevolen): Docker Compose build pack

Dockerfile- en Nixpacks-deploys missen soms het Traefik `loadbalancer.server.port`-label. Gebruik daarom **`docker-compose.yaml`** uit deze repo.

### Stap voor stap

1. **Verwijder** het oude Coolify-resource of maak een **nieuwe** application aan (zelfde repo).
2. **Build Pack** → **Docker Compose**
3. Compose file → `docker-compose.yaml` (standaard)
4. **Is it a static site?** → **UIT**
5. **Is it a SPA?** → **UIT**
6. **Make it publicly available** → **AAN** (belangrijk!)
7. **Domains** → exact:
   ```
   https://rijkdle.nl:3000
   ```
   De `:3000` is verplicht, Coolify zet daarmee de Traefik backend-poort.
8. **Ports Exposes** → `3000`
9. **Health check** → port `3000`, path `/api/health`
10. **Save** → **Redeploy**

### Controleren of het werkt

```bash
curl -I https://rijkdle.nl/
# Verwacht: geen "404 page not found" van Traefik

curl https://rijkdle.nl/api/health
# Verwacht: {"ok":true,"service":"rijkdle"}
# Header: X-Rijkdle: ok
```

Zie je nog steeds `404 page not found` (19 bytes)? → Traefik-route ontbreekt nog. Controleer domein + redeploy.

Zie je `502` / `503` / `no available server`? → Container bereikbaar maar ongezond of verkeerde poort.

---

## Alternatief: Dockerfile / Nixpacks

Alleen als Docker Compose niet kan:

| Veld | Waarde |
|------|--------|
| Build Pack | Dockerfile of Nixpacks |
| Ports Exposes | `3000` |
| Domains | `https://rijkdle.nl:3000` |
| Static site / SPA | UIT |
| Publicly available | AAN |

---

## Cloudflare SSL

| Cloudflare | Coolify |
|------------|---------|
| SSL/TLS mode → **Full** of **Full (strict)** | HTTPS aan op domein |

**Niet** "Flexible": dat breekt HTTPS naar Traefik.

---

## Health check faalt → site offline

Traefik routeert **niet** naar unhealthy containers (lijkt soms op 404).

- Test: health check **tijdelijk uitzetten** → redeploy → werkt de site dan?
- Logs: `[rijkdle] Starting SSR server on 0.0.0.0:3000`
- In container: `curl http://127.0.0.1:3000/api/health`

---

## Omgevingsvariabelen

| Variabele | Doel |
|-----------|------|
| `PORT` | `3000` |
| `HOST` | `0.0.0.0` |
| `UPSTASH_REDIS_REST_URL` | Solve-teller |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token |
| `NS_API_SUBSCRIPTION_KEY` | Overstaple NS-routes |

---

Your Digital Agency
