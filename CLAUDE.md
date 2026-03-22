# propertyhub-inspection-service

Node.js 22 / Express 4 microservice managing property inspections.

## Run locally
```bash
npm install
npm start
# or
docker build -t propertyhub-inspection-service .
docker run -p 3000:3000 propertyhub-inspection-service
```

## Security model
Trusts `X-User-Id` and `X-User-Role` headers injected by the gateway. No JWT validation.

## Endpoints
| Method | Path | Roles |
|--------|------|-------|
| GET | /health | Anonymous |
| GET | /inspections | Any authenticated |
| GET | /inspections/:id | Inspector assigned, requester, or Admin |
| POST | /inspections | Landlord or Admin |
| PATCH | /inspections/:id | Inspector (assigned) or Admin |
| PATCH | /inspections/:id/status | Inspector (assigned) or Admin |
| DELETE | /inspections/:id | Admin |

## Storage
In-memory `Map` — data is lost on restart.
