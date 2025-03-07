# 7702 Bundler Demo

This demo showcases how to utilize EIP-7702 to sponsor a userOperation
originating from a EOA by using the `eth_estimateUserOperationGas` and
`eth_sendUserOperation` endpoints.

This demo is ran on the Odyssey Testnet and uses a modified version of
ETH-Infinitism's Simple Account to accommodate for EIP-7702. Instead of using a
storage slot to hold the account signer/owner, the signer/owner is set to
address(this).

## Warning

THIS IS A EXPERIMENTAL ENDPOINT AND SUBJECT TO CHANGE WITHOUT NOTICE.

## Running

```bash
export PIMLICO_API_KEY=pim_xxxxxxxxxxxxxxxxxxxxxx

pnpm install

pnpm run start
```

### RPC Schemas

#### eth_estimateUserOperationGas

```
{
  "jsonrpc": "2.0",
  "method": "eth_estimateUserOperationGas",
  "params": [
    {
      "sender",
      "nonce",
      "factory",
      "factoryData",
      "callData",
      "callGasLimit",
      "verificationGasLimit",
      "preVerificationGas",
      "maxPriorityFeePerGas",
      "maxFeePerGas",
      "paymaster",
      "paymasterVerificationGasLimit",
      "paymasterPostOpGasLimit",
      "paymasterData",
      "signature",
      "eip7702auth": {
          contractAddress: '0x2A7Df271B4B48753EDd983ba163cB22374C7Bc89',
          chainId: '0xde9fb',
          nonce: '0x',
          r: '0xfb7daf8631a9a713b4d0d3255b2ee2ebfd7019435d156db7906a5d3ec33c566e',
          s: '0x77874c6e19382a1a48b433f9dad5ac617dd18fd600de4053f979904694a5a138',
          v: '0x1b',
          yParity: '0x'
      }
    },
    entryPoint,
    stateOverrides
  ],
  "id": 1
}
```

#### eth_sendUserOperation

```
{
  "jsonrpc": "2.0",
  "method": "eth_sendUserOperation",
  "params": [
    {
      "sender",
      "nonce",
      "factory",
      "factoryData",
      "callData",
      "callGasLimit",
      "verificationGasLimit",
      "preVerificationGas",
      "maxPriorityFeePerGas",
      "maxFeePerGas",
      "paymaster",
      "paymasterVerificationGasLimit",
      "paymasterPostOpGasLimit",
      "paymasterData",
      "signature",
      "eip7702auth": {
          contractAddress: '0x2A7Df271B4B48753EDd983ba163cB22374C7Bc89',
          chainId: '0xde9fb',
          nonce: '0x',
          r: '0xfb7daf8631a9a713b4d0d3255b2ee2ebfd7019435d156db7906a5d3ec33c566e',
          s: '0x77874c6e19382a1a48b433f9dad5ac617dd18fd600de4053f979904694a5a138',
          v: '0x1b',
          yParity: '0x'
      }
    },
    entryPoint
  ],
  "id": 1
}
```
