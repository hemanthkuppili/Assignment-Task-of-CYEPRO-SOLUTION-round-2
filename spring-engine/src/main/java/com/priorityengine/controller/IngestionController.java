package com.priorityengine.controller;

import com.priorityengine.model.NotificationEvent;
import com.priorityengine.service.OrchestratorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/events")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class IngestionController {

    private final OrchestratorService orchestratorService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> ingestEvent(@RequestBody Map<String, String> payload) {
        NotificationEvent event = new NotificationEvent();
        event.setUserId(payload.get("user_id"));
        event.setCategory(payload.get("category"));
        event.setContent(payload.get("content"));

        if (event.getUserId() == null || event.getCategory() == null || event.getContent() == null) {
            Map<String, Object> error = new HashMap<>();
            error.put("error", "Missing fields: user_id, category, content");
            return ResponseEntity.badRequest().body(error);
        }

        NotificationEvent result = orchestratorService.processNotification(event);

        Map<String, Object> response = new HashMap<>();
        response.put("message", "Event accepted. Engine decision recorded.");
        response.put("data", result);
        return ResponseEntity.accepted().body(response);
    }
}
