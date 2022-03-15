// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

interface IHand {
    function hand(uint16 handId) external pure returns (uint8 card1, uint8 card2);
}
