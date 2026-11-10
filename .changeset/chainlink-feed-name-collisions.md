---
"@aave-dao/toolbox": minor
---

Makes chainlink feed names unique per chain. SVR feeds are now classified by upstream's `svrDisplayLabel` instead of the feed path, so Compound's SVR feeds no longer overwrite the shared ones they share a name with; they are dropped from the generated data. Feeds that upstream publishes as variants of another feed (`-cre-backup`, `-fx`, `-2`, ...) take the part of their path the collision does not share as a name qualifier, leaving the plain name on the feed they vary. Generation throws if any name still collides. Each feed also carries its upstream `path` and `svrDisplayLabel`.
