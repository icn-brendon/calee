# Database Migration Guide

Calee stores data locally by default using Home Assistant's built-in `.storage` system.
You can optionally migrate to MariaDB or PostgreSQL for better performance with large datasets.

## Prerequisites

### MariaDB (Official Add-on)
1. Install the **MariaDB** add-on from the HA Add-on Store
2. Start the add-on and note the credentials
3. Create a database for Calee:
   - Open phpMyAdmin or use the MariaDB CLI
   - Run: `CREATE DATABASE calee;`

### PostgreSQL (External)
1. Have a PostgreSQL server accessible from your HA instance
2. Create a database: `CREATE DATABASE calee;`
3. Create a user with full access to that database

## Migration Steps

1. Go to **Settings** > **Devices & Services** > **Calee**
2. Click **Configure** (or the three-dot menu > **Configure**)
3. In the options, change **Storage backend** from "Local (default)" to "MariaDB" or "PostgreSQL"
4. Enter your database connection details:
   - **Host**: `core-mariadb` for the official add-on, or your PostgreSQL hostname
   - **Port**: 3306 (MariaDB) or 5432 (PostgreSQL)
   - **Database Name**: `calee`
   - **Username**: your database user
   - **Password**: your database password
5. Click **Submit** — Calee will test the connection
6. If successful, Calee will automatically:
   - Create the required tables
   - Copy all existing data (calendars, events, tasks, templates, etc.) from local storage to the database
   - Keep the local `.storage` file as a backup

## Migrating Back to Local

1. Go to **Settings** > **Devices & Services** > **Calee** > **Configure**
2. Change **Storage backend** back to "Local (default)"
3. Your local `.storage` file is preserved as a backup from the original migration

## Important Notes

- Migration is automatic — you don't need to manually export/import data
- The local `.storage` file is never deleted (kept as backup)
- After migration, all new data is stored in the database
- Calendar entities and to-do entities continue to work identically
- The database is only used for storage — all business logic stays in Home Assistant

## Troubleshooting

- **"Could not connect to the database"**: Check that the database exists, credentials are correct, and the host is reachable
- **MariaDB add-on**: The default host is `core-mariadb` (not `localhost`)
- **PostgreSQL**: Ensure the database user has CREATE TABLE permissions
