import {
	createPublicClient,
	createWalletClient,
	Hex,
	http,
	zeroAddress,
} from "viem";
import {
	generatePrivateKey,
	privateKeyToAccount,
	privateKeyToAddress,
} from "viem/accounts";
import { odysseyTestnet } from "viem/chains";
import { eip7702Actions } from "viem/experimental";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createSmartAccountClient, deepHexlify } from "permissionless";
import {
	entryPoint07Address,
	EstimateUserOperationGasReturnType,
	UserOperation,
} from "viem/account-abstraction";

if (!process.env.PIMLICO_API_KEY) {
	console.error("need env var PIMLICO_API_KEY");
	process.exit(1);
}

const PRIVATE_KEY = generatePrivateKey();

//const pimlicoUrl = `https://api.pimlico.io/v2/${odysseyTestnet.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;
const pimlicoUrl = `http://0.0.0.0:8080/v2/${odysseyTestnet.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;

const walletClient = createWalletClient({
	account: privateKeyToAccount(PRIVATE_KEY),
	chain: odysseyTestnet,
	transport: http(),
}).extend(eip7702Actions());

const publicClient = createPublicClient({
	chain: odysseyTestnet,
	transport: http(),
});

const pimlicoClient = createPimlicoClient({
	transport: http(pimlicoUrl),
});

const main = async () => {
	// Source code in contracts/src/SimpleAccount7702.sol
	const SIMPLE_7702_ACCOUNT_IMPLEMENTATION =
		"0x2A7Df271B4B48753EDd983ba163cB22374C7Bc89";

	console.log(`sender: ${privateKeyToAddress(PRIVATE_KEY)}`);

	const signedAuthorization = await walletClient.signAuthorization({
		contractAddress: SIMPLE_7702_ACCOUNT_IMPLEMENTATION,
		delegate: true, // We need to explicitly specify this to allow anyone to sponsor the type 4 transaction.
	});
	console.log("Signed authorization:", signedAuthorization);

	const smartAccount = await toSimpleSmartAccount({
		address: walletClient.account.address,
		client: publicClient,
		owner: walletClient.account,
	});

	const smartAccountClient = createSmartAccountClient({
		account: smartAccount,
		bundlerTransport: http(pimlicoUrl),
	});

	// Fill out initial values.
	let userOperation = {} as UserOperation;
	userOperation.sender = walletClient.account.address;
	userOperation.nonce = await smartAccount.getNonce();
	userOperation.callData = await smartAccount.encodeCalls([
		{ to: zeroAddress, value: 0n, data: "0x" },
	]);
	userOperation.signature = await smartAccount.getStubSignature(userOperation);

	// Fill out gasPrices.
	const gasInfo = (await pimlicoClient.getUserOperationGasPrice()).fast;
	console.log("Retrieved gas price info:", gasInfo);

	userOperation = {
		...userOperation,
		...gasInfo,
	};

	// Fill out stub paymaster data.
	const stub = await pimlicoClient.getPaymasterData({
		...userOperation,
		chainId: odysseyTestnet.id,
		entryPointAddress: entryPoint07Address,
	});
	console.log("Retrieved paymaster stub data:", stub);

	userOperation = { ...userOperation, ...stub } as UserOperation;

	// Estimate gas.
	const gasEstimates = (await smartAccountClient.request({
		// @ts-ignore
		method: "pimlico_experimental_estimateUserOperationGas7702",
		params: [
			deepHexlify({ ...userOperation, eip7702Auth: signedAuthorization }),
			// @ts-ignore
			entryPoint07Address,
		],
	})) as EstimateUserOperationGasReturnType;
	console.log({ gasEstimates });

	userOperation = { ...userOperation, ...gasEstimates } as UserOperation;

	// Get sponsor fields.
	const sponsorFields = await pimlicoClient.getPaymasterData({
		...userOperation,
		chainId: odysseyTestnet.id,
		entryPointAddress: entryPoint07Address,
	});
	console.log("Retrieved sponsor fields:", sponsorFields);

	userOperation = { ...userOperation, ...sponsorFields } as UserOperation;

	// Sign and send user operation.
	userOperation.signature = await smartAccount.signUserOperation(userOperation);
	const userOperationHash = (await smartAccountClient.request({
		// @ts-ignore
		method: "pimlico_experimental_sendUserOperation7702",
		// @ts-ignore
		params: [
			deepHexlify({ ...userOperation, eip7702Auth: signedAuthorization }),
			// @ts-ignore
			entryPoint07Address,
		],
	})) as Hex;
	console.log("User operation hash:", userOperationHash);

	const { receipt } = await smartAccountClient.waitForUserOperationReceipt({
		hash: userOperationHash,
	});
	console.log("User operation receipt:", receipt);

	console.log(
		`UserOperation included: https://odyssey-explorer.ithaca.xyz/tx/${receipt.transactionHash}`,
	);
};

main();
