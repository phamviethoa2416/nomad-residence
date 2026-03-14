const crypto = require('crypto');

const requestId = (req, res, next) => {
    const existing = req.headers['x-request-id'];
    const id = typeof existing === 'string' && existing.trim().length > 0
        ? existing.trim()
        : crypto.randomUUID();

    req.requestId = id;
    res.setHeader('x-request-id', id);

    next();
};

module.exports = requestId;