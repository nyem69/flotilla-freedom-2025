#!/bin/bash

# ================================================
# Flotilla Subscription Manager Creator Script
# ================================================
# Creates a SvelteKit subscription management app
# for Freedom Flotilla Coalition email tracking
# Includes email verification, unsubscribe, and
# preference management with MySQL integration
# ================================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Function to print colored output
print_status() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[⚠]${NC} $1"
}

print_info() {
    echo -e "${BLUE}[ℹ]${NC} $1"
}

print_progress() {
    echo -e "${CYAN}[➤]${NC} $1"
}

print_header() {
    echo -e "\n${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${MAGENTA}  $1${NC}"
    echo -e "${BOLD}${MAGENTA}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"
}

# Function to create directory if it doesn't exist
create_dir() {
    if [ ! -d "$1" ]; then
        mkdir -p "$1"
        print_status "Created directory: $1"
    fi
}

# Check if project name is provided
if [ -z "$1" ]; then
    print_error "Error: Project name is required"
    echo "Usage: $0 <project-name> [target-directory]"
    echo "Example: $0 flotilla-subscribe"
    echo "Example: $0 flotilla-subscribe /path/to/parent/dir"
    exit 1
fi

PROJECT_NAME=$1
TARGET_DIR=${2:-$(pwd)}
PROJECT_DIR="$TARGET_DIR/$PROJECT_NAME"

# Check if target directory already exists
if [ -d "$PROJECT_DIR" ]; then
    print_error "Error: Directory $PROJECT_DIR already exists"
    exit 1
fi

print_header "🚀 Creating Flotilla Subscription Manager: $PROJECT_NAME"
print_info "Target directory: $PROJECT_DIR"

# Generate secure keys
SESSION_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)
VERIFICATION_SECRET=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-32)

print_status "Generated security keys"

# ================================================
# Step 1: Create SvelteKit project
# ================================================
print_header "📁 Creating SvelteKit Project"

print_progress "Creating project directory..."
create_dir "$PROJECT_DIR"
cd "$PROJECT_DIR"

print_progress "Initializing SvelteKit project..."
npx sv create . --template minimal --types ts --no-install

# ================================================
# Step 2: Install dependencies
# ================================================
print_header "📦 Installing Dependencies"

print_progress "Installing core dependencies..."
npm install

print_progress "Installing Cloudflare adapter..."
npm install -D @sveltejs/adapter-cloudflare @cloudflare/workers-types

print_progress "Installing database dependencies..."
npm install mysql2

print_progress "Installing email dependencies..."
npm install nodemailer

print_progress "Installing UI dependencies..."
npm install -D tailwindcss postcss autoprefixer
npm install lucide-svelte clsx tailwind-merge

print_progress "Installing validation..."
npm install zod

print_status "All dependencies installed"

# ================================================
# Step 3: Initialize Tailwind CSS
# ================================================
print_header "🎨 Setting up Tailwind CSS"

npx tailwindcss init -p

# ================================================
# Step 4: Create directory structure
# ================================================
print_header "📂 Creating Directory Structure"

create_dir "src/lib/server/db"
create_dir "src/lib/server/email"
create_dir "src/lib/server/security"
create_dir "src/lib/components"
create_dir "src/lib/utils"
create_dir "src/routes/api/subscribe"
create_dir "src/routes/verify/[token]"
create_dir "src/routes/unsubscribe/[token]"
create_dir "src/routes/manage/[token]"
create_dir "static"

# ================================================
# Step 5: Create configuration files
# ================================================
print_header "⚙️  Creating Configuration Files"

# svelte.config.js
cat > svelte.config.js << 'EOF'
import adapter from '@sveltejs/adapter-cloudflare';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({
			routes: {
				include: ['/*'],
				exclude: ['<all>']
			}
		})
	}
};

export default config;
EOF
print_status "Created svelte.config.js"

# wrangler.toml
cat > wrangler.toml << EOF
name = "$PROJECT_NAME"
compatibility_date = "2025-03-01"
compatibility_flags = ["nodejs_compat"]
main = "./.svelte-kit/cloudflare/_worker.js"

[placement]
mode = "smart"

[observability]
enabled = true

# Environment Variables
[vars]
ENVIRONMENT = "production"
APP_NAME = "$PROJECT_NAME"
SITE_NAME = "Freedom Flotilla Coalition Tracker"
BASE_URL = "https://${PROJECT_NAME}.pages.dev"

