# 7702 Bundler Demo

This demo showcases how to utilize EIP-7702 to sponsor a userOperation originating from a EOA by using the `pimlico_experimental_estimateUserOperationGas7702` and `pimlico_experimental_sendUserOperation7702` endpoints.

This demo is ran on the Odyssey Testnet and uses a modified version of ETH-Infinitism's Simple Account to accommodate for EIP-7702. Instead of using a storage slot to hold the account signer/owner, the signer/owner is set to address(this).

## Running

```bash
export PIMLICO_API_KEY=pim_xxxxxxxxxxxxxxxxxxxxxx

pnpm install

pnpm run start
```

### RPC Schemas

#### pimlico_experimental_estimateUserOperationGas7702
```
{
  "jsonrpc": "2.0",
  "method": "pimlico_experimental_estimateUserOperationGas7702",
  "params": [
    userOperation,
    entryPoint,
    signedAuthorization,
    stateOverrides
  ],
  "id": 1
}
```

#### pimlico_experimental_sendUserOperation7702
```
{
  "jsonrpc": "2.0",
  "method": "pimlico_experimental_sendUserOperation7702",
  "params": [
    userOperation,
    entryPoint,
    signedAuthorization
  ],
  "id": 1
}
```
