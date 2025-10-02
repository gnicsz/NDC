import { ThirdwebContract, toTokens } from "thirdweb";
import { getActiveClaimCondition, getNFT, getClaimConditions, totalSupply } from "thirdweb/extensions/erc1155";
import { getContractMetadata } from "thirdweb/extensions/common";
import { defaultTokenId, defaultChain } from "@/lib/constants";
import { getContract } from "thirdweb";
import { client } from "@/lib/thirdwebClient";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";

export async function getERC1155Info(contract: ThirdwebContract) {
  // Get contract metadata first
  const contractMetadata = await getContractMetadata({ contract });
  console.log("Contract metadata:", JSON.stringify(contractMetadata, null, 2));
  
  // For Next Dollar Club: Dynamic pricing starts at 1 USDC and increases by 1 USDC per token
  let pricePerToken = 1; // Default to 1 USDC for first token
  let currencySymbol = "USDC";
  
  try {
    // Get current total supply to calculate the price for the next token
    const currentSupply = await totalSupply({ contract, id: defaultTokenId });
    console.log("Current ERC1155 supply for token", defaultTokenId.toString(), ":", currentSupply.toString());
    
    // Price = (current supply + 1) USDC
    pricePerToken = Number(currentSupply) + 1;
    
    console.log("Next token price:", pricePerToken, "USDC");
    
    // Try to get claim conditions to verify USDC address
    try {
      const allClaimConditions = await getClaimConditions({ 
        contract, 
        tokenId: defaultTokenId 
      });
      console.log("ERC1155 claim conditions:", JSON.stringify(allClaimConditions, null, 2));
      
      if (allClaimConditions && allClaimConditions.length > 0) {
        const firstCondition = allClaimConditions[0];
        
        if (firstCondition?.currency && firstCondition.currency !== "0x0000000000000000000000000000000000000000") {
          // Verify it's USDC
          try {
            const currencyMetadata = await getCurrencyMetadata({
              contract: getContract({
                address: firstCondition.currency,
                chain: defaultChain,
                client,
              }),
            });
            
            if (currencyMetadata) {
              currencySymbol = currencyMetadata.symbol;
              console.log("Currency confirmed:", currencySymbol);
            }
          } catch (error) {
            console.log("Could not fetch currency metadata, assuming USDC");
          }
        }
      }
    } catch (error) {
      console.log("Could not fetch ERC1155 claim conditions, using default USDC pricing");
    }
    
  } catch (error) {
    console.log("Could not get ERC1155 total supply, using default price of 1 USDC");
  }

  return {
    displayName: contractMetadata?.name || "",
    description: contractMetadata?.description || "",
    pricePerToken: pricePerToken,
    contractImage: contractMetadata?.image || "",
    currencySymbol: currencySymbol,
  };
}