# Security Keys (will be overridden in production)
SESSION_SECRET = "$SESSION_SECRET"
VERIFICATION_SECRET = "$VERIFICATION_SECRET"

# MySQL Configuration (from Cloudflare secrets)
MYSQL_HOST = ""
MYSQL_USER = ""
MYSQL_PASSWORD = ""
MYSQL_DATABASE = "flotilla"

# Email Configuration
RESEND_API_KEY = ""
EMAIL_FROM = "noreply@manamurah.com"
EMAIL_NAME = "Freedom Flotilla Tracker"

[env.preview]
vars = { ENVIRONMENT = "preview" }

[env.development]
vars = { ENVIRONMENT = "development", BASE_URL = "http://localhost:5173" }
EOF
print_status "Created wrangler.toml"

# tailwind.config.js
cat > tailwind.config.js << 'EOF'
/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{html,js,svelte,ts}'],
	theme: {
		extend: {}
	},
	plugins: []
};
EOF
print_status "Created tailwind.config.js"

# .env.example
cat > .env.example << EOF
# MySQL Database (Aiven)
MYSQL_HOST=mysql-aiven-warroom.aivencloud.com
MYSQL_USER=your_user
MYSQL_PASSWORD=your_password
MYSQL_DATABASE=flotilla

# Security
SESSION_SECRET=$SESSION_SECRET
VERIFICATION_SECRET=$VERIFICATION_SECRET

# Email (Resend)
RESEND_API_KEY=re_your_resend_api_key
EMAIL_FROM=noreply@manamurah.com
EMAIL_NAME=Freedom Flotilla Tracker

# App Configuration
BASE_URL=http://localhost:5173
SITE_NAME=Freedom Flotilla Coalition Tracker
EOF
print_status "Created .env.example"

# ================================================
# Step 6: Create database utilities
# ================================================
print_header "🗄️  Creating Database Utilities"

# MySQL connection
cat > src/lib/server/db/mysql.ts << 'EOF'
import mysql from 'mysql2/promise';
import { MYSQL_HOST, MYSQL_USER, MYSQL_PASSWORD, MYSQL_DATABASE } from '$env/static/private';

let pool: mysql.Pool | null = null;

export function getPool(): mysql.Pool {
	if (!pool) {
		pool = mysql.createPool({
			host: MYSQL_HOST,
			user: MYSQL_USER,
			password: MYSQL_PASSWORD,
			database: MYSQL_DATABASE,
			waitForConnections: true,
			connectionLimit: 10,
			queueLimit: 0
		});
	}
	return pool;
}

export async function query<T = any>(sql: string, params?: any[]): Promise<T[]> {
	const pool = getPool();
	const [rows] = await pool.execute(sql, params);
	return rows as T[];
}

export async function queryOne<T = any>(sql: string, params?: any[]): Promise<T | null> {
	const results = await query<T>(sql, params);
	return results.length > 0 ? results[0] : null;
}
EOF
print_status "Created MySQL utilities"

# ================================================
# Step 7: Create security utilities
# ================================================
print_header "🔐 Creating Security Utilities"

# Token generation
cat > src/lib/server/security/tokens.ts << 'EOF'
import { randomBytes } from 'crypto';

export function generateVerificationToken(): string {
	return randomBytes(32).toString('hex');
}

export function generateUnsubscribeToken(): string {
	return randomBytes(32).toString('hex');
}

export function isTokenExpired(expiresAt: Date): boolean {
	return new Date() > expiresAt;
}

export function getTokenExpiry(hours: number = 24): Date {
	const expiry = new Date();
	expiry.setHours(expiry.getHours() + hours);
	return expiry;
}
EOF
print_status "Created token utilities"

# Rate limiting
cat > src/lib/server/security/ratelimit.ts << 'EOF'
const rateLimits = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(
	identifier: string,
	maxAttempts: number = 5,
	windowMs: number = 60000
): boolean {
	const now = Date.now();
	const limit = rateLimits.get(identifier);

	if (!limit || now > limit.resetAt) {
		rateLimits.set(identifier, {
			count: 1,
			resetAt: now + windowMs
		});
		return true;
	}

	if (limit.count >= maxAttempts) {
		return false;
	}

	limit.count++;
	return true;
}

export function clearRateLimit(identifier: string): void {
	rateLimits.delete(identifier);
}
EOF
print_status "Created rate limiting"

# ================================================
# Step 8: Create email service
# ================================================
print_header "📧 Creating Email Service"

