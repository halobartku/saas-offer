# API Documentation

## Authentication

### POST /api/auth/register
Register a new user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe"
}
```

### POST /api/auth/login
Authenticate a user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

## Organizations

### POST /api/organizations
Create a new organization.

**Request Body:**
```json
{
  "name": "My Organization"
}
```

### PUT /api/organizations/:id
Update an organization.

**Request Body:**
```json
{
  "name": "Updated Name",
  "plan": "pro"
}
```

## Products

### POST /api/products
Create a new product.

**Request Body:**
```json
{
  "name": "Premium Plan",
  "description": "Our premium offering",
  "price": 9900,
  "features": [
    {
      "name": "Feature 1",
      "description": "Description 1",
      "included": true
    }
  ]
}
```

### PUT /api/products/:id
Update a product.

**Request Body:**
```json
{
  "name": "Updated Premium Plan",
  "price": 19900,
  "active": true
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request
```json
{
  "error": {
    "message": "Validation Error",
    "details": [...]
  }
}
```

### 401 Unauthorized
```json
{
  "error": {
    "message": "Unauthorized"
  }
}
```

### 403 Forbidden
```json
{
  "error": {
    "message": "Forbidden - Insufficient permissions"
  }
}
```

### 500 Internal Server Error
```json
{
  "error": {
    "message": "Internal Server Error"
  }
}
```
