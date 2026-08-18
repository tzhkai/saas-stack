# API Reference

> Use this template to document one API endpoint clearly before adding additional endpoints.

## Create a project

Create a new project in the current workspace.

```http
POST /v1/projects
```

### Authentication

Send a bearer token with every request.

```http
Authorization: Bearer YOUR_API_TOKEN
```

### Request body

| Parameter | Type | Required | Description |
| :--- | :--- | :---: | :--- |
| `name` | `string` | Yes | A human-readable project name. |
| `description` | `string` | No | A short explanation of the project purpose. |
| `visibility` | `string` | No | Access level: `private` or `public`. Defaults to `private`. |
| `template_id` | `string` | No | Optional starter template to apply when creating the project. |

```json
{
  "name": "Documentation site",
  "description": "Markdown docs for the public API",
  "visibility": "private"
}
```

### Response

Returns the new project and its identifier.

```json
{
  "id": "proj_123abc",
  "name": "Documentation site",
  "description": "Markdown docs for the public API",
  "visibility": "private",
  "created_at": "2026-08-15T00:00:00Z"
}
```

### Response fields

| Field | Type | Description |
| :--- | :--- | :--- |
| `id` | `string` | Unique identifier for the project. |
| `name` | `string` | The supplied project name. |
| `description` | `string` | The supplied project description, when present. |
| `visibility` | `string` | The project's access level. |
| `created_at` | `string` | ISO 8601 timestamp for project creation. |

### Errors

| Status | Meaning | What to do |
| :---: | :--- | :--- |
| `400` | The request body is invalid. | Check required fields and data types. |
| `401` | The access token is missing or invalid. | Send a valid bearer token. |
| `409` | A project with the same name already exists. | Choose a different name or update the existing project. |
| `429` | Too many requests. | Retry after the response's retry interval. |
