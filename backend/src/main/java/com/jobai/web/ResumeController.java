package com.jobai.web;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.jobai.model.Resume;
import com.jobai.repo.ResumeRepository;
import com.jobai.repo.UserRepository;
import com.jobai.service.AiService;
import org.apache.pdfbox.Loader;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.text.PDFTextStripper;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/resumes")
public class ResumeController {
    private final ResumeRepository resumes;
    private final UserRepository users;
    private final AiService ai;
    private final ObjectMapper om = new ObjectMapper();

    public ResumeController(ResumeRepository resumes, UserRepository users, AiService ai) {
        this.resumes = resumes; this.users = users; this.ai = ai;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> upload(@RequestParam("file") MultipartFile file, Authentication auth) throws Exception {
        String name = file.getOriginalFilename() == null ? "resume.pdf" : file.getOriginalFilename();
        if (!name.toLowerCase().endsWith(".pdf"))
            return ResponseEntity.badRequest().body(Map.of("error", "Please upload a PDF file"));

        String text;
        try (PDDocument doc = Loader.loadPDF(file.getBytes())) {
            text = new PDFTextStripper().getText(doc).trim();
        }
        if (text.length() < 50)
            return ResponseEntity.badRequest().body(Map.of("error", "No text found in the PDF (it may be a scanned file)"));

        String analysis = ai.analyzeResume(text);

        Resume r = new Resume();
        r.setUser(users.findByEmail(auth.getName()).orElseThrow());
        r.setFileName(name);
        r.setText(text);
        r.setAnalysis(analysis);
        r.setScore(om.readTree(analysis).path("score").asInt(0));
        return ResponseEntity.ok(resumes.save(r));
    }

    @GetMapping
    public List<Resume> mine(Authentication auth) {
        return resumes.findByUserEmailOrderByCreatedAtDesc(auth.getName());
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id, Authentication auth) {
        return resumes.findByIdAndUserEmail(id, auth.getName())
                .map(r -> { resumes.delete(r); return ResponseEntity.ok(Map.of("deleted", id)); })
                .orElse(ResponseEntity.notFound().build());
    }
}
