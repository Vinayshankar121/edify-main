CREATE TABLE IF NOT EXISTS student_enrollment_fee_structures (
  id CHAR(36) PRIMARY KEY,
  enrollment_id CHAR(36) NOT NULL,
  structure_id CHAR(36) NOT NULL,
  UNIQUE KEY enrollment_fee_structure_unique (enrollment_id, structure_id),
  FOREIGN KEY (enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE,
  FOREIGN KEY (structure_id) REFERENCES fee_structures(id) ON DELETE RESTRICT
);

INSERT IGNORE INTO student_enrollment_fee_structures (id, enrollment_id, structure_id)
SELECT UUID(), id, structure_id
  FROM student_enrollments
 WHERE structure_id IS NOT NULL;
