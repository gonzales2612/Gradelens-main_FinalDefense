gradelens/
│
├── physical/                         # Physical / device layer
│   └── arduino/
│       ├── firmware/
│       └── docs/
│
├── compute/                          # Pure computation (stateless)
│   └── cv/
│       ├── app/
│       │   ├── api/                  # FastAPI (health, debug)
│       │   ├── workers/              # Redis consumers
│       │   ├── pipeline/             # CV processing stages
│       │   │   ├── preprocess.py
│       │   │   ├── align.py
│       │   │   ├── bubbles.py
│       │   │   └── grade.py
│       │   ├── schemas/              # Input/output models
│       │   └── settings.py
│       ├── main.py
│       ├── requirements.txt
│       └── Dockerfile
│
├── application/                      # Application / orchestration layer
│   └── api/
│       ├── src/
│       │   ├── controllers/
│       │   ├── routes/
│       │   ├── services/
│       │   ├── queues/               # Redis producers/consumers
│       │   ├── models/               # DTOs / persistence models
│       │   ├── middlewares/
│       │   └── app.ts
│       ├── package.json
│       └── Dockerfile
│
├── domain/                           # Domain knowledge (language-agnostic)
│   ├── schemas/                      # Shared JSON schemas
│   │   ├── scan_job.json
│   │   ├── scan_result.json
│   │   └── exam.json
│   ├── constants/
│   └── rules/
│       └── grading.md
│
├── persistence/                      # Data storage concerns
│   └── mongodb/
│       ├── migrations/
│       └── indexes/
│
├── presentation/                     # UI layer
│   └── frontend/
│       ├── src/
│       ├── public/
│       └── package.json
│
├── storage/                          # Binary artifacts (not code)
│   └── scans/
│
├── infra/                            # Infrastructure & deployment
│   ├── redis/
│   ├── docker-compose.yml
│   └── env/
│
├── docs/                             # System documentation
│   ├── architecture.md
│   ├── data-flow.md
│   └── api-contracts.md
│
└── README.md
