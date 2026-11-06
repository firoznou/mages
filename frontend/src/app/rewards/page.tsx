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
  checkNFTFreeClaimEligibility,
  fetchUserOwnedNFTs,
  MagesClaimEligibility,
  NFTElegibilityCheck,
  getWalletProvider,
  BSC_CHAIN_ID,
  MAGES_FIXED_DISTRIBUTOR_ABI
} from '../../lib/web3';
import { parseEther, encodeFunctionData } from 'viem';

interface RewardTx {
  id: string;
  recipient: string;
  amountMAGES: number;
  bnbCost: string;
  txHash: string;
  timeAgo: string;
  type: 'Free MAGES Claim' | 'Paid MAGES Claim';
  status: 'Completed';
  nftTokenId?: number;
}

interface TxState {
  status: 'idle' | 'checking' | 'pending' | 'success' | 'error';
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
    freeClaimsOpen: true,
    paidClaimsOpen: true,
    isPaused: false,
    freeClaimsCompleted: 1,
    paidClaimsCompleted: 0,
    maxFreeClaims: 5000,
    maxPaidClaims: 2000,
    remainingFreeClaims: 4999,
    remainingPaidClaims: 2000,
    freeRewardAmount: 400,
    paidRewardAmount: 500,
    paidClaimPriceBNB: '0.0013',
    distributorMagesBalance: '2999600',

    walletAddress: null,
    nftBalance: 0,
    hasNFT: false,
    agentHandle: '',
    hasAgentId: false,
    agentBalance: 0,
    magesBalance: '0',
    bnbBalance: '0',

