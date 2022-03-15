// SPDX-License-Identifier: MIT
pragma solidity >=0.8.9;


// inspired by https://medium.com/coinmonks/value-arrays-in-solidity-32ca65135d5b
library uint16a4 { // provides the equivalent of uint16[4]
    uint constant bits = 16;
    uint constant elements = 4;
    // must ensure that bits * elements <= 256

    uint constant range = 1 << bits;
    uint constant max = range - 1;
    // get function
    function get(uint va, uint index) internal pure returns (uint) {
        require(index < elements);
        return (va >> (bits * index)) & max;
    }

    // set function
    function set(uint va, uint index, uint ev) internal pure
    returns (uint) {
        require(index < elements);
        require(ev < range);
        index *= bits;
        return (va & ~(max << index)) | (ev << index);
    }
}
