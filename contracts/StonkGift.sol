// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title StonkGift
 * @notice Time-locked tokenized stock gift protocol on Base.
 * Senders lock whitelisted stock tokens for a recipient with an unlock timestamp.
 * Recipients claim once unlocked. Senders can cancel before unlock, or reclaim
 * an unclaimed gift after a grace period has passed post-unlock.
 */
contract StonkGift is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    /// @dev Sentinel value for `unlockTime` meaning "no lock — claimable immediately".
    /// Gifts created with NO_LOCK can never be cancelled or reclaimed by the sender,
    /// since there is no lock period to measure a grace window from. Front ends
    /// integrating this contract should treat 0 as an explicit, deliberate choice,
    /// not a default/unset value.
    uint256 public constant NO_LOCK = 0;

    /// @dev How long after unlockTime a still-unclaimed gift can be reclaimed by
    /// its original sender. Protects against permanently stuck funds if a
    /// recipient loses access or the address was mistyped.
    uint256 public constant RECLAIM_GRACE_PERIOD = 180 days;

    /// @dev Cap on the on-chain gift message to bound storage growth.
    uint256 public constant MAX_MESSAGE_LENGTH = 500;

    struct Gift {
        address sender;
        address recipient;
        address claimSigner;
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

    event GiftCreatedWithLink(
        uint256 indexed giftId,
        address indexed sender,
        address indexed claimSigner,
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

    event GiftReclaimed(
        uint256 indexed giftId,
        address indexed sender
    );

    event TokenSupportUpdated(
        address indexed token,
        bool supported
    );

    error UnsupportedToken(address token);
    error InvalidRecipient();
    error InvalidClaimSigner();
    error InvalidAmount();
    error InvalidUnlockTime();
    error MessageTooLong();
    error AmountMismatch(uint256 expected, uint256 received);
    error GiftDoesNotExist();
    error NotRecipient();
    error NotLinkGift();
    error InvalidClaimSignature();
    error NotSender();
    error LockPeriodNotOver();
    error ClaimPeriodOver();
    error LockPeriodOver();
    error AlreadyClaimed();
    error AlreadyCancelled();
    error NoLockSet();
    error ReclaimTooEarly();

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
     * @param unlockTime Unix timestamp when the gift unlocks, or NO_LOCK (0) for
     * an immediately-claimable, non-cancellable gift.
     * @param message Personal message attached to the gift (max MAX_MESSAGE_LENGTH bytes).
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
        if (unlockTime != NO_LOCK && unlockTime <= block.timestamp) revert InvalidUnlockTime();
        if (bytes(message).length > MAX_MESSAGE_LENGTH) revert MessageTooLong();

        // Measure actual tokens received rather than trusting `amount`, so
        // fee-on-transfer / deflationary / rebasing tokens can't create a
        // shortfall that later bricks an unrelated gift's claim against the
        // contract's pooled balance of that token.
        uint256 balBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - balBefore;
        if (received != amount) revert AmountMismatch(amount, received);

        giftId = nextGiftId++;

        gifts[giftId] = Gift({
            sender: msg.sender,
            recipient: recipient,
            claimSigner: address(0),
            token: token,
            amount: amount,
            unlockTime: unlockTime,
            claimed: false,
            cancelled: false,
            message: message
        });

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
     * @notice Deposit tokens to create a shareable link/QR gift for an unknown recipient.
     * @param token Address of the tokenized stock ERC-20.
     * @param amount Amount of tokens to gift.
     * @param claimSigner Ephemeral public address authorized to sign the claim.
     * @param unlockTime Unix timestamp when the gift unlocks, or NO_LOCK (0) for immediate.
     * @param message Personal message attached to the gift (max MAX_MESSAGE_LENGTH bytes).
     */
    function createLinkGift(
        address token,
        uint256 amount,
        address claimSigner,
        uint256 unlockTime,
        string calldata message
    ) external nonReentrant returns (uint256 giftId) {
        if (!supportedTokens[token]) revert UnsupportedToken(token);
        if (claimSigner == address(0)) revert InvalidClaimSigner();
        if (amount == 0) revert InvalidAmount();
        if (unlockTime != NO_LOCK && unlockTime <= block.timestamp) revert InvalidUnlockTime();
        if (bytes(message).length > MAX_MESSAGE_LENGTH) revert MessageTooLong();

        uint256 balBefore = IERC20(token).balanceOf(address(this));
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);
        uint256 received = IERC20(token).balanceOf(address(this)) - balBefore;
        if (received != amount) revert AmountMismatch(amount, received);

        giftId = nextGiftId++;

        gifts[giftId] = Gift({
            sender: msg.sender,
            recipient: address(0),
            claimSigner: claimSigner,
            token: token,
            amount: amount,
            unlockTime: unlockTime,
            claimed: false,
            cancelled: false,
            message: message
        });

        emit GiftCreated(
            giftId,
            msg.sender,
            address(0),
            token,
            amount,
            unlockTime,
            message
        );

        emit GiftCreatedWithLink(
            giftId,
            msg.sender,
            claimSigner,
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
        if (gift.unlockTime != NO_LOCK) {
            if (block.timestamp < gift.unlockTime) revert LockPeriodNotOver();
            if (block.timestamp >= gift.unlockTime + RECLAIM_GRACE_PERIOD) revert ClaimPeriodOver();
        }
        if (gift.claimed) revert AlreadyClaimed();
        if (gift.cancelled) revert AlreadyCancelled();

        gift.claimed = true;

        IERC20(gift.token).safeTransfer(gift.recipient, gift.amount);

        emit GiftClaimed(giftId, msg.sender);
    }

    /**
     * @notice Claim a link gift using a signature produced by the ephemeral private key.
     * @dev Frontrunning-immune: the signature binds explicitly to (giftId, msg.sender, block.chainid).
     * @param giftId ID of the gift.
     * @param signature ECDSA signature over keccak256(abi.encodePacked(giftId, msg.sender, block.chainid)).
     */
    function claimGiftWithSignature(uint256 giftId, bytes calldata signature) external nonReentrant {
        Gift storage gift = gifts[giftId];
        if (gift.sender == address(0)) revert GiftDoesNotExist();
        if (gift.claimSigner == address(0)) revert NotLinkGift();
        if (gift.unlockTime != NO_LOCK) {
            if (block.timestamp < gift.unlockTime) revert LockPeriodNotOver();
            if (block.timestamp >= gift.unlockTime + RECLAIM_GRACE_PERIOD) revert ClaimPeriodOver();
        }
        if (gift.claimed) revert AlreadyClaimed();
        if (gift.cancelled) revert AlreadyCancelled();

        bytes32 messageHash = keccak256(abi.encodePacked(giftId, msg.sender, block.chainid));
        bytes32 ethSignedMessageHash = MessageHashUtils.toEthSignedMessageHash(messageHash);
        address recoveredSigner = ECDSA.recover(ethSignedMessageHash, signature);

        if (recoveredSigner != gift.claimSigner) revert InvalidClaimSignature();

        gift.claimed = true;
        gift.recipient = msg.sender;

        IERC20(gift.token).safeTransfer(msg.sender, gift.amount);

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
        if (gift.unlockTime == NO_LOCK || block.timestamp >= gift.unlockTime) revert LockPeriodOver();
        if (gift.claimed) revert AlreadyClaimed();
        if (gift.cancelled) revert AlreadyCancelled();

        gift.cancelled = true;

        IERC20(gift.token).safeTransfer(gift.sender, gift.amount);

        emit GiftCancelled(giftId, msg.sender);
    }

    /**
     * @notice Reclaim a gift that unlocked but was never claimed, once the grace
     * period has elapsed. Prevents funds from being stuck forever if a recipient
     * loses access to their wallet or was mistyped. Not available for NO_LOCK
     * gifts, since there is no unlock timestamp to measure the grace period from.
     * @param giftId ID of the gift.
     */
    function reclaimUnclaimedGift(uint256 giftId) external nonReentrant {
        Gift storage gift = gifts[giftId];
        if (gift.sender == address(0)) revert GiftDoesNotExist();
        if (msg.sender != gift.sender) revert NotSender();
        if (gift.claimed) revert AlreadyClaimed();
        if (gift.cancelled) revert AlreadyCancelled();
        if (gift.unlockTime == NO_LOCK) revert NoLockSet();
        if (block.timestamp < gift.unlockTime + RECLAIM_GRACE_PERIOD) revert ReclaimTooEarly();

        gift.cancelled = true;

        IERC20(gift.token).safeTransfer(gift.sender, gift.amount);

        emit GiftReclaimed(giftId, msg.sender);
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
            (gift.unlockTime == NO_LOCK || block.timestamp >= gift.unlockTime)
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
            gift.unlockTime != NO_LOCK &&
            block.timestamp < gift.unlockTime
        );
    }

    /**
     * @notice Check if an unclaimed, locked gift is currently eligible for
     * reclaim by the sender (i.e. the grace period after unlock has passed).
     */
    function isReclaimable(uint256 giftId) external view returns (bool) {
        Gift memory gift = gifts[giftId];
        return (
            gift.sender != address(0) &&
            !gift.claimed &&
            !gift.cancelled &&
            gift.unlockTime != NO_LOCK &&
            block.timestamp >= gift.unlockTime + RECLAIM_GRACE_PERIOD
        );
    }
}