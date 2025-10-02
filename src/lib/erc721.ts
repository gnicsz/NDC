import { ThirdwebContract, toTokens } from "thirdweb";
import { getActiveClaimCondition, getClaimConditions, totalSupply } from "thirdweb/extensions/erc721";
import { getContractMetadata } from "thirdweb/extensions/common";
import { defaultChain } from "@/lib/constants";
import { getContract } from "thirdweb";
import { client } from "@/lib/thirdwebClient";
import { getCurrencyMetadata } from "thirdweb/extensions/erc20";

export async function getERC721Info(contract: ThirdwebContract) {
  // Always try to get contract metadata first
  const contractMetadata = await getContractMetadata({ contract });
  
  // For Next Dollar Club: Dynamic pricing starts at 1 USDC and increases by 1 USDC per token
  let pricePerToken = 1; // Default to 1 USDC for first token
  let currencySymbol = "USDC";
  
  try {
    // Get current total supply to calculate the price for the next token
    const currentSupply = await totalSupply({ contract });
    console.log("Current supply:", currentSupply.toString());
    
    // Price = (current supply + 1) USDC
    // So token 0 costs 1 USDC, token 1 costs 2 USDC, etc.
    pricePerToken = Number(currentSupply) + 1;
    
    console.log("Next token price:", pricePerToken, "USDC");
    
    // Try to get claim conditions to verify USDC address
    try {
      const allClaimConditions = await getClaimConditions({ contract });
      console.log("All claim conditions:", JSON.stringify(allClaimConditions, null, 2));
      
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
      console.log("Could not fetch claim conditions, using default USDC pricing");
    }
    
  } catch (error) {
    console.log("Could not get total supply, using default price of 1 USDC");
  }

  return {
    displayName: contractMetadata?.name || "",
    description: contractMetadata?.description || "",
    pricePerToken: pricePerToken,
    contractImage: contractMetadata?.image || "",
    currencySymbol: currencySymbol,
  };
}
