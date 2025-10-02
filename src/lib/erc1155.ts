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
  
  // For Next Dollar Club: Dynamic pricing per token ID
  let pricePerToken = 1; // Default to 1 USDC for first token
  let currencySymbol = "USDC";
  
  try {
    // Get current total supply to find the next token ID to mint
    const currentSupply = await totalSupply({ contract, id: defaultTokenId });
    console.log("Current ERC1155 supply for token", defaultTokenId.toString(), ":", currentSupply.toString());

    // The next token to mint will be at index currentSupply (0-based indexing)
    const nextTokenIndex = Number(currentSupply);
    console.log("Next token index to mint:", nextTokenIndex);
    
    // For your setup: token 0 = 1 USDC, token 1 = 2 USDC, token 2 = 3 USDC, etc.
    const expectedPrice = nextTokenIndex + 1;
    console.log("Expected price for token", nextTokenIndex, ":", expectedPrice, "USDC");
    
    // Try to read claim conditions for the specific next token ID
    // Since you've set up pricing per individual token, we need to check the next token's conditions
    try {
      // For ERC1155 Edition Drop, each token can have its own claim conditions
      // We need to get the claim conditions for the next token to be minted
      const nextTokenId = BigInt(nextTokenIndex);
      
      console.log("Checking claim conditions for token ID:", nextTokenId.toString());
      
      const tokenClaimConditions = await getClaimConditions({ 
        contract, 
        tokenId: nextTokenId 
      });
      
      console.log("Claim conditions for token", nextTokenId.toString(), "count:", tokenClaimConditions?.length || 0);
      
      if (tokenClaimConditions && tokenClaimConditions.length > 0) {
        // Use the first (and likely only) claim condition for this specific token
        const tokenCondition = tokenClaimConditions[0];
        
        console.log("Token", nextTokenId.toString(), "claim condition:", {
          pricePerToken: tokenCondition.pricePerToken?.toString(),
          currency: tokenCondition.currency,
          maxClaimableSupply: tokenCondition.maxClaimableSupply?.toString()
        });
        
        // Use the actual price from this token's claim condition
        if (tokenCondition.currency === "0x0000000000000000000000000000000000000000") {
          // ETH payment - convert from wei to ETH
          pricePerToken = Number(tokenCondition.pricePerToken) / 1e18;
          currencySymbol = "ETH";
          console.log("Using token-specific ETH pricing:", pricePerToken, "ETH");
        } else {
          // ERC20 token - assume USDC (6 decimals)
          pricePerToken = Number(tokenCondition.pricePerToken) / 1e6;
          currencySymbol = "USDC";
          console.log("✅ PHANTOM FIX: Using token-specific USDC pricing:", pricePerToken, "USDC");
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
              currencySymbol = currencyMetadata.symbol;
              console.log("Currency confirmed for token", nextTokenId.toString(), ":", currencySymbol);
            }
          } catch (error) {
            console.log("Could not fetch currency metadata for token", nextTokenId.toString(), ", using default");
          }
        }
      } else {
        console.log("No claim conditions found for token", nextTokenId.toString(), ", using expected price");
        pricePerToken = expectedPrice;
        currencySymbol = "USDC";
      }
    } catch (error) {
      console.log("Could not fetch claim conditions for next token:", error);
      console.log("Using expected price with default USDC");
      pricePerToken = expectedPrice;
      currencySymbol = "USDC";
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
