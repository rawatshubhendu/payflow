# Architecture

Internet → Next.js (`apps/web`) → Express (`apps/api`) → MongoDB Atlas → payment gateway (later) → verified webhook → API → email (later)

A **business** is the tenant boundary. MVP: one primary business per user.

API responses:

```json
{ "data": {}, "error": null, "meta": null }
```

Errors:

```json
{ "data": null, "error": { "code": "STRING", "message": "human" }, "meta": null }
```

Do not leak stack traces to clients.
