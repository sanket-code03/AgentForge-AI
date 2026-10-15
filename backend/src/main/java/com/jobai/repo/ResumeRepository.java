package com.jobai.repo;

import com.jobai.model.Resume;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface ResumeRepository extends JpaRepository<Resume, Long> {
    List<Resume> findByUserEmailOrderByCreatedAtDesc(String email);
    Optional<Resume> findByIdAndUserEmail(Long id, String email);
}
