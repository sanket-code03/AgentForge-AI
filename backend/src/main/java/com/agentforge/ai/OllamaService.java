package com.agentforge.ai;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import java.util.*;
@Service public class OllamaService {
 private final RestClient client; private final String model;
 public OllamaService(@Value("${app.ollama.base-url}")String base,@Value("${app.ollama.model}")String model){client=RestClient.builder().baseUrl(base).build();this.model=model;}
 public String generate(String prompt){
  try{
   Map<?,?> result=client.post().uri("/api/chat").contentType(MediaType.APPLICATION_JSON)
    .body(Map.of("model",model,"stream",false,"messages",List.of(
     Map.of("role","system","content","You are AgentForge AI, a helpful coding and research assistant. Be honest about uncertainty. Never claim to have browsed the web or executed code unless a tool actually did so."),
     Map.of("role","user","content",prompt))))
    .retrieve().body(Map.class);
   if(result==null||!(result.get("message") instanceof Map<?,?> msg)||msg.get("content")==null)throw new IllegalStateException("Ollama returned an empty response.");
   return String.valueOf(msg.get("content"));
  }catch(RestClientException ex){throw new IllegalStateException("Cannot reach Ollama. Start Ollama and pull the configured model. Details: "+ex.getMessage(),ex);}
 }
 public String modelName(){return model;}
}
