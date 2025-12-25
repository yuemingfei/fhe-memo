import { ethers } from "ethers";
import { initSDK, createInstance, SepoliaConfig, FhevmInstance } from "@zama-fhe/relayer-sdk/bundle";

let instance: FhevmInstance | null = null;

export const getFhevmInstance = async (): Promise<FhevmInstance> => {
  if (!instance) {
    await initSDK();
    instance = await createInstance(SepoliaConfig);
  }
  return instance;
};

export const CONTRACT_ADDRESS = "0xF1B42174830A0176fd4Fa41E766122a4C8980556";

export const stringToUint256 = (str: string): bigint => {
  const encoder = new TextEncoder();
  const bytes = encoder.encode(str.slice(0, 32)); // Max 32 chars
  let val = 0n;
  for (const byte of bytes) {
    val = (val << 8n) + BigInt(byte);
  }
  return val;
};

export const uint256ToString = (val: bigint): string => {
  if (val === 0n) return "";
  let temp = val;
  const resBytes: number[] = [];
  while (temp > 0n) {
    resBytes.push(Number(temp & 0xffn));
    temp >>= 8n;
  }
  return new TextDecoder().decode(new Uint8Array(resBytes.reverse()));
};
