# Bitespeed Backend Task: Identity Reconciliation

## Project Overview

This project implements an identity reconciliation service for FluxKart.com, helping to track customer identities across multiple purchases even when they use different contact information. The service is designed to identify and link customer contacts based on common email addresses or phone numbers.

## Problem Statement

FluxKart.com needs to track customer identities across multiple purchases where customers might use different email addresses and phone numbers. The service maintains a relational database of contact information and provides an API endpoint to identify and consolidate customer identities.

## Database Schema

The service uses a Contact table with the following structure:

```typescript
{
    id                   Int
    phoneNumber          String?
    email                String?
    linkedId             Int?
    linkPrecedence       "secondary"|"primary"
    createdAt            DateTime
    updatedAt            DateTime
    deletedAt            DateTime?
}
```

## API Endpoint

### POST /identify

**Request Format:**

```json
{
    "email"?: string,
    "phoneNumber"?: number
}
```

**Response Format:**

```json
{
    "contact": {
        "primaryContatctId": number,
        "emails": string[],
        "phoneNumbers": string[],
        "secondaryContactIds": number[]
    }
}
```

## Business Rules

1. **New Contact Creation:**

   - If no existing contacts match the incoming request, creates a new primary contact
   - Returns it with an empty array for secondaryContactIds

2. **Secondary Contact Creation:**

   - Created when an incoming request has either phoneNumber or email common with existing contact but contains new information

3. **Contact Linking:**
   - Contacts are linked if they share either email or phone number
   - The oldest contact is treated as "primary"
   - All other linked contacts become "secondary"
   - Primary contacts can be converted to secondary if linked to an older primary contact

## Example Scenarios

### Scenario 1: New Contact

**Request:**

```json
{
  "email": "lorraine@hillvalley.edu",
  "phoneNumber": "123456"
}
```

Creates a new primary contact.

### Scenario 2: Linking Contacts

**Request:**

```json
{
  "email": "mcfly@hillvalley.edu",
  "phoneNumber": "123456"
}
```

Creates a secondary contact linked to the existing primary contact due to matching phone number.

## Technical Stack

- Backend Framework: Next.js with TypeScript
- Database: In-memory storage (Note: Should be migrated to a SQL database for production)

## Local Development

1. Clone the repository:

```bash
git clone [repository-url]
cd bitespeed
```

2. Install dependencies:

```bash
npm install
```

3. Run the development server:

```bash
npm run dev
```

4. The API will be available at `http://localhost:3000/api/identify`
