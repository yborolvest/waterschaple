# Coolify deploy / NL-EN

## Belangrijk: je app draait al

Als de logs tonen:

```
[@astrojs/node] Server listening on
  network: http://172.x.x.x:4321
```

…dan start Node goed. Een **404 komt dan bijna altijd van de proxy** (verkeerde poort of static/Nginx-modus), niet van Astro.

## Stappen (Nixpacks)

1. **Is it a static site?** → **UIT** (geen publish directory invullen)
2. **Is it a SPA?** → **UIT**
3. **Ports Exposes** → `4321` (exact hetzelfde als in de logs)
4. **Build Pack** → Nixpacks
5. **Start command** → leeg laten (`node ./scripts/start-production.mjs` via `nixpacks.toml`)
6. **Save** en **Redeploy** (Coolify slaat niet altijd automatisch op)

`nixpacks.toml` bevat `providers = ["node"]` zodat Nixpacks **geen** Caddy/Nginx voor Vite/Astro toevoegt.

## Alternatief: Dockerfile (aanbevolen bij aanhoudende 404)

1. **Build Pack** → **Dockerfile**
2. **Ports Exposes** → `4321`
3. Static site → **UIT**
4. Redeploy

## Diagnose 404

| Symptoom | Oorzaak | Oplossing |
|----------|---------|-----------|
| Response header `nginx` | Static site modus | Static + SPA uit |
| App op `4321`, Coolify op `3000`/`80` | Poort mismatch | Zet **Ports Exposes** op `4321` |
| Alleen `/` 404, logs OK | Proxy wijst niet naar container | Controleer domain + redeploy |
| `network: …:4321` in logs | Node OK | Fix Coolify network settings |

## Health check

- URL: `/api/health`
- Verwacht: `{"ok":true}`

Test **binnen het Coolify-netwerk** of via het publieke domein na deploy.

## Omgevingsvariabelen

| Variabele | Doel |
|-----------|------|
| `PORT` | Moet gelijk zijn aan **Ports Exposes** (default `4321`) |
| `HOST` | `0.0.0.0` (staat in `nixpacks.toml` / Dockerfile) |
| `UPSTASH_REDIS_REST_URL` | Solve-teller (productie) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token |
| `NS_API_SUBSCRIPTION_KEY` | Overstaple NS-routes |

## Logs na deploy

```
[rijkdle] Starting SSR server on 0.0.0.0:4321
[@astrojs/node] Server listening on
  network: http://172.x.x.x:4321
```

Als `PORT` in de eerste regel niet overeenkomt met **Ports Exposes**, pas Coolify aan.

---

Your Digital Agency
