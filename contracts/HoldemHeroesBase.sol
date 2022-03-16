// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./Base64.sol";
import "./interfaces/IPlayingCards.sol";


contract HoldemHeroesBase is ERC721Enumerable, Ownable  {

    // a start-hand combination
    struct Hand {
        uint8 card1; // 0 - 51
        uint8 card2; // 0 - 51
    }

    uint256 public constant MAX_NFT_SUPPLY = 1326; // final totalSupply of NFTs

    // sha256 hash of all generated and shuffled hands
    bytes32 public constant HAND_PROVENANCE = 0x0f2f589f7a4a8f583e3053d84ac5b827445dc51d60f1fd4dcf3023ddf2507515;

    // start index for mapping tokenId on to handId - set during the distribution phase
    uint256 public startingIndex;
    // time after which hands are randomised and allocated to token Ids
    uint256 public REVEAL_TIMESTAMP;

    // hands have been revealed
    bool public REVEALED;
    // ranks uploaded - used only during uploadHandRanks function
    bool public RANKS_UPLOADED;
    // the block number in which the final hands were revealed
    uint256 public revealBlock;

    // IPFS hash for provenance JSON - will be set when the last hand batch is revealed
    string public PROVENANCE_IPFS;

    // array of 1326 possible start hand combinations
    Hand[1326] public hands;

    // used during reveal function to ensure batches are uploaded sequentially
    // according to provenance
    uint16 public handUploadId;
    uint8 public nextExpectedBatchId = 0;
    // mapping to ensure batch is not re-uploaded. Only used during reveal function
    mapping(bytes32 => bool) private isHandRevealed;

    // Mapping to hold hand ranks. Requires populating during contract initialisation
    mapping (bytes32 => uint8) public handRanks;

    // The playing cards contract on which HEH is built
    IPlayingCards public immutable playingCards;

    /*
     * EVENTS
     */

    event BatchRevealed(uint16 startHandId, uint16 endHandId, bytes32 batchHash, uint8 batchId);
    event RanksInitialised();

    /**
     * @dev constructor
     * @dev initialises some basic variables.
     *
     * @param _saleStartTime uint256 - unix timestamp for when pre-reveal sale starts. Used to calculate reveal timestamp
     * @param _revealSeconds uint256 - num seconds after pre-reveal sale starts that cards will be revealed and distributed
     * @param _playingCards address - address of Playing Cards contract
     */
    constructor(uint256 _saleStartTime, uint256 _revealSeconds, address _playingCards)
    ERC721("Holdem Heroes", "HEH")
    Ownable() {
        if (_saleStartTime >= block.timestamp) {
            REVEAL_TIMESTAMP = _saleStartTime + _revealSeconds;
        } else {
            REVEAL_TIMESTAMP = block.timestamp + _revealSeconds;
        }

        REVEALED = false;
        RANKS_UPLOADED = false;
        handUploadId = 0;
        playingCards = IPlayingCards(_playingCards);
    }

    /*
    * ADMIN FUNCTIONS
    */

    /**
     * @dev uploadHandRanks upload the 169 start hand ranks, which are referenced
     * @dev by the hand getter functions. Hand ranks are stored as a mapping of a
     * @dev sha256 hash and the integer rank value. The hash is generated from a
     * @dev concatenation of the word "rank" and the hand's name. e.g.
     * keccak256("rankA5s") => 28
     *
     * @param rankHashes bytes32[] array of sha256 hashes
     * @param ranks uint8[] array of corresponding ranks for rankHashes
     */
    function uploadHandRanks(bytes32[] memory rankHashes, uint8[] memory ranks) external onlyOwner {
        require(!RANKS_UPLOADED, "ranks uploaded");
        for (uint8 i = 0; i < rankHashes.length; i++) {
            handRanks[rankHashes[i]] = ranks[i];
        }
        RANKS_UPLOADED = true;
        emit RanksInitialised();
    }

    /**
     * @dev withdrawETH allows contract owner to withdraw ether
     */
    function withdrawETH() external onlyOwner {
        payable(msg.sender).transfer(address(this).balance);
    }

    /**
     * @dev reveal is used to upload and reveal the generated start hand combinations.
     * @dev hands are uploaded in batches, with each batch containing n
     * @dev hands. each hand is a uint8[] array of card IDs, e.g. [2, 3]
     * @dev with each batch represented as a 2d array of hands, for example, [[2, 3], [3, 4], ...]
     * @dev Batches must be uploaded sequentially according to provenance.
     *
     * @param inputs uint8[2][] batch of hands
     * @param batchId uint8 id of the batch being revealed
     * @param ipfs string IPFS hash of provenance.json. Sent with final batch only
     */
    function reveal(uint8[2][] memory inputs, uint8 batchId, string memory ipfs) public onlyOwner {
        require(block.timestamp >= REVEAL_TIMESTAMP, "not time to reveal yet");
        require(handUploadId < 1325, "already revealed");
        require(batchId == nextExpectedBatchId, "batch sequence incorrect");
        bytes32 dataHash = keccak256(abi.encodePacked(inputs));
        require(!isHandRevealed[dataHash], "batch already added");
        isHandRevealed[dataHash] = true;
        for (uint8 i = 0; i < inputs.length; i++) {
            hands[handUploadId] = Hand(inputs[i][0],inputs[i][1]);
            handUploadId = handUploadId + 1;
        }
        emit BatchRevealed(handUploadId - uint16(inputs.length), handUploadId - 1, dataHash, batchId);
        if (handUploadId == 1326) {
            REVEALED = true;
            PROVENANCE_IPFS = ipfs;
            revealBlock = block.number;
        } else {
            nextExpectedBatchId = nextExpectedBatchId + 1;
        }
    }

    /*
     * PUBLIC GETTERS
     */

    /**
     * @dev getHandShape returns the shape for a given hand ID, for example "Suited" or "s"
     *
     * @param handId uint16 ID of the hand from 0 - 1325
     * @param abbreviate bool whether or not to abbreviate ("s" instead of Suited" if true)
     * @return string shape of hand
     */
    function getHandShape(uint16 handId, bool abbreviate) public validHandId(handId) view returns (string memory) {
        uint8 card1N = playingCards.getCardNumberAsUint(hands[handId].card1);
        uint8 card2N = playingCards.getCardNumberAsUint(hands[handId].card2);

        uint8 card1S = playingCards.getCardSuitAsUint(hands[handId].card1);
        uint8 card2S = playingCards.getCardSuitAsUint(hands[handId].card2);

        if (card1N == card2N) {
            return abbreviate ? "" : "Pair";
        } else if (card1S == card2S) {
            return abbreviate ? "s" : "Suited";
        } else {
            return abbreviate ? "o" : "Offsuit";
        }
    }

    /**
     * @dev getHandAsCardIds returns the card IDs (0 - 51) for a given hand ID, for example 12,24
     *
     * @param handId uint16 ID of the hand from 0 - 1325
     * @return card1 uint8 ID of card 1 (0 - 51)
     * @return card2 uint8 ID of card 2 (0 - 51)
     */
    function getHandAsCardIds(uint16 handId) public validHandId(handId) view returns (uint8 card1, uint8 card2) {
        Hand storage hand = hands[handId];
        if (playingCards.getCardNumberAsUint(hand.card1) > playingCards.getCardNumberAsUint(hand.card2)) {
            return (hand.card1, hand.card2);
        } else {
            return (hand.card2, hand.card1);
        }
    }

    /**
     * @dev getHandName returns the canonical name for a given hand ID. This is a concatenation of
     * @dev Card1 + Card2 + Shape, with the cards ordered by card number in descending order.
     * @dev E.g. A5s
     *
     * @param handId uint16 ID of the hand from 0 - 1325
     * @return string hand name
     */
    function getHandName(uint16 handId) public validHandId(handId) view returns (string memory) {
        string memory shape = getHandShape(handId, true);
        (uint8 card1, uint8 card2) = getHandAsCardIds(handId);

        return string(abi.encodePacked(playingCards.getCardNumberAsStr(card1), playingCards.getCardNumberAsStr(card2), shape));
    }

    /**
     * @dev getHandRank returns the canonical rank for a given hand ID. Lower is better
     *
     * @param handId uint16 ID of the hand from 0 - 1325
     * @return string hand rank
     */
    function getHandRank(uint16 handId) public validHandId(handId) view returns (uint8) {
        return handRanks[keccak256(abi.encodePacked("rank", getHandName(handId)))];
    }

    /**
     * @dev getHandAsString returns a concatenation of the card names
     *
     * @param handId uint16 ID of the hand from 0 - 1325
     * @return string hand - cards names concatenated, e.g. AsAc
     */
    function getHandAsString(uint16 handId) public validHandId(handId) view returns (string memory) {
        (uint8 card1, uint8 card2) = getHandAsCardIds(handId);
        return string(abi.encodePacked(playingCards.getCardAsString(card1), playingCards.getCardAsString(card2)));
    }

    /**
     * @dev getHandAsSvg returns the SVG XML for a hand, which can be rendered as an img src in a UI
     *
     * @param handId uint16 ID of the hand from 0 - 1325
     * @return string SVG XML of a hand of 2 cards
     */
    function getHandAsSvg(uint16 handId) public validHandId(handId) view returns (string memory) {
        (uint8 card1, uint8 card2) = getHandAsCardIds(handId);

        string[4] memory parts;
        parts[0] = "<svg xmlns=\"http://www.w3.org/2000/svg\" xmlns:xlink=\"http://www.w3.org/1999/xlink\" viewBox=\"0 0 148 62\" width=\"5in\" height=\"2.147in\">";
        parts[1] = playingCards.getCardBody(playingCards.getCardNumberAsUint(card1), playingCards.getCardSuitAsUint(card1), "7", "32", "2");
        parts[2] = playingCards.getCardBody(playingCards.getCardNumberAsUint(card2), playingCards.getCardSuitAsUint(card2), "82", "107", "76");
        parts[3] = "</svg>";

        string memory output = string(
            abi.encodePacked(parts[0], parts[1], parts[2], parts[3])
        );
        return output;
    }

    /**
     * @dev getHandHash returns a hand's hash, which can be used to match against the
     * @dev published provenance. Hand hashes can be sequentially concatenated and the
     * @dev concatenation itself hashed (after removing each hand hash's 0x prefix)
     * @dev to get the provenance hash. This provenance hash should match both the published
     * @dev hash and the HAND_PROVENANCE constant in this contract
     *
     * @param handId uint16 ID of the hand from 0 - 1325
     * @return string hash of the hand
     */
    function getHandHash(uint16 handId) public validHandId(handId) view returns (bytes32) {
        (uint8 card1, uint8 card2) = getHandAsCardIds(handId);
        return keccak256(abi.encodePacked(
                toString(handId),
                getHandAsString(handId),
                toString(card1),
                toString(playingCards.getCardNumberAsUint(card1)),
                toString(playingCards.getCardSuitAsUint(card1)),
                toString(card2),
                toString(playingCards.getCardNumberAsUint(card2)),
                toString(playingCards.getCardSuitAsUint(card2))
            )
        );
    }

    /**
     * @dev tokenIdToHandId maps a given token ID onto its distributed hand ID
     * @dev Note - this will only run after all hands have been revealed
     * @dev and distributed.
     *
     * @param _tokenId uint256 ID of the NFT token from 0 - 1325
     * @return uint16 hand ID associate to the token
     */
    function tokenIdToHandId(uint256 _tokenId) public view returns (uint16) {
        require(_tokenId >= 0 && _tokenId < 1326, "invalid tokenId");
        require(startingIndex > 0, "not distributed");
        return uint16((_tokenId + startingIndex) % MAX_NFT_SUPPLY);
    }

    /**
     * @dev tokenURI generates the base64 encoded JSON of the NFT itself. tokenURI will first call
     * @dev tokenIdToHandId to find which hand the token is for. It will then generate
     * @dev and output the encoded JSON containing the SVG image, name, description and
     * @dev attributes.
     * @dev Note - this will only run after all hands have been revealed
     * @dev and distributed.
     *
     * @param _tokenId uint256 ID of the NFT token from 0 - 1325
     * @return string the token's NFT JSON
     */
    function tokenURI(uint256 _tokenId) public view override returns (string memory) {
        // we need to map the token ID onto the assigned hand ID,
        // based on the distribution's startingIndex. This is only available
        // AFTER distribution has occurred, and will return an error otherwise
        uint16 handId = tokenIdToHandId(_tokenId);

        string memory handName = getHandAsString(handId);
        string memory shape = getHandShape(handId, false);
        string memory hand = getHandName(handId);
        string memory rank = toString(getHandRank(handId));

        string memory json = Base64.encode(
            bytes(
                string(
                    abi.encodePacked(
                        "{\"name\": \"", handName,
                        "\", \"description\": \"holdemheroes.com\",",
                        getAttributes(shape, hand, rank),
                        "\"image\": \"data:image/svg+xml;base64,",
                        Base64.encode(bytes(getHandAsSvg(handId))),
                        "\"}"
                    )
                )
            )
        );
        string memory output = string(abi.encodePacked("data:application/json;base64,", json));

        return output;
    }

    /*
     * PRIVATE FUNCTIONS
     */

    /**
     * @dev getAttributes will generate the attributes JSON for embedding into the NFT JSON
     *
     * @param shape string shape
     * @param hand string hand
     * @param rank string rank
     * @return string attribute JSON
     */
    function getAttributes(string memory shape, string memory hand, string memory rank) private pure returns (string memory) {
        return string(
            abi.encodePacked(
                "\"attributes\": [{ \"trait_type\": \"Shape\", \"value\": \"", shape, "\"},",
                "{ \"trait_type\": \"Hand\", \"value\": \"", hand, "\"},",
                "{ \"trait_type\": \"Rank\", \"value\": \"", rank, "\"}],"
            )
        );
    }

    /**
     * @dev toString converts a given uint256 to a string. Primarily used in SVG, JSON, string name,
     * @dev and hash generation
     *
     * @param value uint256 number to convert
     * @return string number as a string
     */
    function toString(uint256 value) private pure returns (string memory) {
        // Inspired by OraclizeAPI"s implementation - MIT license
        // https://github.com/oraclize/ethereum-api/blob/b42146b063c7d6ee1358846c198246239e9360e8/oraclizeAPI_0.4.25.sol
        uint256 _tmpN = value;
        if (_tmpN == 0) {
            return "0";
        }
        uint256 temp = _tmpN;
        uint256 digits;
        while (temp != 0) {
            digits++;
            temp /= 10;
        }
        bytes memory buffer = new bytes(digits);
        while (_tmpN != 0) {
            digits -= 1;
            buffer[digits] = bytes1(uint8(48 + uint256(_tmpN % 10)));
            _tmpN /= 10;
        }
        return string(buffer);
    }

    /*
     * MODIFIERS
     */

    /**
     * @dev validHandId ensures a given hand Id is valid
     *
     * @param handId uint16 id of hand
     */
    modifier validHandId(uint16 handId) {
        require(handId >= 0 && handId < 1326, "invalid handId");
        require(REVEALED, "not revealed");
        _;
    }
}
