const WebSocket = require('ws');

class BinanceService {
  constructor(onError = null) {
    this.ws = null;
    this.streams = new Set();
    this.priceCallbacks = new Map(); // Map<symbol, Set<callback>>
    this.currentPrices = new Map(); // Map<symbol, price>
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.reconnectDelay = 5000;
    this.isConnected = false;
    // this.connectionUrl = 'wss://stream.binance.com:9443/ws';
    this.usConnectionUrl = 'wss://stream.binance.us:9443/ws';
    this.usingUS = false;
    this.onError = onError;
  }

  // Subscribe to a symbol
  subscribe(symbol, callback) {
    const formattedSymbol = symbol.toLowerCase();

    // Add callback for this symbol
    if (!this.priceCallbacks.has(formattedSymbol)) {
      this.priceCallbacks.set(formattedSymbol, new Set());
    }
    this.priceCallbacks.get(formattedSymbol).add(callback);

    // If already connected and not subscribed, send subscribe message
    if (this.isConnected && !this.streams.has(formattedSymbol)) {
      this.sendSubscribe(formattedSymbol);
    }

    this.streams.add(formattedSymbol);

    // Return unsubscribe function
    return () => {
      const callbacks = this.priceCallbacks.get(formattedSymbol);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.priceCallbacks.delete(formattedSymbol);
          this.streams.delete(formattedSymbol);
          if (this.isConnected) {
            this.sendUnsubscribe(formattedSymbol);
          }
        }
      }
    };
  }

  connect(initialSymbols = []) {
    initialSymbols.forEach(s => this.streams.add(s.toLowerCase()));

    // Construct combined stream URL if we have initial symbols
    // Note: If streams > 0, we can use combined streams, but for dynamic subscription
    // it's better to connect to base /ws and send subscribe messages.

    console.log(`🔌 Connecting to Binance WebSocket...`);

    this.ws = new WebSocket(this.connectionUrl);

    this.ws.on('open', () => {
      console.log(`✅ Connected to Binance WebSocket`);
      this.isConnected = true;
      this.reconnectAttempts = 0;

      // Resubscribe to all active streams
      if (this.streams.size > 0) {
        this.sendSubscribe(Array.from(this.streams));
      }
    });

    this.ws.on('message', (data) => {
      try {
        const message = JSON.parse(data);

        // Handle trade event
        if (message.e === 'trade') {
          const symbol = message.s.toLowerCase();
          const price = parseFloat(message.p);

          if (price && !isNaN(price)) {
            this.currentPrices.set(symbol, price);

            // Notify subscribers
            const callbacks = this.priceCallbacks.get(symbol);
            if (callbacks) {
              callbacks.forEach(cb => cb(price));
            }
          }
        }
      } catch (error) {
        console.error('❌ Error parsing Binance message:', error);
      }
    });

    this.ws.on('error', (error) => {
      console.error('❌ Binance WebSocket error:', error.message);

      // Check for Geo-Block (451) or Connect Error
      if (error.message.includes('451') || error.message.includes('Unexpected server response')) {
        if (!this.usingUS) {
          console.log('🇺🇸 Switching to Binance US WebSocket (Geo-Fix)...');
          this.usingUS = true;
          this.connectionUrl = this.usConnectionUrl;
          this.disconnect();
          this.connect(); // Immediate retry with US URL
          return;
        }

        console.error('🚫 Binance Geo-Restriction detected on BOTH endpoints. Switching to Synthetic Mode.');
        if (this.onError) this.onError('GEO_BLOCK');
        this.disconnect();
        this.maxReconnectAttempts = 0; // Stop trying
      }
    });

    this.ws.on('close', () => {
      console.log('🔌 Binance WebSocket closed');
      this.isConnected = false;
      this.attemptReconnect();
    });
  }

  sendSubscribe(streams) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const streamList = Array.isArray(streams) ? streams : [streams];
    const params = streamList.map(s => `${s}@trade`);

    const msg = {
      method: "SUBSCRIBE",
      params: params,
      id: Date.now()
    };

    this.ws.send(JSON.stringify(msg));
    console.log(`📡 Subscribed to: ${params.join(', ')}`);
  }

  sendUnsubscribe(streams) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    const streamList = Array.isArray(streams) ? streams : [streams];
    const params = streamList.map(s => `${s}@trade`);

    const msg = {
      method: "UNSUBSCRIBE",
      params: params,
      id: Date.now()
    };

    this.ws.send(JSON.stringify(msg));
    console.log(`🔕 Unsubscribed from: ${params.join(', ')}`);
  }

  attemptReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('❌ Max reconnection attempts reached.');
      return;
    }

    this.reconnectAttempts++;
    console.log(`🔄 Reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts} in ${this.reconnectDelay / 1000}s`);

    setTimeout(() => {
      this.connect();
    }, this.reconnectDelay);
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
      this.isConnected = false;
    }
  }

  getCurrentPrice(symbol) {
    return this.currentPrices.get(symbol.toLowerCase());
  }
}

module.exports = BinanceService;
