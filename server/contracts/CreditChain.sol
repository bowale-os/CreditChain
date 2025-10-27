// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

contract CreditChain {
    struct Insight {
        string tip;
        string category;
        string hashedId;
        uint256 timestamp;
        uint256 upvotes;
    }

    Insight[] public insights;
    mapping(uint256 => mapping(address => bool)) public hasUpvoted;

    event InsightAdded(string tip, string category, string hashedId, uint256 timestamp);
    event InsightUpvoted(uint256 index, uint256 newUpvoteCount);


    function addInsight(string memory _tip, string memory _category, string memory _hashedId) public {
        insights.push(Insight(_tip, _category, _hashedId, block.timestamp, 0));
        emit InsightAdded(_tip, _category, _hashedId, block.timestamp);
    }

    function upvoteInsight(uint256 index) public {
        require(index < insights.length, "Insight does not exist");
        require(!hasUpvoted[index][msg.sender], "Already upvoted");

        insights[index].upvotes += 1;
        hasUpvoted[index][msg.sender] = true;

        emit InsightUpvoted(index, insights[index].upvotes);

    }

    function getInsights() public view returns (Insight[] memory) {
        return insights;
    }

}