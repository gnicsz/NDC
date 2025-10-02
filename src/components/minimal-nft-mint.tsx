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
} from "thirdweb/react";
import { createWallet } from "thirdweb/wallets";
import { client } from "@/lib/thirdwebClient";
import { toast } from "sonner";
import { getNFT as getERC721NFT, totalSupply as getERC721TotalSupply } from "thirdweb/extensions/erc721";
import { getNFT as getERC1155NFT, totalSupply as getERC1155TotalSupply } from "thirdweb/extensions/erc1155";
import { defaultTokenId } from "@/lib/constants";

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

	useEffect(() => {
		const fetchNextTokenId = async () => {
			try {
				setLoading(true);
				
				// For ERC1155, we use the defaultTokenId (0) and check total supply for that token
				let tokenId = defaultTokenId;
				
				// Try to get the total supply for the ERC1155 token
				try {
					const totalSupplyCount = await getERC1155TotalSupply({ 
						contract: props.contract, 
						id: defaultTokenId 
					});
					console.log("ERC1155 Total supply for token", defaultTokenId.toString(), ":", totalSupplyCount.toString());
					
					// For ERC1155, we always mint token ID 0, but track how many have been minted
					setNextTokenId(totalSupplyCount); // This represents the count, not the token ID
				} catch (error) {
					console.log("Could not get ERC1155 total supply, using default");
					setNextTokenId(0n);
				}
				
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


	if (loading) {
		return (
			<div className="min-h-screen bg-black flex items-center justify-center">
				<div className="text-white">Loading...</div>
			</div>
		);
	}

	return (
		<div className="min-h-screen bg-black text-white">
			{/* X (Twitter) Icon - Top Left */}
			<div className="absolute top-8 left-8">
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

			{/* Connect Button - Top Right */}
			<div className="absolute top-8 right-8 z-50">
				<ConnectButton
					client={client}
					wallets={wallets}
					theme="dark"
					appMetadata={{
						name: "Next Dollar Club",
						description: "Join the Next Dollar Club - Mint your exclusive NFT",
						url: "https://nextdollarclub.com"
					}}
				/>
			</div>

			{/* Spacer */}
			<div className="h-5"></div>

			{/* Center Card */}
			<div className="flex items-center justify-center px-4">
				<div className="rounded-lg p-8 max-w-md w-full border border-gray-800" style={{ backgroundColor: '#050505' }}>
					{/* NFT Image */}
					<div className="aspect-square mb-6 rounded-lg overflow-hidden bg-gray-800">
						<Image
							src={`https://jade-persistent-lion-245.mypinata.cloud/ipfs/bafybeieukbwnazk6akirtxqcyacwddp4tkmlvbcidkolbljlts44jz3txu/${Number(nextTokenId) + 1}.png`}
							alt={`Private Club Entry No. ${Number(nextTokenId) + 1}`}
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
						{nextNftData?.metadata?.description || `Private Club Entry No. ${Number(nextTokenId) + 1}`}
					</p>

					{/* Price Display */}
					{props.pricePerToken && props.pricePerToken > 0 && (
						<div className="text-center mb-4">
							<span className="text-lg font-semibold text-white">
								{props.pricePerToken} {props.currencySymbol}
							</span>
						</div>
					)}

					{/* Claim Button */}
					{account ? (
						<ClaimButton
							contractAddress={props.contract.address}
							chain={props.contract.chain}
							client={props.contract.client}
							claimParams={{
								type: "ERC1155",
								tokenId: defaultTokenId,
								quantity: 1n,
								to: account.address,
							}}
							style={{
								backgroundColor: "#ffffff",
								color: "#000000",
								width: "100%",
								padding: "12px 24px",
								borderRadius: "8px",
								border: "none",
								fontSize: "16px",
								fontWeight: "600",
								cursor: "pointer",
							}}
							onTransactionSent={() => toast.info("Minting NFT...")}
							onTransactionConfirmed={() => {
								toast.success("Minted successfully!");
								// Refresh the next token ID and reset image error
								setNextTokenId(prev => prev + 1n);
								setNextNftData(null);
								setImageError(false);
								
								// Force a complete page refresh after 3 seconds to get updated pricing
								setTimeout(() => {
									window.location.reload();
								}, 3000);
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
		</div>
	);
}
