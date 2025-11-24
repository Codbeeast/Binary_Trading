const WebSocket = require('ws');

class BinanceService {
  constructor() {
    this.ws = null;
    this.currentPrice = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.symbol = process.env.MASSIVE_SYMBOL || 'BTCUSDT';
    this.onPriceUpdate = null;
    this.isConnected = false;
  }

  connect(onPriceUpdate) {
    this.onPriceUpdate = onPriceUpdate;
    const wsUrl = `wss://stream.binance.com:9443/ws/${this.symbol.toLowerCase()}@trade`;
    
    console.log(`🔌 Connecting to Binance WebSocket for ${this.symbol}...`);
    
    this.ws = new WebSocket(wsUrl);

    this.ws.on('open', () => {
      console.log(`✅ Connected to Binance WebSocket for ${this.symbol}`);
      this.isConnected = true;
      this.reconnectAttempts = 0;
    });

    this.ws.on('message', (data) => {
      try {
        const trade = JSON.parse(data);
        // Binance trade stream format: { e: 'trade', p: '43250.50', ... }
        const price = parseFloat(trade.p);
        
        if (price && !isNaN(price)) {
          this.currentPrice = price;
          
          if (this.onPriceUpdate) {
            this.onPriceUpdate(price);
          }
        } else {
          console.log('⚠️  Received invalid price from Binance:', trade);
        }
      } catch (error) {
        console.error('❌ Error parsing Binance message:', error);
        console.error('Raw data:', data.toString());
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ Binance WebSocket error:', error.message);
    });

    this.ws.on('close', () => {
      console.log('🔌 Binance WebSocket closed');
      this.isConnected = false;
      this.attemptReconnect();
    });
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached. Stopping reconnection.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Attempting to reconnect (${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${this.reconnectDelay / 1000}s...`);

    setTimeout(() => {
      if (this.onPriceUpdate) {
        this.connect(this.onPriceUpdate);
      }
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.ws) {
      console.log('🔌 Disconnecting from Binance WebSocket...');
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  getCurrentPrice() {
    return this.currentPrice;
  }

  getConnectionStatus() {
    return this.isConnected;
  }
}

module.exports = BinanceService;
