CREATE TABLE ical_links
(
    id             SERIAL PRIMARY KEY,
    room_id        INT         NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    platform       VARCHAR(50) NOT NULL,
    import_url     TEXT,
    export_url     TEXT,
    last_synced_at TIMESTAMP,
    sync_status    VARCHAR(20) DEFAULT 'idle',
    sync_error     TEXT,
    is_active      BOOLEAN     DEFAULT TRUE,
    created_at     TIMESTAMP   DEFAULT NOW(),
    updated_at     TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_ical_links_room_id ON ical_links (room_id);