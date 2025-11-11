# 📊 Binary Trading Chart System

A professional binary trading-style chart system built with Next.js, MongoDB, and Socket.IO. Features real-time candlestick animations, admin controls, and smooth market simulations - perfect for educational purposes.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![Next.js](https://img.shields.io/badge/Next.js-14.0-black)
![MongoDB](https://img.shields.io/badge/MongoDB-8.0-green)
![Socket.IO](https://img.shields.io/badge/Socket.IO-4.6-purple)

## ✨ Features

### 🎯 Core Features
- **Real-time Chart**: Smooth candlestick animations with auto-scrolling
- **Multiple Timeframes**: 1s, 5s, 15s, 30s, 1m intervals
- **Admin Control Panel**: Full control over market direction and behavior
- **MongoDB Storage**: Persistent tick and candle data
- **WebSocket Communication**: Real-time data streaming via Socket.IO
- **Beautiful UI**: Modern gradient design with Framer Motion animations

### 🎮 Admin Controls
- **Market Direction**: Control bullish, bearish, or neutral trends
- **Volatility Slider**: Adjust price movement intensity (0.1x - 5.0x)
- **Tick Speed**: Configure update frequency (100ms - 1000ms)
- **Pause/Resume**: Stop or start market simulation
- **Real-time Updates**: All changes reflected instantly on charts

### 📈 Chart Features
- **Smooth Animations**: Realistic candle formation and movement
- **Auto-scroll**: Chart flows horizontally like live trading platforms
- **Price Labels**: Dynamic current price indicator
- **Grid System**: Professional grid lines and price levels
- **Color Coding**: Green for bullish, red for bearish candles
- **Glow Effects**: Visual feedback for recent candles

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18
- **Styling**: TailwindCSS, Framer Motion
- **Backend**: Node.js, Socket.IO Server
- **Database**: MongoDB with Mongoose ODM
- **Icons**: Lucide React
- **Real-time**: Socket.IO (WebSocket + Polling)

## 📦 Installation

### Prerequisites
- Node.js 18+ installed
- MongoDB installed and running locally
- npm or yarn package manager

### Step 1: Clone and Install

```bash
# Navigate to project directory
cd c:/React/binary

# Install dependencies
npm install
```

### Step 2: Configure Environment

The `.env.local` file is already created with default values:

```env
MONGODB_URI=mongodb://localhost:27017/binary-trading
ADMIN_PASSWORD=admin123
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

### Step 3: Start MongoDB

Make sure MongoDB is running on your system:

```bash
# Windows (if MongoDB is installed as a service)
net start MongoDB

# Or start manually
mongod --dbpath C:\data\db
```

### Step 4: Start the Socket.IO Server

Open a terminal and run:

```bash
npm run server
```

You should see:
```
✅ MongoDB connected to server
🚀 Socket.IO server running on port 3001
📊 Tick generation active (300ms interval)
```

### Step 5: Start Next.js Development Server

Open another terminal and run:

```bash
npm run dev
```

The app will be available at `http://localhost:3000`

## 🚀 Usage

### Main Chart Page
1. Navigate to `http://localhost:3000`
2. View real-time candlestick chart
3. Switch between timeframes (1s, 5s, 15s, 30s, 1m)
4. Monitor market stats and price movements

### Admin Control Panel
1. Navigate to `http://localhost:3000/admin`
2. Login with password: `admin123`
3. Control market direction:
   - **📈 Bullish (UP)**: Price trends upward
   - **➡️ Neutral**: Random walk movement
   - **📉 Bearish (DOWN)**: Price trends downward
4. Adjust volatility (0.1x - 5.0x)
5. Change tick speed (100ms - 1000ms)
6. Pause/Resume market simulation

## 📁 Project Structure

```
binary-trading-chart/
├── app/
│   ├── admin/
│   │   └── page.js          # Admin control panel
│   ├── globals.css          # Global styles
│   ├── layout.js            # Root layout
│   └── page.js              # Main chart page
├── components/
│   ├── TradingChart.js      # Canvas-based chart component
│   ├── PriceDisplay.js      # Current price display
│   ├── TimeframeSelector.js # Timeframe buttons
│   └── MarketStats.js       # Statistics cards
├── lib/
│   └── mongodb.js           # MongoDB connection
├── models/
│   ├── Tick.js              # Tick data schema
│   ├── Candle.js            # Candle data schema
│   └── MarketControl.js     # Market control schema
├── server.js                # Socket.IO server
├── package.json
├── next.config.js
├── tailwind.config.js
└── README.md
```

## 🔧 Configuration

### MongoDB Collections

**Ticks Collection**
```javascript
{
  price: Number,
  timestamp: Date,
  timeframe: String
}
```

**Candles Collection**
```javascript
{
  open: Number,
  high: Number,
  low: Number,
  close: Number,
  timeframe: String,
  timestamp: Date,
  volume: Number
}
```

**MarketControl Collection**
```javascript
{
  direction: String,      // 'up', 'down', 'neutral'
  volatility: Number,     // 0.1 - 5.0
  tickSpeed: Number,      // 100 - 1000 ms
  currentPrice: Number,
  isActive: Boolean,
  lastUpdated: Date
}
```

### Socket.IO Events

**Client → Server**
- `control_update`: Admin sends market control changes

**Server → Client**
- `market_state`: Current market configuration
- `tick_update`: Real-time price update
- `candle_update`: Candle being formed
- `candle_complete`: Completed candle
- `historical_candles`: Initial candle data

## 🎨 Customization

### Change Default Price
Edit `server.js`:
```javascript
currentPrice: 100.00  // Change to your desired starting price
```

### Add New Timeframes
1. Update `server.js` candleTrackers
2. Add to `TimeframeSelector.js` timeframes array

### Modify Colors
Edit `tailwind.config.js`:
```javascript
colors: {
  bullish: '#22c55e',  // Green
  bearish: '#ef4444',  // Red
  neutral: '#6b7280',  // Gray
}
```

### Adjust Animation Speed
Edit `TradingChart.js`:
```javascript
transition={{ duration: 0.3 }}  // Change animation duration
```

## 🐛 Troubleshooting

### MongoDB Connection Error
```bash
# Check if MongoDB is running
mongosh

# If not, start MongoDB service
net start MongoDB
```

### Socket.IO Connection Failed
- Verify server is running on port 3001
- Check firewall settings
- Ensure `NEXT_PUBLIC_SOCKET_URL` is correct

### Chart Not Updating
- Check browser console for errors
- Verify Socket.IO connection status
- Ensure server is generating ticks

### Port Already in Use
```bash
# Kill process on port 3001
npx kill-port 3001

# Or change port in server.js
const PORT = process.env.PORT || 3002;
```

## 📊 Performance Tips

1. **Limit Candle History**: Chart keeps last 150 candles
2. **Optimize Tick Speed**: Higher intervals = better performance
3. **Database Indexing**: Already configured for optimal queries
4. **Canvas Rendering**: Uses requestAnimationFrame for smooth 60fps

## 🔒 Security Notes

⚠️ **Important**: This is for educational/simulation purposes only.

- Change default admin password in production
- Implement proper authentication (JWT, sessions)
- Add rate limiting for Socket.IO events
- Validate all admin inputs server-side
- Use environment variables for sensitive data

## 🚀 Deployment

### Production Build
```bash
npm run build
npm start
```

### Environment Variables for Production
```env
MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/binary-trading
ADMIN_PASSWORD=your_secure_password
NEXT_PUBLIC_SOCKET_URL=https://your-domain.com
```

## 📝 License

MIT License - Feel free to use for educational purposes

## 🤝 Contributing

Contributions welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues or questions:
- Check the troubleshooting section
- Review Socket.IO and Next.js documentation
- Open an issue on GitHub

## 🎯 Future Enhancements

- [ ] Historical data replay
- [ ] Multiple chart types (line, area, heikin-ashi)
- [ ] Export chart as image/CSV
- [ ] User authentication and sessions
- [ ] Multiple market pairs
- [ ] Technical indicators (MA, RSI, MACD)
- [ ] Dark/Light theme toggle
- [ ] Mobile responsive improvements
- [ ] WebSocket reconnection logic
- [ ] Chart zoom and pan controls

---

**Built with ❤️ for educational purposes**

Happy Trading! 📈📉
