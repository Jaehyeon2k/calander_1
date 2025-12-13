```mermaid
erDiagram
  direction LR   %% ← 이 줄이 핵심

  USER {
    string uid
    string email
    string displayName
  }

  EVENT {
    int id PK
    string ownerEmail FK
    string title
    string start
    string end
    boolean allDay
    string memo
    string color
    string scope
  }

  USER ||--o{ EVENT : owns
