package com.agentforge.task;
import com.agentforge.ai.OllamaService;
import com.agentforge.user.UserRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import java.time.Instant;
import java.util.*;
@RestController @RequestMapping("/api/tasks") public class TaskController {
 private final TaskRepository tasks;private final UserRepository users;private final OllamaService ai;
 public TaskController(TaskRepository tasks,UserRepository users,OllamaService ai){this.tasks=tasks;this.users=users;this.ai=ai;}
 public record CreateRequest(@NotBlank @Size(max=8000)String prompt){}
 public record TaskDto(Long id,String prompt,String status,String output,String error,Instant createdAt,Instant finishedAt){
  static TaskDto from(Task t){return new TaskDto(t.getId(),t.getPrompt(),t.getStatus(),t.getOutput(),t.getError(),t.getCreatedAt(),t.getFinishedAt());}
 }
 @PostMapping @ResponseStatus(HttpStatus.CREATED) public TaskDto create(@Valid @RequestBody CreateRequest b,Authentication auth){
  var owner=users.findByEmailIgnoreCase(auth.getName()).orElseThrow(()->new ResponseStatusException(HttpStatus.UNAUTHORIZED));
  Task t=tasks.save(new Task(owner,b.prompt().trim()));
  try{String result=ai.generate("Answer the following task helpfully. Use headings and code blocks when appropriate. Do not claim to have used live web search, external tools, or code execution.\n\nTask:\n"+b.prompt().trim());
   t.complete("## Planner Agent\nTask accepted and sent to the configured AI model.\n\n## Worker Agent\n"+result+"\n\n## Reviewer Agent\nReview status: response generated. Verify factual claims and test any code before production use.");
  }catch(RuntimeException ex){t.fail(ex.getMessage()==null?"AI provider failed.":ex.getMessage());}
  return TaskDto.from(tasks.save(t));
 }
 @GetMapping public List<TaskDto> history(Authentication a){return tasks.findTop100ByOwner_EmailOrderByCreatedAtDesc(a.getName()).stream().map(TaskDto::from).toList();}
 @GetMapping("/{id}") public TaskDto detail(@PathVariable Long id,Authentication a){return tasks.findByIdAndOwner_Email(id,a.getName()).map(TaskDto::from).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Task not found."));}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) public void delete(@PathVariable Long id,Authentication a){Task t=tasks.findByIdAndOwner_Email(id,a.getName()).orElseThrow(()->new ResponseStatusException(HttpStatus.NOT_FOUND,"Task not found."));tasks.delete(t);}
 @GetMapping("/provider") public Map<String,String> provider(){return Map.of("provider","Ollama","model",ai.modelName());}
}
