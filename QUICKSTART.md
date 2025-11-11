# 🚀 Quick Start Guide

Get your Binary Trading Chart running in 5 minutes!

## ⚡ Prerequisites Check

Before starting, ensure you have:
- ✅ Node.js 18+ installed (`node --version`)
- ✅ MongoDB installed and running
- ✅ npm or yarn installed

## 📦 Step 1: Install Dependencies

Open terminal in the project folder and run:

```bash
npm install
```

This will install all required packages (~2-3 minutes).

## 🗄️ Step 2: Start MongoDB

### Windows
```bash
# If MongoDB is installed as a service
net start MongoDB

# Or start manually
mongod --dbpath C:\data\db
```

### Mac/Linux
```bash
# If installed via Homebrew
brew services start mongodb-community

# Or start manually
mongod --dbpath /usr/local/var/mongodb
```

Verify MongoDB is running:
```bash
mongosh
# Should connect successfully
```

## 🎮 Step 3: Start the Application

### Option A: Automatic (Windows)
Double-click `start.bat` - it will start both servers automatically!

### Option B: Manual

**Terminal 1 - Socket.IO Server:**
```bash
npm run server
```

Wait for:
```
✅ MongoDB connected to server
🚀 Socket.IO server running on port 3001
📊 Tick generation active
```

**Terminal 2 - Next.js App:**
```bash
npm run dev
```

Wait for:
```
✓ Ready on http://localhost:3000
```

## 🌐 Step 4: Access the Application

### Main Chart
Open browser: `http://localhost:3000`

You should see:
- Real-time candlestick chart
- Live price updates
- Market statistics
- Timeframe selector

### Admin Panel
Open browser: `http://localhost:3000/admin`

Login with:
- **Password:** `admin123`

You can now:
- Control market direction (UP/DOWN/NEUTRAL)
- Adjust volatility (0.1x - 5.0x)
- Change tick speed (100ms - 1000ms)
- Pause/Resume market

## ✅ Verification Checklist

- [ ] MongoDB is running
- [ ] Socket.IO server started (port 3001)
- [ ] Next.js app started (port 3000)
- [ ] Browser shows chart with candles
- [ ] Price is updating in real-time
- [ ] Admin panel accessible
- [ ] Admin controls affect the chart

## 🐛 Common Issues

### "Cannot connect to MongoDB"
```bash
# Check if MongoDB is running
mongosh

# If not, start it
net start MongoDB  # Windows
brew services start mongodb-community  # Mac
```

### "Port 3001 already in use"
```bash
# Kill the process
npx kill-port 3001

# Or change port in server.js
```

### "Module not found"
```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### Chart not updating
1. Check browser console for errors
2. Verify Socket.IO server is running
3. Check connection status indicator (green dot)

## 🎯 What to Try First

1. **Watch the Chart**: Let it run for 30 seconds to see candles form
2. **Change Timeframe**: Click different timeframe buttons (1s, 5s, 15s, etc.)
3. **Open Admin Panel**: Login and change market direction
4. **Test Controls**: 
   - Set direction to UP → watch price rise
   - Set direction to DOWN → watch price fall
   - Increase volatility → see bigger price swings
   - Decrease tick speed → slower updates

## 📊 Understanding the System

### Data Flow
```
Socket.IO Server (port 3001)
    ↓
Generates Ticks (every 300ms)
    ↓
Groups into Candles (per timeframe)
    ↓
Saves to MongoDB
    ↓
Broadcasts to Clients
    ↓
Chart Updates in Real-time
```

### Admin Controls Effect
- **Direction UP**: Price biased to increase
- **Direction DOWN**: Price biased to decrease
- **Direction NEUTRAL**: Random walk
- **Volatility**: Amplitude of price changes
- **Tick Speed**: Update frequency

## 🎨 Customization Ideas

Want to customize? Check these files:

- **Colors**: `tailwind.config.js`
- **Starting Price**: `server.js` (line ~50)
- **Timeframes**: `components/TimeframeSelector.js`
- **Chart Style**: `components/TradingChart.js`
- **Admin Password**: `.env.local`

## 📚 Next Steps

Once everything is working:

1. Read the full `README.md` for detailed documentation
2. Explore the code structure
3. Try modifying the chart appearance
4. Add your own features
5. Check the "Future Enhancements" section

## 💡 Pro Tips

- Keep both terminal windows visible to monitor logs
- Use Chrome DevTools to see Socket.IO events
- MongoDB Compass to view stored data
- Try different volatility + direction combinations
- Watch how candles close and new ones start

## 🆘 Still Having Issues?

1. Check all prerequisites are installed
2. Verify MongoDB is accessible
3. Look for error messages in terminals
4. Check browser console (F12)
5. Ensure no firewall blocking ports 3000/3001

---

**You're all set! Enjoy your binary trading chart system! 📈📉**

Need help? Check the main README.md for more details.