    hasPaidClaimed: false,
    hasClaimed: false,
    freeEligible: false,
    paidEligible: true
  });
  const [loadingEligibility, setLoadingEligibility] = useState<boolean>(true);

  // Free Claim NFT Selection State
  const [selectedTokenId, setSelectedTokenId] = useState<string>('');
  const [userOwnedTokenIds, setUserOwnedTokenIds] = useState<number[]>([]);
  const [loadingOwnedNFTs, setLoadingOwnedNFTs] = useState<boolean>(false);
  const [nftCheckResult, setNftCheckResult] = useState<NFTElegibilityCheck | null>(null);
  const [checkingNFT, setCheckingNFT] = useState<boolean>(false);

  // Single Token Verifier Tab State
  const [checkIdInput, setCheckIdInput] = useState<string>('1377');
  const [tabCheckedResult, setTabCheckedResult] = useState<NFTElegibilityCheck | null>(null);

  // Transaction execution state
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [txState, setTxState] = useState<TxState>({ status: 'idle' });

  // Add Token Feedback
  const [addTokenSuccess, setAddTokenSuccess] = useState<boolean>(false);

  // Recent on-chain history stream
  const [history, setHistory] = useState<RewardTx[]>([
    {
      id: 'tx_init_1377',
      recipient: '0xbAf4F75B9A91a63cB1d3Cae88a3589F6cBD1C7C9',
      amountMAGES: 400,
      bnbCost: '0.000 BNB',
      txHash: '0x7beb19ba0961029fc47ed5575b95ea9a79c6c76bc53de0915407e2732c7dc90c',
      timeAgo: 'Verified On-Chain',
      type: 'Free MAGES Claim',
      status: 'Completed',
      nftTokenId: 1377
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

  // Discover owned NFTs when wallet connects or changes
  const discoverOwnedNFTs = useCallback(async (addr: string) => {
    setLoadingOwnedNFTs(true);
    try {
      const ids = await fetchUserOwnedNFTs(addr);
      setUserOwnedTokenIds(ids);
      if (ids.length > 0 && !selectedTokenId) {
        setSelectedTokenId(ids[0].toString());
      }
    } catch (err) {
      console.warn('Error discovering owned NFTs:', err);
    } finally {
      setLoadingOwnedNFTs(false);
    }
  }, [selectedTokenId]);

  // Live check the selected Token ID eligibility
  useEffect(() => {
    let isCancelled = false;
    async function verifySelectedNFT() {
      const idNum = parseInt(selectedTokenId, 10);
      if (isNaN(idNum) || idNum <= 0) {
        setNftCheckResult(null);
        return;
      }

      setCheckingNFT(true);
      try {
        const result = await checkNFTFreeClaimEligibility(idNum, wallet);
        if (!isCancelled) {
          setNftCheckResult(result);
        }
      } catch (e) {
        if (!isCancelled) setNftCheckResult(null);
      } finally {
        if (!isCancelled) setCheckingNFT(false);
      }
    }

    verifySelectedNFT();
    return () => { isCancelled = true; };
  }, [selectedTokenId, wallet]);

  // Listen for wallet and chain events
  useEffect(() => {
    loadClaimData(null);

    if (typeof window !== 'undefined') {
      const provider = (window as any).BinanceChain || (window as any).ethereum;
      if (provider) {
        if (provider.selectedAddress) {
          setWallet(provider.selectedAddress);
          loadClaimData(provider.selectedAddress);
          discoverOwnedNFTs(provider.selectedAddress);
        }

        provider.on?.('accountsChanged', (accounts: string[]) => {
          if (accounts && accounts[0]) {
            setWallet(accounts[0]);
            loadClaimData(accounts[0]);
            discoverOwnedNFTs(accounts[0]);
          } else {
            setWallet(null);
            setUserOwnedTokenIds([]);
            setSelectedTokenId('');
            setNftCheckResult(null);
            loadClaimData(null);
          }
        });

        provider.on?.('chainChanged', () => {
          window.location.reload();
        });
      }
    }
  }, [loadClaimData, discoverOwnedNFTs]);

  const handleConnectWallet = async () => {
    const provider = getWalletProvider();
    if (provider) {
      try {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (accounts && accounts[0]) {
          setWallet(accounts[0]);
          await loadClaimData(accounts[0]);
          await discoverOwnedNFTs(accounts[0]);
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
          throw new Error('Please switch your wallet network to BNB Smart Chain Mainnet (Chain ID 56).');
        }
      }
    }
  };

  // Add MAGES Token to MetaMask / Web3 Wallet
  const handleAddTokenToWallet = async () => {
    const provider = getWalletProvider();
    if (!provider) {
      alert('Please connect your Web3 wallet first.');
      return;
    }
    try {
      const wasAdded = await provider.request({
        method: 'wallet_watchAsset',
        params: {
          type: 'ERC20',
          options: {
            address: CONTRACT_ADDRESSES.TOKEN,
            symbol: 'MAGES',
            decimals: 18,
            image: `${ASSET_BASE_URLS.IMAGES}/1.png`
          }
        }
      });
      if (wasAdded) {
        setAddTokenSuccess(true);
        setTimeout(() => setAddTokenSuccess(false), 4000);
      }
    } catch (e: any) {
      console.warn('Failed to add token to wallet:', e);
    }
  };

  // EXECUTE FREE CLAIM (400 MAGES)
  const handleFreeClaim = async () => {
    if (!wallet) return handleConnectWallet();

    const tokenIdNum = parseInt(selectedTokenId, 10);
    if (isNaN(tokenIdNum) || tokenIdNum <= 0) {
      alert('Please enter or select a valid WeZards NFT Token ID to claim.');
      return;
    }

    try {
      setIsSubmitting(true);
      setTxState({
        status: 'checking',
        title: 'Verifying Free Claim Prerequisites...',
        message: `Checking WeZards #${tokenIdNum} ownership, Agent ID, and distributor quota on BSC...`
      });

      const provider = getWalletProvider();
      if (!provider) throw new Error('No Web3 wallet provider detected.');

      await ensureBscChain(provider);

      // Re-verify eligibility on-chain
      const elig = await fetchMagesClaimStatus(wallet);
      if (elig.isPaused) {
        throw new Error('The MAGES distributor contract is currently paused.');
      }
      if (!elig.freeClaimsOpen) {
        throw new Error('Free claims are currently closed.');
      }
      if (elig.remainingFreeClaims <= 0) {
        throw new Error('All 5,000 Free Claim slots have been claimed.');
      }
      if (Number(elig.distributorMagesBalance) < 400) {
        throw new Error('Distributor contract has insufficient MAGES balance.');
      }
      if (!elig.hasNFT) {
        throw new Error('Free claim requires holding at least one WeZards NFT.');
      }
      if (!elig.hasAgentId) {
        throw new Error('Free claim requires a Binance Agent ID registered in SPACE ID registry.');
      }

      // Check NFT specific eligibility
      const nftCheck = await checkNFTFreeClaimEligibility(tokenIdNum, wallet);
      if (!nftCheck.owner) {
        throw new Error(`WeZards #${tokenIdNum} does not exist or has not been minted.`);
      }
      if (!nftCheck.isOwner) {
        throw new Error(`Your connected wallet does not own WeZards #${tokenIdNum}.`);
      }
      if (nftCheck.isAlreadyClaimed) {
        throw new Error(`WeZards #${tokenIdNum} has already claimed its 400 MAGES reward.`);
      }

      const data = encodeFunctionData({
        abi: MAGES_FIXED_DISTRIBUTOR_ABI,
        functionName: 'claimFree',
        args: [BigInt(tokenIdNum)]
      });

      setTxState({
        status: 'pending',
        title: 'Awaiting Wallet Confirmation...',
        message: `Please confirm claimFree(${tokenIdNum}) in your wallet (0 BNB cost + standard gas).`
      });

      let gasLimit = '0x493e0'; // 300,000 gas buffer
      try {
        const estimated = await bscPublicClient.estimateGas({
          account: wallet as `0x${string}`,
          to: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
          data,
          value: 0n
        });
        gasLimit = '0x' + (estimated * 13n / 10n).toString(16);
      } catch {}

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet,
          to: CONTRACT_ADDRESSES.DISTRIBUTOR,
          data,
          value: '0x0',
          gas: gasLimit
        }]
      });

      setTxState({
        status: 'pending',
        title: 'Confirming on BNB Smart Chain...',
        message: `Transaction broadcast! Waiting for block confirmation on BSC Mainnet...`,
        txHash
      });

      const receipt = await bscPublicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status !== 'success') {
        throw new Error('The claimFree transaction reverted on BNB Smart Chain.');
      }

      setTxState({
        status: 'success',
        title: '🎉 Free Claim Confirmed!',
        message: `Success! Exactly 400 MAGES tokens have been transferred to your wallet for WeZards #${tokenIdNum}.`,
        txHash,
        awardedMages: 400
      });

      // Record to history
      const newTx: RewardTx = {
        id: `tx_${Date.now()}`,
        recipient: wallet,
        amountMAGES: 400,
        bnbCost: '0.000 BNB',
        txHash: txHash as string,
        timeAgo: 'Just now',
        type: 'Free MAGES Claim',
        status: 'Completed',
        nftTokenId: tokenIdNum
      };
      setHistory(prev => [newTx, ...prev]);

      // Refresh all on-chain states
      await loadClaimData(wallet);
      await discoverOwnedNFTs(wallet);
      const recheck = await checkNFTFreeClaimEligibility(tokenIdNum, wallet);
      setNftCheckResult(recheck);
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

  // EXECUTE PAID CLAIM (500 MAGES @ 0.0013 BNB)
  const handlePaidClaim = async () => {
    if (!wallet) return handleConnectWallet();

    try {
      setIsSubmitting(true);
      setTxState({
        status: 'checking',
        title: 'Verifying Paid Claim Eligibility...',
        message: 'Checking 1-claim per wallet limit and distributor balance on BNB Smart Chain...'
      });

      const provider = getWalletProvider();
      if (!provider) throw new Error('No Web3 wallet provider detected.');

      await ensureBscChain(provider);

      // Re-verify eligibility on-chain
      const elig = await fetchMagesClaimStatus(wallet);
      if (elig.isPaused) {
        throw new Error('The MAGES distributor contract is currently paused.');
      }
      if (!elig.paidClaimsOpen) {
        throw new Error('Paid claims are currently closed.');
      }
      if (elig.hasPaidClaimed) {
        throw new Error('This wallet has already claimed MAGES tokens. Strictly 1 paid claim per wallet.');
      }
      if (elig.remainingPaidClaims <= 0) {
        throw new Error('All 2,000 Paid Claim slots have been claimed.');
      }
      if (Number(elig.distributorMagesBalance) < 500) {
        throw new Error('Distributor contract has insufficient MAGES balance.');
      }

      const exactPriceWei = parseEther('0.0013');
      const userBnbBal = await bscPublicClient.getBalance({ address: wallet as `0x${string}` });
      if (userBnbBal < exactPriceWei) {
        throw new Error('Insufficient BNB balance to pay the 0.0013 BNB claim fee.');
      }

      const data = encodeFunctionData({
        abi: MAGES_FIXED_DISTRIBUTOR_ABI,
        functionName: 'claimPaid'
      });

      setTxState({
        status: 'pending',
        title: 'Awaiting Wallet Confirmation...',
        message: 'Please confirm the claimPaid() transaction in your wallet with exactly 0.0013 BNB.'
      });

      const valueHex = '0x' + exactPriceWei.toString(16); // 0x49e57d6354000 (0.0013 BNB)

      let gasLimit = '0x493e0'; // 300,000 gas buffer
      try {
        const estimated = await bscPublicClient.estimateGas({
          account: wallet as `0x${string}`,
          to: CONTRACT_ADDRESSES.DISTRIBUTOR as `0x${string}`,
          data,
          value: exactPriceWei
        });
        gasLimit = '0x' + (estimated * 13n / 10n).toString(16);
      } catch {}

      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: wallet,
          to: CONTRACT_ADDRESSES.DISTRIBUTOR,
          data,
          value: valueHex,
          gas: gasLimit
        }]
      });

      setTxState({
        status: 'pending',
        title: 'Confirming on BNB Smart Chain...',
        message: `Transaction broadcast! Waiting for block confirmation on BSC Mainnet...`,
        txHash
      });

      const receipt = await bscPublicClient.waitForTransactionReceipt({ hash: txHash as `0x${string}` });
      if (receipt.status !== 'success') {
        throw new Error('The claimPaid transaction reverted on BNB Smart Chain.');
      }

      setTxState({
        status: 'success',
        title: '🎉 Paid Claim Confirmed!',
        message: 'Success! Exactly 500 MAGES tokens have been transferred directly to your wallet.',
        txHash,
        awardedMages: 500
      });

      // Record to history
      const newTx: RewardTx = {
        id: `tx_${Date.now()}`,
        recipient: wallet,
        amountMAGES: 500,
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

  // Single Token Checker (Tab 3)
  const handleVerifyTabToken = async (idStr: string) => {
    const id = parseInt(idStr, 10);
    if (isNaN(id) || id <= 0) return;
    const result = await checkNFTFreeClaimEligibility(id, wallet);
    setTabCheckedResult(result);
  };

  // Quota percentages
  const freePercent = (claimEligibility.freeClaimsCompleted / claimEligibility.maxFreeClaims) * 100;
  const paidPercent = (claimEligibility.paidClaimsCompleted / claimEligibility.maxPaidClaims) * 100;

  return (
    <div className="min-h-screen bg-[#06030D] text-gray-200 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        
        {/* Header */}
        <div className="text-center mb-10 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#7928CA]/20 text-[#F59E0B] text-xs font-bold tracking-widest uppercase mb-3 border border-[#7928CA]/40 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            BNB Smart Chain (Chain ID 56) • Official MAGES Fixed Distributor
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight mb-4">
            MAGES Fixed Reward Claim Hub
          </h1>
          <p className="text-gray-300 text-sm sm:text-base leading-relaxed">
            Claim fixed MAGES token allocations directly from the verified <strong className="text-white">MAGESFixedDistributor</strong> smart contract.
            Receive <strong className="text-emerald-400">400 MAGES</strong> per WeZards NFT + Agent ID, or participate in the public paid claim for <strong className="text-amber-400">500 MAGES</strong>.
          </p>
        </div>

        {/* Global Summary Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Free Claim Reward</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">400 MAGES</div>
            <div className="text-[11px] text-gray-400 mt-1">Per WeZards NFT (1 claim/NFT)</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Paid Claim Reward</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-amber-400">500 MAGES</div>
            <div className="text-[11px] text-gray-400 mt-1">@ 0.0013 BNB (1 claim/wallet)</div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Free Claims Completed</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              {claimEligibility.freeClaimsCompleted.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/ 5,000</span>
            </div>
            <div className="text-[11px] text-emerald-400 mt-1">
              {claimEligibility.remainingFreeClaims.toLocaleString()} slots remaining
            </div>
          </div>
          <div className="p-4 sm:p-5 rounded-2xl bg-[#160D27] border border-[#2E1B4E]">
            <div className="text-[11px] text-gray-400 uppercase font-bold tracking-wider mb-1">Paid Claims Completed</div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-purple-400">
              {claimEligibility.paidClaimsCompleted.toLocaleString()} <span className="text-xs text-gray-500 font-normal">/ 2,000</span>
            </div>
            <div className="text-[11px] text-gray-400 mt-1">
              {claimEligibility.remainingPaidClaims.toLocaleString()} slots remaining
            </div>
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
                    claimEligibility.isPaused 
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {claimEligibility.isPaused ? 'Contract Paused' : 'Campaign Active'}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            <div className="text-right">
              <div className="text-xs text-gray-400 font-medium">Your MAGES Balance:</div>
              <div className="text-base font-mono font-bold text-[#F59E0B]">
                {Number(walletMagesBalance).toLocaleString()} MAGES
              </div>
            </div>

            <button
              onClick={handleAddTokenToWallet}
              className="px-3 py-2 rounded-xl text-xs font-mono font-bold bg-[#090514] border border-[#2E1B4E] hover:border-amber-400 text-amber-300 transition flex items-center gap-1.5"
              title="Add MAGES Token to MetaMask"
            >
              <span>🦊</span>
              <span>{addTokenSuccess ? '✓ Added to Wallet!' : 'Add MAGES to MetaMask'}</span>
            </button>

            {!wallet ? (
              <button
                onClick={handleConnectWallet}
                className="px-5 py-2.5 rounded-xl font-bold text-xs bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:brightness-110 text-white shadow-lg transition"
              >
                Connect Wallet
              </button>
            ) : (
              <button
                onClick={() => {
                  loadClaimData(wallet);
                  discoverOwnedNFTs(wallet);
                }}
                disabled={loadingEligibility}
                className="px-4 py-2 rounded-xl text-xs font-mono font-bold bg-[#090514] border border-[#2E1B4E] hover:border-[#7928CA] text-gray-300 transition disabled:opacity-50"
              >
                {loadingEligibility ? 'Syncing...' : '🔄 Refresh Data'}
              </button>
            )}
          </div>
        </div>

        {/* Transaction Status Modal / Banner */}
        {txState.status !== 'idle' && (
          <div className={`p-5 rounded-2xl mb-8 border transition-all ${
            txState.status === 'pending' || txState.status === 'checking'
              ? 'bg-purple-950/40 border-purple-500/50 text-purple-200'
              : txState.status === 'success'
              ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-200'
              : 'bg-rose-950/40 border-rose-500/50 text-rose-200'
          }`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <span className="text-2xl mt-0.5">
                  {txState.status === 'pending' || txState.status === 'checking' ? '⏳' : txState.status === 'success' ? '🎉' : '❌'}
                </span>
                <div>
                  <h4 className="font-bold text-base text-white mb-1">{txState.title}</h4>
                  <p className="text-xs text-gray-300 leading-relaxed font-mono">{txState.message}</p>
                  
                  {txState.awardedMages && (
                    <div className="mt-3 p-3 rounded-xl bg-black/40 border border-emerald-500/40 inline-flex items-center gap-3">
                      <span className="text-xs uppercase tracking-wider font-bold text-gray-400">Fixed Reward Received:</span>
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
                        <span>View Transaction on BscScan ↗</span>
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
          
          {/* CARD 1: FREE CLAIM (400 MAGES / NFT) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-[#160D27] border-2 border-[#7928CA]/40 hover:border-[#7928CA] transition shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-[#7928CA]/20 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-bold uppercase tracking-wider border border-emerald-500/30 font-mono">
                  <span>✨</span>
                  <span>WeZards NFT + Agent ID</span>
                </span>
                <span className="text-xs font-mono font-bold text-emerald-400 bg-[#090514] px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                  Fixed 400 MAGES / NFT
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                Free MAGES Claim
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
                Holders owning a <strong className="text-white">WeZards NFT</strong> and a verified <strong className="text-white">Binance Agent ID</strong> can claim exactly <strong className="text-emerald-400">400 MAGES</strong> per NFT. Each NFT token ID can claim once.
              </p>

              {/* Reward & Pricing Pill */}
              <div className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] mb-5 grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Payment</div>
                  <div className="text-2xl font-black font-mono text-emerald-400">0.000 BNB</div>
                  <div className="text-[10px] text-gray-500">Free to Claim (Gas Only)</div>
                </div>
                <div className="border-l border-[#2E1B4E]">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Fixed Reward</div>
                  <div className="text-2xl font-black font-mono text-[#F59E0B]">400 MAGES</div>
                  <div className="text-[10px] text-gray-500">Per NFT Token ID</div>
                </div>
              </div>

              {/* Live Quota Progress */}
              <div className="mb-5">
                <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                  <span className="text-gray-300">Free Claims Completed:</span>
                  <span className="text-emerald-400 font-bold">
                    {claimEligibility.freeClaimsCompleted.toLocaleString()} / {claimEligibility.maxFreeClaims.toLocaleString()} ({freePercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative w-full h-3 bg-[#090514] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E]">
                  <div
                    style={{ width: `${Math.max(freePercent, claimEligibility.freeClaimsCompleted > 0 ? 1 : 0)}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-emerald-600 via-teal-400 to-emerald-400 transition-all duration-700"
                  />
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-1">
                  ⚡ {claimEligibility.remainingFreeClaims.toLocaleString()} of 5,000 Free Claim slots remaining
                </div>
              </div>

              {/* NFT TOKEN ID SELECTOR & ELIGIBILITY VERIFICATION */}
              <div className="p-4 rounded-2xl bg-[#0E071A] border border-[#2E1B4E] mb-6 space-y-3 text-xs font-mono">
                <div className="text-gray-300 font-bold uppercase text-[11px] font-sans flex items-center justify-between">
                  <span>Select Eligible WeZards NFT:</span>
                  <span className="text-[10px] font-mono text-gray-400">
                    {loadingOwnedNFTs ? 'Scanning NFTs...' : `${userOwnedTokenIds.length} Detected`}
                  </span>
                </div>

                {/* Detected NFTs Badges */}
                {userOwnedTokenIds.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {userOwnedTokenIds.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedTokenId(id.toString())}
                        className={`px-3 py-1 rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${
                          selectedTokenId === id.toString()
                            ? 'bg-[#7928CA] text-white border border-purple-400 shadow-md'
                            : 'bg-[#090514] text-gray-300 hover:text-white border border-[#2E1B4E]'
                        }`}
                      >
                        <span>🧙</span>
                        <span>#{id}</span>
                      </button>
                    ))}
                  </div>
                )}

                {/* Manual Token ID Input */}
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <span className="absolute left-3 top-2.5 text-gray-500 font-bold">#</span>
                    <input
                      type="number"
                      min="1"
                      max="5000"
                      value={selectedTokenId}
                      onChange={(e) => setSelectedTokenId(e.target.value)}
                      placeholder="Enter WeZards Token ID (e.g. 1377)"
                      className="w-full pl-8 pr-3 py-2 rounded-xl bg-[#090514] border border-[#2E1B4E] text-white text-xs font-mono focus:outline-none focus:border-[#7928CA]"
                    />
                  </div>
                </div>

                {/* Live On-Chain Check Feedback for Selected NFT */}
                {checkingNFT ? (
                  <div className="text-[11px] text-purple-300 flex items-center gap-1.5">
                    <span className="animate-spin">🌀</span>
                    <span>Checking on-chain eligibility for WeZards #{selectedTokenId}...</span>
                  </div>
                ) : nftCheckResult && selectedTokenId ? (
                  <div className={`p-2.5 rounded-xl border text-[11px] ${
                    nftCheckResult.isEligible
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : nftCheckResult.isAlreadyClaimed
                      ? 'bg-amber-950/40 border-amber-500/40 text-amber-300'
                      : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
                  }`}>
                    {nftCheckResult.statusMessage}
                  </div>
                ) : null}

                {/* Requirements Checklist */}
                <div className="pt-2 border-t border-[#2E1B4E] space-y-1.5 text-[11px]">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">• Wallet NFT Balance:</span>
                    <span className={claimEligibility.hasNFT ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {wallet ? `${claimEligibility.nftBalance} NFT(s)` : 'Connect Wallet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-400">• Binance Agent ID:</span>
                    <span className={claimEligibility.hasAgentId ? 'text-emerald-400 font-bold' : 'text-amber-400'}>
                      {wallet ? (claimEligibility.hasAgentId ? '✓ Verified' : 'Not Found') : 'Connect Wallet'}
                    </span>
                  </div>
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
                  Requires Binance Agent ID (SPACE ID)
                </button>
              ) : !selectedTokenId ? (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-[#1C102E] text-gray-400 border border-[#2E1B4E] cursor-not-allowed"
                >
                  Enter or Select a Token ID to Claim
                </button>
              ) : nftCheckResult && !nftCheckResult.isEligible ? (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-[#1C102E] text-amber-400 border border-amber-500/30 cursor-not-allowed"
                >
                  {nftCheckResult.isAlreadyClaimed ? '✓ Token Already Claimed' : 'Token ID Not Owned'}
                </button>
              ) : (
                <button
                  onClick={handleFreeClaim}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:brightness-110 text-black shadow-[0_0_25px_rgba(16,185,129,0.4)] transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Free Claim...' : `⚡ Claim 400 MAGES for #${selectedTokenId} (0 BNB)`}
                </button>
              )}
            </div>
          </div>

          {/* CARD 2: PAID CLAIM (500 MAGES @ 0.0013 BNB) */}
          <div className="p-6 sm:p-7 rounded-3xl bg-[#160D27] border-2 border-amber-500/40 hover:border-amber-400 transition shadow-2xl flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-br from-amber-500/20 to-transparent rounded-full blur-2xl pointer-events-none" />

            <div>
              {/* Header Badges */}
              <div className="flex items-center justify-between gap-2 mb-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-[#F59E0B] text-xs font-bold uppercase tracking-wider border border-amber-500/30 font-mono">
                  <span>💎</span>
                  <span>Open to Any Wallet</span>
                </span>
                <span className="text-xs font-mono font-bold text-amber-300 bg-[#090514] px-2.5 py-0.5 rounded-full border border-amber-500/30">
                  Fixed 500 MAGES
                </span>
              </div>

              <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight mb-2">
                Paid MAGES Claim
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 leading-relaxed mb-4">
                Open to all BNB Chain wallets without needing an NFT or Agent ID. Claim exactly <strong className="text-amber-400">500 MAGES</strong> tokens for <strong className="text-white">0.0013 BNB</strong>. Strictly 1 paid claim per wallet.
              </p>

              {/* Reward & Pricing Pill */}
              <div className="p-4 rounded-2xl bg-[#090514] border border-[#2E1B4E] mb-5 grid grid-cols-2 gap-3 text-center">
                <div>
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Payment Required</div>
                  <div className="text-2xl font-black font-mono text-[#F59E0B]">0.0013 BNB</div>
                  <div className="text-[10px] text-gray-500">Contract Payment</div>
                </div>
                <div className="border-l border-[#2E1B4E]">
                  <div className="text-[10px] text-gray-400 uppercase font-bold tracking-wider mb-0.5">Fixed Reward</div>
                  <div className="text-2xl font-black font-mono text-[#F59E0B]">500 MAGES</div>
                  <div className="text-[10px] text-gray-500">Instant Token Delivery</div>
                </div>
              </div>

              {/* Live Quota Progress */}
              <div className="mb-5">
                <div className="flex justify-between items-center text-xs font-mono mb-1.5">
                  <span className="text-gray-300">Paid Claims Completed:</span>
                  <span className="text-amber-400 font-bold">
                    {claimEligibility.paidClaimsCompleted.toLocaleString()} / {claimEligibility.maxPaidClaims.toLocaleString()} ({paidPercent.toFixed(1)}%)
                  </span>
                </div>
                <div className="relative w-full h-3 bg-[#090514] rounded-full overflow-hidden p-0.5 border border-[#2E1B4E]">
                  <div
                    style={{ width: `${Math.max(paidPercent, claimEligibility.paidClaimsCompleted > 0 ? 1 : 0)}%` }}
                    className="h-full rounded-full bg-gradient-to-r from-amber-600 via-yellow-400 to-amber-500 transition-all duration-700"
                  />
                </div>
                <div className="text-[10px] font-mono text-gray-400 mt-1">
                  ⚡ {claimEligibility.remainingPaidClaims.toLocaleString()} of 2,000 Paid Claim slots remaining
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
                    <span>{!claimEligibility.hasPaidClaimed ? '✅' : '🚫'}</span>
                    <span className={!claimEligibility.hasPaidClaimed ? 'text-white' : 'text-gray-400'}>
                      Wallet Claim Status:
                    </span>
                  </span>
                  <span className={`font-bold ${!claimEligibility.hasPaidClaimed ? 'text-emerald-400' : 'text-amber-400'}`}>
                    {wallet ? (claimEligibility.hasPaidClaimed ? 'Already Claimed (Limit Reached)' : 'Unclaimed (Eligible)') : 'Connect Wallet'}
                  </span>
                </div>
              </div>
            </div>

            {/* Paid Claim Action Button */}
            <div>
              {!wallet ? (
                <button
                  onClick={handleConnectWallet}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 to-[#F59E0B] hover:brightness-110 text-black shadow-lg transition active:scale-95"
                >
                  Connect Wallet to Claim Paid
                </button>
              ) : claimEligibility.hasPaidClaimed ? (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-[#1C102E] text-gray-500 border border-[#2E1B4E] cursor-not-allowed"
                >
                  ✓ Already Claimed (1 Claim Limit Reached)
                </button>
              ) : claimEligibility.remainingPaidClaims <= 0 ? (
                <button
                  disabled
                  className="w-full py-4 rounded-2xl font-bold text-sm bg-[#1C102E] text-gray-500 border border-[#2E1B4E] cursor-not-allowed"
                >
                  Paid Claim Allocation Filled (2,000 / 2,000)
                </button>
              ) : (
                <button
                  onClick={handlePaidClaim}
                  disabled={isSubmitting}
                  className="w-full py-4 rounded-2xl font-black text-sm bg-gradient-to-r from-amber-400 via-yellow-400 to-[#F59E0B] hover:brightness-110 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)] transition active:scale-95 disabled:opacity-50"
                >
                  {isSubmitting ? 'Submitting Paid Claim...' : '💎 Claim 500 MAGES (0.0013 BNB)'}
                </button>
              )}
            </div>
          </div>

        </div>

        {/* BOTTOM TABS: ARCHITECTURE, VERIFIER, PROCESS & AUDIT STREAM */}
        <div className="flex flex-wrap gap-2 border-b border-[#2E1B4E] pb-4 mb-6">
          {[
            { id: 'claim', label: 'Contract Architecture & ABIs' },
            { id: 'free', label: 'NFT Eligibility Verifier' },
            { id: 'process', label: '8-Step Process Lifecycle' },
            { id: 'history', label: 'Live On-Chain Audit Log' }
          ].map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition ${
                activeTab === t.id
                  ? 'bg-[#7928CA] text-white shadow-[0_0_15px_rgba(121,40,202,0.4)]'
                  : 'bg-[#160D27] text-gray-400 hover:text-white border border-[#2E1B4E]'
              }`}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* TAB 1: CLAIM DETAILS & CONTRACT ARCHITECTURE */}
        {activeTab === 'claim' && (
          <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E] space-y-6">
            <h3 className="text-2xl font-black text-white">Smart Contract Technical Specifications</h3>
            <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">
              MAGES claims execute directly on the deployed <strong className="text-white">MAGESFixedDistributor</strong> smart contract on BNB Smart Chain Mainnet.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-2xl bg-[#090514] border border-[#2E1B4E]">
                <div className="text-white font-bold text-sm mb-2 flex items-center gap-2">
                  <span>⚡</span>
                  <span>function claimFree(uint256 nftTokenId)</span>
                </div>
                <div className="text-xs font-mono text-gray-400 space-y-1">
                  <div>• Method: <code className="text-emerald-400">claimFree(uint256 nftTokenId) external</code></div>
                  <div>• Requirements: WeZards NFT + Binance Agent ID</div>
                  <div>• Limit: Exactly 1 claim per NFT Token ID</div>
                  <div>• Reward: Exactly 400 MAGES tokens</div>
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
                  <div>• Reward: Exactly 500 MAGES tokens</div>
                  <div>• Payment: Exact 0.0013 BNB</div>
                </div>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0E071A] border border-[#2E1B4E] text-xs font-mono space-y-2">
              <div className="text-gray-300 font-bold uppercase">Contract References (BSC Chain ID 56):</div>
              <div className="flex flex-col sm:flex-row justify-between gap-1 text-gray-400">
                <span>Official MAGES Fixed Distributor:</span>
                <a
                  href={`https://bscscan.com/address/${CONTRACT_ADDRESSES.DISTRIBUTOR}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-amber-400 hover:text-white font-bold"
                >
                  {CONTRACT_ADDRESSES.DISTRIBUTOR} ↗
                </a>
              </div>
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

        {/* TAB 2: TOKEN ID ELIGIBILITY VERIFIER */}
        {activeTab === 'free' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <h3 className="text-base font-bold text-white mb-2">Check Specific Token ID Status</h3>
              <p className="text-xs text-gray-400 mb-4">Input any WeZards NFT ID (1 - 5,000) to inspect its ownership and free claim status on BNB Smart Chain.</p>

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
                  onClick={() => handleVerifyTabToken(checkIdInput)}
                  className="px-5 py-2.5 rounded-xl font-bold text-xs bg-[#24133D] hover:bg-[#341B55] text-white border border-[#2E1B4E] transition"
                >
                  Verify ID
                </button>
              </div>

              {tabCheckedResult && (
                <div className="p-4 rounded-xl bg-[#090514] border border-[#2E1B4E] text-xs font-mono space-y-2 max-w-md">
                  <div className="flex justify-between text-gray-400">
                    <span>Token ID:</span>
                    <span className="text-white font-bold">WeZards #{String(tabCheckedResult.tokenId).padStart(4, '0')}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Current Owner:</span>
                    <span className="text-amber-300 font-bold">{tabCheckedResult.owner ? formatAddress(tabCheckedResult.owner) : 'Unminted'}</span>
                  </div>
                  <div className="flex justify-between text-gray-400">
                    <span>Claim Status:</span>
                    <span className={tabCheckedResult.isAlreadyClaimed ? 'text-amber-400 font-bold' : 'text-emerald-400 font-bold'}>
                      {tabCheckedResult.isAlreadyClaimed ? 'Already Claimed' : 'Unclaimed (Eligible for 400 MAGES)'}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: 8-STEP PROCESS EXPLAINER */}
        {activeTab === 'process' && (
          <div className="space-y-6">
            <div className="p-6 sm:p-8 rounded-3xl bg-[#160D27] border border-[#2E1B4E]">
              <h2 className="text-2xl font-black text-white mb-2 tracking-tight">
                MAGES Fixed Reward Claim Process
              </h2>
              <p className="text-gray-400 text-xs sm:text-sm mb-6 leading-relaxed">
                Follow the 8-step lifecycle from wallet connection to receiving your fixed MAGES token allocation.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  {
                    step: '1',
                    title: 'Connect Wallet',
                    desc: 'Connect MetaMask, Trust Wallet, Binance Web3 Wallet or Injected Web3 and verify BNB Smart Chain Mainnet (Chain ID 56).',
                    tag: 'MetaMask / Trust / Binance',
                    tagColor: 'bg-amber-500/20 text-[#F59E0B]'
                  },
                  {
                    step: '2',
                    title: 'Select Claim Tier',
                    desc: 'Choose Free Claim (400 MAGES per WeZards NFT + Agent ID) or Public Paid Claim (500 MAGES @ 0.0013 BNB).',
                    tag: '400 or 500 MAGES',
                    tagColor: 'bg-purple-500/20 text-purple-300'
                  },
                  {
                    step: '3',
                    title: 'Select Eligible NFT',
                    desc: 'For Free Claims, pick your owned WeZards NFT token ID from the automatically detected list or manual input.',
                    tag: '1 Claim Per NFT',
                    tagColor: 'bg-emerald-500/20 text-emerald-400'
                  },
                  {
                    step: '4',
                    title: 'Submit Transaction',
                    desc: "Call claimFree(nftTokenId) with 0 BNB, or claimPaid() with exactly 0.0013 BNB to the MAGESFixedDistributor contract.",
                    tag: 'On-Chain Execution',
                    tagColor: 'bg-blue-500/20 text-blue-300'
                  },
                  {
                    step: '5',
                    title: 'Fixed Reward Delivery',
                    desc: 'The distributor contract directly transfers the exact fixed MAGES tokens (400 or 500) to your connected wallet.',
                    tag: 'Instant Payout',
                    tagColor: 'bg-amber-500/20 text-[#F59E0B]'
                  },
                  {
                    step: '6',
                    title: 'Funded Treasury Reserve',
                    desc: 'Tokens are distributed from the 3,000,000 MAGES allocation safely locked in the distributor contract.',
                    tag: 'Audited Contract',
                    tagColor: 'bg-purple-500/20 text-purple-300'
                  },
                  {
                    step: '7',
                    title: 'Real-Time Quota Sync',
                    desc: 'Remaining claim slots and on-chain metrics update immediately upon block confirmation.',
                    tag: 'State Sync',
                    tagColor: 'bg-emerald-500/20 text-emerald-400'
                  },
                  {
                    step: '8',
                    title: 'Explorer Verification',
                    desc: 'Transaction hash and recipient records are permanently indexed on BscScan.',
                    tag: 'BscScan Verified',
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
                        {tx.nftTokenId && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-bold">
                            NFT #{tx.nftTokenId}
                          </span>
                        )}
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
