// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;


interface IPlayingCards {
    function getCardNumberAsUint(uint8 cardId) external view returns (uint8);
    function getCardSuitAsUint(uint8 cardId) external view returns (uint8);
    function getCardNumberAsStr(uint8 cardId) external view returns (string memory);
    function getCardSuitAsStr(uint8 cardId) external view returns (string memory);
    function getCardAsString(uint8 cardId) external view returns (string memory);
    function getCardAsSvg(uint8 cardId) external view returns (string memory);
    function getCardAsComponents(uint8 cardId) external view returns (uint8 number, uint8 suit);
    function getCardBody(uint8 numberId, uint8 suitId, uint256 fX, uint256 sX, uint256 rX) external pure returns (string memory);
    function getSuitPath(uint8 suitId) external pure returns (string memory);
    function getNumberPath(uint8 numberId) external pure returns (string memory);
}
