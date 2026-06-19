// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract ChainChama {
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
        uint contributionAmount;
        bool isActive;
        uint memberCount;
    }

    mapping(string => Group) public groups;
    // groupCode => memberAddress => MemberData
    mapping(string => mapping(address => MemberData)) public members;
    
    // groupCode => memberAddress => bool
    mapping(string => mapping(address => bool)) public pendingRequests;

    function createGroup(
        string memory _code, 
        string memory _name, 
        uint _minMembers, 
        uint _contributionAmount
    ) public {
        require(groups[_code].admin == address(0), "Group code already exists");
        
        groups[_code] = Group({
            name: _name,
            admin: msg.sender,
            totalFunds: 0,
            minMembers: _minMembers,
            contributionAmount: _contributionAmount,
            isActive: false,
            memberCount: 1
        });

        // Admin is automatically approved and added, but hasn't contributed yet
        members[_code][msg.sender] = MemberData({
            name: "Chairman",
            phone: "",
            isApproved: true,
            hasContributed: false
        });
    }

    function requestJoin(string memory _code, string memory _name, string memory _phone) public {
        require(groups[_code].admin != address(0), "Group does not exist");
        require(!members[_code][msg.sender].isApproved, "Already a member");
        
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
        
        pendingRequests[_code][_member] = false;
        members[_code][_member].isApproved = true;
        groups[_code].memberCount++;
        
        if(groups[_code].memberCount >= groups[_code].minMembers) {
            groups[_code].isActive = true;
        }
    }

    function contribute(string memory _code) public payable {
        require(members[_code][msg.sender].isApproved, "Not an approved member");
        require(!members[_code][msg.sender].hasContributed, "Already contributed");
        require(msg.value == groups[_code].contributionAmount, "Incorrect contribution amount");
        
        members[_code][msg.sender].hasContributed = true;
        groups[_code].totalFunds += msg.value;
    }
}
