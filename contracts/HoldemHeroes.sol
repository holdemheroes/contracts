// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@unification-com/xfund-vor/contracts/VORConsumerBase.sol";
import "./HoldemHeroesBase.sol";


contract HoldemHeroes is Ownable, HoldemHeroesBase, ReentrancyGuard, VORConsumerBase  {
    using SafeMath for uint256;

    // max number of NFTs allowed per address
    uint256 public MAX_PER_ADDRESS_OR_TX;
    // timestamp for when public sale opens
    uint256 public SALE_START_TIMESTAMP;
    // adjustable price to be used after hands are revealed, in case not all NFTs are sold during
    // the pre-reveal sales. By default, this will be the last price in the getNftPrice list
    // and can be modified by the contract owner
    uint256 public POST_REVEAL_MINT_PRICE;
    // timestamp before which only whitelisted addresses can mint
    uint256 public WHITELIST_MINT_TIMESTAMP;

    bytes32 public whitelistMerkleRoot;
    bool public useWhitelist;

    /*
     * EVENTS
     */

    event DistributionBegun(bytes32 requestId, address sender);
    event DistributionResult(bytes32 requestId, uint256 randomness, uint256 startingIndex);
    event PostRevealMintPriceSet(address owner, uint256 oldPrice, uint256 newPrice);
    event WhitelistMerkleRootSet(address owner, bytes32 oldMerkleRoot, bytes32 newMerkleRoot, bool useWhitelist);

    /**
     * @dev constructor
     * @dev initialises some basic variables.
     *
     * @param _vorCoordinator address - address of VORCoordinator contract
     * @param _xfund address - address of xFUND contract
     * @param _playingCards address - address of Playing Cards contract
     * @param _saleStartTime uint256 - unix timestamp for when pre-reveal sale starts. Allows time for card/rank init
     * @param _revealSeconds uint256 - num seconds after pre-reveal sale starts that cards will be revealed and distributed
     * @param _whitelistSeconds uint256 - num seconds after pre-reveal sale starts that only whitelisted addresses can mint
     * @param _maxNfts address - max number of NFTs a single wallet address can mint
     */
    constructor(
        address _vorCoordinator,
        address _xfund,
        address _playingCards,
        uint256 _saleStartTime,
        uint256 _revealSeconds,
        uint256 _whitelistSeconds,
        uint256 _maxNfts)
    VORConsumerBase(_vorCoordinator, _xfund)
    HoldemHeroesBase(_saleStartTime, _revealSeconds, _playingCards)
    {
        if (_saleStartTime >= block.timestamp) {
            SALE_START_TIMESTAMP = _saleStartTime;
        } else {
            SALE_START_TIMESTAMP = block.timestamp;
        }

        WHITELIST_MINT_TIMESTAMP = SALE_START_TIMESTAMP + _whitelistSeconds;
        useWhitelist = false;

        MAX_PER_ADDRESS_OR_TX = _maxNfts;

        // Should be the same as the final scheduled price in getNftPrice() to begin with
        POST_REVEAL_MINT_PRICE = 0.01 ether;
    }

    /*
     * ADMIN FUNCTIONS
     */

    /**
     * @dev setPostRevealMintPrice allows the contract owner to change the post reveal mint price in the event
     * @dev that some NFTs remain unsold.
     *
     * @param newPrice uint256 new price in wei
     */

    function setPostRevealMintPrice(uint256 newPrice) external onlyOwner {
        uint256 oldPrice = POST_REVEAL_MINT_PRICE;
        POST_REVEAL_MINT_PRICE = newPrice;
        emit PostRevealMintPriceSet(msg.sender, oldPrice, newPrice);
    }

    /**
     * @dev setWhitelistMerkleRoot allows the contract owner to change the merkle root for whitelisted
     * @dev pre-reveal minters
     *
     * @param newMerkleRoot bytes32 new merkle root hash
     */

    function setWhitelistMerkleRoot(bytes32 newMerkleRoot, bool newUseWhitelist) external onlyOwner {
        bytes32 oldRoot = whitelistMerkleRoot;
        whitelistMerkleRoot = newMerkleRoot;
        useWhitelist = newUseWhitelist;
        emit WhitelistMerkleRootSet(msg.sender, oldRoot, newMerkleRoot, newUseWhitelist);
    }

    /*
     * MINT & DISTRIBUTION FUNCTIONS
     */

    /**
     * @dev getNftPrice returns the current price to mint 1 NFT
     *
     * @return uint256
     */

    function getNftPrice() public view returns (uint256) {

        if (REVEALED && startingIndex > 0) {
            return POST_REVEAL_MINT_PRICE;
        }

        if (totalSupply() <= 250) {
            return 0.001 ether;
        } else if (totalSupply() <= 500) {
            return 0.002 ether;
        } else if (totalSupply() <= 750) {
            return 0.005 ether;
        } else if (totalSupply() <= 1000) {
            return 0.008 ether;
        } else {
            return 0.01 ether;
        }
    }

    /**
     * @dev mintNFTPreReveal is a public payable function which any user can call during the pre-reveal
     * @dev sale phase. This allows a user to mint up to MAX_PER_ADDRESS_OR_TX tokens. Tokens are
     * @dev minted sequentially. Mapping of token IDs on to hand IDs (according to provenance) is
     * @dev executed during the reveal & distribution phase, via a call to VOR.
     * @dev Correct ether value is expected to pay for tokens.
     *
     * @param numberOfNfts uint256 number of NFTs to mint in this Tx
     * @param merkleProof bytes32[] merkle proof for whitelist check
     */
    function mintNFTPreReveal(uint256 numberOfNfts, bytes32[] calldata merkleProof) external payable nonReentrant {
        require(block.timestamp >= SALE_START_TIMESTAMP, "sale not started");
        require(totalSupply() < MAX_NFT_SUPPLY, "sold out");
        require(block.timestamp < REVEAL_TIMESTAMP, "pre reveal sale ended");
        require(numberOfNfts > 0, "cannot buy 0");
        require(numberOfNfts <= MAX_PER_ADDRESS_OR_TX, "max 5 per tx");
        require(balanceOf(msg.sender).add(numberOfNfts) <= MAX_PER_ADDRESS_OR_TX, "mint limit reached");
        require(totalSupply().add(numberOfNfts) <= MAX_NFT_SUPPLY, "exceeds MAX_NFT_SUPPLY");
        require(getNftPrice().mul(numberOfNfts) == msg.value, "eth value incorrect");

        if(block.timestamp <= WHITELIST_MINT_TIMESTAMP && useWhitelist) {
            bytes32 leaf = keccak256(abi.encodePacked(msg.sender));
            require(verifyMerkleProof(merkleProof, whitelistMerkleRoot, leaf), "not whitelisted");
        }

        for (uint i = 0; i < numberOfNfts; i++) {
            uint mintIndex = totalSupply();
            _safeMint(msg.sender, mintIndex);
        }
    }

    /**
     * @dev mintNFTPostReveal is a public payable function which any user can call AFTER the pre-reveal
     * @dev sale phase. This allows a user to mint any available token ID that hasn't been sold yet.
     * @dev This function cannot be executed until hands have been revealed and distributed.
     * @dev Correct ether value is expected to pay for token.
     *
     * @param tokenId uint256 NFT Token ID to purchase
     */
    function mintNFTPostReveal(uint256 tokenId) external payable nonReentrant {
        require(REVEALED, "not revealed");
        require(startingIndex > 0, "not distributed");
        require(tokenId >= 0 && tokenId < MAX_NFT_SUPPLY, "invalid tokenId");
        require(getNftPrice() == msg.value, "eth value incorrect");

        _safeMint(msg.sender, tokenId);
    }

    /**
     * @dev beginDistribution is called to initiate distribution and makes a VOR request to generate
     * @dev a random value. Can only be called after hands have been revealed according to provenance.
     *
     * @param _keyHash bytes32 key hash of the VOR Oracle that will handle the request
     * @param _fee uint256 xFUND fee to pay the VOR Oracle
     */
    function beginDistribution(bytes32 _keyHash, uint256 _fee) public onlyOwner nonReentrant {
        require(startingIndex == 0, "already executed");
        require(REVEALED, "not revealed");
        _increaseVorCoordinatorAllowance(_fee);
        uint256 seed = uint256(blockhash(block.number-10));
        bytes32 requestId = requestRandomness(_keyHash, _fee, seed);
        emit DistributionBegun(requestId, msg.sender);
    }

    /**
     * @dev fallbackDistribution is an emergency fallback function which can be called in the event
     * @dev of the fulfillRandomness function failing. It can only be called by the contract owner
     * @dev and should only be called if beginDistribution failed.
     */
    function fallbackDistribution() public onlyOwner {
        require(startingIndex == 0, "already executed");
        require(REVEALED, "not revealed");

        uint256 sourceBlock = revealBlock;

        // Just a sanity check (EVM only stores last 256 block hashes)
        if (block.number.sub(revealBlock) > 255) {
            sourceBlock = block.number-1;
        }

        uint256 randomness = uint(blockhash(sourceBlock));

        checkAndSetStartIdx(randomness);

        emit DistributionResult(0x0, 0, startingIndex);
    }

    /**
     * @dev checkAndSetStartIdx is an internal function which will take the generated randomness
     * @dev and calculate/set the startingIndex mapping value.
     *
     * @param _randomness uint256 generated randomness value from VOR etc.
     */
    function checkAndSetStartIdx(uint256 _randomness) internal {
        // calculate based on randomness
        startingIndex = _randomness.mod(MAX_NFT_SUPPLY-1);
        // Prevent default sequence
        if (startingIndex == 0) {
            startingIndex = startingIndex.add(1);
        }
        if (startingIndex > 1325) {
            startingIndex = 1325;
        }
    }

    /**
     * @dev fulfillRandomness is called by the VOR Oracle to fulfil the randomness request.
     * @dev The randomness value sent is used to calculate the start array Idx onto which
     * @dev hand IDs are mapped on to the NFT Token IDs.
     * @dev Can only be called by the correct VOR Oracle, and only via the VORCoordinator contract.
     *
     * @param _requestId bytes32 ID of the request fulfilled by the Oracle
     * @param _randomness uint256 the random number generated by the VOR Oracle
     */
    function fulfillRandomness(bytes32 _requestId, uint256 _randomness) internal override {
        require(startingIndex == 0, "already executed");
        checkAndSetStartIdx(_randomness);
        emit DistributionResult(_requestId, _randomness, startingIndex);
    }

    /**
     * @dev Returns true if a `leaf` can be proved to be a part of a Merkle tree
     * defined by `root`. For this, a `proof` must be provided, containing
     * sibling hashes on the branch from the leaf to the root of the tree. Each
     * pair of leaves and each pair of pre-images are assumed to be sorted.
     */
    function verifyMerkleProof(
        bytes32[] memory proof,
        bytes32 root,
        bytes32 leaf
    ) internal pure returns (bool) {
        bytes32 computedHash = leaf;

        for (uint256 i = 0; i < proof.length; i++) {
            bytes32 proofElement = proof[i];

            if (computedHash <= proofElement) {
                // Hash(current computed hash + current element of the proof)
                computedHash = keccak256(abi.encodePacked(computedHash, proofElement));
            } else {
                // Hash(current element of the proof + current computed hash)
                computedHash = keccak256(abi.encodePacked(proofElement, computedHash));
            }
        }

        // Check if the computed hash (root) is equal to the provided root
        return computedHash == root;
    }
}
