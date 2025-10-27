// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract CreditChain {
    struct Insight {
        string tip;
        string body;
        string category;
        string hashedId;
        uint256 timestamp;
        uint256 upvotes;
    }

    Insight[] public insights;
    mapping(uint256 => mapping(address => bool)) public hasUpvoted;

    // 🧠 Include on-chain ID (index) in the event
    event InsightAdded(
        uint256 indexed id,       // new on-chain ID
        string tip, 
        string body,
        string category, 
        string hashedId, 
        uint256 timestamp
    );

    event InsightUpvoted(uint256 indexed id, uint256 newUpvoteCount);

    // 🚀 Add new insight + emit its on-chain ID
    function addInsight(
        string memory _tip, 
        string memory _body, 
        string memory _category, 
        string memory _hashedId
    ) public {
        insights.push(
            Insight(_tip, _body, _category, _hashedId, block.timestamp, 0)
        );

        uint256 newId = insights.length - 1;

        emit InsightAdded(
            newId,
            _tip, 
            _body, 
            _category, 
            _hashedId, 
            block.timestamp
        );
    }

    // ❤️ Upvote system with protection
    function upvoteInsight(uint256 id) public {
        require(id < insights.length, "Insight does not exist");
        require(!hasUpvoted[id][msg.sender], "Already upvoted");

        insights[id].upvotes += 1;
        hasUpvoted[id][msg.sender] = true;

        emit InsightUpvoted(id, insights[id].upvotes);
    }

    // 📜 View all insights
    function getInsights() public view returns (Insight[] memory) {
        return insights;
    }
}