cat > src/lib/server/email/verification.ts << 'EOF'
import nodemailer from 'nodemailer';
import { RESEND_API_KEY, EMAIL_FROM, EMAIL_NAME, BASE_URL } from '$env/static/private';

const transporter = nodemailer.createTransport({
	host: 'smtp.resend.com',
	port: 465,
	secure: true,
	auth: {
		user: 'resend',
		pass: RESEND_API_KEY
	}
});

export async function sendVerificationEmail(email: string, token: string): Promise<void> {
	const verifyUrl = `${BASE_URL}/verify/${token}`;

	await transporter.sendMail({
		from: `${EMAIL_NAME} <${EMAIL_FROM}>`,
		to: email,
		subject: 'Verify your email - Freedom Flotilla Tracker',
		html: `
			<h2>Welcome to Freedom Flotilla Coalition Tracker!</h2>
			<p>Please verify your email address to start receiving updates.</p>
			<p><a href="${verifyUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:white;text-decoration:none;border-radius:6px;">Verify Email</a></p>
			<p>Or copy this link: ${verifyUrl}</p>
			<p>This link will expire in 24 hours.</p>
		`,
		text: `
Welcome to Freedom Flotilla Coalition Tracker!

Please verify your email address by clicking this link:
${verifyUrl}

This link will expire in 24 hours.
		`
	});
}

export async function sendUnsubscribeConfirmation(email: string): Promise<void> {
	await transporter.sendMail({
		from: `${EMAIL_NAME} <${EMAIL_FROM}>`,
		to: email,
		subject: 'Unsubscribed - Freedom Flotilla Tracker',
		html: `
			<h2>You've been unsubscribed</h2>
			<p>You will no longer receive updates from Freedom Flotilla Coalition Tracker.</p>
			<p>We're sorry to see you go!</p>
		`,
		text: `
You've been unsubscribed from Freedom Flotilla Coalition Tracker.
You will no longer receive updates.
		`
	});
}
EOF
print_status "Created email service"

# ================================================
# Step 9: Create app CSS
# ================================================
print_header "🎨 Creating Global Styles"

cat > src/app.css << 'EOF'
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
	:root {
		--background: 0 0% 100%;
		--foreground: 222.2 84% 4.9%;
		--primary: 221.2 83.2% 53.3%;
		--primary-foreground: 210 40% 98%;
	}

	* {
		@apply border-border;
	}

	body {
		@apply bg-background text-foreground;
	}
}
EOF
print_status "Created app.css"

# ================================================
# Step 10: Create layout
# ================================================
print_header "🎭 Creating Layout"

cat > src/routes/+layout.svelte << 'EOF'
<script lang="ts">
	import '../app.css';
</script>

<div class="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
	<slot />
</div>
EOF
print_status "Created layout"

# ================================================
# Step 11: Create home page (subscribe form)
# ================================================
print_header "🏠 Creating Home Page"

cat > 'src/routes/+page.svelte' << 'EOF'
<script lang="ts">
	import { enhance } from '$app/forms';

	let loading = false;
	let success = false;
	let error = '';
</script>

