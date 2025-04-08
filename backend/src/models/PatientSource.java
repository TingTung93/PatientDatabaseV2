package src.models;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import javax.persistence.*;

import org.hibernate.annotations.CreationTimestamp;

@Entity
@Table(name = "patient_sources")
public class PatientSource {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @Column(nullable = false, length = 100)
    private String name;
    
    @Column(columnDefinition = "TEXT")
    private String description;
    
    @CreationTimestamp
    @Column(name = "created_at")
    private LocalDateTime createdAt;
    
    public Map<String, Object> toDict() {
        Map<String, Object> dict = new HashMap<>();
        dict.put("id", this.id);
        dict.put("name", this.name);
        dict.put("description", this.description);
        dict.put("created_at", this.createdAt.toString());
        return dict;
    }

    // Getters and setters
    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
} 