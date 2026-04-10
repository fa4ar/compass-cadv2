# Backend Requirements: Self-Issued Fines, Warrants, and Character Tags System

## Database Schema Changes

### 1. New Table: `SelfIssuedFine`
```sql
CREATE TABLE SelfIssuedFine (
  id INT PRIMARY KEY AUTO_INCREMENT,
  issuerId INT NOT NULL,  -- Character ID who issued the fine
  recipientId INT NOT NULL,  -- Character ID who received the fine
  amount DECIMAL(10,2) NOT NULL,
  reason TEXT NOT NULL,
  fineType ENUM('traffic', 'misdemeanor', 'felony') DEFAULT 'misdemeanor',
  status ENUM('pending', 'paid', 'disputed', 'cancelled') DEFAULT 'pending',
  issuedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiresAt TIMESTAMP NULL,  -- Optional expiration for certain fine types
  FOREIGN KEY (issuerId) REFERENCES Character(id),
  FOREIGN KEY (recipientId) REFERENCES Character(id)
);
```

### 2. New Table: `WarrantRequest`
```sql
CREATE TABLE WarrantRequest (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requesterId INT NOT NULL,  -- Character ID requesting the warrant
  accusedId INT NOT NULL,  -- Character ID the warrant is against
  warrantType ENUM('arrest', 'search', 'surveillance') NOT NULL,
  reason TEXT NOT NULL,
  evidence TEXT,  -- Optional evidence description
  status ENUM('pending', 'approved', 'rejected', 'active', 'executed', 'cancelled') DEFAULT 'pending',
  approvedBy INT NULL,  -- Character ID who approved (if admin approval required)
  approvedAt TIMESTAMP NULL,
  expiresAt TIMESTAMP NULL,  -- Warrant expiration
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requesterId) REFERENCES Character(id),
  FOREIGN KEY (accusedId) REFERENCES Character(id),
  FOREIGN KEY (approvedBy) REFERENCES Character(id)
);
```

### 3. New Table: `WarrantWitness`
```sql
CREATE TABLE WarrantWitness (
  id INT PRIMARY KEY AUTO_INCREMENT,
  warrantId INT NOT NULL,
  witnessId INT NOT NULL,  -- Character ID signing as witness
  statement TEXT,  -- Optional witness statement
  signedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (warrantId) REFERENCES WarrantRequest(id) ON DELETE CASCADE,
  FOREIGN KEY (witnessId) REFERENCES Character(id),
  UNIQUE KEY (warrantId, witnessId)
);
```

### 4. New Table: `CharacterTag`
```sql
CREATE TABLE CharacterTag (
  id INT PRIMARY KEY AUTO_INCREMENT,
  characterId INT NOT NULL,
  tagType ENUM('gang_member', 'parole', 'witness', 'dangerous', 'ci', 'probation', 'weapons_restriction', 'custom') NOT NULL,
  tagName VARCHAR(100) NOT NULL,  -- Display name for the tag
  tagValue TEXT,  -- Additional data (e.g., gang name, case reference, expiration date)
  color VARCHAR(7) DEFAULT '#3b82f6',  -- Hex color for custom tags
  isCustom BOOLEAN DEFAULT FALSE,
  createdBy INT NOT NULL,  -- Character ID who created the tag
  expiresAt TIMESTAMP NULL,  -- For tags with expiration (parole, etc.)
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (characterId) REFERENCES Character(id) ON DELETE CASCADE,
  FOREIGN KEY (createdBy) REFERENCES Character(id)
);
```

### 5. New Table: `RateLimitLog`
```sql
CREATE TABLE RateLimitLog (
  id INT PRIMARY KEY AUTO_INCREMENT,
  characterId INT NOT NULL,
  actionType ENUM('fine_issued', 'warrant_requested', 'tag_created') NOT NULL,
  actionCount INT DEFAULT 1,
  windowStart TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  windowEnd TIMESTAMP NOT NULL,  -- windowStart + 1 hour
  FOREIGN KEY (characterId) REFERENCES Character(id),
  UNIQUE KEY (characterId, actionType, windowStart)
);
```

### 6. Modify Existing Table: `Character`
Add columns if not already present:
```sql
ALTER TABLE Character ADD COLUMN totalFinesAmount DECIMAL(10,2) DEFAULT 0;
ALTER TABLE Character ADD COLUMN totalFinesCount INT DEFAULT 0;
ALTER TABLE Character ADD COLUMN hasActiveWarrant BOOLEAN DEFAULT FALSE;
```

## API Endpoints

### Fine Issuance Endpoints

