const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const { ipWhitelistMiddleware, requestLoggerMiddleware } = require('./middleware/ipWhitelist');

const app = express();

app.use(cors());
app.use(express.json());

// Request logging (all requests)
app.use(requestLoggerMiddleware);

// IP Whitelist for POST requests (production mode only)
app.use(ipWhitelistMiddleware);

app.use('/api', routes);

app.get('/', (req, res) => {
    res.send('IoT Desalinasi Monitoring API');
});

module.exports = app;
