CREATE TABLE inspection_location_captures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES inspections(id) ON DELETE RESTRICT,
  operation_id uuid NOT NULL UNIQUE,
  actor_user_id uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  base_version integer NOT NULL CHECK (base_version > 0),
  payload_hash char(64) NOT NULL CHECK (payload_hash ~ '^[0-9a-f]{64}$'),
  latitude numeric(9,6) NOT NULL CHECK (latitude BETWEEN -90 AND 90),
  longitude numeric(9,6) NOT NULL CHECK (longitude BETWEEN -180 AND 180),
  accuracy_meters numeric(10,2) NOT NULL CHECK (accuracy_meters > 0),
  captured_at timestamptz NOT NULL,
  resulting_version integer NOT NULL CHECK (resulting_version > base_version),
  created_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE INDEX inspection_location_captures_inspection_idx
  ON inspection_location_captures(inspection_id, created_at DESC);
