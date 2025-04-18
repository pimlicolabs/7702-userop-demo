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
import { bsc } from "viem/chains";
import { SignedAuthorization } from "viem";
import { toSimpleSmartAccount } from "permissionless/accounts";
import { createPimlicoClient } from "permissionless/clients/pimlico";
import { createSmartAccountClient, deepHexlify } from "permissionless";
import {
	entryPoint07Address,
	EstimateUserOperationGasReturnType,
	UserOperation,
} from "viem/account-abstraction";
import dotenv from "dotenv";

// Load environment variables from .env file
dotenv.config();
const chain = bsc;

if (!process.env.PIMLICO_API_KEY) {
	console.error("need env var PIMLICO_API_KEY");
	process.exit(1);
}

const PRIVATE_KEY = generatePrivateKey();

const pimlicoUrl = `https://api.pimlico.io/v2/${chain.id}/rpc?apikey=${process.env.PIMLICO_API_KEY}`;

const walletClient = createWalletClient({
	account: privateKeyToAccount(PRIVATE_KEY),
	chain,
	transport: http(),
});

const publicClient = createPublicClient({
	chain,
	transport: http(),
});

const pimlicoClient = createPimlicoClient({
	transport: http(pimlicoUrl),
});

type UserOperationWithEip7702Auth = UserOperation & {
	eip7702Auth: SignedAuthorization;
};
const main = async () => {
	// Source code at contracts/src/SimpleAccount7702.sol
	const SIMPLE_7702_ACCOUNT_IMPLEMENTATION =
		"0x0E2DAdd8081919CD0534c4144A74204f2dB229ec";

	console.log(`sender: ${privateKeyToAddress(PRIVATE_KEY)}`);

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
	let userOperation = {} as UserOperationWithEip7702Auth;
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
		eip7702Auth: {
			address: SIMPLE_7702_ACCOUNT_IMPLEMENTATION,
			chainId: chain.id,
			nonce: 0,
			r: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			s: "0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
			v: 1n,
			yParity: 1,
		},
	};

	// Fill out stub paymaster data.
	const stub = await pimlicoClient.getPaymasterStubData({
		...userOperation,
		chainId: chain.id,
		entryPointAddress: entryPoint07Address,
	});
	console.log("Retrieved paymaster stub data:", stub);

	userOperation = { ...userOperation, ...stub } as UserOperationWithEip7702Auth;

	// Estimate gas.
	const gasEstimates = (await smartAccountClient.request({
		method: "eth_estimateUserOperationGas",
		params: [deepHexlify({ ...userOperation }), entryPoint07Address],
	})) as EstimateUserOperationGasReturnType;
	console.log({ gasEstimates });

	userOperation = {
		...userOperation,
		...gasEstimates,
	} as UserOperationWithEip7702Auth;

	// Get sponsor fields.
	const sponsorFields = await pimlicoClient.getPaymasterData({
		...userOperation,
		chainId: chain.id,
		entryPointAddress: entryPoint07Address,
	});
	console.log("Retrieved sponsor fields:", sponsorFields);

	userOperation = {
		...userOperation,
		...sponsorFields,
	} as UserOperationWithEip7702Auth;

	const signedAuthorization = await walletClient.signAuthorization({
		contractAddress: SIMPLE_7702_ACCOUNT_IMPLEMENTATION,
	});

	console.log("Signed authorization:", signedAuthorization);

	// Sign and send user operation.
	userOperation.signature = await smartAccount.signUserOperation(userOperation);
	const userOperationHash = (await smartAccountClient.request({
		method: "eth_sendUserOperation",
		params: [
			deepHexlify({ ...userOperation, eip7702Auth: signedAuthorization }),
			entryPoint07Address,
		],
	})) as Hex;
	console.log("User operation hash:", userOperationHash);

	const { receipt } = await smartAccountClient.waitForUserOperationReceipt({
		hash: userOperationHash,
	});
	console.log("User operation receipt:", receipt);

	console.log(
		`UserOperation included: https://bscscan.com/tx/${receipt.transactionHash}`,
	);
};

main();
