"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import type { ThirdwebContract } from "thirdweb";
import {
	ClaimButton,
	ConnectButton,
	useActiveAccount,
	MediaRenderer,
	darkTheme,
	TransactionButton,
} from "thirdweb/react";
import { claimTo } from "thirdweb/extensions/erc1155";
import { createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdwebClient";
import { toast } from "sonner";
import { getNFT as getERC721NFT, totalSupply as getERC721TotalSupply } from "thirdweb/extensions/erc721";
import { getNFT as getERC1155NFT, totalSupply as getERC1155TotalSupply, getClaimConditions } from "thirdweb/extensions/erc1155";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";
import { getContract } from "thirdweb";
import { defaultTokenId, defaultChain } from "@/lib/constants";

type Props = {
	contract: ThirdwebContract;
	displayName: string;
	description: string;
	contractImage: string;
	pricePerToken: number | null;
	currencySymbol: string | null;
};

// Create wallets for the custom ConnectButton
const wallets = [
	createWallet("io.metamask"),
	createWallet("com.coinbase.wallet"),
	createWallet("me.rainbow"),
	createWallet("io.rabby"),
	createWallet("io.zerion.wallet"),
];

export function MinimalNftMint(props: Props) {
	const account = useActiveAccount();
	const [nextTokenId, setNextTokenId] = useState<bigint>(0n);
	const [nextNftData, setNextNftData] = useState<any>(null);
	const [loading, setLoading] = useState(true);
	const [imageError, setImageError] = useState(false);
	const [currentPrice, setCurrentPrice] = useState<number>(0);
	const [currentCurrency, setCurrentCurrency] = useState<string>("USDC");
	const [totalSupply, setTotalSupply] = useState<number>(10000); // Default to 10,000

	// Function to fetch pricing for a specific token ID
	const fetchTokenPricing = async (tokenId: bigint) => {
		try {
			console.log("🔍 Fetching pricing for token ID:", tokenId.toString());
			
			const tokenClaimConditions = await getClaimConditions({ 
				contract: props.contract, 
				tokenId: tokenId 
			});
			
			console.log("Claim conditions for token", tokenId.toString(), "count:", tokenClaimConditions?.length || 0);
			
			if (tokenClaimConditions && tokenClaimConditions.length > 0) {
				const tokenCondition = tokenClaimConditions[0];
				
				console.log("Token", tokenId.toString(), "claim condition:", {
					pricePerToken: tokenCondition.pricePerToken?.toString(),
					currency: tokenCondition.currency,
					maxClaimableSupply: tokenCondition.maxClaimableSupply?.toString()
				});
				
				let price = 0;
				let currency = "USDC";
				
				if (tokenCondition.currency === "0x0000000000000000000000000000000000000000") {
					// ETH payment - convert from wei to ETH
					price = Number(tokenCondition.pricePerToken) / 1e18;
					currency = "ETH";
					console.log("Using token-specific ETH pricing:", price, "ETH");
				} else {
					// ERC20 token - assume USDC (6 decimals)
					price = Number(tokenCondition.pricePerToken) / 1e6;
					currency = "USDC";
					console.log("✅ DYNAMIC PRICING: Using token-specific USDC pricing:", price, "USDC");
				}
				
				// Verify currency metadata
				if (tokenCondition.currency && tokenCondition.currency !== "0x0000000000000000000000000000000000000000") {
					try {
						const currencyMetadata = await getCurrencyMetadata({
							contract: getContract({
								address: tokenCondition.currency,
								chain: defaultChain,
								client,
							}),
						});

						if (currencyMetadata) {
							currency = currencyMetadata.symbol;
							console.log("Currency confirmed for token", tokenId.toString(), ":", currency);
						}
					} catch (error) {
						console.log("Could not fetch currency metadata for token", tokenId.toString(), ", using default");
					}
				}
				
				setCurrentPrice(price);
				setCurrentCurrency(currency);
			} else {
				// Fallback to expected price (token ID + 1)
				const expectedPrice = Number(tokenId) + 1;
				console.log("No claim conditions found for token", tokenId.toString(), ", using expected price:", expectedPrice);
				setCurrentPrice(expectedPrice);
				setCurrentCurrency("USDC");
			}
		} catch (error) {
			console.log("Could not fetch claim conditions for token", tokenId.toString(), ":", error);
			// Fallback to expected price
			const expectedPrice = Number(tokenId) + 1;
			setCurrentPrice(expectedPrice);
			setCurrentCurrency("USDC");
		}
	};

	// Function to fetch total supply from contract
	const fetchTotalSupply = async () => {
		try {
			// Try to get total supply from contract metadata or claim conditions
			// For ERC1155, we might need to check the maxClaimableSupply from claim conditions
			// or use a hardcoded value if the contract doesn't expose this
			
			// For now, we'll use a default of 10,000 but this could be made dynamic
			// by checking contract metadata or other contract methods
			setTotalSupply(10000);
			console.log("Total supply set to:", 10000);
		} catch (error) {
			console.log("Could not fetch total supply, using default:", error);
			setTotalSupply(10000);
		}
	};

	useEffect(() => {
		const fetchNextTokenId = async () => {
			try {
				setLoading(true);
				
				// Find the next token ID to mint by checking each token sequentially
				let nextTokenIndex = 0;
				
				// Check tokens starting from 0 until we find one that hasn't been minted
				while (true) {
					try {
						const tokenSupply = await getERC1155TotalSupply({ 
							contract: props.contract, 
							id: BigInt(nextTokenIndex) 
						});
						console.log(`Frontend: Token ${nextTokenIndex} supply:`, tokenSupply.toString());
						
						if (tokenSupply === 0n) {
							// This token hasn't been minted yet, so it's the next one
							break;
						}
						
						nextTokenIndex++;
						
						// Safety check to prevent infinite loop (max 1000 tokens)
						if (nextTokenIndex > 1000) {
							console.log("Frontend: Reached maximum token check limit, using token 0");
							nextTokenIndex = 0;
							break;
						}
					} catch (error) {
						// If we can't get supply for this token, it probably doesn't exist yet
						console.log(`Frontend: Token ${nextTokenIndex} doesn't exist yet, using this as next token`);
						break;
					}
				}
				
				console.log("Frontend: Next token index to mint:", nextTokenIndex);
				const newTokenId = BigInt(nextTokenIndex);
				setNextTokenId(newTokenId);
				
				// Fetch pricing for this specific token ID
				await fetchTokenPricing(newTokenId);
				
				// Fetch total supply
				await fetchTotalSupply();
				
				// Try to get metadata for the ERC1155 token
				try {
					const nextNft = await getERC1155NFT({
						contract: props.contract,
						tokenId: defaultTokenId,
					});
					setNextNftData(nextNft);
					console.log("Found ERC1155 NFT metadata for token", defaultTokenId.toString(), ":", JSON.stringify(nextNft, null, 2));
				} catch (error) {
					console.log("ERC1155 NFT metadata not available, will use contract metadata");
					setNextNftData(null);
				}
			} catch (error) {
				console.error("Error fetching ERC1155 token info:", error);
				setNextTokenId(0n);
			} finally {
				setLoading(false);
			}
		};

		fetchNextTokenId();
	}, [props.contract]);

	// Reset image error when token ID changes
	useEffect(() => {
		setImageError(false);
	}, [nextTokenId]);

	// Fetch pricing when token ID changes
	useEffect(() => {
		if (nextTokenId !== 0n) {
			fetchTokenPricing(nextTokenId);
		}
	}, [nextTokenId]);


	if (loading) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center">
				<div className="text-white">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white">
			{/* Social Icons - Top Left */}
			<div className="absolute top-8 left-8 flex gap-4">
				<a 
					href="https://x.com/NextDollarClub" 
					target="_blank" 
					rel="noopener noreferrer"
					className="hover:opacity-80 transition-opacity"
				>
					<Image
						src="/X.svg"
						alt="Next Dollar Club on X"
						width={24}
						height={24}
						className="w-6 h-6"
					/>
				</a>
				<a 
					href="https://opensea.io/collection/nextdollarclub" 
					target="_blank" 
					rel="noopener noreferrer"
					className="hover:opacity-80 transition-opacity"
				>
					<Image
						src="/opensea.svg"
						alt="Next Dollar Club on OpenSea"
						width={24}
						height={24}
						className="w-6 h-6"
					/>
				</a>
			</div>

			{/* Logo - Top Center */}
			<div className="flex justify-center pt-8 pb-4">
				<Image
					src="/NDC.svg"
					alt="Next Dollar Club Logo"
					width={480}
					height={160}
					className="h-40 w-auto"
				/>
			</div>

			{/* Subtitle */}
			<div className="flex justify-center pb-4">
				<p className="text-gray-300 text-lg font-medium">
					$1 more each mint
				</p>
			</div>

			{/* Connect Button - Hidden on mobile, shown on desktop */}
			<div className="hidden md:block absolute top-8 right-8 z-50">
				<ConnectButton
					client={client}
					wallets={wallets}
					theme="dark"
					appMetadata={{
						name: "Next Dollar Club",
						description: "Join the Next Dollar Club - Mint your exclusive NFT",
						url: "https://nextdollarclub.com"
					}}
					connectModal={{
						size: "wide",
						titleIcon: "",
						showThirdwebBranding: false,
					}}
				/>
			</div>


			{/* Center Card */}
			<div className="flex items-center justify-center px-4">
				<div className="rounded-lg p-8 max-w-md w-full border" style={{ backgroundColor: '#050505', borderColor: '#2e2e2e' }}>
					{/* NFT Image */}
					<div className="aspect-square mb-6 rounded-lg overflow-hidden bg-gray-800">
						<Image
							src={`https://jade-persistent-lion-245.mypinata.cloud/ipfs/bafybeieukbwnazk6akirtxqcyacwddp4tkmlvbcidkolbljlts44jz3txu/${Number(nextTokenId) + 1}.png`}
							alt={`Item: ${Number(nextTokenId) + 1}/${totalSupply.toLocaleString()}`}
							width={400}
							height={400}
							className="w-full h-full object-cover"
							unoptimized={true}
						/>
					</div>

					{/* NFT Name - Hidden since we have the logo */}
					{nextNftData?.metadata?.name && (
						<h2 className="text-2xl font-bold mb-4 text-center">
							{nextNftData.metadata.name}
						</h2>
					)}

					{/* NFT Description */}
					<p className="text-gray-300 mb-4 text-center">
						{nextNftData?.metadata?.description || `Item: ${Number(nextTokenId) + 1}/${totalSupply.toLocaleString()}`}
					</p>

					{/* Price Display */}
					{currentPrice && currentPrice > 0 && (
						<div className="text-center mb-4">
							<span className="text-lg font-semibold text-white">
								{currentPrice} {currentCurrency}
							</span>
						</div>
					)}

					{/* Enhanced Mint Button */}
					{account ? (
						<ClaimButton
							contractAddress={props.contract.address}
							chain={props.contract.chain}
							client={props.contract.client}
							claimParams={{
								type: "ERC1155",
								tokenId: nextTokenId,
								quantity: 1n,
								to: account.address,
							}}
							style={{
								backgroundColor: "#ffffff",
								color: "#000000",
								width: "100%",
								padding: "16px 24px",
								borderRadius: "12px",
								border: "none",
								fontSize: "18px",
								fontWeight: "700",
								cursor: "pointer",
								textTransform: "uppercase",
								letterSpacing: "0.5px",
								boxShadow: "0 4px 12px rgba(255, 255, 255, 0.15)",
								transition: "all 0.2s ease",
							}}
							onTransactionSent={() => toast.info("Processing payment...")}
							onTransactionConfirmed={async () => {
								toast.success("Welcome to Next Dollar Club! 🎉");
								// Refresh the next token ID and reset image error
								const newTokenId = nextTokenId + 1n;
								setNextTokenId(newTokenId);
								setNextNftData(null);
								setImageError(false);
								
								// Fetch pricing for the new token ID
								await fetchTokenPricing(newTokenId);
							}}
							onError={(err) => toast.error(err.message)}
						>
							join now
						</ClaimButton>
					) : (
						<ConnectButton
							client={client}
							theme="dark"
							connectButton={{ 
								style: { 
									width: "100%",
									padding: "12px 24px",
									borderRadius: "8px",
									fontSize: "16px",
									fontWeight: "600",
								} 
							}}
						/>
					)}
				</div>
			</div>

			{/* Footer with spacing */}
			<div className="h-20"></div>
		</div>
	);
}
