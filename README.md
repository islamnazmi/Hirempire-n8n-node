# n8n-nodes-hirempire

This is an [n8n](https://n8n.io) community node. It lets you use [Hirempire](https://www.hirempire.com) — an AI recruitment platform — in your n8n workflows.

You can trigger workflows from Hirempire webhook events and manage jobs, applicants (candidates) and companies through the Hirempire API.

[Installation](#installation) · [Credentials](#credentials) · [Operations](#operations) · [Trigger](#trigger) · [Resources](#resources)

## Installation

Follow the [community nodes installation guide](https://docs.n8n.io/integrations/community-nodes/installation/) in the n8n documentation.

In n8n, go to **Settings → Community Nodes**, select **Install**, and enter `n8n-nodes-hirempire`.

## Credentials

The node authenticates with a Hirempire **API token**.

1. In Hirempire, open **Settings → API Tokens**.
2. Create a token, selecting the scopes your workflow needs (Jobs, Applicants, Companies, Webhooks, …).
3. Copy the token (it usually starts with `sk`) into the **Hirempire API** credential in n8n.

The token is sent as `Authorization: Bearer <token>` against `https://api.hirempire.com/v1`.

## Operations

### Job
- **Create** – create a new job posting
- **Get** – retrieve a single job by ID
- **Get Many** – list all jobs
- **Update Status** – change a job's status (Active, Closed, Hired, Paused, Pending)
- **Delete** – delete a job

### Applicant
- **Get** – retrieve a single applicant by ID
- **Get Many** – list all applicants
- **Get Many by Job** – list applicants for a specific job
- **Update Status** – change an applicant's status (Applied, Reviewed, Accepted, Scheduled, Met, Hired, Rejected)

### Company
- **Create** – create a new company

## Trigger

The **Hirempire Trigger** node starts a workflow when a Hirempire event occurs. When you activate the workflow, the node registers a webhook with Hirempire (and answers Hirempire's verification challenge automatically).

Supported events:

| Event | Description |
| --- | --- |
| `job_added` | A new job was published |
| `job_activated` | A job was made active |
| `job_deactivated` | A job is no longer active |
| `job_deleted` | A job was permanently removed |
| `applicant_applied` | A candidate applied to one of your jobs |
| `cv_upload_completed` | CV processing and analysis finished |
| `meeting_booked` | A meeting was scheduled via Hirempire |

> **Note:** The Hirempire API does not expose a delete-webhook endpoint, so deactivating the workflow deactivates the registered webhook rather than removing it. Re-activating reuses the same webhook registration.

## Resources

- [Hirempire API docs](https://docs.hirempire.com/developers/get-started)
- [Webhook events](https://docs.hirempire.com/developers/webhooks/event-types)
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](https://opensource.org/licenses/MIT)
