export const CHAMACIRCLE_ADDRESS = "0x7e95a47e10eBC0605b3ce04294a3324670C420Bd";

export const CHAMACIRCLE_ABI = [
  {
    "inputs": [
      { "internalType": "string", "name": "_code", "type": "string" },
      { "internalType": "address", "name": "_member", "type": "address" }
    ],
    "name": "approveMember",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_code", "type": "string" }
    ],
    "name": "contribute",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_code", "type": "string" },
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_chairmanName", "type": "string" },
      { "internalType": "string", "name": "_chairmanPhone", "type": "string" },
      { "internalType": "uint256", "name": "_minMembers", "type": "uint256" },
      { "internalType": "uint256", "name": "_maxMembers", "type": "uint256" },
      { "internalType": "uint256", "name": "_contributionAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "_cycle", "type": "uint256" }
    ],
    "name": "createGroup",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_code", "type": "string" },
      { "internalType": "string", "name": "_name", "type": "string" },
      { "internalType": "string", "name": "_phone", "type": "string" }
    ],
    "name": "requestJoin",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "name": "groups",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "address", "name": "admin", "type": "address" },
      { "internalType": "uint256", "name": "totalFunds", "type": "uint256" },
      { "internalType": "uint256", "name": "minMembers", "type": "uint256" },
      { "internalType": "uint256", "name": "maxMembers", "type": "uint256" },
      { "internalType": "uint256", "name": "contributionAmount", "type": "uint256" },
      { "internalType": "uint256", "name": "cycle", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "uint256", "name": "memberCount", "type": "uint256" },
      { "internalType": "uint256", "name": "payoutIndex", "type": "uint256" },
      { "internalType": "uint256", "name": "lastCycleStartTime", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "userGroups",
    "outputs": [
      { "internalType": "string", "name": "", "type": "string" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_user", "type": "address" }
    ],
    "name": "getUserGroups",
    "outputs": [
      { "internalType": "string[]", "name": "", "type": "string[]" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "members",
    "outputs": [
      { "internalType": "string", "name": "name", "type": "string" },
      { "internalType": "string", "name": "phone", "type": "string" },
      { "internalType": "bool", "name": "isApproved", "type": "bool" },
      { "internalType": "bool", "name": "hasContributed", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "pendingRequests",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "_code", "type": "string" }
    ],
    "name": "startCycle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "", "type": "string" },
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "name": "groupMembersList",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
];
