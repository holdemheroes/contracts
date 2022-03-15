// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "./HoldemHeroesBase.sol";


contract HoldemHeroesL2 is Ownable, HoldemHeroesBase  {

    // Contract address for the L1 HEH deployment
    address public parentChainContractAddress;
    uint256 public parentNetworkId;

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
    // There is no sale/pre-reveal sale on L2. Just using airdrop
    HoldemHeroesBase(block.timestamp, 0, _playingCards)
    {
        REVEAL_TIMESTAMP = block.timestamp; // no reveal time
        startingIndex = _startingIndex; // already distributed on parent chain.
        parentChainContractAddress = _parentChainContractAddress;
        parentNetworkId = _parentNetworkId;
    }

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

}
