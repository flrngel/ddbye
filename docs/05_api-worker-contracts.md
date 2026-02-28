# API and worker contracts

This is intentionally a contract-only document.

## Request lifecycle

States:

- queued
- parsing
- resolving
- researching
- synthesizing
- drafting
- ready
- failed

The frontend prototype compresses these into a simpler running/ready UI, but the production worker should keep the more detailed state model.

## API surface

### POST /requests

Create a new diligence request.

Payload:

```json
{
  "targetBrief": "PG, famous for YC — want to explore doing business with Hacker News...",
  "objective": "Find a business angle with Hacker News",
  "offer": "We build hosted search...",
  "preferredChannel": "email",
  "tone": "respectful",
  "goalType": "sell",
  "focuses": ["person_background", "service_surface", "objections"]
}
```

Response:

```json
{
  "id": "req_123",
  "status": "queued",
  "createdAt": "2026-02-28T00:00:00.000Z"
}
```

### GET /requests

Return request summaries for the left rail.

### GET /requests/:id

Return the full request:

- intake
- run status
- research packet
- outreach packet

### POST /requests/:id/redraft

Optional future endpoint.

Use this only when the user changes tone or channel after the first result exists.

## Worker event model

The frontend should subscribe to worker progress events.

### Example SSE events

- `request.parsing`
- `request.resolved`
- `request.researching`
- `request.synthesized`
- `request.drafted`
- `request.ready`
- `request.failed`

## Data ownership

### API owns

- request persistence
- worker dispatch
- fetch for UI

### Worker owns

- Claude Agent SDK execution
- web research
- structured packet generation
- quality gate

### Frontend owns

- intake UX
- run visibility
- research rendering
- outreach rendering
- copy/export interaction
