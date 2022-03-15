// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "../../interfaces/IPlayingCards.sol";


contract MockHEH is ERC721Enumerable {
    using SafeMath for uint256;

    // a start-hand combination
    struct Hand {
        uint8 card1; // 0 - 51
        uint8 card2; // 0 - 51
    }

    uint256 public constant MAX_NFT_SUPPLY = 1326; // final totalSupply of NFTs

    // array of 1326 possible start hand combinations
    Hand[1326] public hands;

    IPlayingCards public playingCards;

    constructor(address _playingCards)
    ERC721("Holdem Heroes", "HEH") {
        playingCards = IPlayingCards(_playingCards);
    }

    function setTestHand(uint16 idx, uint8 _card1, uint8 _card2) external {
        hands[idx] = Hand(_card1, _card2);
    }

    function batchMint(uint256 numberOfNfts) external {
        require(totalSupply().add(numberOfNfts) <= MAX_NFT_SUPPLY, "exceeds MAX_NFT_SUPPLY");
        for (uint i = 0; i < numberOfNfts; i++) {
            uint mintIndex = totalSupply();
            _safeMint(msg.sender, mintIndex);
        }
    }

    function mint(uint256 tokenId) external {
        require(tokenId >= 0 && tokenId < MAX_NFT_SUPPLY, "invalid tokenId");
        _safeMint(msg.sender, tokenId);
    }

    function getCardAsString(uint8 cardId) public view returns (string memory) {
        return playingCards.getCardAsString(cardId);
    }

    function getCardAsComponents(uint8 cardId) public view returns (uint8 number, uint8 suit) {
        return playingCards.getCardAsComponents(cardId);
    }

    function getHandAsCardIds(uint16 handId) public view returns (uint8 card1, uint8 card2) {
        Hand storage hand = hands[handId];
        if (playingCards.getCardNumberAsUint(hand.card1) > playingCards.getCardNumberAsUint(hand.card2)) {
            return (hand.card1, hand.card2);
        } else {
            return (hand.card2, hand.card1);
        }
    }

    function getHandAsString(uint16 handId) public view returns (string memory) {
        (uint8 card1, uint8 card2) = getHandAsCardIds(handId);
        return string(abi.encodePacked(getCardAsString(card1), getCardAsString(card2)));
    }

    function tokenIdToHandId(uint256 _tokenId) public pure returns (uint16) {
        return uint16(_tokenId);
    }

}
