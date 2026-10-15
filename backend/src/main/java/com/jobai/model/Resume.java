package com.jobai.model;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import java.time.LocalDateTime;

@Entity
@Getter @Setter
public class Resume {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY) @JsonIgnore
    private User user;
    private String fileName;
    @JsonIgnore
    @Column(columnDefinition = "LONGTEXT")
    private String text;
    @Column(columnDefinition = "LONGTEXT")
    private String analysis;   // AI ka JSON string
    private Integer score;
    private LocalDateTime createdAt = LocalDateTime.now();
}
