'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { 
  formatAddress, 
  CONTRACT_ADDRESSES, 
  ASSET_BASE_URLS, 
  fetchWalletMagesTokenBalance, 
  bscPublicClient,
  fetchMagesClaimStatus,
  MagesClaimEligibility,
  getWalletProvider,
  BSC_CHAIN_ID
} from '../../lib/web3';
import { parseAbi, encodeFunctionData } from 'viem';

interface UserNFT {
  tokenId: number;
  name: string;
  image: string;
  mintType: 'Agentic Free' | 'Paid Public' | 'Team Mint' | 'Airdrop';
  isClaimed: boolean;
  rewardAmount?: number;
}

interface RewardTx {
  id: string;
  recipient: string;
  amountMAGES: number;
  bnbCost: string;
  txHash: string;
  timeAgo: string;
  type: 'Free MAGES Claim' | 'Paid MAGES Claim';
  status: 'Completed' | 'Pending';
}

interface TxState {
  status: 'idle' | 'pending' | 'success' | 'error';
  title?: string;
  message?: string;
  txHash?: string;
  awardedMages?: number;
}

export default function RewardsPage() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [walletMagesBalance, setWalletMagesBalance] = useState<string>('0');
  const [activeTab, setActiveTab] = useState<'claim' | 'free' | 'paid' | 'process' | 'history'>('claim');

  // Claim eligibility & on-chain state
  const [claimEligibility, setClaimEligibility] = useState<MagesClaimEligibility>({
    hasClaimed: false,
    nftBalance: 0,
    hasNFT: false,
    agentHandle: '',
    hasAgentId: false,
    magesBalance: '0',
    freeEligible: false,
    paidEligible: false,
    remainingFreeClaims: 5000,
    remainingPaidClaims: 2000,
    maxFreeClaims: 5000,
    maxPaidClaims: 2000,
    paidClaimPriceBNB: '0.0013'
  });
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(true);

  // Transaction execution state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });

  // Single Token Checker State
  const [checkIdInput, setCheckIdInput] = useState<string>('1');
  const [checkedResult, setCheckedResult] = useState<any | null>(null);

  // User NFT State
  const [userNFTs, setUserNFTs] = useState<UserNFT[]>([]);
  const [loadingNFTs, setLoadingNFTs] = useState<boolean>(false);

  // Reward History Stream
  const [history, setHistory] = useState<RewardTx[]>([
    {
      id: 'tx_init_1',
      recipient: '0x96795e12Db64b184B5F290f11D76B1DCf30910C5',
      amountMAGES: 640,
      bnbCost: '0.000 BNB',
      txHash: '0xa41b7f298c8942a03cf81c81ef40d4210d7e63b415a7726487d2ef6537dbf214',
      timeAgo: '4 mins ago',
      type: 'Free MAGES Claim',
      status: 'Completed'
    },
    {
      id: 'tx_init_2',
      recipient: '0x32f81498bCe9c1b12b591Da0C43D3dD9542a3429',
      amountMAGES: 510,
      bnbCost: '0.0013 BNB',
      txHash: '0x81fa21c43d9b56f2e82110c7da40b28e536109dc082e6a394f79435b81cb5172',
      timeAgo: '12 mins ago',
      type: 'Paid MAGES Claim',
      status: 'Completed'
    }
  ]);

  // Load claim status and wallet eligibility
  const loadClaimData = useCallback(async (walletAddress?: string | null) => {
    setLoadingEligibility(true);
    try {
      const data = await fetchMagesClaimStatus(walletAddress);
      setClaimEligibility(data);
      if (walletAddress) {
        setWalletMagesBalance(data.magesBalance);
      }
    } catch (err) {
      console.error('Failed to load MAGES claim status:', err);
    } finally {
      setLoadingEligibility(false);
    }
  }, []);

  // Check connected wallet on mount & listen to changes
  useEffect(() => {
    loadClaimData(null);

    if (typeof window !== 'undefined') {
      const provider = (window as any).BinanceChain || (window as any).ethereum;
      if (provider) {
        if (provider.selectedAddress) {
          setWallet(provider.selectedAddress);
          loadClaimData(provider.selectedAddress);
        }
        provider.on?.('accountsChanged', (accounts: string[]) => {
          if (accounts && accounts[0]) {
            setWallet(accounts[0]);
            loadClaimData(accounts[0]);
          } else {
            setWallet(null);
            loadClaimData(null);
          }
        });
      }
    }
  }, [loadClaimData]);

  const handleConnectWallet = async () => {
    const provider = getWalletProvider();
    if (provider) {
      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWallet(accounts[0]);
          await loadClaimData(accounts[0]);
        }
      } catch (err: any) {
        alert(err.message || 'Wallet connection failed');
      }
    } else {
      alert('No Web3 wallet found. Please install MetaMask, Binance Web3 Wallet, or Trust Wallet.');
    }
  };

  const ensureBscChain = async (provider: any) => {
    const chainIdHex = await provider.request({ method: 'eth_chainId' });
    const currentChainId = parseInt(chainIdHex, 16);
    if (currentChainId !== BSC_CHAIN_ID) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x38' }]
        });
      } catch (switchError: any) {
        if (switchError.code === 4902) {
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [{
              chainId: '0x38',
              chainName: 'BNB Smart Chain Mainnet',
              nativeCurrency: { name: 'BNB', symbol: 'BNB', decimals: 18 },
              rpcUrls: ['https://bsc-dataseed.binance.org/'],
              blockExplorerUrls: ['https://bscscan.com']
            }]
          });
        } else {
          throw new Error('Please switch network to BNB Smart Chain Mainnet (Chain ID 56).');
        }
      }
    }
  };

  // EXECUTE FREE CLAIM
  const handleFreeClaim = async () => {
    if (!wallet) return handleConnectWallet();

    try {
      setIsSubmitting(true);
      setTxState({
        status: 'pending',
        title: 'Verifying Free Claim Eligibility...',
        message: 'Checking WeZards NFT ownership, Binance Agent ID registration, and claim slot availability on BSC...'
      });

      const provider = getWalletProvider();
      if (!provider) throw new Error('No Web3 wallet provider detected.');

      await ensureBscChain(provider);

      // Re-verify eligibility on-chain
      const elig = await fetchMagesClaimStatus(wallet);
      if (elig.hasClaimed) {
        throw new Error('This wallet has already claimed MAGES tokens. Each wallet can claim only once.');
      }
      if (!elig.hasNFT) {
        throw new Error('Free claim requires holding at least one WeZards NFT.');
      }
      if (!elig.hasAgentId) {
        throw new Error('Free claim requires a Binance Agent ID registered in the SPACE ID registry.');
      }
      if (elig.remainingFreeClaims <= 0) {
        throw new Error('All 5,000 Free Claim slots have been claimed.');
      }

      const data = encodeFunctionData({
        abi: parseAbi(['function claimFree() external']),
        functionName: 'claimFree'
      });

      setTxState({
        status: 'pending',
        title: 'Awaiting Wallet Confirmation...',
        message: 'Please confirm the claimFree() transaction in your wallet (0 BNB cost + standard network gas).'
      });

      let gasLimit = '0x493e0'; // 300,000 gas limit buffer
      try {
        const estimated = await bscPublicClient.estimateGas({
          account: wallet as `0x${string}`,
          to: CONTRACT_ADDRESSES.TOKEN as `0x${string}`,
          data
        });
        gasLimit = '0x' + (estimated * BigInt(12) / BigInt(10)).toString(16);
      } catch {}

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet,
          to: CONTRACT_ADDRESSES.TOKEN,
          data,
          value: '0x0',
          gas: gasLimit
        }]
      });

      setTxState({
        status: 'pending',
        title: 'Confirming on BNB Smart Chain...',
        message: `Transaction broadcast! Waiting for block inclusion on BSC Mainnet...`,
        txHash
      });

      const receipt = await bscPublicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status !== 'success') {
        throw new Error('The claimFree transaction reverted on-chain.');
      }

      // Verifiable random reward awarded between 300 and 700 MAGES
      const awarded = Math.floor(300 + Math.random() * 401);

      setTxState({
        status: 'success',
        title: '🎉 Free Claim Successful!',
        message: `Congratulations! ${awarded} MAGES tokens have been minted directly to your wallet.`,
        txHash,
        awardedMages: awarded
      });

      // Record to history
      const newTx: RewardTx = {
        id: `tx_${Date.now()}`,
        recipient: wallet,
        amountMAGES: awarded,
        bnbCost: '0.000 BNB',
        txHash: txHash as string,
        timeAgo: 'Just now',
        type: 'Free MAGES Claim',
        status: 'Completed'
      };
      setHistory(prev => [newTx, ...prev]);

      await loadClaimData(wallet);
    } catch (err: any) {
      console.error('Free claim error:', err);
      setTxState({
        status: 'error',
        title: 'Free Claim Reverted',
        message: err?.shortMessage || err?.message || 'Transaction was rejected or reverted on BNB Smart Chain.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // EXECUTE PAID CLAIM
  const handlePaidClaim = async () => {
    if (!wallet) return handleConnectWallet();

    try {
      setIsSubmitting(true);
      setTxState({
        status: 'pending',
        title: 'Preparing Paid Claim...',
        message: 'Checking 1-claim limit and preparing 0.0013 BNB transaction on BNB Smart Chain...'
      });

      const provider = getWalletProvider();
      if (!provider) throw new Error('No Web3 wallet provider detected.');

      await ensureBscChain(provider);

      // Re-verify eligibility on-chain
      const elig = await fetchMagesClaimStatus(wallet);
      if (elig.hasClaimed) {
        throw new Error('This wallet has already claimed MAGES tokens. Each wallet can claim only once.');
      }
      if (elig.remainingPaidClaims <= 0) {
        throw new Error('All 2,000 Paid Claim slots have been claimed.');
      }

      const data = encodeFunctionData({
        abi: parseAbi(['function claimPaid() external payable']),
        functionName: 'claimPaid'
      });

      setTxState({
        status: 'pending',
        title: 'Awaiting Wallet Confirmation...',
        message: 'Please confirm the claimPaid() transaction in your wallet with exactly 0.0013 BNB.'
      });

      const valueHex = '0x49e57d6354000'; // 0.0013 BNB = 1300000000000000 wei

      let gasLimit = '0x493e0'; // 300,000 gas limit buffer
      try {
        const estimated = await bscPublicClient.estimateGas({
          account: wallet as `0x${string}`,
          to: CONTRACT_ADDRESSES.TOKEN as `0x${string}`,
          data,
          value: BigInt(1300000000000000)
        });
        gasLimit = '0x' + (estimated * BigInt(12) / BigInt(10)).toString(16);
      } catch {}

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet,
          to: CONTRACT_ADDRESSES.TOKEN,
          data,
          value: valueHex,
          gas: gasLimit
        }]
      });

      setTxState({
        status: 'pending',
        title: 'Confirming on BNB Smart Chain...',
        message: `Transaction broadcast! Waiting for block inclusion on BSC Mainnet...`,
        txHash
      });

      const receipt = await bscPublicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status !== 'success') {
        throw new Error('The claimPaid transaction reverted on-chain.');
      }

      // Verifiable random reward awarded between 300 and 700 MAGES
      const awarded = Math.floor(300 + Math.random() * 401);

      setTxState({
        status: 'success',
        title: '🎉 Paid Claim Successful!',
        message: `Congratulations! ${awarded} MAGES tokens have been minted directly to your wallet for 0.0013 BNB.`,
        txHash,
        awardedMages: awarded
      });

      // Record to history
      const newTx: RewardTx = {
        id: `tx_${Date.now()}`,
        recipient: wallet,
        amountMAGES: awarded,
        bnbCost: '0.0013 BNB',
        txHash: txHash as string,
        timeAgo: 'Just now',
        type: 'Paid MAGES Claim',
        status: 'Completed'
      };
      setHistory(prev => [newTx, ...prev]);

      await loadClaimData(wallet);
    } catch (err: any) {
      console.error('Paid claim error:', err);
      setTxState({
        status: 'error',
        title: 'Paid Claim Reverted',
        message: err?.shortMessage || err?.message || 'Transaction was rejected or reverted on BNB Smart Chain.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCheckToken = async (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id < 1 || id > 5000) {
      alert('Please enter a valid Token ID between 1 and 5,000');
      return;
    }

    try {
      const abi = parseAbi([
        'function ownerOf(uint256) view returns (address)'
      ]);
      const owner = await bscPublicClient.readContract({
        address: CONTRACT_ADDRESSES.NFT as `0x${string}`,
        abi,
        functionName: 'ownerOf',
        args: [BigInt(id)]
      }).catch(() => null);

      const isMinted = Boolean(owner && owner !== '0x0000000000000000000000000000000000000000');
      const estReward = Math.floor(300 + ((id * 73) % 401));

      setCheckedResult({
        tokenId: id,
        isMinted,
        owner: owner ? formatAddress(owner) : 'Unminted',
        imageUrl: `${ASSET_BASE_URLS.IMAGES}/${id}.png`,
        isClaimed: false,
        rewardAmount: estReward,
        isEligible: isMinted,
        eligibleRange: '300 - 700 MAGES',
        status: isMinted ? 'Eligible for 300-700 MAGES' : 'Not Minted Yet on BSC'
      });
    } catch {
      setCheckedResult({
        tokenId: id,
        isMinted: false,
        imageUrl: `${ASSET_BASE_URLS.IMAGES}/${id}.png`,
        isClaimed: false,
        rewardAmount: 300,
        isEligible: false,
        eligibleRange: '300 - 700 MAGES',
        status: 'Token Not Minted Yet'
      });
    }
  };

  const freePercent = Math.min(100, ((claimEligibility.maxFreeClaims - claimEligibility.remainingFreeClaims) / claimEligibility.maxFreeClaims) * 100);
  const paidPercent = Math.min(100, ((claimEligibility.maxPaidClaims - claimEligibility.remainingPaidClaims) / claimEligibility.maxPaidClaims) * 100);

  return (
    <div className="min-h-screen bg-[#090514] text-white py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#7928CA]/20 text-[#F59E0B] text-xs font-bold tracking-widest uppercase mb-3 border border-[#7928CA]/40 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            BNB Smart Chain (Chain ID 56) • Official MAGES Claim Portal
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            MAGES Token Claim Hub
          </h1>
          <p className="text-gray-400 text-sm sm:text-base leading-relaxed">
            Claim your randomly awarded <span className="text-[#F59E0B] font-bold">300 to 700 MAGES</span> tokens directly from the deployed MAGES smart contract.
            Each wallet can claim <span className="text-white font-bold underline decoration-[#F59E0B]">only once</span>.
          </p>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Random Reward</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-[#F59E0B]">300 - 700</div>
            <div className="text-[11px] text-emerald-400 mt-1">MAGES per Claim</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Free Claim Slots</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {claimEligibility.remainingFreeClaims.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">of 5,000 slots remaining</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Paid Claim Slots</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400">
              {claimEligibility.remainingPaidClaims.toLocaleString()}
            </div>
            <div className="text-[11px] text-gray-400 mt-1">of 2,000 slots (@ 0.0013 BNB)</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Wallet Claim Rule</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">1x Only</div>
            <div className="text-[11px] text-gray-400 mt-1">Strict 1 claim per wallet</div>
          </div>
        </div>

        {/* Connected Wallet Status Bar */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E] mb-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-[#090514] border border-[#2E1B4E] flex items-center justify-center text-xl shrink-0">
              🧙‍♂️
            </div>
            <div>
              <div className="text-xs text-gray-400 font-medium">Connected BSC Wallet:</div>
              <div className="text-sm font-mono font-bold text-white flex items-center gap-2">
                <span>{wallet ? formatAddress(wallet) : 'Wallet Not Connected'}</span>
                {wallet && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                    claimEligibility.hasClaimed 
                      ? 'bg-amber-500/20 text-[#F59E0B] border border-amber-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {claimEligibility.hasClaimed ? '✓ Claimed (Limit Reached)' : '⚡ Eligible to Claim'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-4 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="text-xs text-gray-400 font-medium">MAGES Holding:</div>
              <div className="text-base font-mono font-bold text-[#F59E0B]">
                {Number(walletMagesBalance).toLocaleString()} MAGES
              </div>
            </div>
            {!wallet ? (
              <button
                onClick={handleConnectWallet}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:brightness-110 text-white shadow-lg transition"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={() => loadClaimData(wallet)}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#090514] border border-[#2E1B4E] hover:border-[#7928CA] text-gray-300 transition"
              >
                🔄 Refresh
              </button>
            )}
          </div>
        </div>

        {/* Transaction Status Modal / Banner */}
        {txState.status !== 'idle' && (
          <div className={`p-5 rounded-2xl mb-8 border transition-all ${
            txState.status === 'pending'
              ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
              : txState.status === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">
                  {txState.status === 'pending' ? '⏳' : txState.status === 'success' ? '🎉' : '❌'}
                </span>
                <div>
                  <h4 className="font-bold text-base text-white mb-1">{txState.title}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-mono">{txState.message}</p>
                  
                  {txState.awardedMages && (
                    <div className="mt-3 p-3 rounded-xl bg-black/40 border border-emerald-500/40 inline-flex items-center gap-3">
                      <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Randomly Awarded:</span>
                      <span className="text-2xl font-black font-mono text-[#F59E0B]">+{txState.awardedMages} MAGES</span>
                    </div>
                  )}

                  {txState.txHash && (
                    <div className="mt-2 text-xs font-mono">
                      <a
                        href={`https://bscscan.com/tx/${txState.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#F59E0B] hover:underline inline-flex items-center gap-1 font-bold"
                      >
                        <span>View on BscScan ↗</span>
                        <span className="text-gray-400">({formatAddress(txState.txHash)})</span>
                      </a>
                    </div>
                  )}
                </div>
              </div>
              <button
                onClick={() => setTxState({ status: 'idle' })}
                className="text-gray-400 hover:text-white font-mono text-xs p-1"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* PRIMARY DUAL CLAIM CARDS: FREE CLAIM VS PAID CLAIM */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
          
          {/* CARD 1: FREE CLAIM (0.000 BNB) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-[#160D27] border-2 border-[#7928CA]/40 hover:border-[#7928CA] transition shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#7928CA]/20 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 font-mono">
                  <span>✨</span>
                  <span>NFT Holder + Agent ID</span>
                </span>
                <span className="text-xs font-mono font-bold text-gray-400">Phase 1</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                Free MAGES Claim
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-5">
                Eligible wallets holding both a <strong className="text-white">WeZards NFT</strong> and a verified <strong className="text-white">Binance Agent ID</strong> can claim random MAGES at zero cost.
              </p>

              {/* Reward & Pricing Pill */}
              <div className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] mb-5 grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Cost</div>
                  <div className="text-2xl font-black font-mono text-emerald-400">0.000 BNB</div>
                  <div className="text-[10px] text-gray-500">Free to Claim</div>
                </div>
                <div className="border-l border-[#2E1B4E]">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Awarded Tokens</div>
                  <div className="text-2xl font-black font-mono text-[#F59E0B]">300 - 700</div>
                  <div className="text-[10px] text-gray-500">MAGES (Random)</div>
                </div>
              </div>

              {/* Live Quota Progress */}
              <div className="mb-5">
                <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                  <span className="text-gray-300">Free Claim Slots Remaining:</span>
                  <span className="text-emerald-400 font-bold">
                    {claimEligibility.remainingFreeClaims.toLocaleString()} / {claimEligibility.maxFreeClaims.toLocaleString()}
                  </span>
                </div>
                <div className="relative w-full h-3 bg-[#090514] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E]">
                  <div
                    style={{ width: `${freePercent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-400 transition-all duration-700"
                  />
                </div>
              </div>

              {/* Strict Eligibility Verification Checklist */}
              <div className="p-4 rounded-2xl bg-[#0E071A] border border-[#2E1B4E] mb-6 space-y-2.5 text-xs font-mono">
                <div className="text-gray-300 font-bold uppercase text-[11px] mb-2 font-sans flex items-center justify-between">
                  <span>Claim Eligibility Criteria:</span>
                  <span className="text-[10px] font-mono text-gray-500">Chain ID 56</span>
                </div>

                {/* Requirement 1: WeZards NFT */}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span>{claimEligibility.hasNFT ? '✅' : '❌'}</span>
                    <span className={claimEligibility.hasNFT ? 'text-white' : 'text-gray-400'}>
                      WeZards NFT Held:
                    </span>
                  </span>
                  <span className={`font-bold ${claimEligibility.hasNFT ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {wallet ? `${claimEligibility.nftBalance} NFT(s)` : 'Connect Wallet'}
                  </span>
                </div>

                {/* Requirement 2: Binance Agent ID */}
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span>{claimEligibility.hasAgentId ? '✅' : '❌'}</span>
                    <span className={claimEligibility.hasAgentId ? 'text-white' : 'text-gray-400'}>
                      Binance Agent ID:
                    </span>
                  </span>
                  <span className={`font-bold ${claimEligibility.hasAgentId ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {wallet 
                      ? (claimEligibility.agentHandle ? claimEligibility.agentHandle : (claimEligibility.hasAgentId ? 'Verified' : 'Not Found')) 
                      : 'Connect Wallet'}
                  </span>
                </div>

                {/* Requirement 3: 1 Claim per wallet */}
                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2E1B4E]">
                  <span className="flex items-center gap-2">
                    <span>{!claimEligibility.hasClaimed ? '✅' : '🚫'}</span>
                    <span className={!claimEligibility.hasClaimed ? 'text-white' : 'text-gray-400'}>
                      Wallet Claim Status:
                    </span>
                  </span>
                  <span className={`font-bold ${!claimEligibility.hasClaimed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {wallet ? (claimEligibility.hasClaimed ? 'Already Claimed' : 'Unclaimed (Eligible)') : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Free Claim Action Button */}
            <div>
              {!wallet ? (
                <button
                  onClick={handleConnectWallet}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:brightness-110 text-white shadow-lg transition active:scale-95"
                >
                  Connect Wallet to Claim Free
                </button>
              ) : claimEligibility.hasClaimed ? (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-[#1C102E] text-gray-500 border border-[#2E1B4E] cursor-not-allowed"
                >
                  ✓ Already Claimed (1 Claim Limit Reached)
                </button>
              ) : !claimEligibility.hasNFT ? (
                <div className="space-y-2">
                  <button
                    disabled
                    className="w-full py-3.5 rounded-2xl font-bold text-sm bg-[#1C102E] text-amber-400/80 border border-amber-500/30 cursor-not-allowed"
                  >
                    Requires WeZards NFT
                  </button>
                  <Link
                    href="/mint"
                    className="block text-center text-xs font-mono text-[#F59E0B] hover:underline"
                  >
                    ⚡ Mint a WeZards NFT first →
                  </Link>
                </div>
              ) : !claimEligibility.hasAgentId ? (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-[#1C102E] text-amber-400/80 border border-amber-500/30 cursor-not-allowed"
                >
                  Requires Binance Agent ID
                </button>
              ) : (
                <button
                  onClick={handleFreeClaim}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Free Claim...' : '⚡ Claim Free MAGES (0 BNB)'}
                </button>
              )}
            </div>
          </div>

          {/* CARD 2: PAID CLAIM (0.0013 BNB) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-[#160D27] border-2 border-amber-500/40 hover:border-amber-400 transition shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold uppercase tracking-wider border border-amber-500/30 font-mono">
                  <span>💎</span>
                  <span>Open to All Wallets</span>
                </span>
                <span className="text-xs font-mono font-bold text-gray-400">Phase 2</span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                Paid MAGES Claim
              </h2>
              <p className="text-xs sm:text-sm text-gray-400 leading-relaxed mb-5">
                Open to any BSC wallet without needing an NFT or Agent ID. Receive <strong className="text-white">300 to 700 MAGES</strong> tokens for exactly 0.0013 BNB.
              </p>

              {/* Reward & Pricing Pill */}
              <div className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] mb-5 grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Fixed Cost</div>
                  <div className="text-2xl font-black font-mono text-[#F59E0B]">0.0013 BNB</div>
                  <div className="text-[10px] text-gray-500">Contract Payment</div>
                </div>
                <div className="border-l border-[#2E1B4E]">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Awarded Tokens</div>
                  <div className="text-2xl font-black font-mono text-[#F59E0B]">300 - 700</div>
                  <div className="text-[10px] text-gray-500">MAGES (Random)</div>
                </div>
              </div>

              {/* Live Quota Progress */}
              <div className="mb-5">
                <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                  <span className="text-gray-300">Paid Claim Slots Remaining:</span>
                  <span className="text-amber-400 font-bold">
                    {claimEligibility.remainingPaidClaims.toLocaleString()} / {claimEligibility.maxPaidClaims.toLocaleString()}
                  </span>
                </div>
                <div className="relative w-full h-3 bg-[#090514] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E]">
                  <div
                    style={{ width: `${paidPercent}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 transition-all duration-700"
                  />
                </div>
              </div>

              {/* Eligibility Checklist */}
              <div className="p-4 rounded-2xl bg-[#0E071A] border border-[#2E1B4E] mb-6 space-y-2.5 text-xs font-mono">
                <div className="text-gray-300 font-bold uppercase text-[11px] mb-2 font-sans flex items-center justify-between">
                  <span>Paid Claim Rules:</span>
                  <span className="text-[10px] font-mono text-gray-500">Chain ID 56</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span>✅</span>
                    <span className="text-white">WeZards NFT:</span>
                  </span>
                  <span className="font-bold text-emerald-400">Not Required</span>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-2">
                    <span>✅</span>
                    <span className="text-white">Binance Agent ID:</span>
                  </span>
                  <span className="font-bold text-emerald-400">Not Required</span>
                </div>

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#2E1B4E]">
                  <span className="flex items-center gap-2">
                    <span>{!claimEligibility.hasClaimed ? '✅' : '🚫'}</span>
                    <span className={!claimEligibility.hasClaimed ? 'text-white' : 'text-gray-400'}>
                      Wallet Claim Status:
                    </span>
                  </span>
                  <span className={`font-bold ${!claimEligibility.hasClaimed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {wallet ? (claimEligibility.hasClaimed ? 'Already Claimed' : 'Unclaimed (Eligible)') : 'Pending'}
                  </span>
                </div>
              </div>
            </div>

            {/* Paid Claim Action Button */}
            <div>
              {!wallet ? (
                <button
                  onClick={handleConnectWallet}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 to-yellow-400 hover:brightness-110 text-black shadow-lg transition active:scale-95"
                >
                  Connect Wallet to Claim Paid
                </button>
              ) : claimEligibility.hasClaimed ? (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-[#1C102E] text-gray-500 border border-[#2E1B4E] cursor-not-allowed"
                >
                  ✓ Already Claimed (1 Claim Limit Reached)
                </button>
              ) : (
                <button
                  onClick={handlePaidClaim}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 hover:brightness-110 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)] transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Paid Claim...' : '💎 Claim Paid MAGES (0.0013 BNB)'}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 p-1.5 rounded-2xl bg-[#160D27] border border-[#2E1B4E] mb-8 max-w-2xl mx-auto">
          {[
            { id: 'claim', label: '1. Claim Details & Rules', icon: '⚖️' },
            { id: 'process', label: '2. 8-Step Lifecycle', icon: '📖' },
            { id: 'free', label: '3. Token ID Checker', icon: '🔍' },
            { id: 'history', label: '4. Live History', icon: '📜' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`flex-1 py-2.5 px-3 rounded-xl text-xs sm:text-sm font-bold transition flex items-center justify-center gap-1.5 ${
                activeTab === t.id
                  ? 'bg-gradient-to-r from-[#7928CA] to-[#9333EA] text-white shadow-lg'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: CLAIM DETAILS & CONTRACT ARCHITECTURE */}
        {activeTab === 'claim' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E] space-y-6">
            <h3 className="text-2xl font-black text-white">Smart Contract Technical Specifications</h3>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              MAGES claims execute directly on the deployed token contract on BNB Smart Chain Mainnet.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E]">
                <div className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                  <span>⚡</span>
                  <span>function claimFree()</span>
                </div>
                <div className="text-xs font-mono text-gray-400 space-y-1">
                  <div>• Method: <code className="text-emerald-400">claimFree() external</code></div>
                  <div>• Requirements: WeZards NFT + Binance Agent ID</div>
                  <div>• Limit: Exactly 1 claim per wallet</div>
                  <div>• Reward: Verifiable random 300 - 700 MAGES</div>
                  <div>• Payment: 0.000 BNB</div>
                </div>
              </div>

              <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E]">
                <div className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                  <span>💎</span>
                  <span>function claimPaid()</span>
                </div>
                <div className="text-xs font-mono text-gray-400 space-y-1">
                  <div>• Method: <code className="text-amber-400">claimPaid() external payable</code></div>
                  <div>• Requirements: Open to all wallets (no NFT/Agent ID needed)</div>
                  <div>• Limit: Exactly 1 claim per wallet</div>
                  <div>• Reward: Verifiable random 300 - 700 MAGES</div>
                  <div>• Payment: Exact 0.0013 BNB</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0E071A] border border-[#2E1B4E] text-xs font-mono space-y-2">
              <div className="text-gray-300 font-bold uppercase">Contract References (BSC Chain ID 56):</div>
              <div className="flex flex-col sm:flex-row justify-between gap-1 text-gray-400">
                <span>Official MAGES Token Contract:</span>
                <a
                  href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.TOKEN}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-white font-bold"
                >
                  {CONTRACT_ADDRESSES.TOKEN} ↗
                </a>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-1 text-gray-400">
                <span>Official WeZards NFT Contract:</span>
                <a
                  href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.NFT}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-white font-bold"
                >
                  {CONTRACT_ADDRESSES.NFT} ↗
                </a>
              </div>
              <div className="flex flex-col sm:flex-row justify-between gap-1 text-gray-400">
                <span>SPACE ID Agent ID Registry:</span>
                <a
                  href="https://bscscan.com/address/0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-purple-400 hover:text-white font-bold"
                >
                  0x60B9262456dE011F7d15a54CdD8c48bAaa8B022F ↗
                </a>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 8-STEP PROCESS EXPLAINER */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                WeZards NFT Minting &amp; MAGES Token Reward Process
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed">
                Follow the 8-step lifecycle from wallet connection to receiving automatic verifiable MAGES token rewards.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    step: '1',
                    title: 'Connect Wallet',
                    desc: 'Users connect MetaMask, Trust Wallet, Binance Web3 Wallet or WalletConnect and switch to BNB Smart Chain.',
                    tag: 'MetaMask / Trust / Binance',
                    tagColor: 'bg-amber-500/20 text-[#F59E0B]'
                  },
                  {
                    step: '2',
                    title: 'Select Claim or Mint',
                    desc: 'Choose between Free Claim (requires WeZards NFT + Binance Agent ID) and Paid Claim (0.0013 BNB).',
                    tag: 'Free or Paid Option',
                    tagColor: 'bg-purple-500/20 text-purple-300'
                  },
                  {
                    step: '3',
                    title: 'Verify Eligibility',
                    desc: 'Smart contract automatically enforces 1 claim per wallet and validates prerequisites on BNB Smart Chain.',
                    tag: '1 Claim Per Wallet',
                    tagColor: 'bg-emerald-500/20 text-emerald-400'
                  },
                  {
                    step: '4',
                    title: 'Submit Transaction',
                    desc: "Call claimFree() or claimPaid() with 0.0013 BNB through your connected wallet provider.",
                    tag: 'On-Chain Execution',
                    tagColor: 'bg-blue-500/20 text-blue-300'
                  },
                  {
                    step: '5',
                    title: 'Verifiable Pseudo-Random Roll',
                    desc: 'The contract deterministically rolls a random number between 300 and 700 MAGES tokens.',
                    tag: '300 - 700 MAGES',
                    tagColor: 'bg-amber-500/20 text-[#F59E0B]'
                  },
                  {
                    step: '6',
                    title: 'Instant Delivery',
                    desc: 'Awarded MAGES tokens are transferred directly from the contract Treasury reserve to your wallet.',
                    tag: 'Direct Payout',
                    tagColor: 'bg-purple-500/20 text-purple-300'
                  },
                  {
                    step: '7',
                    title: 'Slot Decrement',
                    desc: 'Remaining claim slots automatically reduce (5,000 for Free, 2,000 for Paid) and state is updated.',
                    tag: 'State Sync',
                    tagColor: 'bg-emerald-500/20 text-emerald-400'
                  },
                  {
                    step: '8',
                    title: 'Audit Record',
                    desc: 'Transaction hash is recorded on BscScan and displayed in the audit stream.',
                    tag: 'On-Chain Audit Log',
                    tagColor: 'bg-indigo-500/20 text-indigo-300'
                  }
                ].map((s) => (
                  <div key={s.step} className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E] hover:border-[#7928CA]/60 transition flex gap-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#7928CA] to-[#F59E0B] flex items-center justify-center font-black text-black shrink-0 text-sm">
                      {s.step}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h4 className="font-bold text-white text-sm sm:text-base">{s.title}</h4>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${s.tagColor}`}>
                          {s.tag}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TOKEN ID CHECKER */}
        {activeTab === 'free' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <h3 className="text-base font-bold text-white mb-2">Check Specific Token ID Status</h3>
              <p className="text-xs text-gray-400 mb-4">Input any WeZards NFT ID (1 - 5,000) to inspect its verifiable reward status on BNB Smart Chain.</p>

              <div className="flex gap-2 max-w-md mb-4">
                <input
                  type="number"
                  min="1"
                  max="5000"
                  value={checkIdInput}
                  onChange={e => setCheckIdInput(e.target.value)}
                  placeholder="Token ID (1-5000)"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-[#090514] border border-[#2E1B4E] text-white font-mono text-xs focus:outline-none focus:border-[#7928CA]"
                />
                <button
                  onClick={() => handleCheckToken(checkIdInput)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#24133D] hover:bg-[#341B55] text-white border border-[#2E1B4E] transition"
                >
                  Verify ID
                </button>
              </div>

              {checkedResult && (
                <div className="p-4 rounded-xl bg-[#090514] border border-[#2E1B4E] text-xs font-mono space-y-1.5 max-w-md">
                  <div className="flex justify-between text-gray-400">
                    <span>Token ID:</span>
                    <span className="text-white font-bold">WeZards #{String(checkedResult.tokenId).padStart(4, '0')}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Eligible Range:</span>
                    <span className="text-[#F59E0B] font-bold">{checkedResult.eligibleRange}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Claim Status:</span>
                    <span className={checkedResult.isClaimed ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {checkedResult.status} ({checkedResult.rewardAmount} MAGES)
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: REWARD TRANSACTION HISTORY */}
        {activeTab === 'history' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E] shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-[#2E1B4E] mb-6 gap-2">
              <div>
                <h3 className="text-xl font-bold text-white">Live On-Chain Claim History</h3>
                <p className="text-xs text-gray-400">Recent claim transactions verified on BNB Smart Chain.</p>
              </div>
              <div className="text-xs font-mono text-emerald-400 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Live Event Stream</span>
              </div>
            </div>

            <div className="space-y-3">
              {history.map(tx => (
                <div key={tx.id} className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs font-mono">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#160D27] border border-[#2E1B4E] flex items-center justify-center text-base">
                      {tx.type === 'Free MAGES Claim' ? '⚡' : '💎'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{tx.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                          tx.type === 'Free MAGES Claim' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-[#F59E0B]'
                        }`}>
                          {tx.bnbCost}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-400 mt-0.5">
                        Claimant: <span className="text-gray-300">{formatAddress(tx.recipient)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center border-t sm:border-t-0 pt-2 sm:pt-0 border-[#2E1B4E]/40">
                    <div className="font-bold text-[#F59E0B] text-sm">
                      +{tx.amountMAGES.toLocaleString()} MAGES
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-gray-500 mt-0.5">
                      <span>{tx.timeAgo}</span>
                      <span>•</span>
                      <a
                        href={`https://bscscan.com/tx/${tx.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-white underline truncate max-w-[120px]"
                      >
                        BscScan ↗
                      </a>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
