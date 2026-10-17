package com.agentforge.task;
import com.agentforge.user.AppUser;
import jakarta.persistence.*;
import java.time.Instant;
@Entity @Table(name="tasks",indexes=@Index(name="idx_task_owner_created",columnList="owner_id,createdAt"))
public class Task {
 @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
 @ManyToOne(optional=false,fetch=FetchType.LAZY) @JoinColumn(name="owner_id",nullable=false) private AppUser owner;
 @Column(nullable=false,length=8000) private String prompt;
 @Column(nullable=false,length=30) private String status="RUNNING";
 @Column(length=30000) private String output;
 @Column(length=2000) private String error;
 @Column(nullable=false) private Instant createdAt=Instant.now(); private Instant finishedAt;
 protected Task(){}
 public Task(AppUser owner,String prompt){this.owner=owner;this.prompt=prompt;}
 public void complete(String out){output=out;status="COMPLETED";finishedAt=Instant.now();error=null;}
 public void fail(String message){status="FAILED";error=message;finishedAt=Instant.now();}
 public Long getId(){return id;} public String getPrompt(){return prompt;} public String getStatus(){return status;} public String getOutput(){return output;} public String getError(){return error;} public Instant getCreatedAt(){return createdAt;} public Instant getFinishedAt(){return finishedAt;}
}
