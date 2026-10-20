# ACC Marketplace

A student marketplace for the ACC community.

ACC Marketplace is a web application where students can buy and sell items, offer services, discover listings, and connect with other members of their community.

## Features

- **User Accounts** — Register, manage profiles, and update account settings.
- **Marketplace Listings** — Browse, search, filter, and sort available listings.
- **Categories** — Find items and services by category.
- **Listing Management** — Create and manage marketplace listings.
- **Favorites** — Save listings for quick access.
- **Orders** — Manage transactions and order statuses.
- **Reviews and Ratings** — Allow buyers to review sellers after completed orders.
- **Messaging and Attachments** — Support communication and file attachments.
- **Reports and Moderation** — Report listings or users for administrative review.
- **Admin Dashboard** — Manage users, listings, reports, and marketplace statistics.
- **Transaction Reports** — Review marketplace transaction information.

## Technology Stack

**Backend**
- PHP 8.3 or newer
- Laravel 13

**Frontend**
- React 19
- TypeScript
- Inertia.js
- Tailwind CSS 4
- Vite
- Lucide React icons

**Database**
- SQLite by default in the example environment configuration
- Other database connections may be configured through Laravel's environment settings

## Requirements

Install the following before setting up the project:

- PHP 8.3 or newer
- Composer
- Node.js and npm
- Git

Ensure your PHP installation has the extensions required by Laravel and your installed dependencies.

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/Signaless1/ACC-Marketplace.git
cd ACC-Marketplace
```

### 2. Install PHP dependencies

```bash
composer install
```

### 3. Configure the environment

Create your local environment file.

**Windows Command Prompt:**

```cmd
copy .env.example .env
```

**macOS or Linux:**

```bash
cp .env.example .env
```

Generate the application key:

```bash
php artisan key:generate
```

### 4. Configure the database

The example environment uses SQLite.

Ensure the SQLite database file exists at `database/database.sqlite`. If it does not exist, create an empty file at that location.

Then run the migrations:

```bash
php artisan migrate
```

If you choose another supported database, update the `DB_*` settings in your `.env` file and create the database before running migrations.

### 5. Install frontend dependencies

```bash
npm install
```

### 6. Prepare uploaded files

```bash
php artisan storage:link
```

### 7. Start the application

Run the development command:

```bash
composer run dev
```

Use the local URL displayed in the terminal to open the application.

To create a production frontend build instead, run:

```bash
npm run build
```

## Testing

Run the automated test suite with:

```bash
php artisan test
```

## Project Structure

| Directory or file | Purpose |
|---|---|
| `app/` | Application logic, models, policies, and other backend classes |
| `bootstrap/` | Laravel application bootstrapping |
| `config/` | Application configuration |
| `database/` | Migrations, seeders, factories, and database files |
| `public/` | Public entry point and static assets |
| `resources/` | Frontend components, pages, styles, and other resources |
| `routes/` | Application route definitions |
| `storage/` | Logs, generated files, and application storage |
| `tests/` | Automated tests |
| `composer.json` | PHP dependencies and Composer scripts |
| `package.json` | Frontend dependencies and npm scripts |
| `vite.config.js` | Vite build configuration |

## Security

- Keep your `.env` file and application secrets private.
- Never commit passwords, API keys, or production credentials.
- Change any default development credentials before using the application.
- Use `APP_DEBUG=false` in production.
- Review and test database migrations before applying them to production data.

## Repository

GitHub: https://github.com/Signaless1/ACC-Marketplace

---

Developed for the ACC student community.
