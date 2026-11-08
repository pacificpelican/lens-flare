# Architecture Decisions - Lens Flare Photo Archiver

## ADR-001: Database Abstraction Layer

**Decision:** Implement a unified `IDatabase` interface that supports both SQLite and MySQL through different driver implementations.

**Rationale:**
- Allows zero-config local development with SQLite
- Seamless production deployment with MySQL
- Shared schema and query interface across both implementations
- Type-safe queries with TypeScript
- Supports migration from local to production without code changes

**Implementation:**
- `SqliteDatabase` class wraps sqlite3 callbacks in Promises
- `MysqlDatabase` class wraps mysql2/promise connection pool
- Both implement identical `query<T>()`, `run()`, and `transaction<T>()` methods
- Factory function `createDatabase()` selects implementation based on config

---

## ADR-002: Authentication Strategy

**Decision:** JWT-based access tokens with refresh tokens in httpOnly cookies.

**Rationale:**
- Access tokens (15min): Short-lived, sent in `Authorization: Bearer` header
- Refresh tokens (7d): Long-lived, httpOnly cookies (CSRF-resistant, XSS-safe)
- Stateless API design: No session server needed, scales horizontally
- Works for SPA + Electron deployment
- "Remember me" via persistent refresh tokens
- Automatic silent refresh when access token expires

**Flow:**
1. User registers/logs in → Server issues access token + stores refresh token in DB
2. Frontend sends access token in Authorization header for API calls
3. Token expires → Frontend uses refresh token to get new access token
4. Logout → Server revokes all refresh tokens for user

**Security:**
- Passwords hashed with bcryptjs (10 rounds)
- JWT signed with separate secret
- Refresh tokens also signed and stored in DB for validation

---

## ADR-003: Monorepo Structure

**Decision:** Single repository with separate `src/backend`, `src/frontend`, and `src/shared` folders.

**Rationale:**
- Shared type definitions between frontend and backend
- Single `package.json` for synchronized dependencies
- Unified build and development tooling
- Easy to deploy both services together or separately
- Electron packaging easier with single repo

**Tooling:**
- TypeScript project references for separate compilation
- Vite for frontend dev/build with proxy to backend
- ts-node for backend development

---

## ADR-004: Configuration Management

**Decision:** Environment variables via `.env` file, parsed by `config.ts`.

**Rationale:**
- Follows 12-factor app principles
- Same code runs locally, in Docker, and in production
- Database, AI, and server settings configurable without code changes
- Template provided in `.env.example`

**Key Variables:**
- `DATABASE_TYPE`: `sqlite` or `mysql`
- `AI_PROVIDER`: `ollama`, `openai`, `anthropic`
- `NODE_ENV`: Development/Production mode selection

---

## ADR-005: Frontend Framework & Styling

**Decision:** React 18 + TypeScript + Vite + Tailwind CSS.

**Rationale:**
- React: Familiar, component-based, large ecosystem
- Vite: Fast dev experience, optimized builds
- TypeScript: Type safety, better IDE support
- Tailwind: Utility-first CSS, design tokens configuration
- Custom CSS for design system specifics (translucency, sharp corners, purple accents)

**Design System:**
- CSS variables in `index.css` for theming
- Tailwind config extended with custom colors/spacing
- Consistent with UI requirements (light grays, sharp corners, glassy borders)

---

## ADR-006: API Design

**Decision:** RESTful JSON API with Bearer token authentication.

**Rationale:**
- Simple, stateless, cacheable
- Standard HTTP verbs and status codes
- JWT Bearer token in `Authorization` header
- Consistent request/response structure

**Response Format:**
```json
{
  "success": true,
  "data": { /* response payload */ },
  "error": null,
  "message": null
}
```

**Error Handling:**
- 4xx for client errors (validation, auth, not found)
- 5xx for server errors
- Error messages in `error` field

---

## Next Decisions (Coming)

**ADR-007:** Photo Storage & File Organization
**ADR-008:** AI Description Integration  
**ADR-009:** Image Processing Pipeline
**ADR-010:** Caching Strategy

---

## Future Considerations

- **Electron Packaging:** Backend can be bundled with Electron for desktop app
- **Docker Deployment:** Single Dockerfile for full stack
- **Horizontal Scaling:** Stateless API design supports load balancing
- **Database Sharding:** Schema designed for future partitioning by user
