import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import 'dotenv/config'
import cors from 'cors';

const app = express();

const corsOptions = {
    origin: [process.env.FRONTEND_HOST_URL, process.env.FRONTEND_AUTH_URL],
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
    max: 300,
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

app.listen(process.env.PORT, () => {
    console.log(`Reverse proxy server running at http://localhost:${process.env.PORT}`);
});
