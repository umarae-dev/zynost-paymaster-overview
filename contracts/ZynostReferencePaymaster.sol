// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.23;

/* solhint-disable reason-string */
/* solhint-disable no-inline-assembly */

import "@account-abstraction/contracts/core/BasePaymaster.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

/// @title ZynostReferencePaymaster
/// @notice Public reference implementation of Zynost's ERC-4337 gas-sponsorship model.
/// @dev This is intentionally configured for reproducible local/testnet use. Production
/// signing policy, credentials, operational thresholds and abuse-detection systems are
/// not part of this repository.
contract ZynostReferencePaymaster is BasePaymaster {
    using ECDSA for bytes32;

    address public verifyingSigner;
    bool public sponsorshipPaused;

    uint256 public dailyCapPerSender;
    uint256 public globalDailyCap;

    uint256 public globalSpentToday;
    uint256 public globalDayStart;

    mapping(address => uint256) public spentToday;
    mapping(address => uint256) public senderDayStart;
    mapping(address => uint256) public senderNonce;

    uint256 private constant VALID_TIMESTAMP_OFFSET = 20;
    uint256 private constant COST_OFFSET = 84;
    uint256 private constant SIGNATURE_OFFSET = 116;

    event SponsorshipPausedSet(bool paused);
    event VerifyingSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event CapsUpdated(uint256 dailyCapPerSender, uint256 globalDailyCap);
    event SponsoredOperation(address indexed sender, uint256 actualGasCost);

    constructor(
        IEntryPoint _entryPoint,
        address _verifyingSigner,
        uint256 _dailyCapPerSender,
        uint256 _globalDailyCap
    ) BasePaymaster(_entryPoint) {
        require(_verifyingSigner != address(0), "invalid signer");
        verifyingSigner = _verifyingSigner;
        dailyCapPerSender = _dailyCapPerSender;
        globalDailyCap = _globalDailyCap;
    }

    function setVerifyingSigner(address newSigner) external onlyOwner {
        require(newSigner != address(0), "invalid signer");
        emit VerifyingSignerUpdated(verifyingSigner, newSigner);
        verifyingSigner = newSigner;
    }

    function setPaused(bool paused) external onlyOwner {
        sponsorshipPaused = paused;
        emit SponsorshipPausedSet(paused);
    }

    function setCaps(uint256 _dailyCapPerSender, uint256 _globalDailyCap) external onlyOwner {
        dailyCapPerSender = _dailyCapPerSender;
        globalDailyCap = _globalDailyCap;
        emit CapsUpdated(_dailyCapPerSender, _globalDailyCap);
    }

    /// @dev Mirrors the packing strategy used by the ERC-4337 reference
    /// VerifyingPaymaster: copy the UserOperation calldata up to but not
    /// including the paymasterAndData contents.
    function pack(UserOperation calldata userOp) internal pure returns (bytes memory ret) {
        bytes calldata pnd = userOp.paymasterAndData;
        assembly {
            let ofs := userOp
            let len := sub(sub(pnd.offset, ofs), 32)
            ret := mload(0x40)
            mstore(0x40, add(ret, add(len, 32)))
            mstore(ret, len)
            calldatacopy(add(ret, 32), ofs, len)
        }
    }

    /// @notice Hash signed by the off-chain sponsorship authorizer.
    /// @dev Binds approval to the operation, chain, paymaster address, sender nonce,
    /// validity window and explicit maximum sponsored cost.
    function getHash(
        UserOperation calldata userOp,
        uint48 validUntil,
        uint48 validAfter,
        uint256 maxSponsoredCost
    ) public view returns (bytes32) {
        return keccak256(
            abi.encode(
                pack(userOp),
                block.chainid,
                address(this),
                senderNonce[userOp.sender],
                validUntil,
                validAfter,
                maxSponsoredCost
            )
        );
    }

    /// @notice paymasterAndData layout:
    /// [0:20] address(this)
    /// [20:84] abi.encode(validUntil, validAfter)
    /// [84:116] abi.encode(maxSponsoredCost)
    /// [116:] signature
    function parsePaymasterAndData(bytes calldata paymasterAndData)
        public
        pure
        returns (
            uint48 validUntil,
            uint48 validAfter,
            uint256 maxSponsoredCost,
            bytes calldata signature
        )
    {
        (validUntil, validAfter) = abi.decode(
            paymasterAndData[VALID_TIMESTAMP_OFFSET:COST_OFFSET],
            (uint48, uint48)
        );
        maxSponsoredCost = abi.decode(
            paymasterAndData[COST_OFFSET:SIGNATURE_OFFSET],
            (uint256)
        );
        signature = paymasterAndData[SIGNATURE_OFFSET:];
    }

    function _validatePaymasterUserOp(
        UserOperation calldata userOp,
        bytes32 /* userOpHash */,
        uint256 maxCost
    ) internal override returns (bytes memory context, uint256 validationData) {
        require(!sponsorshipPaused, "ZynostPaymaster: sponsorship paused");

        (
            uint48 validUntil,
            uint48 validAfter,
            uint256 maxSponsoredCost,
            bytes calldata signature
        ) = parsePaymasterAndData(userOp.paymasterAndData);

        require(
            signature.length == 64 || signature.length == 65,
            "ZynostPaymaster: invalid signature length"
        );
        require(
            maxCost <= maxSponsoredCost,
            "ZynostPaymaster: cost exceeds approved max"
        );

        bytes32 hash = getHash(
            userOp,
            validUntil,
            validAfter,
            maxSponsoredCost
        ).toEthSignedMessageHash();

        // A signed envelope is single-use for this sender nonce.
        senderNonce[userOp.sender]++;

        if (verifyingSigner != hash.recover(signature)) {
            return ("", _packValidationData(true, validUntil, validAfter));
        }

        _rolloverSenderWindowIfNeeded(userOp.sender);
        _rolloverGlobalWindowIfNeeded();

        require(
            spentToday[userOp.sender] + maxCost <= dailyCapPerSender,
            "ZynostPaymaster: sender daily cap exceeded"
        );
        require(
            globalSpentToday + maxCost <= globalDailyCap,
            "ZynostPaymaster: global daily cap exceeded"
        );

        spentToday[userOp.sender] += maxCost;
        globalSpentToday += maxCost;

        context = abi.encode(userOp.sender);
        return (context, _packValidationData(false, validUntil, validAfter));
    }

    function _postOp(
        PostOpMode /* mode */,
        bytes calldata context,
        uint256 actualGasCost
    ) internal override {
        address sender = abi.decode(context, (address));
        emit SponsoredOperation(sender, actualGasCost);
    }

    function _rolloverSenderWindowIfNeeded(address sender) private {
        if (block.timestamp >= senderDayStart[sender] + 1 days) {
            senderDayStart[sender] = block.timestamp;
            spentToday[sender] = 0;
        }
    }

    function _rolloverGlobalWindowIfNeeded() private {
        if (block.timestamp >= globalDayStart + 1 days) {
            globalDayStart = block.timestamp;
            globalSpentToday = 0;
        }
    }
}
