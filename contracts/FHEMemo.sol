// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {FHE, euint256, externalEuint256} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";

/// @title FHE Memo Contract
/// @notice 这是一个使用 Zama FHEVM 技术实现的加密备忘录合约。
/// @dev 每个 Memo 使用 single euint256 存储加密内容（32 字节/字符）。
contract FHEMemo is ZamaEthereumConfig {
    struct Memo {
        euint256 content;
        bool exists;
    }

    // 存储每个地址的 Memo 数组
    mapping(address => Memo[]) private _userMemos;

    event MemoAdded(address indexed user, uint256 index);
    event MemoUpdated(address indexed user, uint256 index);
    event MemoDeleted(address indexed user, uint256 index);

    /// @notice 新增加密 Memo
    /// @param input 加密的输入数据 (32 字节)
    /// @param proof 加密证明
    function addMemo(externalEuint256 input, bytes calldata proof) external {
        Memo storage newMemo = _userMemos[msg.sender].push();
        newMemo.exists = true;

        newMemo.content = FHE.fromExternal(input, proof);
        FHE.allow(newMemo.content, msg.sender);
        FHE.allowThis(newMemo.content);

        uint256 index = _userMemos[msg.sender].length - 1;
        emit MemoAdded(msg.sender, index);
    }

    /// @notice 修改现有的 Memo
    /// @param index Memo 在列表中的索引
    /// @param input 新的加密数据
    /// @param proof 加密证明
    function updateMemo(uint256 index, externalEuint256 input, bytes calldata proof) external {
        require(index < _userMemos[msg.sender].length, "Index out of bounds");
        require(_userMemos[msg.sender][index].exists, "Memo was deleted");

        _userMemos[msg.sender][index].content = FHE.fromExternal(input, proof);
        FHE.allow(_userMemos[msg.sender][index].content, msg.sender);
        FHE.allowThis(_userMemos[msg.sender][index].content);

        emit MemoUpdated(msg.sender, index);
    }

    /// @notice 删除 Memo (标记为不存在)
    /// @param index Memo 的索引
    function deleteMemo(uint256 index) external {
        require(index < _userMemos[msg.sender].length, "Index out of bounds");
        _userMemos[msg.sender][index].exists = false;

        emit MemoDeleted(msg.sender, index);
    }

    /// @notice 获取当前用户 Memo 的总数
    function getMemosCount() external view returns (uint256) {
        return _userMemos[msg.sender].length;
    }

    /// @notice 获取指定索引的 Memo 加密句柄
    /// @param index 索引
    /// @return content 加密数据的句柄
    /// @return exists 是否存在
    function getMemo(uint256 index) external view returns (euint256 content, bool exists) {
        require(index < _userMemos[msg.sender].length, "Index out of bounds");
        Memo storage m = _userMemos[msg.sender][index];
        return (m.content, m.exists);
    }

    /// @notice 获取当前用户的所有 Memo
    /// @return 所有的 Memo 结构体列表
    function getAllMemos() external view returns (Memo[] memory) {
        return _userMemos[msg.sender];
    }
}
