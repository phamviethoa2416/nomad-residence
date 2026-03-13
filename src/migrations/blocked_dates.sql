CREATE TABLE blocked_dates
(
    id         SERIAL PRIMARY KEY,
    room_id    INT         NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    date       DATE        NOT NULL,

    source     VARCHAR(30) NOT NULL,
    source_ref VARCHAR(255),
    reason     VARCHAR(255),

    created_at TIMESTAMP DEFAULT NOW(),

    UNIQUE (room_id, date, source)
);

CREATE INDEX idx_blocked_dates_room_date ON blocked_dates (room_id, date);
CREATE INDEX idx_blocked_dates_source ON blocked_dates (source);