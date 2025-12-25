import { FHEMemo, FHEMemo__factory } from "../types";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture() {
  const factory = (await ethers.getContractFactory("FHEMemo")) as FHEMemo__factory;
  const memoContract = (await factory.deploy()) as FHEMemo;
  const memoContractAddress = await memoContract.getAddress();

  return { memoContract, memoContractAddress };
}

describe("FHEMemo", function () {
  let signers: Signers;
  let memoContract: FHEMemo;
  let memoContractAddress: string;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async () => {
    ({ memoContract, memoContractAddress } = await deployFixture());
  });

  const generate32CharsInput = async (address: string, user: HardhatEthersSigner, val: bigint) => {
    let input = fhevm.createEncryptedInput(address, user.address);
    input = input.add256(val);
    return input.encrypt();
  };

  it("should add a memo with valid 32-byte data", async function () {
    const val = BigInt("0x" + "1".repeat(64));
    const encrypted = await generate32CharsInput(memoContractAddress, signers.alice, val);

    await memoContract.connect(signers.alice).addMemo(encrypted.handles[0], encrypted.inputProof);

    const count = await memoContract.connect(signers.alice).getMemosCount();
    expect(count).to.equal(1n);

    const [handle, exists] = await memoContract.connect(signers.alice).getMemo(0);
    expect(exists).to.equal(true);

    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint256, handle, memoContractAddress, signers.alice);
    expect(decrypted).to.equal(val);
  });

  it("should update a memo", async function () {
    const val1 = 1n;
    const encrypted1 = await generate32CharsInput(memoContractAddress, signers.alice, val1);
    await memoContract.connect(signers.alice).addMemo(encrypted1.handles[0], encrypted1.inputProof);

    const val2 = 2n;
    const encrypted2 = await generate32CharsInput(memoContractAddress, signers.alice, val2);
    await memoContract.connect(signers.alice).updateMemo(0, encrypted2.handles[0], encrypted2.inputProof);

    const [handle] = await memoContract.connect(signers.alice).getMemo(0);
    const decrypted = await fhevm.userDecryptEuint(FhevmType.euint256, handle, memoContractAddress, signers.alice);
    expect(decrypted).to.equal(val2);
  });

  it("should delete a memo", async function () {
    const val = 9n;
    const encrypted = await generate32CharsInput(memoContractAddress, signers.alice, val);
    await memoContract.connect(signers.alice).addMemo(encrypted.handles[0], encrypted.inputProof);

    await memoContract.connect(signers.alice).deleteMemo(0);
    const [_, exists] = await memoContract.connect(signers.alice).getMemo(0);
    expect(exists).to.equal(false);
  });

  it("should get all memos at once", async function () {
    const val1 = 1n;
    const encrypted1 = await generate32CharsInput(memoContractAddress, signers.alice, val1);
    await memoContract.connect(signers.alice).addMemo(encrypted1.handles[0], encrypted1.inputProof);

    const val2 = 2n;
    const encrypted2 = await generate32CharsInput(memoContractAddress, signers.alice, val2);
    await memoContract.connect(signers.alice).addMemo(encrypted2.handles[0], encrypted2.inputProof);

    const allMemos = await memoContract.connect(signers.alice).getAllMemos();
    expect(allMemos.length).to.equal(2);
    expect(allMemos[0].exists).to.equal(true);
    expect(allMemos[1].exists).to.equal(true);
  });
});
