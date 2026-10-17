package com.agentforge.task;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface TaskRepository extends JpaRepository<Task,Long>{
 List<Task> findTop100ByOwner_EmailOrderByCreatedAtDesc(String email);
 Optional<Task> findByIdAndOwner_Email(Long id,String email);
}
