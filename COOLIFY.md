# Coolify deploy / NL-EN

## Snelle checklist

1. **Build pack:** Nixpacks (niet Dockerfile, tenzij je die zelf beheert)
2. **Is it a static site?** → **UIT** (SSR, geen static hosting)
3. **Ports Exposes:** `4321` (moet overeenkomen met waar de app luistert)
4. **Start command:** leeg laten (gebruikt `npm run start` uit `nixpacks.toml`)  
   of expliciet: `HOST=0.0.0.0 node ./dist/server/entry.mjs`
5. **Redeploy** na config-wijzigingen (Coolify slaat niet altijd automatisch op)

## Veelvoorkomende 404

| Oorzaak | Oplossing |
|---------|-----------|
| Static site aan | Zet **Is it a static site?** uit — anders serveert Nginx alleen `dist/` als static files |
| Verkeerde poort | Zet **Ports Exposes** op `4321` |
| App op localhost | Gebruik `server.host: true` in `astro.config.mjs` + `HOST=0.0.0.0` bij start (staat in repo) |
| Oude image | Force redeploy na wijzigingen |

## Omgevingsvariabelen (optioneel)

| Variabele | Doel |
|-----------|------|
| `UPSTASH_REDIS_REST_URL` | Globale solve-teller (productie) |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash token |
| `NS_API_SUBSCRIPTION_KEY` | Overstaple NS-routes |
| `PORT` | Wordt door Coolify gezet; fallback `4321` |

## Logs controleren

In Coolify → **Logs**: na start zou je iets moeten zien als:

```
Server listening on http://0.0.0.0:4321
```

Als je `localhost` ziet, bereikt de proxy de container niet.

---

Your Digital Agency
