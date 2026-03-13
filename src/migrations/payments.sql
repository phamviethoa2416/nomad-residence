CREATE TABLE payments
(
    id                   SERIAL PRIMARY KEY,
    booking_id           INT            NOT NULL REFERENCES bookings (id),

    amount               DECIMAL(12, 0) NOT NULL,
    method               VARCHAR(30)    NOT NULL,

    vnpay_txn_ref        VARCHAR(100),
    vnpay_transaction_no VARCHAR(100),
    vnpay_response_code  VARCHAR(10),
    vnpay_bank_code      VARCHAR(20),

    status               VARCHAR(20)    NOT NULL DEFAULT 'pending',

    paid_at              TIMESTAMP,
    raw_response         JSONB,
    admin_note           TEXT,

    created_at           TIMESTAMP               DEFAULT NOW(),
    updated_at           TIMESTAMP               DEFAULT NOW()
);

CREATE INDEX idx_payments_booking_id ON payments (booking_id);
CREATE INDEX idx_payments_vnpay_txn ON payments (vnpay_txn_ref);