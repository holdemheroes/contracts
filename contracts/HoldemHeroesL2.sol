// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./HoldemHeroesBase.sol";


contract HoldemHeroesL2 is Ownable, HoldemHeroesBase  {
    // Contract address for the L1 HEH deployment
    address public parentChainContractAddress;
    uint256 public parentNetworkId;

    uint256 public basePostRevealPrice;

    /**
     * @dev constructor
     * @dev initialises some basic variables.
     *
     * @param _startingIndex uint256 start index used on L1 HEH
     * @param _parentChainContractAddress address contract address of HEH on L1
     * @param _parentNetworkId uint256 parent network ID
     * @param _playingCards address - address of Playing Cards contract
     */
    constructor(uint256 _startingIndex, address _parentChainContractAddress, uint256 _parentNetworkId, address _playingCards)
    // There is no pre-reveal sale on L2. Just using airdrop & post-reveal mint
    HoldemHeroesBase(0, _playingCards)
    {
        REVEAL_TIMESTAMP = block.timestamp; // no reveal time
        startingIndex = _startingIndex; // already distributed on parent chain. Use same start index
        parentChainContractAddress = _parentChainContractAddress;
        parentNetworkId = _parentNetworkId;
        basePostRevealPrice = 150 ether; // 150 MATIC
    }

    /**
     * ADMIN
     */

    /**
     * @dev airdrop is an admin function to mint L1 tokens for their respective owners on L2.
     *
     * @param _tokenIds []uint256 array of NFT Token IDs
     * @param _owners []address corresponding array of NFT Token owners
     */
    function airdrop(uint256[] memory _tokenIds, address[] memory _owners) external onlyOwner {
        for (uint8 i = 0; i < _tokenIds.length; i++) {
            require(_tokenIds[i] >= 0 && _tokenIds[i] < MAX_NFT_SUPPLY, "invalid tokenId");
            require(_owners[i] != address(0), "invalid owner");
            _safeMint(_owners[i], _tokenIds[i]);
        }
    }

    /**
     * @dev setBasePostRevealPrice allows owner to adjust post-reveal price according to market
     *
     * @param newPrice uint256 new base price in wei
     */
    function setBasePostRevealPrice(uint256 newPrice) external onlyOwner {
        basePostRevealPrice = newPrice;
    }

    /**
     * MINT
     */

    /**
     * @dev getPostRevealNftPrice get mint price for revealed tokens, based on the hand Rank
     * @dev lower rank = better hand = higher price. e.g. AA = rank 1 = high price
     * @dev Note - reveal and distribution occurred on L1 Eth mainnet. Hands and start index
     * @dev are ported to the L2 contract, and are identical to the HoldemHeroes contract on L1.
     *
     * @return result uint256 price in wei
     */
    function getPostRevealNftPrice(uint256 _tokenId) public view returns (uint256 result) {
        uint256 rank = uint256(getHandRank(tokenIdToHandId(_tokenId)));
        if(rank == 1) {
            result = basePostRevealPrice;
        } else {
            uint256 m = 100 - ((rank * 100) / 169); // get % as int
            m = (m < 10) ? 10 : m;
            result = (basePostRevealPrice * m) / 100;
        }
    }

    /**
     * @dev mintNFTPostReveal is a public payable function which any user can call.
     * @dev This allows a user to mint any available token ID that hasn't been sold yet.
     * @dev Correct ether value is expected to pay for token.
     *
     * @param tokenId uint256 NFT Token ID to purchase
     */
    function mintNFTPostReveal(uint256 tokenId) external payable {
        uint256 price = getPostRevealNftPrice(tokenId);
        require(msg.value >= price, "eth too low");

        _safeMint(msg.sender, tokenId);
    }
}
