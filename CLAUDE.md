# Souple System

A multi-sided transportation platform for intercity buses, vehicle rentals, and cargo delivery — built for DRC and similar markets.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | AdonisJS 6, Node.js 20+, MySQL 8, Redis 7, BullMQ |
| **Frontend** | Next.js 15, React 18+, Tailwind CSS v4, Radix UI Themes |
| **State** | Zustand (client), @tanstack/react-query (server) |
| **i18n** | next-intl — FR, EN, LN (Lingala), SW (Swahili) |
| **Storage** | S3 / MinIO |
| **Infra** | Docker Compose, Nginx, Certbot, GitHub Actions CI/CD |
| **Monitoring** | Prometheus, Grafana, Sentry |

## Project Structure

```
souple-system/
├── skills/           # 25 skill specifications (01-25)
├── team/             # AI agent persona definitions
│   ├── pm.md         # Aïcha — Project Manager
│   ├── dev.md        # Kael — Senior Full-Stack Developer
│   ├── design.md     # Mila — Senior UI/UX Designer
│   └── qa.md         # Zane — QA & Security Tester
├── PROGRESS.md       # Project checklist & build status
└── CLAUDE.md         # This file
```

## AI Agent Team

This project uses four specialized AI agent personas to provide expert feedback from different perspectives. Invoke them by asking Claude to respond **as** that role.

| Persona | Name | Invoke with | Focus |
|---------|------|-------------|-------|
| Project Manager | **Aïcha** | "as PM" | Scope, priorities, blockers, sprint planning |
| Senior Developer | **Kael** | "as Dev" | Architecture, code quality, performance, edge cases |
| UI/UX Designer | **Mila** | "as Designer" | Visual hierarchy, accessibility, Apple-tier polish |
| QA & Security | **Zane** | "as QA" | OWASP Top 10, test coverage, penetration testing |

### How to Use

- **Single perspective**: "As PM, what should I build next?"
- **Code review**: "As Dev, review this controller"
- **Design audit**: "As Designer, evaluate this component"
- **Security check**: "As QA, audit this endpoint"
- **Multi-perspective**: "As PM and Dev, assess Skill 04 readiness"

Full persona specs are in the `team/` folder. Read the relevant file before responding as that persona.

## Key Conventions

### Architecture Principles
- **Segment-based everything** — Pricing, availability, bookings, capacity are per route segment, not global
- **DRC-first** — 70% of users are on feature phones; USSD/SMS channels are first-class citizens
- **Offline-first ticketing** — Ticketers must work offline with reliable sync
- **Role-based UI density** — Passengers see spacious UIs, operators see data-dense dashboards
- **AI assists, humans decide** — AI handles first-line support and suggestions; humans make final calls

### Coding Standards
- TypeScript strict mode everywhere
- AdonisJS conventions for backend (controllers, services, validators, models)
- Next.js App Router conventions for frontend
- All dates stored in UTC, displayed in user's local timezone via Luxon
- API responses follow a standardized envelope format
- Multi-language strings via next-intl (FR as default, EN, LN, SW)
- CDF + USD dual-currency support throughout

### Database
- MySQL 8 with proper indexing on all foreign keys and frequently queried columns
- Soft deletes where appropriate
- Audit logging on sensitive operations
- Exchange rates locked at transaction time

### Security
- OTP-based authentication (no passwords)
- RBAC middleware on all routes
- Rate limiting on public endpoints
- Shield security headers
- Input validation on every endpoint

## Project Status

See `PROGRESS.md` for the full build checklist with task-level tracking across all 25 skills.
