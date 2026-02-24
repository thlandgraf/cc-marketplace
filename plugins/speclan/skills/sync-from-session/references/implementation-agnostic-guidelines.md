# Implementation-Agnostic Writing Guidelines

Specs must be 100% implementation and architecture agnostic. Describe WHAT the system does from the user's perspective, never HOW it's built.

## DO NOT Include

### Implementation Details
- File paths, directory names, or code locations
- Class names, function names, or variable names
- Library names, framework references, or technology choices (e.g., "JWT", "Redis", "PostgreSQL")
- API endpoint paths or route definitions
- Database table/column names or schema details
- Code fragments, snippets, or pseudocode
- Configuration file references
- Technical implementation approaches

### Architecture Details
- Design patterns used (e.g., "MVC", "event-driven", "microservices", "singleton")
- System architecture decisions (e.g., "monolith vs microservices", "serverless")
- Component relationships or dependencies (e.g., "service A calls service B")
- Data flow or sequence diagrams
- Infrastructure choices (e.g., "deployed on AWS Lambda", "uses message queue")
- Caching strategies, scaling approaches, or performance optimizations
- Internal module boundaries or layering decisions
- Protocol choices (e.g., "REST", "GraphQL", "WebSocket")

## DO Include
- User-facing capabilities and behaviors
- Business value and purpose
- Functional requirements (what the system does)
- User stories and acceptance criteria (inline in requirements)
- Expected outcomes from user perspective

## Examples

**WRONG:** "JWT-based authentication with refresh tokens stored in Redis"
**RIGHT:** "Secure login that keeps users signed in across sessions"

**WRONG:** "Validates CSV format using the FileValidator class in src/validators/"
**RIGHT:** "Validates uploaded files meet the required format before processing"

**WRONG:** "Uses event-driven architecture with message queues for async processing"
**RIGHT:** "Processes large imports without blocking the user interface"

**WRONG:** "Implements repository pattern with PostgreSQL for data persistence"
**RIGHT:** "Stores and retrieves user data reliably"
