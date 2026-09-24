---
"@aave-dao/toolbox": minor
"@aave-dao/cli": patch
---

use viem's `arc` chain (public rpcs, explorer api, multicall3) and read arc-mainnet from the generated alchemy map. viem peer range is now ^2.56.6. `tenderly_createVnet` has an explicit return type (`Tenderly_createVnetResponse`) so the dts builds on viem 2.56.
