CREATE TABLE settings
(
    key         VARCHAR(100) PRIMARY KEY,
    value       JSONB NOT NULL,
    description VARCHAR(255),
    updated_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO settings (key, value, description)
VALUES ('site_name', '"Homestay ABC"', 'Tên website'),
       ('contact_phone', '"0912345678"', 'SĐT liên hệ'),
       ('contact_email', '"info@homestay.vn"', 'Email liên hệ'),
       ('booking_expire_minutes', '15', 'Thời gian hết hạn đơn pending (phút)'),
       ('vnpay_tmn_code', '"VNPAY_TMN"', 'Mã terminal VNPay'),
       ('default_checkin_time', '"14:00"', 'Giờ checkin mặc định'),
       ('default_checkout_time', '"12:00"', 'Giờ checkout mặc định'),
       ('zalo_oa_token', '"xxx"', 'Token Zalo OA gửi thông báo'),
       ('telegram_bot_token', '"xxx"', 'Token Telegram bot cho admin'),
       ('telegram_chat_id', '"xxx"', 'Chat ID nhóm admin Telegram'),
       ('ical_sync_interval_minutes', '30', 'Chu kỳ đồng bộ iCal');