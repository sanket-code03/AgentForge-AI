package com.jobai.web;

import com.jobai.model.User;
import com.jobai.repo.UserRepository;
import com.jobai.security.JwtService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    record RegisterReq(@NotBlank String name, @Email @NotBlank String email, @Size(min = 6) String password) {}
    record LoginReq(@NotBlank String email, @NotBlank String password) {}

    private final UserRepository users;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthController(UserRepository users, PasswordEncoder encoder, JwtService jwt) {
        this.users = users; this.encoder = encoder; this.jwt = jwt;
    }

    @PostMapping("/register")
    public ResponseEntity<?> register(@Valid @RequestBody RegisterReq r) {
        if (users.existsByEmail(r.email()))
            return ResponseEntity.badRequest().body(Map.of("error", "Email is already registered"));
        User u = new User();
        u.setName(r.name()); u.setEmail(r.email()); u.setPassword(encoder.encode(r.password()));
        users.save(u);
        return ResponseEntity.ok(Map.of("token", jwt.generate(u.getEmail()), "name", u.getName(), "email", u.getEmail()));
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginReq r) {
        return users.findByEmail(r.email())
                .filter(u -> encoder.matches(r.password(), u.getPassword()))
                .<ResponseEntity<?>>map(u -> ResponseEntity.ok(
                        Map.of("token", jwt.generate(u.getEmail()), "name", u.getName(), "email", u.getEmail())))
                .orElse(ResponseEntity.status(401).body(Map.of("error", "Incorrect email or password")));
    }
}
