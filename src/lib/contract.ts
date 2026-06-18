export const CONTRACT_ADDRESS = "0xPLACEHOLDER"; // TODO: paste real ABI after deployment

// ABI for the ChainChama smart contract
export const CONTRACT_ABI = [
  "function joinGroup(string _name) external",
  "function startGroup() external",
  "function contribute() external payable",
  "function triggerPayout() external",
  "function getMembers() external view returns (address[])",
  "function getMemberCount() external view returns (uint256)",
  "function getCycleHistory() external view returns (tuple(uint256 cycleNumber, address recipient, uint256 amountPaid, uint256 timestamp)[])",
  "function getBalance() external view returns (uint256)",
  "function getCurrentRecipient() external view returns (address)",
  "function getContributionStatus() external view returns (address[] members, bool[] hasContributed)",
  "function getMemberDetails(address member) external view returns (string name, uint256 totalContributed, bool hasReceivedPayout, bool contributedThisCycle)",
  "function timeUntilDeadline() external view returns (uint256)",
  "function groupName() external view returns (string)",
  "function admin() external view returns (address)",
  "function contributionAmount() external view returns (uint256)",
  "function maxMembers() external view returns (uint256)",
  "function currentCycle() external view returns (uint256)",
  "function cycleDeadline() external view returns (uint256)",
  "function isActive() external view returns (bool)"
];
