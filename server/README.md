# Server placeholder

No backend code is intentionally included in this package.

This directory exists only to make the future boundary explicit.

The future server should:

- accept request creation
- persist request objects
- dispatch worker jobs
- expose request status and results to the frontend
- stream worker progress events

See `docs/05_api-worker-contracts.md` for the contract.
