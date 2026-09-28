---
"@aave-dao/toolbox": patch
---

`getQuicknodeRpc` and `getRPCUrl` resolve Arc mainnet (5042) via the `arc-mainnet` Quicknode slug, which the generated chains map doesn't include yet.
