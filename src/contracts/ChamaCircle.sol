// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChamaCircle {
    struct MemberData {
        string name;
        string phone;
        bool isApproved;
        bool hasContributed;
    }

    struct Group {
        string name;
        address admin;
        uint totalFunds;
        uint minMembers;
        uint maxMembers;
        uint contributionAmount;
        uint cycle; // cycle in minutes for demo
        bool isActive;
        uint memberCount;
        uint payoutIndex; // Tracks whose turn it is to receive funds
        uint lastCycleStartTime; // On-chain countdown tracker
    }

    mapping(string => Group) public groups;
    string[] public allGroupCodes;
    
    // groupCode => array of approved member addresses (for round robin payouts)
    mapping(string => address[]) public groupMembersList;

    // groupCode => memberAddress => MemberData
    mapping(string => mapping(address => MemberData)) public members;
    
    // groupCode => memberAddress => bool
    mapping(string => mapping(address => bool)) public pendingRequests;

    // Tracks which groups a user belongs to
    mapping(address => string[]) public userGroups;

    function getUserGroups(address _user) public view returns (string[] memory) {
        return userGroups[_user];
    }

    function getAllGroups() public view returns (string[] memory) {
        return allGroupCodes;
    }

    function createGroup(
        string memory _code, 
        string memory _name, 
        string memory _chairmanName,
        string memory _chairmanPhone,
        uint _minMembers, 
        uint _maxMembers,
        uint _contributionAmount,
        uint _cycle
    ) public {
        require(groups[_code].admin == address(0), "Group code already exists");
        require(_maxMembers >= _minMembers, "Max members must be >= min members");
        
        groups[_code] = Group({
            name: _name,
            admin: msg.sender,
            totalFunds: 0,
            minMembers: _minMembers,
            maxMembers: _maxMembers,
            contributionAmount: _contributionAmount,
            cycle: _cycle,
            isActive: false,
            memberCount: 1,
            payoutIndex: 0,
            lastCycleStartTime: 0
        });

        // Admin is automatically approved and added, but hasn't contributed yet
        members[_code][msg.sender] = MemberData({
            name: _chairmanName,
            phone: _chairmanPhone,
            isApproved: true,
            hasContributed: false
        });
        
        // Add admin to the round robin list
        groupMembersList[_code].push(msg.sender);
        // Track this group for the admin
        userGroups[msg.sender].push(_code);
        // Track globally for the automation bot
        allGroupCodes.push(_code);
    }

    function requestJoin(string memory _code, string memory _name, string memory _phone) public {
        require(groups[_code].admin != address(0), "Group does not exist");
        require(!members[_code][msg.sender].isApproved, "Already a member");
        require(groups[_code].memberCount < groups[_code].maxMembers, "Group is full");
        
        pendingRequests[_code][msg.sender] = true;
        members[_code][msg.sender] = MemberData({
            name: _name,
            phone: _phone,
            isApproved: false,
            hasContributed: false
        });
    }

    function approveMember(string memory _code, address _member) public {
        require(msg.sender == groups[_code].admin, "Only Chairman can approve");
        require(pendingRequests[_code][_member], "No pending request");
        require(groups[_code].memberCount < groups[_code].maxMembers, "Group is full");
        
        pendingRequests[_code][_member] = false;
        members[_code][_member].isApproved = true;
        groups[_code].memberCount++;
        
        groupMembersList[_code].push(_member); // Add to payout list
        userGroups[_member].push(_code);       // Track this group for the user
        
        if(groups[_code].memberCount >= groups[_code].minMembers) {
            groups[_code].isActive = true;
            if(groups[_code].lastCycleStartTime == 0) {
                groups[_code].lastCycleStartTime = block.timestamp;
            }
        }
    }

    function contribute(string memory _code) public payable {
        require(members[_code][msg.sender].isApproved, "Not an approved member");
        require(!members[_code][msg.sender].hasContributed, "Already contributed");
        require(msg.value == groups[_code].contributionAmount, "Incorrect contribution amount");
        
        members[_code][msg.sender].hasContributed = true;
        groups[_code].totalFunds += msg.value;
    }

    function startCycle(string memory _code) public {
        require(groups[_code].totalFunds > 0, "No funds to payout");
        
        // Ensure the time limit has passed before allowing payout
        require(block.timestamp >= groups[_code].lastCycleStartTime + (groups[_code].cycle * 1 minutes), "Cycle time not reached");

        // Identify the next recipient
        address payable recipient = payable(groupMembersList[_code][groups[_code].payoutIndex]);
        uint payoutAmount = groups[_code].totalFunds;
        
        // Zero out the funds
        groups[_code].totalFunds = 0;
        
        // Increment the payout index (wrap around back to 0 if at the end)
        groups[_code].payoutIndex = (groups[_code].payoutIndex + 1) % groupMembersList[_code].length;
        
        // Reset everyone's contribution status for the next cycle
        for(uint i = 0; i < groupMembersList[_code].length; i++) {
            members[_code][groupMembersList[_code][i]].hasContributed = false;
        }

        // Reset the timer for the next cycle
        groups[_code].lastCycleStartTime = block.timestamp;

        // Transfer the funds to the recipient
        (bool success, ) = recipient.call{value: payoutAmount}("");
        require(success, "Transfer failed");
    }
}
