require('crypto');
const config = require('../config');

const buildTransferCode = (bookingCode) => {
    return bookingCode.replace(/-/g, '');
}

const generateVietQR = async ({bookingCode, amount}) => {
    const transferCode  = buildTransferCode(bookingCode);

    const body = {
        accountNo: config.vietqr.accountNo,
        accountName: config.vietqr.accountName,
        acqId: config.vietqr.acqId,
        amount: amount,
        addInfo: transferCode,
        format: 'text',
        template: 'compact2',
    };

    const response = await fetch ('https://api.vietqr.io/v2/generate', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-client-id': config.vietqr.clientId,
            'x-api-key': config.vietqr.apiKey,
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        throw new Error(`VietQR API error: ${response.status}`);
    }

    const data = await response.json();

    if (data.code !== '00') {
        throw new Error(`VietQR generate failed: ${data.desc}`);
    }

    return {
        qrDataURL: data.data.qrDataURL,
        qrCode: data.data.qrCode,
        transferCode,
        accountNo: config.vietqr.accountNo,
        accountName: data.data.accountName || config.vietqr.accountName,
        bankName: config.vietqr.bankName,
        acqId: config.vietqr.acqId,
    };
};

const verifyWebhookToken = (authHeader) => {
    if (!authHeader || !authHeader.startsWith('Bearer ')) return false;

    const token = authHeader.split(' ')[1];
    const secretKey = config.vietqr.webhookSecret;

    if (!secretKey) {
        console.warn('[VietQR] webhookSecret chưa được cấu hình, bỏ qua verify');
        return true;
    }

    try {
        const jwt = require('jsonwebtoken');
        jwt.verify(token, secretKey);
        return true;
    } catch {
        return false;
    }
};

const extractBookingCode = (content) => {
    if (!content) return null;

    const normalized = content.toUpperCase().replace(/\s+/g, '');

    const matchCompact = normalized.match(/BK(\d{8})(\d{3})/);
    if (matchCompact) {
        return `BK-${matchCompact[1]}-${matchCompact[2]}`;
    }

    const matchFull = normalized.match(/BK-(\d{8})-(\d{3})/);
    if (matchFull) {
        return `BK-${matchFull[1]}-${matchFull[2]}`;
    }

    return null;
};

module.exports = {
    generateVietQR,
    verifyWebhookToken,
    extractBookingCode,
}
