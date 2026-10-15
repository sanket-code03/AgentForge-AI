package com.jobai.web;

import com.jobai.model.Job;
import com.jobai.repo.JobRepository;
import com.jobai.repo.ResumeRepository;
import com.jobai.service.AiService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/jobs")
public class JobController {
    record JobReq(@NotBlank String title, @NotBlank String company, String location, @NotBlank String description) {}

    private final JobRepository jobs;
    private final ResumeRepository resumes;
    private final AiService ai;

    public JobController(JobRepository jobs, ResumeRepository resumes, AiService ai) {
        this.jobs = jobs; this.resumes = resumes; this.ai = ai;
    }

    @GetMapping
    public List<Job> all() { return jobs.findAllByOrderByCreatedAtDesc(); }

    @PostMapping
    public Job create(@Valid @RequestBody JobReq r, Authentication auth) {
        Job j = new Job();
        j.setTitle(r.title()); j.setCompany(r.company()); j.setLocation(r.location());
        j.setDescription(r.description()); j.setPostedBy(auth.getName());
        return jobs.save(j);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        return jobs.findById(id)
                .filter(j -> auth.getName().equals(j.getPostedBy()))
                .map(j -> { jobs.delete(j); return ResponseEntity.ok(Map.of("deleted", id)); })
                .orElse(ResponseEntity.status(403).build());
    }

    /** Resume ko job se match karo (AI) */
    @PostMapping("/{id}/match")
    public ResponseEntity<?> match(@PathVariable Long id, @RequestParam Long resumeId, Authentication auth) {
        var job = jobs.findById(id).orElse(null);
        var resume = resumes.findByIdAndUserEmail(resumeId, auth.getName()).orElse(null);
        if (job == null || resume == null)
            return ResponseEntity.badRequest().body(Map.of("error", "Job or resume not found"));
        String json = ai.matchJob(resume.getText(), job.getTitle(), job.getDescription());
        return ResponseEntity.ok().header("Content-Type", "application/json").body(json);
    }
}
