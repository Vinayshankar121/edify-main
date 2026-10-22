CREATE TABLE IF NOT EXISTS payment_fee_head_allocations (
  id CHAR(36) PRIMARY KEY,
  payment_id CHAR(36) NOT NULL,
  structure_id CHAR(36) NOT NULL,
  head_position INT NOT NULL,
  head_name VARCHAR(255) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  FOREIGN KEY (structure_id) REFERENCES fee_structures(id) ON DELETE RESTRICT,
  INDEX payment_fee_head_lookup (payment_id),
  INDEX fee_head_payment_lookup (structure_id, head_position)
);
