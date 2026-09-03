// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title StonkGift
 * @notice Time-locked tokenized stock gift protocol on Base.
 * Senders lock whitelisted stock tokens for a recipient with an unlock timestamp.
 * Recipients claim once unlocked. Senders can cancel before unlock.
 */
contract StonkGift is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    struct Gift {
        address sender;
        address recipient;
        address token;
        uint256 amount;
        uint256 unlockTime;
        bool claimed;
        bool cancelled;
        string message;
    }

    uint256 public nextGiftId = 1;

    mapping(uint256 => Gift) public gifts;
    mapping(address => bool) public supportedTokens;

    event GiftCreated(
        uint256 indexed giftId,
        address indexed sender,
        address indexed recipient,
        address token,
        uint256 amount,
        uint256 unlockTime,
        string message
    );

    event GiftClaimed(
        uint256 indexed giftId,
        address indexed recipient
    );

    event GiftCancelled(
        uint256 indexed giftId,
        address indexed sender
    );

    event TokenSupportUpdated(
        address indexed token,
        bool supported
    );

    error UnsupportedToken(address token);
    error InvalidRecipient();
    error InvalidAmount();
    error InvalidUnlockTime();
    error GiftDoesNotExist();
    error NotRecipient();
    error NotSender();
    error LockPeriodNotOver();
    error LockPeriodOver();
    error AlreadyClaimed();
    error AlreadyCancelled();

    constructor() Ownable(msg.sender) {}

    /**
     * @notice Add or remove a tokenized stock from the whitelist.
     * @param token Address of the ERC20 token.
     * @param supported Boolean indicating if the token is accepted.
     */
    function setSupportedToken(address token, bool supported) external onlyOwner {
        supportedTokens[token] = supported;
        emit TokenSupportUpdated(token, supported);
    }

    /**
     * @notice Deposit tokens to create a time-locked gift for a recipient.
     * @param token Address of the tokenized stock ERC-20.
     * @param amount Amount of tokens to gift.
     * @param recipient Address of the gift receiver.
     * @param unlockTime Unix timestamp when the gift unlocks.
     * @param message Personal message attached to the gift.
     */
    function createGift(
        address token,
        uint256 amount,
        address recipient,
        uint256 unlockTime,
        string calldata message
    ) external nonReentrant returns (uint256 giftId) {
        if (!supportedTokens[token]) revert UnsupportedToken(token);
        if (recipient == address(0)) revert InvalidRecipient();
        if (amount == 0) revert InvalidAmount();
        if (unlockTime != 0 && unlockTime <= block.timestamp) revert InvalidUnlockTime();

        giftId = nextGiftId++;

        gifts[giftId] = Gift({
            sender: msg.sender,
            recipient: recipient,
            token: token,
            amount: amount,
            unlockTime: unlockTime,
            claimed: false,
            cancelled: false,
            message: message
        });

        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        emit GiftCreated(
            giftId,
            msg.sender,
            recipient,
            token,
            amount,
            unlockTime,
            message
        );
    }

    /**
     * @notice Claim a gift once the unlock timestamp has arrived.
     * @param giftId ID of the gift.
     */
    function claimGift(uint256 giftId) external nonReentrant {
        Gift storage gift = gifts[giftId];
        if (gift.sender == address(0)) revert GiftDoesNotExist();
        if (msg.sender != gift.recipient) revert NotRecipient();
        if (gift.unlockTime != 0 && block.timestamp < gift.unlockTime) revert LockPeriodNotOver();
        if (gift.claimed) revert AlreadyClaimed();
        if (gift.cancelled) revert AlreadyCancelled();

        gift.claimed = true;

        IERC20(gift.token).safeTransfer(gift.recipient, gift.amount);

        emit GiftClaimed(giftId, msg.sender);
    }

    /**
     * @notice Cancel a gift before the unlock timestamp and retrieve deposited tokens.
     * @param giftId ID of the gift.
     */
    function cancelGift(uint256 giftId) external nonReentrant {
        Gift storage gift = gifts[giftId];
        if (gift.sender == address(0)) revert GiftDoesNotExist();
        if (msg.sender != gift.sender) revert NotSender();
        if (gift.unlockTime == 0 || block.timestamp >= gift.unlockTime) revert LockPeriodOver();
        if (gift.claimed) revert AlreadyClaimed();
        if (gift.cancelled) revert AlreadyCancelled();

        gift.cancelled = true;

        IERC20(gift.token).safeTransfer(gift.sender, gift.amount);

        emit GiftCancelled(giftId, msg.sender);
    }

    /**
     * @notice Helper to fetch complete gift data by ID.
     */
    function getGift(uint256 giftId) external view returns (Gift memory) {
        Gift memory gift = gifts[giftId];
        if (gift.sender == address(0)) revert GiftDoesNotExist();
        return gift;
    }

    /**
     * @notice Check if a gift is currently eligible for claiming.
     */
    function isClaimable(uint256 giftId) external view returns (bool) {
        Gift memory gift = gifts[giftId];
        return (
            gift.sender != address(0) &&
            !gift.claimed &&
            !gift.cancelled &&
            (gift.unlockTime == 0 || block.timestamp >= gift.unlockTime)
        );
    }

    /**
     * @notice Check if a gift is currently eligible for cancellation by the sender.
     */
    function isCancellable(uint256 giftId) external view returns (bool) {
        Gift memory gift = gifts[giftId];
        return (
            gift.sender != address(0) &&
            !gift.claimed &&
            !gift.cancelled &&
            gift.unlockTime != 0 &&
            block.timestamp < gift.unlockTime
        );
    }
}
