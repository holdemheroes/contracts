// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;

import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/utils/Address.sol";


interface IVORConsumerBase {
    function rawFulfillRandomness(bytes32 requestId, uint256 randomness) external;
}


contract MockVORDeterministic {
    using SafeMath for uint256;
    using Address for address;

    struct ServiceAgreement {
        address payable vOROracle;
        uint96 fee;
        mapping(address => uint96) granularFees;
    }

    uint256 feePaid;
    mapping(bytes32 => ServiceAgreement) public serviceAgreements;
    mapping(bytes32 => mapping(address => uint256)) private nonces;
    mapping(bytes32 => address) private consumerContracts;

    constructor() {}

    function randomnessRequest(
        bytes32 _keyHash,
        uint256 _consumerSeed,
        uint256 _feePaid
    ) external {
        uint256 nonce = nonces[_keyHash][msg.sender];
        uint256 preSeed = uint256(keccak256(abi.encode(_keyHash, _consumerSeed, msg.sender, nonce)));
        bytes32 requestId = keccak256(abi.encodePacked(_keyHash, preSeed));
        nonces[_keyHash][msg.sender] = nonces[_keyHash][msg.sender].add(1);
        consumerContracts[requestId] = msg.sender;
        feePaid = _feePaid;
    }

    // mock fulfilRequest
    function fulfillRequest(bytes32 _requestId, uint256 _randomness) external {
        IVORConsumerBase v;
        bytes memory resp = abi.encodeWithSelector(v.rawFulfillRandomness.selector, _requestId, _randomness);
        (bool success, ) = consumerContracts[_requestId].call(resp);
        delete consumerContracts[_requestId];
        (success);
    }

    // used to check a receiving contract's fulfilRequest function "directly"
    function fulfillRequestUseSentContractAddress(bytes32 _requestId, uint256 _randomness, address _contractAddress) external {
        IVORConsumerBase v;
        bytes memory resp = abi.encodeWithSelector(v.rawFulfillRandomness.selector, _requestId, _randomness);
        _contractAddress.functionCall(resp);
    }

    function getProviderAddress(bytes32 _keyHash) external view returns (address) {
        return serviceAgreements[_keyHash].vOROracle;
    }

    function getProviderFee(bytes32 _keyHash) external view returns (uint96) {
        return serviceAgreements[_keyHash].fee;
    }

    function getProviderGranularFee(bytes32 _keyHash, address _consumer) external view returns (uint96) {
        if (serviceAgreements[_keyHash].granularFees[_consumer] > 0) {
            return serviceAgreements[_keyHash].granularFees[_consumer];
        } else {
            return serviceAgreements[_keyHash].fee;
        }
    }
}
