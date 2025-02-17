// monitor.js

// Se necessário (para Node < 18), descomente a linha abaixo:
// const fetch = require('node-fetch');

const API_KEY = 'NABPG1J8DPTD6NMNU4WZIT4GCB258666UQ';
const monitoredAddress = '0xcc89f132e9cdd6e88fa435c69ef5e805267bf803';
const checkIntervalMs = 10000; // 10 segundos

let lastContractAddress = "";
let lastTxHash = "";
let liquidityInterval = null; // Para monitorar o LP do novo token

const CHAT_IDS = ['-1002494316606', '1236509840', '-1001413235185', '-4691521492', '-1002103181224'];
const BOT_TOKEN = '7724572064:AAE0dApQydqMEMpyzIJMVNVU5xQO53QFZPY';

/**
 * Consulta a última transação do endereço monitorado na BSC.
 */
async function getLastTransaction() {
  try {
    const urlTxList = `https://api.bscscan.com/api?module=account&action=txlist&address=${monitoredAddress}&startblock=1&endblock=99999999&sort=desc&apikey=${API_KEY}`;
    const response = await fetch(urlTxList);
    const data = await response.json();
    
    if (data.status === '1' && data.result.length > 0) {
      const lastTx = data.result[0];
      const txHash = lastTx.hash;
      lastTxHash = txHash;
      
      const timeStamp = parseInt(lastTx.timeStamp, 10);
      const now = Math.floor(Date.now() / 1000);
      const diffSeconds = now - timeStamp;
      const minutes = Math.floor(diffSeconds / 60);
      const seconds = diffSeconds % 60;
      const timeString = `${minutes}m ${seconds}s`;
      
      // Consulta o recibo da transação para obter os logs
      const urlReceipt = `https://api.bscscan.com/api?module=proxy&action=eth_getTransactionReceipt&txhash=${txHash}&apikey=${API_KEY}`;
      const receiptRes = await fetch(urlReceipt);
      const receiptData = await receiptRes.json();
      
      if (receiptData.result) {
        const logs = receiptData.result.logs;
        if (!logs || logs.length === 0) {
          console.log('Sem logs na transação.');
          return;
        }
        
        // Obtém o endereço do primeiro log (representa o contrato)
        const firstLogAddress = logs[0].address;
        console.log(`Nova Tx: ${txHash}\nContrato: ${firstLogAddress}\nCriado a: ${timeString} ago`);
        console.log(`Ver contrato em: https://bscscan.com/address/${firstLogAddress}`);
        
        // Se o contrato for novo, envia notificação e inicia o monitoramento de liquidez
        if (lastContractAddress !== firstLogAddress) {
          lastContractAddress = firstLogAddress;
          await sendTelegramMessage(firstLogAddress, timeString);
          startLiquidityMonitoring(firstLogAddress);
        } else {
          console.log("Mesmo contrato, nenhuma nova notificação enviada.");
        }
      } else {
        console.log('Não foi possível obter o recibo da transação.');
      }
    } else {
      console.log('Nenhuma transação encontrada.');
    }
  } catch (error) {
    console.error('Erro:', error.message);
  }
}

/**
 * Envia uma notificação via Telegram informando que um novo token foi criado.
 */
async function sendTelegramMessage(tokenAddress, timeString) {
  const message = `⚠️ New token created
      
📈 Deployed: ${timeString} ago - No LP Yet
      
CA: ${tokenAddress}
      
Track: [Maestro](https://t.me/maestro?start=${tokenAddress}-rfdtk) | [Sigma](https://t.me/SigmaTrading5_bot?start=x6735144634-${tokenAddress})
      
----------------
A free to use token launcher for Base, BSC & ETH (SUI soon).
Create New token: WeLaunchIt.org`;
  
  for (const chatId of CHAT_IDS) {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&parse_mode=Markdown&text=${encodeURIComponent(message)}`;
    try {
      const response = await fetch(telegramUrl);
      const data = await response.json();
      if (data.ok) {
        console.log(`Notificação enviada com sucesso para chat ${chatId}.`);
      } else {
        console.error(`Erro ao enviar notificação para chat ${chatId}:`, data);
      }
    } catch (error) {
      console.error(`Erro na requisição de notificação para chat ${chatId}:`, error);
    }
  }
}

/**
 * Inicia o monitoramento de liquidez para o token recém-detectado.
 */
function startLiquidityMonitoring(tokenAddress) {
  if (liquidityInterval) clearInterval(liquidityInterval);
  liquidityInterval = setInterval(() => {
    monitorLiquidity(tokenAddress);
  }, 10000);
}

/**
 * Verifica se existe alguma transação no token cujo método contenha "Add Liquidity".
 * Se encontrado, envia notificação e encerra o monitoramento deste token.
 */
async function monitorLiquidity(tokenAddress) {
  const urlTxList = `https://api.bscscan.com/api?module=account&action=txlist&address=${tokenAddress}&startblock=1&endblock=99999999&sort=desc&apikey=${API_KEY}`;
  try {
    const response = await fetch(urlTxList);
    const data = await response.json();
    if (data.status === '1' && data.result.length > 0) {
      // Procura em todas as transações se há alguma com "Add Liquidity" no campo "method"
      const foundLP = data.result.find(tx => tx.method && tx.method.includes("Add Liquidity"));
      if (foundLP) {
        await sendTelegramMessageLP(tokenAddress);
        clearInterval(liquidityInterval);
        liquidityInterval = null;
      }
    }
  } catch (error) {
    console.error('Erro ao monitorar liquidez:', error);
  }
}

/**
 * Envia uma notificação via Telegram informando que Liquidez foi adicionada.
 */
async function sendTelegramMessageLP(tokenAddress) {
  const message = `💰 LP Added 
      
CA: ${tokenAddress}
      
🎯Buy: [Maestro](https://t.me/maestro?start=${tokenAddress}-rfdtk) | [Sigma](https://t.me/SigmaTrading5_bot?start=x6735144634-${tokenAddress})
📊 [DV](https://www.dexview.com/bsc/${tokenAddress}) | [DS](https://dexscreener.com/bsc/${tokenAddress})
----------------
DYOR`;
  
  for (const chatId of CHAT_IDS) {
    const telegramUrl = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage?chat_id=${chatId}&parse_mode=Markdown&text=${encodeURIComponent(message)}`;
    try {
      const response = await fetch(telegramUrl);
      const data = await response.json();
      if (data.ok) {
        console.log(`LP notification sent successfully to chat ${chatId}.`);
      } else {
        console.error(`Error sending LP notification to chat ${chatId}:`, data);
      }
    } catch (error) {
      console.error(`Error in LP notification request to chat ${chatId}:`, error);
    }
  }
}

/**
 * Função que inicia o monitoramento recorrente.
 */
function startMonitoring() {
  // Executa a primeira verificação imediatamente
  getLastTransaction();
  // E agenda verificações a cada checkIntervalMs
  setInterval(getLastTransaction, checkIntervalMs);
}

// Inicia o monitoramento
startMonitoring();
