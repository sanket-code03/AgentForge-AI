package com.jobai.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import java.util.*;
import java.util.regex.Pattern;

@Service
public class AiService {
    @Value("${ai.api.url}") private String url;
    @Value("${ai.api.key:}") private String apiKey;
    @Value("${ai.model}") private String model;
    @Value("${ai.demo:false}") private boolean demo;

    private final RestClient rest = RestClient.create();
    private final ObjectMapper om = new ObjectMapper();

    private boolean useDemo() { return demo || apiKey == null || apiKey.isBlank(); }

    private String ask(String system, String user) {
        String key = apiKey == null ? "" : apiKey.replaceAll("[^\\x21-\\x7E]", "");
        Map<String, Object> body = Map.of(
                "model", model,
                "max_tokens", 1500,
                "system", system,
                "messages", List.of(Map.of("role", "user", "content", user)));

        JsonNode res = rest.post().uri(url)
                .header("x-api-key", key)
                .header("anthropic-version", "2023-06-01")
                .contentType(MediaType.APPLICATION_JSON)
                .body(body).retrieve().body(JsonNode.class);

        String text = res.path("content").path(0).path("text").asText();
        int s = text.indexOf('{'), e = text.lastIndexOf('}');
        if (s < 0 || e < s) throw new IllegalStateException("The AI did not return valid JSON");
        return text.substring(s, e + 1);
    }

    private String cut(String t) { return t.length() > 12000 ? t.substring(0, 12000) : t; }

    public String analyzeResume(String resumeText) {
        if (useDemo()) return demoAnalyze(resumeText);
        String system = "You are an expert recruiter and resume reviewer. Reply with ONLY a JSON object written in English, no extra text.";
        String user = """
            Analyze this resume. Return JSON with exactly these keys:
            {"score": <0-100 integer>, "summary": "<2-3 sentences>", "skills": [..], "strengths": [..],
             "weaknesses": [..], "suggestions": [..], "suitableRoles": [..]}

            RESUME:
            """ + cut(resumeText);
        return ask(system, user);
    }

    public String matchJob(String resumeText, String jobTitle, String jobDesc) {
        if (useDemo()) return demoMatch(resumeText, jobTitle, jobDesc);
        String system = "You are an expert ATS and recruiter. Reply with ONLY a JSON object written in English, no extra text.";
        String user = """
            Compare the resume with the job. Return JSON with exactly these keys:
            {"matchScore": <0-100 integer>, "verdict": "<one sentence>", "matchedSkills": [..],
             "missingSkills": [..], "tips": [..]}

            JOB TITLE: %s
            JOB DESCRIPTION: %s

            RESUME:
            %s
            """.formatted(jobTitle, jobDesc, cut(resumeText));
        return ask(system, user);
    }

    // ---------------- DEMO MODE (baghair AI key ke) ----------------
    private static final String[] SKILLS = {
        "java", "spring boot", "spring framework", "hibernate", "jpa", "mysql", "postgresql", "mongodb", "sql",
        "python", "django", "flask", "javascript", "typescript", "react", "angular", "vue", "node.js", "express",
        "html", "css", "tailwind", "bootstrap", "c++", "c#", ".net", "php", "laravel", "git", "github", "docker",
        "kubernetes", "aws", "azure", "gcp", "linux", "rest api", "restful", "microservices", "jwt", "junit",
        "maven", "gradle", "jenkins", "ci/cd", "machine learning", "deep learning", "tensorflow", "pytorch",
        "pandas", "numpy", "data analysis", "power bi", "tableau", "excel", "figma", "agile", "scrum", "kotlin",
        "android", "flutter", "swift", "redis", "kafka", "graphql", "firebase", "selenium",
        "communication", "leadership", "teamwork", "problem solving"
    };

    private static final Map<String, String[]> ROLES = new LinkedHashMap<>();
    static {
        ROLES.put("Java Backend Developer", new String[]{"java", "spring boot", "hibernate", "jpa", "mysql", "maven", "rest api"});
        ROLES.put("Frontend Developer", new String[]{"html", "css", "javascript", "react", "angular", "vue", "typescript"});
        ROLES.put("Full Stack Developer", new String[]{"react", "node.js", "java", "spring boot", "mysql", "mongodb", "javascript"});
        ROLES.put("Python Developer", new String[]{"python", "django", "flask", "pandas"});
        ROLES.put("Data Analyst", new String[]{"sql", "excel", "power bi", "tableau", "pandas", "data analysis", "python"});
        ROLES.put("ML Engineer", new String[]{"machine learning", "deep learning", "tensorflow", "pytorch", "python"});
        ROLES.put("DevOps Engineer", new String[]{"docker", "kubernetes", "aws", "linux", "jenkins", "ci/cd", "git"});
        ROLES.put("Mobile Developer", new String[]{"android", "flutter", "kotlin", "swift", "firebase"});
        ROLES.put("QA Engineer", new String[]{"selenium", "junit", "agile"});
    }

    private List<String> foundSkills(String text) {
        String t = text.toLowerCase();
        List<String> out = new ArrayList<>();
        for (String s : SKILLS) {
            Pattern p = Pattern.compile("(?<![a-z0-9+#])" + Pattern.quote(s) + "(?![a-z0-9+#])");
            if (p.matcher(t).find()) out.add(s);
        }
        return out;
    }

