import React, { useState, useEffect, useMemo } from "react";
import { ethers, BrowserProvider, Signer } from "ethers";
import { Search, Plus, Trash2, Lock, Unlock, FileText, CheckCircle2, ShieldCheck, Wallet, LogOut } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { getFhevmInstance, CONTRACT_ADDRESS, stringToUint256, uint256ToString } from "./utils/fhe";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface MemoItem {
  index: number;
  handle: string;
  exists: boolean;
  decryptedContent?: string;
  isDecrypted: boolean;
}

const ABI = [
  {
    inputs: [],
    name: "ZamaProtocolUnsupported",
    type: "error",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "MemoAdded",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "MemoDeleted",
    type: "event",
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "address",
        name: "user",
        type: "address",
      },
      {
        indexed: false,
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "MemoUpdated",
    type: "event",
  },
  {
    inputs: [
      {
        internalType: "externalEuint256",
        name: "input",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "proof",
        type: "bytes",
      },
    ],
    name: "addMemo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "confidentialProtocolId",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "deleteMemo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "getAllMemos",
    outputs: [
      {
        components: [
          {
            internalType: "euint256",
            name: "content",
            type: "bytes32",
          },
          {
            internalType: "bool",
            name: "exists",
            type: "bool",
          },
        ],
        internalType: "struct FHEMemo.Memo[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
    ],
    name: "getMemo",
    outputs: [
      {
        internalType: "euint256",
        name: "content",
        type: "bytes32",
      },
      {
        internalType: "bool",
        name: "exists",
        type: "bool",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "getMemosCount",
    outputs: [
      {
        internalType: "uint256",
        name: "",
        type: "uint256",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      {
        internalType: "uint256",
        name: "index",
        type: "uint256",
      },
      {
        internalType: "externalEuint256",
        name: "input",
        type: "bytes32",
      },
      {
        internalType: "bytes",
        name: "proof",
        type: "bytes",
      },
    ],
    name: "updateMemo",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const SEPOLIA_CHAIN_ID = "0xaa36a7"; // 11155111

const App: React.FC = () => {
  const [signer, setSigner] = useState<Signer | null>(null);
  const [address, setAddress] = useState<string>("");
  const [memos, setMemos] = useState<MemoItem[]>([]);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [editorContent, setEditorContent] = useState("");
  const [isNewMemo, setIsNewMemo] = useState(false);
  const [isWrongNetwork, setIsWrongNetwork] = useState(false);

  const ensureSepoliaNetwork = async () => {
    if ((window as any).ethereum) {
      const chainId = await (window as any).ethereum.request({ method: "eth_chainId" });
      if (chainId !== SEPOLIA_CHAIN_ID) {
        try {
          await (window as any).ethereum.request({
            method: "wallet_switchEthereumChain",
            params: [{ chainId: SEPOLIA_CHAIN_ID }],
          });
          setIsWrongNetwork(false);
          return true;
        } catch (switchError: any) {
          // This error code indicates that the chain has not been added to MetaMask.
          if (switchError.code === 4902) {
            try {
              await (window as any).ethereum.request({
                method: "wallet_addEthereumChain",
                params: [
                  {
                    chainId: SEPOLIA_CHAIN_ID,
                    chainName: "Sepolia Testnet",
                    nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
                    rpcUrls: ["https://rpc.sepolia.org"],
                    blockExplorerUrls: ["https://sepolia.etherscan.io"],
                  },
                ],
              });
              setIsWrongNetwork(false);
              return true;
            } catch (addError) {
              console.error(addError);
            }
          }
          console.error(switchError);
        }
        setIsWrongNetwork(true);
        return false;
      }
      setIsWrongNetwork(false);
      return true;
    }
    return false;
  };

  const connectWallet = async () => {
    if ((window as any).ethereum) {
      const isCorrect = await ensureSepoliaNetwork();
      if (!isCorrect) return;

      const provider = new BrowserProvider((window as any).ethereum);
      const s = await provider.getSigner();
      const network = await provider.getNetwork();
      console.log("network: ", network);
      setSigner(s);
      setAddress(await s.getAddress());
      fetchMemos(s);
    }
  };

  const handleLogout = () => {
    setSigner(null);
    setAddress("");
    setMemos([]);
    setSelectedIndex(null);
    setEditorContent("");
    setIsNewMemo(false);
  };

  const fetchMemos = async (s: Signer) => {
    try {
      setLoading(true);
      const provider = s.provider;
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, s);
      const rawMemos = await contract.getAllMemos();

      const formatted: MemoItem[] = rawMemos
        .map((m: any, i: number) => ({
          index: i,
          handle: "0x" + BigInt(m.content).toString(16).padStart(64, "0"),
          exists: m.exists,
          isDecrypted: false,
        }))
        .filter((m: MemoItem) => m.exists);

      setMemos(formatted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const currentMemo = useMemo(() => {
    if (selectedIndex === null) return null;
    return memos.find((m) => m.index === selectedIndex) || null;
  }, [selectedIndex, memos]);

  const decryptMemo = async (memo: MemoItem) => {
    if (!signer || memo.isDecrypted) return;
    try {
      setLoading(true);
      const instance = await getFhevmInstance();
      const keypair = instance.generateKeypair();
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = "10";
      const contractAddresses = [CONTRACT_ADDRESS];

      const eip712 = instance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await (signer as any).signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await instance.userDecrypt(
        [{ handle: memo.handle, contractAddress: CONTRACT_ADDRESS }],
        keypair.privateKey,
        keypair.publicKey,
        signature.replace("0x", ""),
        contractAddresses,
        address,
        startTimeStamp,
        durationDays,
      );

      const decrypted = uint256ToString(BigInt((result as any)[memo.handle]));

      setMemos((prev) =>
        prev.map((m) => (m.index === memo.index ? { ...m, decryptedContent: decrypted, isDecrypted: true } : m)),
      );
      setEditorContent(decrypted);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!signer) return;
    const isCorrect = await ensureSepoliaNetwork();
    if (!isCorrect) return;

    try {
      setLoading(true);
      const instance = await getFhevmInstance();
      const val = stringToUint256(editorContent);
      const buffer = instance.createEncryptedInput(CONTRACT_ADDRESS, address);
      buffer.add256(val);
      const encrypted = await buffer.encrypt();

      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      let tx;
      if (isNewMemo) {
        tx = await contract.addMemo(encrypted.handles[0], encrypted.inputProof);
      } else if (selectedIndex !== null) {
        tx = await contract.updateMemo(selectedIndex, encrypted.handles[0], encrypted.inputProof);
      }

      if (tx) {
        await tx.wait();
        setIsNewMemo(false);
        fetchMemos(signer);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!signer || selectedIndex === null) return;
    try {
      setLoading(true);
      const contract = new ethers.Contract(CONTRACT_ADDRESS, ABI, signer);
      const tx = await contract.deleteMemo(selectedIndex);
      await tx.wait();
      setSelectedIndex(null);
      setEditorContent("");
      fetchMemos(signer);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const filteredMemos = memos.filter(
    (m) =>
      (m.decryptedContent || "").toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.handle.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  return (
    <div className="flex h-screen w-full overflow-hidden">
      {/* Sidebar */}
      <div className="w-80 bg-[var(--bg-sidebar)] border-r border-[var(--border-color)] flex flex-col">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="p-2 bg-blue-600/20 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-blue-500" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">FHE Memo</h1>
          </div>

          <button
            onClick={() => {
              setIsNewMemo(true);
              setSelectedIndex(null);
              setEditorContent("");
            }}
            className="w-full py-2.5 bg-[#2f81f7] hover:bg-blue-600 transition-all rounded-md flex items-center justify-center gap-2 font-medium mb-6 shadow-lg shadow-blue-500/10"
          >
            <Plus className="w-4 h-4" />
            New Memo
          </button>

          <div className="relative group">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-secondary)] group-focus-within:text-blue-500 transition-colors" />
            <input
              type="text"
              placeholder="Search title or tag..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#161b22] border border-[var(--border-color)] rounded-md py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-6">
          <div className="px-4 mb-3 text-[10px] font-bold uppercase tracking-widest text-[var(--text-secondary)] opacity-60">
            Recent Memos
          </div>
          <div className="space-y-1">
            {filteredMemos.map((memo) => (
              <button
                key={memo.index}
                onClick={() => {
                  setSelectedIndex(memo.index);
                  setIsNewMemo(false);
                  if (memo.isDecrypted) {
                    setEditorContent(memo.decryptedContent || "");
                  } else {
                    setEditorContent("");
                    decryptMemo(memo);
                  }
                }}
                className={cn(
                  "w-full text-left p-3 rounded-md flex items-start gap-3 transition-colors group",
                  selectedIndex === memo.index
                    ? "bg-blue-600/10 border-l-2 border-blue-500"
                    : "hover:bg-[var(--bg-hover)]",
                )}
              >
                <div
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    memo.isDecrypted ? "bg-green-500/10 text-green-500" : "bg-slate-700/50 text-slate-400",
                  )}
                >
                  {memo.isDecrypted ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate mb-1">
                    {memo.isDecrypted ? memo.decryptedContent || "Untitled Memo" : `Encrypted (idx: ${memo.index})`}
                  </div>
                  <div className="text-[11px] text-[var(--text-secondary)] flex items-center gap-2">
                    {memo.isDecrypted ? "Decrypted" : "Encrypted"} • {memo.handle.slice(0, 8)}...
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col bg-[var(--bg-main)]">
        {/* Header */}
        <header className="h-16 border-b border-[var(--border-color)] flex items-center justify-between px-8 bg-[var(--bg-sidebar)]/50">
          <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
            <FileText className="w-4 h-4" />
            <span>/ Private /</span>
            <span className="text-[var(--text-primary)] font-medium">
              {isNewMemo
                ? "New Memo"
                : currentMemo?.isDecrypted
                  ? currentMemo.decryptedContent || "Memo"
                  : "Encrypted Memo"}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border",
                isWrongNetwork
                  ? "bg-red-500/5 border-red-500/20 text-red-500"
                  : "bg-green-500/5 border-green-500/20 text-green-500",
              )}
            >
              <div
                className={cn("w-2 h-2 rounded-full animate-pulse", isWrongNetwork ? "bg-red-500" : "bg-green-500")}
              ></div>
              <span className="text-[11px] font-medium">{isWrongNetwork ? "Wrong Network" : "Sepolia"}</span>
            </div>
            {address && (
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-500/10 rounded-full transition-all"
                title="Logout"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={connectWallet}
              className="px-4 py-1.5 bg-[#21262d] hover:bg-[#30363d] border border-[var(--border-color)] rounded-full text-xs font-semibold transition-all flex items-center gap-2"
            >
              <Wallet className="w-3 h-3" />
              {address ? `${address.slice(0, 6)}...${address.slice(-4)}` : "Connect Wallet"}
            </button>
          </div>
        </header>

        {/* Editor Area */}
        <main className="flex-1 p-12 overflow-y-auto relative bg-[radial-gradient(circle_at_top_right,rgba(47,129,247,0.03),transparent)]">
          {!address ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="p-6 bg-blue-600/10 rounded-2xl mb-6">
                <Wallet className="w-12 h-12 text-blue-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Connect your wallet</h2>
              <p className="text-[var(--text-secondary)] max-w-md mb-8">
                Please connect your wallet to access and manage your secure memos on the FHE network.
              </p>
              <button
                onClick={connectWallet}
                className="px-8 py-3 bg-[#2f81f7] hover:bg-blue-600 rounded-full font-semibold transition-all shadow-xl shadow-blue-500/20"
              >
                Connect Wallet
              </button>
            </div>
          ) : !isNewMemo && selectedIndex === null ? (
            <div className="h-full flex flex-col items-center justify-center text-center">
              <div className="p-6 bg-green-500/10 rounded-2xl mb-6">
                <ShieldCheck className="w-12 h-12 text-green-500" />
              </div>
              <h2 className="text-3xl font-bold mb-4">Welcome to FHE Memo</h2>
              <p className="text-[var(--text-secondary)] max-w-md">
                Select a memo from the sidebar or create a new one to get started with end-to-end encrypted storage.
              </p>
            </div>
          ) : (
            <div className="max-w-4xl mx-auto flex flex-col h-full">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-4xl font-bold tracking-tight">
                  {isNewMemo ? "New Secure Memo" : currentMemo?.decryptedContent || "Project Alpha Keys"}
                </h2>
                {!isNewMemo && selectedIndex !== null && (
                  <button
                    onClick={handleDelete}
                    className="p-2 text-red-500/60 hover:text-red-500 hover:bg-red-500/10 rounded-lg transition-all"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                )}
              </div>

              {selectedIndex !== null && currentMemo?.isDecrypted && (
                <div className="mb-8 p-4 bg-green-900/10 border border-green-500/20 rounded-xl flex gap-4 items-start">
                  <CheckCircle2 className="w-5 h-5 text-green-500 mt-0.5" />
                  <div>
                    <div className="text-sm font-semibold text-green-500">Content Successfully Decrypted</div>
                    <div className="text-xs text-green-500/60">
                      You are viewing the decrypted version of this memo. Changes will be re-encrypted upon saving.
                    </div>
                  </div>
                </div>
              )}

              <div className="flex-1 relative">
                <textarea
                  value={editorContent}
                  onChange={(e) => setEditorContent(e.target.value)}
                  maxLength={32}
                  placeholder="Type your memo here... (max 32 characters)"
                  className="w-full h-full bg-transparent border-none focus:outline-none text-lg leading-relaxed font-['JetBrains_Mono'] resize-none placeholder:text-slate-700"
                />
                <div className="absolute bottom-4 right-4 text-[10px] uppercase tracking-widest text-slate-600 font-bold">
                  {editorContent.length}/32 Characters
                </div>
              </div>
            </div>
          )}

          {/* Action Button */}
          {(isNewMemo || (selectedIndex !== null && currentMemo?.isDecrypted)) && (
            <button
              onClick={handleSave}
              disabled={loading || editorContent.length === 0}
              className="fixed bottom-12 right-12 px-8 py-3 bg-[#2f81f7] hover:bg-blue-600 border border-blue-400/20 text-white rounded-full flex items-center gap-3 font-semibold shadow-2xl shadow-blue-500/20 transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              ) : (
                <Lock className="w-4 h-4" />
              )}
              {isNewMemo ? "Encrypt & Save" : "Re-encrypt & Update"}
            </button>
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
