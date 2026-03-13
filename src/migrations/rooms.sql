CREATE TABLE rooms
(
    id                  SERIAL PRIMARY KEY,
    name                VARCHAR(255)        NOT NULL,
    slug                VARCHAR(255) UNIQUE NOT NULL,
    room_type           VARCHAR(50)         NOT NULL,
    description         TEXT,
    short_description   VARCHAR(500),
    max_guests          INT                 NOT NULL DEFAULT 2,
    num_bedrooms        INT                 NOT NULL DEFAULT 1,
    num_bathrooms       INT                 NOT NULL DEFAULT 1,
    num_beds            INT                 NOT NULL DEFAULT 1,
    area                DECIMAL(6, 1),
    address             TEXT,
    district            VARCHAR(100),
    city                VARCHAR(100)                 DEFAULT 'Hà Nội',
    latitude            DECIMAL(10, 7),
    longitude           DECIMAL(10, 7),
    base_price          DECIMAL(12, 0)      NOT NULL,
    cleaning_fee        DECIMAL(12, 0)               DEFAULT 0,
    checkin_time        TIME                         DEFAULT '14:00',
    checkout_time       TIME                         DEFAULT '12:00',
    min_nights          INT                          DEFAULT 1,
    max_nights          INT                          DEFAULT 30,
    house_rules         TEXT,
    cancellation_policy TEXT,
    status              VARCHAR(20)                  DEFAULT 'active',
    sort_order          INT                          DEFAULT 0,
    created_at          TIMESTAMP                    DEFAULT NOW(),
    updated_at          TIMESTAMP                    DEFAULT NOW()
);

CREATE INDEX idx_rooms_status ON rooms (status);
CREATE INDEX idx_rooms_room_type ON rooms (room_type);
CREATE INDEX idx_rooms_slug ON rooms (slug);