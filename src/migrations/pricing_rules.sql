CREATE TABLE pricing_rules
(
    id             SERIAL PRIMARY KEY,
    room_id        INT            NOT NULL REFERENCES rooms (id) ON DELETE CASCADE,
    name           VARCHAR(255),
    rule_type      VARCHAR(30)    NOT NULL,
    date_from      DATE,
    date_to        DATE,
    day_of_week    INT[],
    price_modifier DECIMAL(12, 0) NOT NULL,
    modifier_type  VARCHAR(10) DEFAULT 'fixed',
    priority       INT         DEFAULT 0,
    is_active      BOOLEAN     DEFAULT TRUE,
    created_at     TIMESTAMP   DEFAULT NOW(),
    updated_at     TIMESTAMP   DEFAULT NOW()
);

CREATE INDEX idx_pricing_rules_room_id ON pricing_rules (room_id);
CREATE INDEX idx_pricing_rules_dates ON pricing_rules (date_from, date_to);