// Mock auth for the demo
export const authMiddleware = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).json({ error: 'Unauthorized. Use any bearer token for this demo.' });
    }
    // In a real app, verify JWT here
    next();
};

export const adminMiddleware = (req, res, next) => {
    // Simple check
    next();
};
