# TradingView-like self-hosted terminal MVP

## Features
- TradingView-style dark terminal layout
- 1 / 2 / 4 / 6 chart grid
- Candlestick charts with volume
- Binance public historical and realtime kline data
- Pine-like indicator subset: EMA, SMA, RSI, MACD, plot
- Optional exchange trading endpoint through CCXT
- Docker Compose deployment

> This is an extensible MVP, not a 1:1 TradingView or full Pine Script implementation. Live trading is disabled by default.

## Deploy
```bash
cp .env.example .env
docker compose up -d --build
```
Open `http://SERVER_IP:8000`.

## Configuration
- `MARKET_EXCHANGE=binance`
- `TRADING_ENABLED=false` by default
- Keep API keys only in `.env`; never commit them.
- Use testnet keys first and disable withdrawal permission.

## Current data model
Market history is fetched from CCXT. Realtime public klines use Binance WebSocket when `MARKET_EXCHANGE=binance`; other exchanges use periodic REST refresh in the browser. The architecture keeps market, Pine, trading, and gateway services separate so storage, authentication, and more exchanges can be added later.

## Service health
- `GET /api/market/health`
- `GET /api/pine/health`
- `GET /api/trade/health`

## Important limitations
- Pine support is a safe, deliberately small subset and does not claim Pine v5/v6 compatibility.
- The order API has basic validation but should be protected by authentication, rate limiting, and a reverse proxy before internet exposure.
- Do not enable live trading until you add user authentication, audit logs, stronger risk controls, and testnet verification.
