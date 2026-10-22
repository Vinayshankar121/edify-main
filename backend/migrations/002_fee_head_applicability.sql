CREATE TABLE IF NOT EXISTS fee_head_applicability (
  id CHAR(36) PRIMARY KEY,
  structure_id CHAR(36) NOT NULL,
  head_position INT NOT NULL,
  student_enrollment_id CHAR(36) NULL,
  UNIQUE KEY fee_head_student_unique (structure_id, head_position, student_enrollment_id),
  FOREIGN KEY (structure_id) REFERENCES fee_structures(id) ON DELETE CASCADE,
  FOREIGN KEY (student_enrollment_id) REFERENCES student_enrollments(id) ON DELETE CASCADE
);
