# Database Configuration Guide

## AWS RDS PostgreSQL Configuration

This project uses an AWS RDS PostgreSQL database which requires SSL connections. The connection settings are managed through environment variables:

### Required Environment Variables

- `DATABASE_USERNAME`: PostgreSQL username
- `DATABASE_HOST`: AWS RDS host address
- `DATABASE_NAME`: Database name
- `DATABASE_PASSWORD`: Database user password
- `DATABASE_PORT`: PostgreSQL port (typically 5432)
- `DATABASE_SSL`: Defaults to "true" for AWS RDS connections (only set to "false" for local non-SSL databases)

### GitHub Actions Secrets

For CI/CD, these variables are stored as GitHub repository secrets and automatically injected into workflows. Make sure all required secrets are set in your repository's Settings > Secrets and variables > Actions section.

### Local Development

For local development, copy `.env.example` to `.env` in the API directory and fill in your values:

```bash
cp .env.example .env
# Edit .env with your actual database credentials
```

### PostgreSQL SSL Configuration

AWS RDS requires SSL connections. The application is configured to use SSL by default with `rejectUnauthorized: false` which allows connections to self-signed certificates commonly used with AWS RDS.

For enhanced security in production, consider configuring a proper certificate verification process.

If you need to disable SSL (for local development with a non-SSL PostgreSQL instance), explicitly set `DATABASE_SSL=false` in your `.env` file.
