CREATE TABLE room_amenities
(
    id       SERIAL PRIMARY KEY,
    room_id  INT          NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    name     VARCHAR(100) NOT NULL,
    icon     VARCHAR(50),
    category VARCHAR(50) DEFAULT 'general'
);

CREATE INDEX idx_room_amenities_room_id ON room_amenities (room_id);