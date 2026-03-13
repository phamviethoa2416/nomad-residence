CREATE TABLE room_images
(
    id         SERIAL PRIMARY KEY,
    room_id    INT          NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    url        VARCHAR(500) NOT NULL,
    alt_text   VARCHAR(255),
    is_primary BOOLEAN   DEFAULT FALSE,
    sort_order INT       DEFAULT 0,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_room_images_room_id ON room_images (room_id);