#### POST `/api/fines/self-issue`
**Description:** Issue a fine to another character

**Request Body:**
```json
{
  "recipientId": 123,
  "amount": 500.00,
  "reason": "Speeding in residential zone",
  "fineType": "traffic"
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "issuerId": 456,
  "recipientId": 123,
  "amount": 500.00,
  "reason": "Speeding in residential zone",
  "fineType": "traffic",
  "status": "pending",
  "issuedAt": "2025-04-10T14:30:00Z",
  "isSelfIssued": true
}
```

**Validation:**
- Recipient must exist and not be the issuer
- Amount must be positive (max $10,000 for self-issued)
- Reason must be at least 10 characters
- Rate limit: max 3 fines per hour per character
- Fine type validation based on amount (traffic < $500, misdemeanor < $2000, felony >= $2000)

#### GET `/api/fines/character/:characterId`
**Description:** Get all fines for a character

**Query Params:**
- `type`: Optional filter by fine type (traffic, misdemeanor, felony)
- `status`: Optional filter by status

**Response:** 200 OK
```json
{
  "fines": [
    {
      "id": 1,
      "amount": 500.00,
      "reason": "Speeding",
      "fineType": "traffic",
      "status": "pending",
      "issuedAt": "2025-04-10T14:30:00Z",
      "isSelfIssued": true,
      "issuer": {
        "id": 456,
        "firstName": "John",
        "lastName": "Doe"
      }
    }
  ],
  "totalAmount": 500.00,
  "totalCount": 1
}
```

### Warrant Request Endpoints

#### POST `/api/warrants/request`
**Description:** Request a warrant against another character

**Request Body:**
```json
{
  "accusedId": 123,
  "warrantType": "arrest",
  "reason": "Suspected of drug trafficking based on witness testimony",
  "evidence": "Witness statement from confidential informant"
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "requesterId": 456,
  "accusedId": 123,
  "warrantType": "arrest",
  "reason": "Suspected of drug trafficking...",
  "evidence": "Witness statement...",
  "status": "pending",
  "createdAt": "2025-04-10T14:30:00Z"
}
```

**Validation:**
- Accused must exist and not be the requester
- Reason must be at least 20 characters
- Evidence is optional but recommended
- Rate limit: max 3 warrant requests per hour per character
- For felony-level warrants, require admin approval

#### POST `/api/warrants/:warrantId/witness`
**Description:** Sign as witness for a warrant request

**Request Body:**
```json
{
  "statement": "I observed the suspect at the scene"
}
```

**Response:** 200 OK
```json
{
  "id": 1,
  "witnessId": 789,
  "statement": "I observed the suspect...",
  "signedAt": "2025-04-10T14:35:00Z"
}
```

**Validation:**
- Witness cannot be the requester or accused
- Statement must be at least 10 characters
- One witness per character per warrant

#### GET `/api/warrants/character/:characterId`
**Description:** Get all warrants for a character

**Query Params:**
- `status`: Optional filter by status

**Response:** 200 OK
```json
{
  "warrants": [
    {
      "id": 1,
      "warrantType": "arrest",
      "reason": "Suspected of drug trafficking...",
      "status": "active",
      "createdAt": "2025-04-10T14:30:00Z",
      "expiresAt": "2025-05-10T14:30:00Z",
      "witnesses": [
        {
          "witnessId": 789,
          "firstName": "Jane",
          "lastName": "Smith",
          "statement": "I observed..."
        }
      ]
    }
  ]
}
```

### Character Tags Endpoints

#### POST `/api/characters/:characterId/tags`
**Description:** Add a tag to a character