    private boolean has(String t, String... words) {
        for (String w : words) if (t.contains(w)) return true;
        return false;
    }

    private void fill(ObjectNode n, String key, Collection<String> items) {
        ArrayNode a = n.putArray(key);
        for (String s : items) a.add(s);
    }

    private Set<String> words(String text) {
        Set<String> out = new HashSet<>();
        for (String w : text.toLowerCase().split("[^a-z]+")) if (w.length() > 4) out.add(w);
        return out;
    }

    private String demoAnalyze(String text) {
        String t = text.toLowerCase();
        List<String> skills = foundSkills(text);
        boolean edu = has(t, "education", "university", "degree", "bachelor");
        boolean exp = has(t, "experience", "internship", "work history");
        boolean proj = has(t, "project");
        boolean cert = has(t, "certif", "course");
        boolean summ = has(t, "summary", "objective", "profile");
        boolean email = Pattern.compile("[\\w.+-]+@[\\w-]+\\.[\\w.]+").matcher(text).find();
        boolean phone = Pattern.compile("\\+?\\d[\\d\\s-]{8,}\\d").matcher(text).find();

        int score = 25 + Math.min(40, skills.size() * 4)
                + (edu ? 5 : 0) + (exp ? 8 : 0) + (proj ? 8 : 0) + (cert ? 4 : 0) + (summ ? 3 : 0)
                + (email ? 3 : 0) + (phone ? 2 : 0) + (text.length() > 1500 ? 4 : 0);
        score = Math.min(score, 95);

        List<String> strengths = new ArrayList<>();
        List<String> weaknesses = new ArrayList<>();
        List<String> suggestions = new ArrayList<>();

        if (skills.size() >= 8) strengths.add("Strong skills section (" + skills.size() + " skills detected)");
        if (proj) strengths.add("Projects are mentioned");
        if (exp) strengths.add("Experience or internship section is present");
        if (cert) strengths.add("Certifications or courses are mentioned");
        if (edu) strengths.add("Education section is present");

        if (skills.size() < 5) { weaknesses.add("Few technical skills detected"); suggestions.add("Add a dedicated Skills section listing your tools and technologies"); }
        if (!proj) { weaknesses.add("No projects section found"); suggestions.add("Add 2-3 projects with the tools used and the outcome"); }
        if (!exp) { weaknesses.add("No experience or internship found"); suggestions.add("List internships, freelance work or practice projects as experience"); }
        if (!summ) suggestions.add("Add a 2-3 line professional summary at the top");
        if (!email || !phone) weaknesses.add("Email or phone number is not clearly visible");
        if (text.length() < 1500) weaknesses.add("Resume is very short");
        suggestions.add("Quantify your impact (e.g. 'reduced load time by 30%')");
        suggestions.add("Include keywords from the job you are applying for");

        Set<String> have = new HashSet<>(skills);
        List<String> roles = new ArrayList<>();
        ROLES.entrySet().stream()
                .map(e -> Map.entry(e.getKey(), (int) Arrays.stream(e.getValue()).filter(have::contains).count()))
                .filter(e -> e.getValue() >= 2)
                .sorted((a, b) -> b.getValue() - a.getValue())
                .limit(3)
                .forEach(e -> roles.add(e.getKey()));

        ObjectNode n = om.createObjectNode();
        n.put("score", score);
        n.put("summary", "Demo mode: " + skills.size() + " skills detected. This is a keyword-based estimate, not a full AI review. "
                + "Set ai.api.key to enable full AI analysis.");
        fill(n, "skills", skills);
        fill(n, "strengths", strengths);
        fill(n, "weaknesses", weaknesses);
        fill(n, "suggestions", suggestions);
        fill(n, "suitableRoles", roles);
        return n.toString();
    }

    private String demoMatch(String resumeText, String jobTitle, String jobDesc) {
        String jobText = jobTitle + " " + jobDesc;
        Set<String> resumeSkills = new HashSet<>(foundSkills(resumeText));
        List<String> jobSkills = foundSkills(jobText);

        List<String> matched = new ArrayList<>();
        List<String> missing = new ArrayList<>();
        for (String s : jobSkills) (resumeSkills.contains(s) ? matched : missing).add(s);

        int score;
        if (!jobSkills.isEmpty()) {
            score = (int) Math.round(100.0 * matched.size() / jobSkills.size());
        } else {
            Set<String> jw = words(jobText), rw = words(resumeText);
            long common = jw.stream().filter(rw::contains).count();
            score = jw.isEmpty() ? 0 : (int) Math.min(90, 100 * common / jw.size());
        }

        String verdict = score >= 75 ? "Your resume is a strong match for this job (demo estimate)."
                : score >= 45 ? "Some skills match, but there are gaps (demo estimate)."
                : "Your resume is a weak match for this job (demo estimate).";

        List<String> tips = new ArrayList<>();
        for (int i = 0; i < Math.min(3, missing.size()); i++)
            tips.add("'" + missing.get(i) + "' is missing. Learn it, or add it to your resume if you already know it.");
        tips.add("Work keywords from the job description into your summary and projects");

        ObjectNode n = om.createObjectNode();
        n.put("matchScore", score);
        n.put("verdict", verdict);
        fill(n, "matchedSkills", matched);
        fill(n, "missingSkills", missing);
        fill(n, "tips", tips);
        return n.toString();
    }
}