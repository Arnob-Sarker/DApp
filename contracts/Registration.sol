// SPDX-License-Identifier: MIT
pragma solidity >=0.7.0 <0.9.0;

contract Registration {
    struct User {
        address walletAddress;
        bool isRegistered;
        bool isEmailVerified;
        uint256 registrationTimestamp;
        uint256 lastUpdateTimestamp;
    }

    mapping(address => User) public userList;
    mapping(address => bool) public registeredAddresses;
    
    event UserRegistrationRequested(address indexed userAddress, uint256 timestamp);
    event UserRegistered(address indexed userAddress, uint256 timestamp);
    event EmailVerified(address indexed userAddress, uint256 timestamp);
    event UserUpdated(address indexed userAddress, uint256 timestamp);

    modifier notRegistered() {
        require(!userList[msg.sender].isRegistered, "You are already registered");
        _;
    }

    modifier isRegistered() {
        require(userList[msg.sender].isRegistered, "User not registered");
        _;
    }

    modifier isEmailVerified() {
        require(userList[msg.sender].isEmailVerified, "Email not verified");
        _;
    }

    // Step 3: Email Verification - Store minimal data on blockchain
    function completeRegistration() external notRegistered returns (bool) {
        address sender = msg.sender;
        
        // Create user record with minimal data
        userList[sender] = User({
            walletAddress: sender,
            isRegistered: true,
            isEmailVerified: true,
            registrationTimestamp: block.timestamp,
            lastUpdateTimestamp: block.timestamp
        });

        registeredAddresses[sender] = true;
        
        emit UserRegistrationRequested(sender, block.timestamp);
        emit UserRegistered(sender, block.timestamp);
        emit EmailVerified(sender, block.timestamp);
        
        return true;
    }

    // Update user status (for future use)
    function updateUserStatus() external isRegistered {
        address sender = msg.sender;
        userList[sender].lastUpdateTimestamp = block.timestamp;
        emit UserUpdated(sender, block.timestamp);
    }

    // Check if user is registered
    function checkIfRegistered(address userAddress) external view returns (bool) {
        return userList[userAddress].isRegistered;
    }

    // Check if user's email is verified
    function checkIfEmailVerified(address userAddress) external view returns (bool) {
        return userList[userAddress].isEmailVerified;
    }

    // Get minimal user info (only blockchain data)
    function getUserInfo(address userAddress) external view returns (
        address walletAddress,
        bool registered,
        bool emailVerified,
        uint256 registrationTimestamp,
        uint256 lastUpdateTimestamp
    ) {
        User memory user = userList[userAddress];
        return (
            user.walletAddress,
            user.isRegistered,
            user.isEmailVerified,
            user.registrationTimestamp,
            user.lastUpdateTimestamp
        );
    }

    // Check if address is in registered addresses list
    function isAddressRegistered(address userAddress) external view returns (bool) {
        return registeredAddresses[userAddress];
    }

    // Get total number of registered users
    function getTotalRegisteredUsers() external view returns (uint256) {
        // This would require additional logic to track count
        // For now, we can only check individual addresses
        return 0; // Placeholder
    }

    // Emergency function to remove user (only for admin in future versions)
    // This would require access control modifiers
    function removeUser(address userAddress) external {
        // This should only be callable by admin
        // For now, we'll leave it as a placeholder
        require(false, "Admin function - not implemented");
    }
}