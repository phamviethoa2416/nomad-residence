CREATE TABLE bookings
(
    id              SERIAL PRIMARY KEY,
    booking_code    VARCHAR(20) UNIQUE NOT NULL,
    room_id         INT                NOT NULL REFERENCES rooms (id),

    guest_name      VARCHAR(255)       NOT NULL,
    guest_phone     VARCHAR(20)        NOT NULL,
    guest_email     VARCHAR(255),
    guest_note      TEXT,

    checkin_date    DATE               NOT NULL,
    checkout_date   DATE               NOT NULL,
    num_guests      INT                NOT NULL DEFAULT 1,
    num_nights      INT                NOT NULL,

    base_total      DECIMAL(12, 0)     NOT NULL,
    cleaning_fee    DECIMAL(12, 0)              DEFAULT 0,
    discount        DECIMAL(12, 0)              DEFAULT 0,
    total_amount    DECIMAL(12, 0)     NOT NULL,

    price_breakdown JSONB,
    status          VARCHAR(20)        NOT NULL DEFAULT 'pending',
    source          VARCHAR(20)                 DEFAULT 'website',
    admin_note      TEXT,

    confirmed_at    TIMESTAMP,
    canceled_at     TIMESTAMP,
    cancel_reason   VARCHAR(255),
    expires_at      TIMESTAMP,

    created_at      TIMESTAMP                   DEFAULT NOW(),
    updated_at      TIMESTAMP                   DEFAULT NOW()
);

CREATE INDEX idx_bookings_room_dates ON bookings (room_id, checkin_date, checkout_date);
CREATE INDEX idx_bookings_status ON bookings (status);
CREATE INDEX idx_bookings_expires ON bookings (expires_at) WHERE status = 'pending';
CREATE INDEX idx_bookings_booking_code ON bookings (booking_code);
CREATE INDEX idx_bookings_guest_phone ON bookings (guest_phone);