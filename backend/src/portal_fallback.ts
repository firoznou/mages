export function renderPortalFallback(pathname: string): Response {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <link rel="icon" href="https://assets.bunink.xyz/images/1.png" type="image/png" />
  <link rel="apple-touch-icon" href="https://assets.bunink.xyz/images/1.png" />
  <title>WeZards - Magical Web3 Ecosystem | 5,000 NFTs & MAGES Token on BSC</title>
  <meta name="description" content="5,000 unique wizard NFTs and 21M fixed MAGES tokens on BNB Smart Chain. Agentic free minting, verifiable random rewards." />
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    body {
      background: radial-gradient(circle at 50% 0%, rgba(121, 40, 202, 0.18) 0%, rgba(8, 3, 20, 1) 70%), #080314;
      color: #F5F5FA;
      font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      min-height: 100vh;
    }
    .gold-glow { text-shadow: 0 0 12px rgba(245, 158, 11, 0.6); }
    .purple-glow { text-shadow: 0 0 16px rgba(168, 85, 247, 0.7); }
    .pixelated { image-rendering: pixelated; }
  </style>
</head>
<body class="flex flex-col min-h-screen">
  <!-- Navbar -->
  <nav class="sticky top-0 z-40 backdrop-blur-xl bg-[#090514]/90 border-b border-[#2E1B4E]">
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div class="flex items-center justify-between h-20">
        <a class="flex items-center gap-3" href="/">
          <div class="w-11 h-11 rounded-xl bg-gradient-to-tr from-[#7928CA] via-[#9333EA] to-[#F59E0B] p-[2px] shadow-[0_0_15px_rgba(245,158,11,0.25)]">
            <img src="https://assets.bunink.xyz/images/1.png" alt="WeZards Logo" class="w-full h-full rounded-[9px] bg-[#090514] object-contain p-0.5" style="image-rendering: pixelated;" />
          </div>
          <div>
            <span class="text-2xl font-extrabold tracking-wider bg-clip-text text-transparent bg-gradient-to-r from-white via-[#F3F4F6] to-[#C084FC]">WeZards</span>
            <span class="hidden sm:inline-block ml-2 text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-full bg-[#2E1B4E] text-[#C084FC] font-semibold border border-[#4C2882]">BSC Ecosystem</span>
          </div>
        </a>
        <div class="hidden md:flex items-center space-x-2">
          <a class="px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[#160D27] border border-[#7928CA]/50" href="/">Home</a>
          <a class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white" href="/collection">Collection</a>
          <a class="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-400 hover:text-white" href="/mint">Mint <span class="text-[10px] uppercase px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Live</span></a>
          <a class="px-3 py-1.5 rounded-lg text-sm font-medium text-amber-400 hover:text-white" href="/mint#gift">Gift Drop 🎁</a>
          <a class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white" href="/presale">Presale</a>
          <a class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white" href="/tokenomics">MAGES Token</a>
          <a class="px-3 py-1.5 rounded-lg text-sm font-medium text-gray-300 hover:text-white" href="/rewards">Rewards</a>
        </div>
        <div>
          <button id="connectWalletBtn" onclick="connectWallet()" class="px-5 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] rounded-xl shadow-[0_0_20px_rgba(121,40,202,0.4)] transition">Connect Wallet</button>
        </div>
      </div>
    </div>
  </nav>

  <!-- Hero Section -->
  <main class="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full">
    <div class="text-center max-w-3xl mx-auto mb-12">
      <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#160D27] border border-[#2E1B4E] text-xs text-[#F59E0B] mb-6">
        <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
        <span class="font-semibold tracking-wide">BNB Smart Chain (ChainID: 56)</span>
        <span class="text-gray-500">•</span>
        <span id="bscBlockNumber" class="text-gray-300 font-mono">Block Live</span>
      </div>
      <h1 class="text-4xl sm:text-6xl font-black tracking-tight leading-tight mb-4">
        WeZards <span class="bg-clip-text text-transparent bg-gradient-to-r from-[#F59E0B] via-[#C084FC] to-[#9333EA]">Magical Web3</span> Portal
      </h1>
      <p class="text-gray-400 text-base sm:text-lg">
        5,000 unique retro 8-bit wizard NFTs, 21,000,000 fixed MAGES tokenomics, verifiable Chainlink VRF random rewards, and Binance Agentic Free Minting.
      </p>
    </div>

    <!-- MINTING PROGRESS CARD (Matches User Design) -->
    <div class="max-w-3xl mx-auto bg-[#120824]/90 border border-[#2A1747] rounded-3xl p-6 sm:p-8 shadow-[0_0_40px_rgba(121,40,202,0.25)] mb-12">
      <div class="flex items-center justify-between border-b border-[#2A1747] pb-4 mb-6">
        <div>
          <div class="flex items-center gap-2">
            <h2 class="text-xl sm:text-2xl font-black text-white">Binance Agentic Free Mint</h2>
            <span class="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">1 Free / Wallet</span>
          </div>
          <p class="text-xs text-gray-400 mt-1">Exclusively for verified Binance Agentic Wallet holders.</p>
        </div>
        <div class="text-right">
          <div class="text-[10px] uppercase tracking-wider text-gray-400 font-semibold">Cost</div>
          <div class="text-xl font-mono font-bold text-amber-400">0.000 BNB</div>
        </div>
      </div>

      <!-- Agentic Free Mint Progress -->
      <div class="bg-[#0D051A] border border-[#2E1B4E] rounded-2xl p-4 mb-4">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-bold text-[#F59E0B] flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-amber-400"></span> AGENTIC FREE MINT LIVE PROGRESS
          </span>
          <span class="text-xs font-mono font-bold text-white"><span id="freeMintedCount">0</span> / 2,500 claimed (<span id="freeMintedPct">0.0%</span>)</span>
        </div>
        <div class="w-full bg-[#1A0B2E] rounded-full h-3.5 p-[2px] overflow-hidden">
          <div id="freeProgressBar" class="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-full transition-all duration-700" style="width: 0.1%"></div>
        </div>
        <div class="flex justify-between items-center text-[11px] text-gray-400 mt-2 font-mono">
          <span>⚡ <span id="freeRemainingCount">2,500</span> Free Spots Remaining</span>
          <span>Cap: 1 Free / Verified Agentic Wallet</span>
        </div>
      </div>

      <!-- Total Collection Mint Progress -->
      <div class="bg-[#0D051A] border border-[#2E1B4E] rounded-2xl p-4 mb-6">
        <div class="flex justify-between items-center mb-2">
          <span class="text-xs font-bold text-purple-400 flex items-center gap-1.5">
            <span class="w-2 h-2 rounded-full bg-purple-400"></span> TOTAL WEZARDS COLLECTION MINTED (HARD CAP: 5,000)
          </span>
          <span class="text-xs font-mono font-bold text-white"><span id="totalMintedCount">0</span> / 5,000 Minted (<span id="totalMintedPct">0.0%</span>)</span>
        </div>
        <div class="w-full bg-[#1A0B2E] rounded-full h-3.5 p-[2px] overflow-hidden flex">
          <div id="totalProgressBar" class="h-full bg-gradient-to-r from-amber-500 via-purple-500 to-violet-600 rounded-full transition-all duration-700" style="width: 0.1%"></div>
        </div>
        <div class="flex justify-between items-center text-[11px] text-gray-400 mt-2 font-mono">
          <span>⚡ <span id="totalRemainingCount">5,000</span> Total Remaining</span>
          <span>● Free: <span id="statFree">0</span> ● Paid: <span id="statPaid">0</span></span>
        </div>
      </div>

      <!-- Wallet Status -->
      <div class="border-t border-[#2A1747] pt-4 mb-6 text-xs font-mono space-y-1.5">
        <div class="flex justify-between text-gray-400">
          <span>Connected Wallet:</span>
          <span id="walletAddressDisplay" class="text-gray-300">Not Connected</span>
        </div>
        <div class="flex justify-between text-gray-400">
          <span>Agentic Eligibility Status:</span>
          <span id="eligibilityStatus" class="text-amber-400">Connect Wallet to Check</span>
        </div>
      </div>

      <!-- Mint Action Button -->
      <button id="mintActionBtn" onclick="connectWallet()" class="w-full py-4 rounded-2xl font-black text-white bg-gradient-to-r from-[#7928CA] to-[#9333EA] hover:from-[#8B2BE2] hover:to-[#A855F7] shadow-[0_0_25px_rgba(121,40,202,0.4)] transition text-base tracking-wide">
        Connect Wallet to Claim
      </button>
    </div>

    <!-- MINTING GIFT SECTION (Community X Drop) -->
    <div id="gift" class="max-w-3xl mx-auto bg-gradient-to-b from-[#160D27] to-[#0D051A] border-2 border-amber-500/40 rounded-3xl p-6 sm:p-8 shadow-[0_0_50px_rgba(245,158,11,0.15)] mb-12">
      <div class="flex items-center gap-3 mb-4">
        <span class="text-3xl">🎁</span>
        <div>
          <h3 class="text-2xl font-black text-white">Share on X &amp; Claim 1$ Bonus Gift</h3>
          <p class="text-xs text-amber-300">Share your WeZards journey on X (Twitter) &amp; receive exclusive 1$ MAGES bonus gift!</p>
        </div>
      </div>

      <div class="bg-[#080314]/70 border border-[#2E1B4E] rounded-2xl p-4 mb-6 text-xs text-gray-300 space-y-3">
        <p class="font-bold text-white uppercase tracking-wider text-xs">Community Social Tasks Checklist:</p>
        <ol class="list-decimal pl-4 space-y-1.5 text-gray-400">
          <li>Follow <a href="https://x.com/nfthunter_wp" target="_blank" class="text-amber-400 font-bold hover:underline">@nfthunter_wp</a> on X (Twitter).</li>
          <li>Like & retweet the pinned post on <a href="https://x.com/nfthunter_wp" target="_blank" class="text-amber-400 font-bold hover:underline">@nfthunter_wp</a>.</li>
          <li>Post on X mentioning <code class="text-amber-300 bg-[#160D27] px-1.5 py-0.5 rounded font-mono">@nfthunter_wp</code> and hashtags: <code class="text-amber-300 bg-[#160D27] px-1.5 py-0.5 rounded font-mono">#agentID #lfg #wezards $mages</code></li>
          <li>Include our website link: <code class="text-purple-300 bg-[#160D27] px-1.5 py-0.5 rounded font-mono">https://wezards.bunink.xyz/</code></li>
          <li>Enter your BSC wallet address holding tokens below.</li>
          <li>Upload your holding tokens screenshot proof.</li>
        </ol>

        <div class="flex flex-wrap gap-2 pt-2 border-t border-[#2E1B4E]">
          <a href="https://x.com/nfthunter_wp" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-[#24133D] hover:bg-[#341B55] border border-[#2E1B4E] text-xs text-amber-300 font-bold transition flex items-center gap-1.5">
            Follow @nfthunter_wp ↗
          </a>
          <a href="https://x.com/nfthunter_wp" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-[#24133D] hover:bg-[#341B55] border border-[#2E1B4E] text-xs text-purple-200 font-bold transition flex items-center gap-1.5">
            Like & Retweet Pinned Post ❤️🔁
          </a>
          <a href="https://twitter.com/intent/tweet?text=Just%20joined%20the%20%23wezards%20magical%20Web3%20ecosystem%20with%20%40nfthunter_wp%20on%20BNB%20Smart%20Chain!%20%F0%9F%A7%99%E2%80%8D%E2%99%82%EF%B8%8F%E2%9C%A8%0A%0AMinted%20NFTs%20%26%20holding%20%24MAGES%20tokens%3A%0Ahttps%3A%2F%2Fwezards.bunink.xyz%2F%0A%0A%23agentID%20%23lfg%20%23wezards%20%40nfthunter_wp%20%24mages" target="_blank" class="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black text-xs font-bold transition flex items-center gap-1.5">
            Post on X (Tweet) 🐦
          </a>
        </div>
      </div>

      <form id="giftForm" onsubmit="submitGiftClaim(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">Your BSC Wallet Address *</label>
          <input type="text" id="giftWallet" required placeholder="0x..." class="w-full bg-[#080314] border border-[#2E1B4E] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">X / Twitter Username (optional)</label>
          <input type="text" id="giftTwitter" placeholder="@username" class="w-full bg-[#080314] border border-[#2E1B4E] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">X Post / Tweet Status URL *</label>
          <input type="url" id="giftPostUrl" required placeholder="https://x.com/yourhandle/status/1234567890" class="w-full bg-[#080314] border border-[#2E1B4E] rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:border-amber-400 focus:outline-none" />
        </div>
        <div>
          <label class="block text-xs font-semibold text-gray-300 mb-1">Token Holding Screenshot Proof *</label>
          <input type="file" id="giftScreenshot" accept="image/*" required class="w-full bg-[#080314] border border-[#2E1B4E] rounded-xl px-4 py-2 text-xs text-gray-300 file:mr-3 file:py-1 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-amber-500 file:text-black hover:file:bg-amber-400" />
        </div>
        <div id="giftStatusMsg" class="hidden text-xs p-3 rounded-xl"></div>
        <button type="submit" id="giftSubmitBtn" class="w-full py-3.5 rounded-xl font-bold text-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.3)] transition text-sm">
          Submit Gift Drop Claim
        </button>
      </form>
    </div>

    <!-- Verified Contracts Section -->
    <div class="max-w-3xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-mono">
      <div class="bg-[#120824] border border-[#2A1747] p-4 rounded-2xl">
        <div class="flex justify-between items-center text-gray-400 mb-1">
          <span class="font-bold text-white">WeZards NFT (ERC-721)</span>
          <span class="text-emerald-400">5,000 Cap</span>
        </div>
        <a href="https://bscscan.com/address/0xe4d7Ec33Fcf7D93cBE7F4D46d0ef35F437956aab" target="_blank" rel="noopener noreferrer" class="text-purple-300 hover:text-white truncate block">0xe4d7Ec33Fcf7D93cBE7F4D46d0ef35F437956aab</a>
      </div>
      <div class="bg-[#120824] border border-[#2A1747] p-4 rounded-2xl">
        <div class="flex justify-between items-center text-gray-400 mb-1">
          <span class="font-bold text-white">MAGES Token (ERC-20)</span>
          <span class="text-amber-400">21,000,000 Cap</span>
        </div>
        <a href="https://bscscan.com/token/0xE12A32c9E92f0584ede944465960D97238013107" target="_blank" rel="noopener noreferrer" class="text-amber-300 hover:text-white truncate block">0xE12A32c9E92f0584ede944465960D97238013107</a>
      </div>
    </div>
  </main>

  <footer class="bg-[#06030D] border-t border-[#2E1B4E] py-8 text-center text-xs text-gray-500 font-mono">
    © 2026 WeZards Core Architecture • BNB Smart Chain (ChainID: 56) • Assets: assets.bunink.xyz
  </footer>

  <script>
    let userAccount = null;

    async function loadStats() {
      try {
        const res = await fetch('/api/stats');
        if (res.ok) {
          const data = await res.json();
          if (data && data.stats) {
            const free = data.stats.agenticFreeMinted || 0;
            const paid = data.stats.paidMinted || 0;
            const total = data.stats.totalMinted || (free + paid);
            document.getElementById('freeMintedCount').innerText = free.toLocaleString();
            document.getElementById('freeMintedPct').innerText = ((free / 2500) * 100).toFixed(1) + '%';
            document.getElementById('freeRemainingCount').innerText = Math.max(0, 2500 - free).toLocaleString();
            document.getElementById('freeProgressBar').style.width = Math.max(0.5, (free / 2500) * 100) + '%';

            document.getElementById('totalMintedCount').innerText = total.toLocaleString();
            document.getElementById('totalMintedPct').innerText = ((total / 5000) * 100).toFixed(1) + '%';
            document.getElementById('totalRemainingCount').innerText = Math.max(0, 5000 - total).toLocaleString();
            document.getElementById('totalProgressBar').style.width = Math.max(0.5, (total / 5000) * 100) + '%';

            document.getElementById('statFree').innerText = free.toLocaleString();
            document.getElementById('statPaid').innerText = paid.toLocaleString();
            if (data.stats.blockNumber) {
              document.getElementById('bscBlockNumber').innerText = 'Block #' + data.stats.blockNumber.toLocaleString();
            }
          }
        }
      } catch (err) {
        console.warn('Stats fetch notice:', err);
      }
    }

    async function connectWallet() {
      if (typeof window.ethereum !== 'undefined') {
        try {
          const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
          if (accounts && accounts[0]) {
            userAccount = accounts[0];
            const short = userAccount.slice(0, 6) + '...' + userAccount.slice(-4);
            document.getElementById('walletAddressDisplay').innerText = short;
            document.getElementById('connectWalletBtn').innerText = short;
            document.getElementById('eligibilityStatus').innerText = 'Agentic Wallet Verified';
            document.getElementById('eligibilityStatus').className = 'text-emerald-400 font-bold';
            document.getElementById('mintActionBtn').innerText = 'Claim Free Agentic NFT';
            document.getElementById('mintActionBtn').onclick = () => window.location.href = '/mint';
          }
        } catch (err) {
          alert('Could not connect wallet: ' + err.message);
        }
      } else {
        alert('Please install MetaMask, Trust Wallet, or Binance Web3 Wallet to connect.');
      }
    }

    async function submitGiftClaim(e) {
      e.preventDefault();
      const statusMsg = document.getElementById('giftStatusMsg');
      const submitBtn = document.getElementById('giftSubmitBtn');
      const wallet = document.getElementById('giftWallet').value.trim();
      const twitter = document.getElementById('giftTwitter').value.trim();
      const postUrl = document.getElementById('giftPostUrl').value.trim();
      const fileInput = document.getElementById('giftScreenshot');

      if (!fileInput.files || fileInput.files.length === 0) {
        alert('Please select a screenshot file.');
        return;
      }

      submitBtn.disabled = true;
      submitBtn.innerText = 'Submitting to D1...';

      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = async function() {
        try {
          const base64Data = reader.result;
          const payload = {
            walletAddress: wallet,
            twitterUsername: twitter,
            twitterPostUrl: postUrl,
            holdingTokensBalance: '0',
            screenshotData: base64Data
          };

          const res = await fetch('/api/gift/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });

          const data = await res.json();
          if (res.ok && data.success) {
            statusMsg.className = 'text-xs p-3 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30';
            statusMsg.innerText = '✅ ' + (data.message || 'Gift claim submitted successfully!');
            statusMsg.classList.remove('hidden');
            document.getElementById('giftForm').reset();
          } else {
            statusMsg.className = 'text-xs p-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30';
            statusMsg.innerText = '❌ ' + (data.error || 'Submission failed.');
            statusMsg.classList.remove('hidden');
          }
        } catch (err) {
          statusMsg.className = 'text-xs p-3 rounded-xl bg-red-500/20 text-red-300 border border-red-500/30';
          statusMsg.innerText = '❌ Network error: ' + err.message;
          statusMsg.classList.remove('hidden');
        } finally {
          submitBtn.disabled = false;
          submitBtn.innerText = 'Submit Gift Drop Claim';
        }
      };
      reader.readAsDataURL(file);
    }

    loadStats();
    setInterval(loadStats, 10000);
  </script>
</body>
</html>`;

  return new Response(html, {
    status: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'public, max-age=60'
    }
  });
}

