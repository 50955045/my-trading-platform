const express = require('express');
const cors = require('cors');
const ccxt = require('ccxt');
const WebSocket = require('ws');
const http = require('http');

const app = express(); app.use(cors());
const port = Number(process.env.PORT || 3001);
const name = process.env.MARKET_EXCHANGE || 'binance';
const exchange = new ccxt[name]({ enableRateLimit: true, timeout: 15000 });
const server = http.createServer(app);
const wss = new WebSocket.Server({ server, path: '/ws' });

const normalize = rows => rows.map(x => ({time: Math.floor(x[0] / 1000), open:+x[1], high:+x[2], low:+x[3], close:+x[4], volume:+x[5]}));
app.get('/health', (_q,r) => r.json({ok:true, exchange:name}));
app.get('/api/ohlcv', async (req,res) => { try { const symbol=req.query.symbol||'BTC/USDT'; const timeframe=req.query.timeframe||'1h'; const limit=Math.min(Number(req.query.limit||500),1000); const rows=await exchange.fetchOHLCV(symbol,timeframe,undefined,limit); res.json({symbol,timeframe,data:normalize(rows)}); } catch(e) { res.status(500).json({error:e.message}); } });
app.get('/api/symbols', async (_q,res) => { try { const markets=await exchange.loadMarkets(); res.json({symbols:Object.keys(markets).filter(s=>s.includes('/')).slice(0,500)}); } catch(e) { res.status(500).json({error:e.message}); } });

function binanceSymbol(s){ return s.replace('/','').toLowerCase(); }
wss.on('connection', ws => { let upstream; let timer; ws.on('message', raw => { try { const m=JSON.parse(raw); if(m.action!=='subscribe') return; if(upstream) upstream.close(); clearInterval(timer); if(name==='binance') { const stream=`${binanceSymbol(m.symbol||'BTC/USDT')}@kline_${m.timeframe||'1m'}`; upstream=new WebSocket(`wss://stream.binance.com:9443/ws/${stream}`); upstream.on('message', data => { const x=JSON.parse(data); const k=x.k; if(ws.readyState===WebSocket.OPEN) ws.send(JSON.stringify({type:'kline',data:{time:Math.floor(k.t/1000),open:+k.o,high:+k.h,low:+k.l,close:+k.c,volume:+k.v}})); }); upstream.on('error', e=>ws.readyState===1&&ws.send(JSON.stringify({type:'error',message:e.message}))); } else { const poll=async()=>{ try { const rows=await exchange.fetchOHLCV(m.symbol||'BTC/USDT',m.timeframe||'1m',undefined,2); const d=normalize(rows).at(-1); if(d&&ws.readyState===1) ws.send(JSON.stringify({type:'kline',data:d})); } catch(e){} }; poll(); timer=setInterval(poll,5000); } } catch(e){} }); ws.on('close',()=>{if(upstream) upstream.close();clearInterval(timer);}); });
server.listen(port,()=>console.log(`market-service :${port}`));
