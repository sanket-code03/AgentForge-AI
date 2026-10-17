package com.agentforge.auth;
import com.agentforge.security.JwtService;
import com.agentforge.user.*;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.util.Map;
@RestController @RequestMapping("/api/auth") public class AuthController {
 private final UserRepository users; private final PasswordEncoder encoder; private final JwtService jwt;
 public AuthController(UserRepository users,PasswordEncoder encoder,JwtService jwt){this.users=users;this.encoder=encoder;this.jwt=jwt;}
 public record RegisterRequest(@NotBlank @Size(max=100)String name,@NotBlank @Email @Size(max=190)String email,@NotBlank @Size(min=8,max=72)String password){}
 public record LoginRequest(@NotBlank @Email String email,@NotBlank String password){}
 public record AuthResponse(String token,String name,String email){}
 @PostMapping("/register") @ResponseStatus(HttpStatus.CREATED) public AuthResponse register(@Valid @RequestBody RegisterRequest b){
  String email=b.email().trim().toLowerCase();if(users.existsByEmailIgnoreCase(email))throw new ResponseStatusException(HttpStatus.CONFLICT,"An account with this email already exists.");
  AppUser u=users.save(new AppUser(b.name().trim(),email,encoder.encode(b.password())));return new AuthResponse(jwt.createToken(u.getEmail()),u.getName(),u.getEmail());
 }
 @PostMapping("/login") public AuthResponse login(@Valid @RequestBody LoginRequest b){
  AppUser u=users.findByEmailIgnoreCase(b.email().trim()).filter(x->encoder.matches(b.password(),x.getPasswordHash())).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED,"Email or password is incorrect."));
  return new AuthResponse(jwt.createToken(u.getEmail()),u.getName(),u.getEmail());
 }
 @GetMapping("/me") public Map<String,String> me(Authentication a){AppUser u=users.findByEmailIgnoreCase(a.getName()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));return Map.of("name",u.getName(),"email",u.getEmail());}
}
