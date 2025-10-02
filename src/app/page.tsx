import { MinimalNftMint } from "@/components/minimal-nft-mint";
import { contract } from "@/lib/constants";
// lib imports for fetching NFT details
import { getERC721Info } from "@/lib/erc721";
import { getERC1155Info } from "@/lib/erc1155";
// thirdweb imports
import { isERC721 } from "thirdweb/extensions/erc721";
import { isERC1155 } from "thirdweb/extensions/erc1155";

async function getERCType() {
  const [isErc721Result, isErc1155Result] = await Promise.all([
    isERC721({ contract }).catch(() => false),
    isERC1155({ contract }).catch(() => false),
  ]);
  
  if (isErc1155Result) return "ERC1155";
  if (isErc721Result) return "ERC721";
  return "Unknown";
}

export default async function Home() {
  try {
    // Detect contract type first
    const ercType = await getERCType();
    console.log("Detected contract type:", ercType);
    
    let info;
    try {
      if (ercType === "ERC1155") {
        info = await getERC1155Info(contract);
      } else if (ercType === "ERC721") {
        info = await getERC721Info(contract);
      } else {
        throw new Error("Unsupported contract type");
      }
    } catch (error) {
      console.log("Could not fetch contract info, using defaults:", error);
      // Use default values if contract info fetch fails
      info = {
        displayName: "NFT Collection",
        description: "Private Club Entry",
        contractImage: "",
        currencySymbol: "USDC",
        pricePerToken: 1,
      };
    }

    return (
      <MinimalNftMint
        contract={contract}
        displayName={info.displayName || "NFT Collection"}
        contractImage={info.contractImage || ""}
        description={info.description || "Private Club Entry"}
        currencySymbol={info.currencySymbol || "ETH"}
        pricePerToken={info.pricePerToken || 0}
      />
    );
  } catch (error) {
    console.error("Error in Home component:", error);
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Failed to load NFT</h1>
          <p className="text-gray-400">
            {error instanceof Error
              ? error.message
              : "An unexpected error occurred."}
          </p>
        </div>
      </div>
    );
  }
}
