package com.priorityengine.model;

import lombok.Data;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Document(collection = "events")
public class NotificationEvent {
    @Id
    private String id;
    private String userId;
    private String category;
    private String content;
    private String status; // NOW, LATER, NEVER
    private String via; // RULE, AI, DEDUPE
    private LocalDateTime timestamp;
    private List<AuditTrail> auditTrail = new ArrayList<>();

    @Data
    public static class AuditTrail {
        private String step;
        private String decision;
        private String metadata;
        private LocalDateTime timestamp;
    }
}
