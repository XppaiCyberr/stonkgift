const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("StonkGift Contract", function () {
  let stonkGift;
  let mockNvda;
  let owner;
  let sender;
  let recipient;
  let stranger;

  const INITIAL_SUPPLY = ethers.parseUnits("1000", 18);
  const GIFT_AMOUNT = ethers.parseUnits("0.05", 18); // 0.05 NVDA from buildplan example

  beforeEach(async function () {
    [owner, sender, recipient, stranger] = await ethers.getSigners();

    // Deploy Mock NVDA token (18 decimals)
    const MockStock = await ethers.getContractFactory("MockStockToken");
    mockNvda = await MockStock.deploy("Tokenized NVIDIA", "NVDA", 18, INITIAL_SUPPLY);
    await mockNvda.waitForDeployment();

    // Deploy StonkGift
    const StonkGift = await ethers.getContractFactory("contracts/StonkGift.sol:StonkGift");
    stonkGift = await StonkGift.deploy();
    await stonkGift.waitForDeployment();

    // Whitelist NVDA
    await stonkGift.setSupportedToken(await mockNvda.getAddress(), true);

    // Transfer some NVDA to sender
    await mockNvda.transfer(sender.address, ethers.parseUnits("100", 18));

    // Sender approves StonkGift contract
    await mockNvda.connect(sender).approve(await stonkGift.getAddress(), ethers.MaxUint256);
  });

  describe("Token Whitelisting", function () {
    it("Allows owner to whitelist and remove supported tokens", async function () {
      const tokenAddr = await mockNvda.getAddress();
      expect(await stonkGift.supportedTokens(tokenAddr)).to.be.true;

      await stonkGift.setSupportedToken(tokenAddr, false);
      expect(await stonkGift.supportedTokens(tokenAddr)).to.be.false;

      await stonkGift.setSupportedToken(tokenAddr, true);
      expect(await stonkGift.supportedTokens(tokenAddr)).to.be.true;
    });

    it("Reverts if non-owner attempts to whitelist tokens", async function () {
      await expect(
        stonkGift.connect(sender).setSupportedToken(await mockNvda.getAddress(), false)
      ).to.be.revertedWithCustomError(stonkGift, "OwnableUnauthorizedAccount");
    });
  });

  describe("Creating Gifts", function () {
    it("Successfully creates a gift and transfers tokens into custody", async function () {
      const now = await time.latest();
      const unlockTime = now + 3600; // 1 hour in future
      const message = "Happy birthday! Here is some NVDA stock.";

      const initialContractBalance = await mockNvda.balanceOf(await stonkGift.getAddress());
      const initialSenderBalance = await mockNvda.balanceOf(sender.address);

      const tx = await stonkGift.connect(sender).createGift(
        await mockNvda.getAddress(),
        GIFT_AMOUNT,
        recipient.address,
        unlockTime,
        message
      );

      await expect(tx)
        .to.emit(stonkGift, "GiftCreated")
        .withArgs(
          1,
          sender.address,
          recipient.address,
          await mockNvda.getAddress(),
          GIFT_AMOUNT,
          unlockTime,
          message
        );

      expect(await mockNvda.balanceOf(await stonkGift.getAddress())).to.equal(
        initialContractBalance + GIFT_AMOUNT
      );
      expect(await mockNvda.balanceOf(sender.address)).to.equal(
        initialSenderBalance - GIFT_AMOUNT
      );

      const gift = await stonkGift.getGift(1);
      expect(gift.sender).to.equal(sender.address);
      expect(gift.recipient).to.equal(recipient.address);
      expect(gift.token).to.equal(await mockNvda.getAddress());
      expect(gift.amount).to.equal(GIFT_AMOUNT);
      expect(gift.unlockTime).to.equal(unlockTime);
      expect(gift.claimed).to.be.false;
      expect(gift.cancelled).to.be.false;
      expect(gift.message).to.equal(message);
    });

    it("Reverts when token is not supported", async function () {
      const MockStock = await ethers.getContractFactory("MockStockToken");
      const unapprovedToken = await MockStock.deploy("Fake Stock", "FAKE", 18, INITIAL_SUPPLY);
      await unapprovedToken.waitForDeployment();

      const now = await time.latest();
      await expect(
        stonkGift.connect(sender).createGift(
          await unapprovedToken.getAddress(),
          GIFT_AMOUNT,
          recipient.address,
          now + 3600,
          "Fake gift"
        )
      ).to.be.revertedWithCustomError(stonkGift, "UnsupportedToken");
    });

    it("Reverts if recipient is zero address", async function () {
      const now = await time.latest();
      await expect(
        stonkGift.connect(sender).createGift(
          await mockNvda.getAddress(),
          GIFT_AMOUNT,
          ethers.ZeroAddress,
          now + 3600,
          "Gift"
        )
      ).to.be.revertedWithCustomError(stonkGift, "InvalidRecipient");
    });

    it("Reverts if amount is zero", async function () {
      const now = await time.latest();
      await expect(
        stonkGift.connect(sender).createGift(
          await mockNvda.getAddress(),
          0,
          recipient.address,
          now + 3600,
          "Gift"
        )
      ).to.be.revertedWithCustomError(stonkGift, "InvalidAmount");
    });

    it("Reverts if unlockTime is in the past or current time", async function () {
      const now = await time.latest();
      await expect(
        stonkGift.connect(sender).createGift(
          await mockNvda.getAddress(),
          GIFT_AMOUNT,
          recipient.address,
          now,
          "Gift"
        )
      ).to.be.revertedWithCustomError(stonkGift, "InvalidUnlockTime");
    });
  });

  describe("Claiming Gifts", function () {
    let unlockTime;

    beforeEach(async function () {
      const now = await time.latest();
      unlockTime = now + 3600; // 1 hour
      await stonkGift.connect(sender).createGift(
        await mockNvda.getAddress(),
        GIFT_AMOUNT,
        recipient.address,
        unlockTime,
        "Gift for you"
      );
    });

    it("Cannot claim early before unlock time", async function () {
      expect(await stonkGift.isClaimable(1)).to.be.false;

      await expect(
        stonkGift.connect(recipient).claimGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "LockPeriodNotOver");
    });

    it("Wrong wallet cannot claim", async function () {
      await time.increaseTo(unlockTime + 1);

      await expect(
        stonkGift.connect(stranger).claimGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "NotRecipient");

      await expect(
        stonkGift.connect(sender).claimGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "NotRecipient");
    });

    it("Recipient can claim after unlock time and receives tokens", async function () {
      await time.increaseTo(unlockTime + 1);
      expect(await stonkGift.isClaimable(1)).to.be.true;

      const recipientBalBefore = await mockNvda.balanceOf(recipient.address);
      const contractBalBefore = await mockNvda.balanceOf(await stonkGift.getAddress());

      const tx = await stonkGift.connect(recipient).claimGift(1);

      await expect(tx)
        .to.emit(stonkGift, "GiftClaimed")
        .withArgs(1, recipient.address);

      expect(await mockNvda.balanceOf(recipient.address)).to.equal(
        recipientBalBefore + GIFT_AMOUNT
      );
      expect(await mockNvda.balanceOf(await stonkGift.getAddress())).to.equal(
        contractBalBefore - GIFT_AMOUNT
      );

      const gift = await stonkGift.getGift(1);
      expect(gift.claimed).to.be.true;
      expect(await stonkGift.isClaimable(1)).to.be.false;
    });

    it("Cannot claim twice", async function () {
      await time.increaseTo(unlockTime + 1);
      await stonkGift.connect(recipient).claimGift(1);

      await expect(
        stonkGift.connect(recipient).claimGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "AlreadyClaimed");
    });

    it("Cannot claim if gift was cancelled", async function () {
      await stonkGift.connect(sender).cancelGift(1);
      await time.increaseTo(unlockTime + 1);

      await expect(
        stonkGift.connect(recipient).claimGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "AlreadyCancelled");
    });
  });

  describe("Cancelling Gifts", function () {
    let unlockTime;

    beforeEach(async function () {
      const now = await time.latest();
      unlockTime = now + 3600;
      await stonkGift.connect(sender).createGift(
        await mockNvda.getAddress(),
        GIFT_AMOUNT,
        recipient.address,
        unlockTime,
        "Gift to cancel"
      );
    });

    it("Sender can cancel before unlock time and receives refund", async function () {
      expect(await stonkGift.isCancellable(1)).to.be.true;

      const senderBalBefore = await mockNvda.balanceOf(sender.address);
      const contractBalBefore = await mockNvda.balanceOf(await stonkGift.getAddress());

      const tx = await stonkGift.connect(sender).cancelGift(1);

      await expect(tx)
        .to.emit(stonkGift, "GiftCancelled")
        .withArgs(1, sender.address);

      expect(await mockNvda.balanceOf(sender.address)).to.equal(
        senderBalBefore + GIFT_AMOUNT
      );
      expect(await mockNvda.balanceOf(await stonkGift.getAddress())).to.equal(
        contractBalBefore - GIFT_AMOUNT
      );

      const gift = await stonkGift.getGift(1);
      expect(gift.cancelled).to.be.true;
      expect(await stonkGift.isCancellable(1)).to.be.false;
    });

    it("Non-sender cannot cancel gift", async function () {
      await expect(
        stonkGift.connect(stranger).cancelGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "NotSender");

      await expect(
        stonkGift.connect(recipient).cancelGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "NotSender");
    });

    it("Sender cannot cancel after unlock time has passed", async function () {
      await time.increaseTo(unlockTime);
      expect(await stonkGift.isCancellable(1)).to.be.false;

      await expect(
        stonkGift.connect(sender).cancelGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "LockPeriodOver");
    });

    it("Cannot cancel a gift twice", async function () {
      await stonkGift.connect(sender).cancelGift(1);

      await expect(
        stonkGift.connect(sender).cancelGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "AlreadyCancelled");
    });

    it("Cannot cancel after already claimed", async function () {
      await time.increaseTo(unlockTime + 1);
      await stonkGift.connect(recipient).claimGift(1);

      await expect(
        stonkGift.connect(sender).cancelGift(1)
      ).to.be.revertedWithCustomError(stonkGift, "LockPeriodOver");
    });
  });

  describe("Instant / Unlocked Gifts (No Lock Option)", function () {
    let giftId;

    beforeEach(async function () {
      // Create gift with unlockTime = 0 (immediately unlocked)
      const tx = await stonkGift.connect(sender).createGift(
        await mockNvda.getAddress(),
        GIFT_AMOUNT,
        recipient.address,
        0, // unlockTime = 0 means NO LOCK
        "Instant gift without lock!"
      );
      const receipt = await tx.wait();
      giftId = 1;
    });

    it("Is immediately claimable upon creation", async function () {
      expect(await stonkGift.isClaimable(giftId)).to.be.true;
    });

    it("Is not cancellable by sender", async function () {
      expect(await stonkGift.isCancellable(giftId)).to.be.false;

      await expect(
        stonkGift.connect(sender).cancelGift(giftId)
      ).to.be.revertedWithCustomError(stonkGift, "LockPeriodOver");
    });

    it("Recipient can claim immediately without waiting for timestamp", async function () {
      const recipientBalBefore = await mockNvda.balanceOf(recipient.address);

      await expect(stonkGift.connect(recipient).claimGift(giftId))
        .to.emit(stonkGift, "GiftClaimed")
        .withArgs(giftId, recipient.address);

      expect(await mockNvda.balanceOf(recipient.address)).to.equal(
        recipientBalBefore + GIFT_AMOUNT
      );

      const gift = await stonkGift.getGift(giftId);
      expect(gift.claimed).to.be.true;
      expect(await stonkGift.isClaimable(giftId)).to.be.false;
    });

    it("Reclaiming a NO_LOCK gift reverts with NoLockSet", async function () {
      await expect(
        stonkGift.connect(sender).reclaimUnclaimedGift(giftId)
      ).to.be.revertedWithCustomError(stonkGift, "NoLockSet");
    });
  });

  describe("Security Enhancements & Grace Period Reclaim", function () {
    it("Reverts if message exceeds MAX_MESSAGE_LENGTH (500 bytes)", async function () {
      const now = await time.latest();
      const longMessage = "a".repeat(501);

      await expect(
        stonkGift.connect(sender).createGift(
          await mockNvda.getAddress(),
          GIFT_AMOUNT,
          recipient.address,
          now + 3600,
          longMessage
        )
      ).to.be.revertedWithCustomError(stonkGift, "MessageTooLong");
    });

    it("Sender cannot reclaim before unlockTime + 180 days", async function () {
      const now = await time.latest();
      const unlockTime = now + 86400; // 1 day from now

      await stonkGift.connect(sender).createGift(
        await mockNvda.getAddress(),
        GIFT_AMOUNT,
        recipient.address,
        unlockTime,
        "Grace test"
      );
      const giftId = 1;

      // Fast forward past unlock, but before 180 days
      await time.increaseTo(unlockTime + 100);

      expect(await stonkGift.isReclaimable(giftId)).to.be.false;
      await expect(
        stonkGift.connect(sender).reclaimUnclaimedGift(giftId)
      ).to.be.revertedWithCustomError(stonkGift, "ReclaimTooEarly");
    });

    it("Recipient cannot claim after 180 days grace period has passed", async function () {
      const now = await time.latest();
      const unlockTime = now + 86400;

      await stonkGift.connect(sender).createGift(
        await mockNvda.getAddress(),
        GIFT_AMOUNT,
        recipient.address,
        unlockTime,
        "Expired claim test"
      );
      const giftId = 1;

      // Advance time past unlockTime + 180 days
      const gracePeriod = 180 * 24 * 3600;
      await time.increaseTo(unlockTime + gracePeriod + 1);

      await expect(
        stonkGift.connect(recipient).claimGift(giftId)
      ).to.be.revertedWithCustomError(stonkGift, "ClaimPeriodOver");
    });

    it("Sender can reclaim unclaimed gift after 180 days grace period", async function () {
      const now = await time.latest();
      const unlockTime = now + 86400;

      await stonkGift.connect(sender).createGift(
        await mockNvda.getAddress(),
        GIFT_AMOUNT,
        recipient.address,
        unlockTime,
        "Successful reclaim test"
      );
      const giftId = 1;

      const gracePeriod = 180 * 24 * 3600;
      await time.increaseTo(unlockTime + gracePeriod + 10);

      expect(await stonkGift.isReclaimable(giftId)).to.be.true;

      const senderBalBefore = await mockNvda.balanceOf(sender.address);

      await expect(stonkGift.connect(sender).reclaimUnclaimedGift(giftId))
        .to.emit(stonkGift, "GiftReclaimed")
        .withArgs(giftId, sender.address);

      expect(await mockNvda.balanceOf(sender.address)).to.equal(
        senderBalBefore + GIFT_AMOUNT
      );

      const gift = await stonkGift.getGift(giftId);
      expect(gift.cancelled).to.be.true;
      expect(await stonkGift.isReclaimable(giftId)).to.be.false;
    });
  });
});
