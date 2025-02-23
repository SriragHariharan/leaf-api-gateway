import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'
import cors from 'cors';
import http from 'http';

const app = express();
const server = http.createServer(app);

const corsOptions = {
    origin: [process.env.FRONTEND_HOST_URL, process.env.FRONTEND_AUTH_URL, process.env.FRONTEND_PROFILE_URL],
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true,
};

app.use(cors(corsOptions));

// Request logging with morgan
app.use(morgan(':method :url :status :res[content-length] - :response-time ms'));

// Rate limiting configuration
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 3000,
    message: 'Too many requests from this IP, please try again later.',
});
app.use(limiter);

// Middleware to forward the original client IP (in case you're behind a proxy)
app.use((req, res, next) => {
    req.headers['X-Forwarded-For'] = req.ip;
    next();
});


app.use('/api/v1/user', createProxyMiddleware({
    target: process.env.USER_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const forwardedFor = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        proxyReq.headers['X-Forwarded-For'] = forwardedFor;
    },
}));

app.use('/api/v1/post', createProxyMiddleware({
    target: process.env.POSTS_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const forwardedFor = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        proxyReq.headers['X-Forwarded-For'] = forwardedFor;
    },
}));

/* feeds service */
app.use('/api/v1/feed', createProxyMiddleware({
    target: process.env.FEEDS_SERVICE_URL,
    changeOrigin: true,
    onProxyReq: (proxyReq, req) => {
        const forwardedFor = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
        proxyReq.headers['X-Forwarded-For'] = forwardedFor;
    },
}));

app.use('/api/v1/chat', createProxyMiddleware({
    target: process.env.CHAT_SERVICE_URL,
    changeOrigin: true,
    ws: true,  // Ensure WebSockets are enabled
}));

app.use('/api/v1/notification', createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    ws: true,  // Ensure WebSockets are enabled
}));

// Handle WebSocket Upgrades
server.on('upgrade', (req, socket, head) => {
    console.log("starts with URL ::: ", req.url);
    if (req.url.startsWith('/api/v1/chat')) {
        console.log('Upgrading WebSocket connection for Chat Service...');
        createProxyMiddleware({ target: process.env.CHAT_SERVICE_URL, ws: true })(req, socket, head);
    } else if (req.url.startsWith('/api/v1/notification')) {
        console.log('Upgrading WebSocket connection for Notification Service...');
        createProxyMiddleware({ target: process.env.NOTIFICATION_SERVICE_URL, ws: true })(req, socket, head);
    }
});

server.listen(process.env.PORT, () => {
    console.log(`API Gateway running on port ${process.env.PORT}`);
});