**Request Body:**
```json
{
  "tagType": "gang_member",
  "tagName": "Член банды",
  "tagValue": "Los Santos Vagos",
  "color": "#ef4444",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Response:** 201 Created
```json
{
  "id": 1,
  "tagType": "gang_member",
  "tagName": "Член банды",
  "tagValue": "Los Santos Vagos",
  "color": "#ef4444",
  "isCustom": false,
  "createdAt": "2025-04-10T14:30:00Z",
  "expiresAt": "2025-12-31T23:59:59Z"
}
```

**Validation:**
- Max 5 custom tags per character
- Predefined tags have specific required fields (e.g., gang_member requires tagValue)
- Color must be valid hex code for custom tags
- Rate limit: max 10 tags per hour per character

#### GET `/api/characters/:characterId/tags`
**Description:** Get all tags for a character

**Response:** 200 OK
```json
{
  "tags": [
    {
      "id": 1,
      "tagType": "gang_member",
      "tagName": "Член банды",
      "tagValue": "Los Santos Vagos",
      "color": "#ef4444",
      "isCustom": false,
      "expiresAt": "2025-12-31T23:59:59Z",
      "isExpiring": true  // Calculated if expires within 30 days
    }
  ]
}
```

#### DELETE `/api/characters/:characterId/tags/:tagId`
**Description:** Remove a tag from a character

**Response:** 204 No Content

**Validation:**
- Only the creator of a custom tag can delete it
- Predefined tags can only be removed by admins or the tag creator

#### PUT `/api/characters/:characterId/tags/:tagId`
**Description:** Update a tag (custom tags only)

**Request Body:**
```json
{
  "tagName": "Updated tag name",
  "color": "#3b82f6"
}
```

**Response:** 200 OK

**Validation:**
- Only custom tags can be updated
- Only the creator can update

### Rate Limiting Endpoints

#### GET `/api/rate-limit/check`
**Description:** Check current rate limit status for current character

**Response:** 200 OK
```json
{
  "finesIssued": {
    "count": 2,
    "limit": 3,
    "windowEndsAt": "2025-04-10T15:30:00Z"
  },
  "warrantsRequested": {
    "count": 0,
    "limit": 3,
    "windowEndsAt": "2025-04-10T15:30:00Z"
  },
  "tagsCreated": {
    "count": 5,
    "limit": 10,
    "windowEndsAt": "2025-04-10T15:30:00Z"
  }
}
```

## Validation Logic

### Fine Amount Limits
- Self-issued fines: Max $10,000
- Traffic fines: Typically $50 - $500
- Misdemeanor fines: Typically $500 - $2,000
- Felony fines: $2,000 - $10,000
- Amounts exceeding limits require admin approval

### Warrant Approval Logic
- Traffic/misdemeanor warrants: Auto-approved after 1 witness signature
- Felony warrants: Require admin approval
- Surveillance warrants: Require admin approval + minimum 2 witnesses
- Emergency warrants (immediate threat): Can bypass approval with justification

### Tag Validation
- Predefined tags have specific field requirements:
  - `gang_member`: Requires `tagValue` (gang name)
  - `parole`: Requires `tagValue` (expiration date or case number)
  - `witness`: Requires `tagValue` (case reference)
  - `ci`: No additional fields, but only visible to police
  - `probation`: Requires `tagValue` (end date)
  - `weapons_restriction`: No additional fields
- Custom tags: Max 5 per character, min 3 characters for name

### Rate Limiting Implementation
- Sliding window rate limiting (1 hour windows)
- Track counts in `RateLimitLog` table
- Clean up old entries periodically (older than 24 hours)
- Return 429 Too Many Requests when limit exceeded
- Include `Retry-After` header with seconds until window resets

## Permission Logic

### General Permissions
- All logged-in citizens can issue fines (subject to rate limits)
- All logged-in citizens can request warrants (subject to rate limits)
- All logged-in citizens can add custom tags (subject to rate limits)
- Admin users can approve/reject warrant requests
- Admin users can remove any tag
- Police users can view CI tags
- Only tag creators can edit/delete their custom tags

### Special Cases
- Self-issued fines cannot be issued to oneself
- Warrant requests cannot be made against oneself
- Witness signatures cannot be added by requester or accused
- CI tags are only visible to users with police role
- "Dangerous" tag requires at least one felony warrant or 3+ misdemeanor fines

## Database Indexes

```sql
CREATE INDEX idx_self_issued_fines_recipient ON SelfIssuedFine(recipientId);
CREATE INDEX idx_self_issued_fines_issuer ON SelfIssuedFine(issuerId);
CREATE INDEX idx_self_issued_fines_status ON SelfIssuedFine(status);

CREATE INDEX idx_warrant_requests_accused ON WarrantRequest(accusedId);
CREATE INDEX idx_warrant_requests_requester ON WarrantRequest(requesterId);
CREATE INDEX idx_warrant_requests_status ON WarrantRequest(status);

CREATE INDEX idx_character_tags_character ON CharacterTag(characterId);
CREATE INDEX idx_character_tags_type ON CharacterTag(tagType);
CREATE INDEX idx_character_tags_creator ON CharacterTag(createdBy);

CREATE INDEX idx_rate_limit_character_action ON RateLimitLog(characterId, actionType, windowStart);
```

## Data Migration Notes

- Existing fines in the system should be marked as `isSelfIssued: false` for backward compatibility
- Character `totalFinesAmount` and `totalFinesCount` should be calculated from existing fine records
- Warrant status should be updated to match new enum values
- Consider adding a migration script to populate initial rate limit windows
