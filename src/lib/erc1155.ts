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

    // Price = (current supply + 1) USDC - this is our expected price
    const expectedPrice = Number(currentSupply) + 1;
    console.log("Expected next token price:", expectedPrice, "USDC");
    
    // Try to get all claim conditions to find the right tier for current supply
    try {
      // Get all claim conditions to find the correct pricing tier
      const allClaimConditions = await getClaimConditions({ 
        contract, 
        tokenId: defaultTokenId 
      });
      console.log("ERC1155 all claim conditions count:", allClaimConditions?.length || 0);
      
      let activeClaimCondition = null;
      
      if (allClaimConditions && allClaimConditions.length > 0) {
        // Find the claim condition that applies to the current supply
        // Sort by maxClaimableSupply to find the right tier
        const sortedConditions = allClaimConditions.sort((a, b) => {
          const aMax = Number(a.maxClaimableSupply || 0);
          const bMax = Number(b.maxClaimableSupply || 0);
          return aMax - bMax;
        });
        
        // Find the condition where currentSupply < maxClaimableSupply
        for (const condition of sortedConditions) {
          const maxSupply = Number(condition.maxClaimableSupply || 0);
          if (currentSupply < maxSupply || maxSupply === 0) {
            activeClaimCondition = condition;
            console.log("Found matching claim condition for supply", currentSupply.toString(), "with max", maxSupply);
            break;
          }
        }
        
        // Fallback to first condition if no match
        if (!activeClaimCondition) {
          activeClaimCondition = sortedConditions[0];
          console.log("Using fallback claim condition");
        }
      }
      
      console.log("Selected claim condition found:", activeClaimCondition ? "Yes" : "No");
      if (activeClaimCondition) {
        console.log("Price per token:", activeClaimCondition.pricePerToken?.toString());
        console.log("Currency:", activeClaimCondition.currency);
      }
      
      if (activeClaimCondition) {
        // Check if it's ETH (0x0000000000000000000000000000000000000000) or ERC20
        if (activeClaimCondition.currency === "0x0000000000000000000000000000000000000000") {
          // ETH payment - convert from wei to ETH
          const contractPrice = Number(activeClaimCondition.pricePerToken) / 1e18;
          currencySymbol = "ETH";
          // Use expected price for dynamic pricing, contract price as fallback
          pricePerToken = expectedPrice;
          console.log("Contract price:", contractPrice, "ETH, Using expected price:", pricePerToken, "ETH");
        } else {
          // ERC20 token - assume USDC (6 decimals)
          const contractPrice = Number(activeClaimCondition.pricePerToken) / 1e6;
          currencySymbol = "USDC";
          // Use the actual contract price from the correct tier
          pricePerToken = contractPrice;
          console.log("Using contract price from claim condition:", pricePerToken, "USDC");
        }
        
        // Verify currency
        if (activeClaimCondition.currency && activeClaimCondition.currency !== "0x0000000000000000000000000000000000000000") {
          try {
            const currencyMetadata = await getCurrencyMetadata({
              contract: getContract({
                address: activeClaimCondition.currency,
                chain: defaultChain,
                client,
              }),
            });
            
            if (currencyMetadata) {
              currencySymbol = currencyMetadata.symbol;
              console.log("Currency confirmed from active condition:", currencySymbol);
            }
          } catch (error) {
            console.log("Could not fetch currency metadata from active condition, assuming USDC");
          }
        }
      } else {
        console.log("No claim conditions found, using expected price");
        pricePerToken = expectedPrice;
      }
    } catch (error) {
      console.log("Could not fetch ERC1155 claim conditions:", error);
      console.log("Using default USDC pricing");
    }
    
  } catch (error) {
    console.log("Could not get ERC1155 total supply, using default price of 1 USDC");
    pricePerToken = 1; // Fallback to 1 USDC
  }

  return {
    displayName: contractMetadata?.name || "",
    description: contractMetadata?.description || "",
    pricePerToken: pricePerToken,
    contractImage: contractMetadata?.image || "",
    currencySymbol: currencySymbol,
  };
}
