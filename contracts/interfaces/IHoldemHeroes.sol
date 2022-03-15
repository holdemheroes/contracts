// SPDX-License-Identifier: MIT
pragma solidity  >=0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/IERC721Enumerable.sol";


interface IHoldemHeroes is IERC721Enumerable {
    function getHandAsString(uint16 handId) external view returns (string memory);
    function getHandAsCardIds(uint16 handId) external view returns (uint8 card1, uint8 card2);
    function getHandAsSvg(uint16 handId) external view returns (string memory);
    function getHandHash(uint16 handId) external view returns (bytes32);
    function tokenIdToHandId(uint256 _tokenId) external view returns (uint16);
    function getHandShape(uint16 handId, bool abbreviate) external view returns (string memory);
    function getHandName(uint16 handId) external view returns (string memory);
    function getHandRank(uint16 handId) external view returns (uint8);
    function tokenURI(uint256 _tokenId) external view returns (string memory);
}