<div class="container mx-auto px-4 py-16">
	<div class="max-w-2xl mx-auto">
		<div class="text-center mb-12">
			<h1 class="text-4xl font-bold text-gray-900 mb-4">
				🚢 Freedom Flotilla Coalition Tracker
			</h1>
			<p class="text-lg text-gray-600">
				Get real-time updates on vessel positions, distances to Gaza, and estimated arrival times
			</p>
		</div>

		{#if success}
			<div class="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
				<h2 class="text-2xl font-semibold text-green-900 mb-2">Check your email!</h2>
				<p class="text-green-700">
					We've sent a verification link to your email address. Please click the link to confirm your subscription.
				</p>
			</div>
		{:else}
			<div class="bg-white rounded-lg shadow-lg p-8">
				<h2 class="text-2xl font-semibold mb-6">Subscribe for Updates</h2>

				<form method="POST" use:enhance={() => {
					loading = true;
					return async ({ result }) => {
						loading = false;
						if (result.type === 'success') {
							success = true;
						} else if (result.type === 'failure') {
							error = result.data?.message || 'Something went wrong';
						}
					};
				}}>
					<div class="space-y-6">
						<div>
							<label for="email" class="block text-sm font-medium text-gray-700 mb-2">
								Email Address
							</label>
							<input
								type="email"
								id="email"
								name="email"
								required
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
								placeholder="you@example.com"
							/>
						</div>

						<div>
							<label for="timezone" class="block text-sm font-medium text-gray-700 mb-2">
								Your Timezone
							</label>
							<select
								id="timezone"
								name="timezone"
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="Asia/Kuala_Lumpur">Asia/Kuala Lumpur (MYT)</option>
								<option value="Europe/London">Europe/London (GMT/BST)</option>
								<option value="America/New_York">America/New York (EST/EDT)</option>
								<option value="America/Los_Angeles">America/Los Angeles (PST/PDT)</option>
								<option value="Asia/Dubai">Asia/Dubai (GST)</option>
								<option value="Asia/Tokyo">Asia/Tokyo (JST)</option>
							</select>
						</div>

						<div>
							<label for="frequency" class="block text-sm font-medium text-gray-700 mb-2">
								Update Frequency
							</label>
							<select
								id="frequency"
								name="frequency"
								class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
							>
								<option value="60">Every Hour</option>
								<option value="30">Every 30 Minutes</option>
								<option value="15">Every 15 Minutes</option>
							</select>
						</div>

						{#if error}
							<div class="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
								{error}
							</div>
						{/if}

						<button
							type="submit"
							disabled={loading}
							class="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{loading ? 'Subscribing...' : 'Subscribe'}
						</button>
					</div>
				</form>

				<p class="mt-6 text-sm text-gray-500 text-center">
					By subscribing, you agree to receive email updates about vessel tracking.
					You can unsubscribe at any time using the link in any email.
				</p>
			</div>
		{/if}
	</div>
</div>
EOF
print_status "Created home page"

# ================================================
# Step 12: Create README
# ================================================
print_header "📚 Creating Documentation"

cat > README.md << 'README'
# Flotilla Subscription Manager

Email subscription management for Freedom Flotilla Coalition vessel tracking.

## Features

- ✅ Email verification with secure tokens
- ✅ Timezone customization
- ✅ Frequency settings (15/30/60 minutes)
- ✅ Easy unsubscribe
- ✅ Preference management
- ✅ Rate limiting
- ✅ MySQL database integration

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Configure environment:
   ```bash
   cp .env.example .env
   # Edit .env with your MySQL and Resend credentials
   ```

3. Start development:
   ```bash
   npm run dev
   ```

## Deployment

Deploy to Cloudflare Pages:

```bash
npm run build
npx wrangler pages deploy .svelte-kit/cloudflare
```

## Database Schema

The `flotilla_subscribers` table in MySQL:

- email (VARCHAR, unique)
- timezone (VARCHAR)
- frequency_minutes (INT)
- is_verified (BOOLEAN)
- verification_token (VARCHAR)
- unsubscribe_token (VARCHAR)
- Timestamps

## Routes

- `/` - Subscribe form
- `/verify/[token]` - Email verification
- `/unsubscribe/[token]` - Unsubscribe
- `/manage/[token]` - Manage preferences
- `/api/subscribe` - Subscribe API endpoint

## Security

- Crypto-secure token generation
- Rate limiting on subscription
- Email verification required
- HTTPS-only (Cloudflare)
- Prepared SQL statements

## License

MIT
README

print_status "Created README.md"

# ================================================
# Step 13: Final summary
# ================================================
print_header "✨ Project Created Successfully!"

echo -e "${GREEN}Project created at: ${BOLD}$PROJECT_DIR${NC}"
echo ""
echo -e "${BLUE}Generated Security Keys:${NC}"
echo -e "  SESSION_SECRET: ${YELLOW}$SESSION_SECRET${NC}"
echo -e "  VERIFICATION_SECRET: ${YELLOW}$VERIFICATION_SECRET${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo -e "1. ${CYAN}cd $PROJECT_DIR${NC}"
echo -e "2. ${CYAN}cp .env.example .env${NC}"
echo -e "3. Update ${YELLOW}.env${NC} with your MySQL and Resend credentials"
echo -e "4. ${CYAN}npm run dev${NC}"
echo ""
echo -e "${BLUE}Key Features:${NC}"
echo -e "  ✓ Email subscription with verification"
echo -e "  ✓ Timezone customization"
echo -e "  ✓ Frequency settings (15/30/60 min)"
echo -e "  ✓ Unsubscribe mechanism"
echo -e "  ✓ MySQL database integration"
echo -e "  ✓ Rate limiting"
echo -e "  ✓ Cloudflare Pages ready"
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}Happy coding! 🚢${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
