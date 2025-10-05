# Security Policy

## Environment Variables & Secrets

### ✅ Protected Secrets

All sensitive information is stored in environment variables and **NEVER** committed to the repository:

- `RESEND_API_KEY` - Email API key
- `SMTP_SENDER_EMAIL` - Sender email address
- `RECIPIENT_EMAIL` - Recipient email addresses
- `MYSQL_HOST` - Database host
- `MYSQL_USER` - Database username
- `MYSQL_PASSWORD` - Database password
- `SESSION_SECRET` - Session encryption key
- `VERIFICATION_SECRET` - Email verification key
- `JWT_SECRET` - JWT signing key

### 🔒 Security Measures

1. **`.env` is gitignored** - Never committed to repository
2. **`.env.example`** - Template without real values
3. **Dynamic key generation** - Scripts generate random keys at setup
4. **Cloudflare Secrets** - Production secrets stored in Cloudflare dashboard
5. **No hardcoded secrets** - All secrets loaded from environment

### 📝 Environment Setup

**Local Development:**
```bash
cp .env.example .env
# Edit .env with your actual credentials
```

**Production (Cloudflare Pages):**
1. Go to Cloudflare Pages Dashboard
2. Settings → Environment Variables
3. Add all required secrets as encrypted variables

### 🛡️ What's Safe in Git

✅ **Safe to commit:**
- `.env.example` (template with no real values)
- `wrangler.toml` (placeholders only)
- Scripts that generate random keys
- Configuration with `process.env` references

❌ **Never commit:**
- `.env` files
- Any file with actual API keys
- Database credentials
- Session secrets
- JWT secrets

### 🔐 Token Security

**Email Verification Tokens:**
- Generated using `crypto.randomBytes(32)`
- 64 characters hex string
- Expires after 24 hours
- One-time use only

**Unsubscribe Tokens:**
- Generated using `crypto.randomBytes(32)`
- 64 characters hex string
- Permanent until subscriber deleted
- Stored hashed in database

**Session Secrets:**
- Minimum 32 characters
- Generated with `openssl rand -base64 32`
- Unique per environment

### 🚨 Reporting Security Issues

If you discover a security vulnerability:

1. **Do NOT** create a public GitHub issue
2. Email: azmi@aga.my
3. Include detailed description
4. Allow 48 hours for response

### 📋 Security Checklist

Before deploying:

- [ ] All secrets in Cloudflare environment variables
- [ ] `.env` file never committed
- [ ] Production uses HTTPS only
- [ ] Database credentials rotated
- [ ] Session secrets are unique and random
- [ ] Email verification enabled
- [ ] Rate limiting configured
- [ ] CORS properly configured
- [ ] Input validation on all forms
- [ ] SQL injection prevention (prepared statements)

### 🔄 Secret Rotation

Rotate secrets every 90 days:

1. Generate new secret: `openssl rand -base64 32`
2. Update Cloudflare environment variable
3. Update local `.env` file
4. Restart application
5. Invalidate old sessions (if rotating SESSION_SECRET)

### 📚 Additional Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Cloudflare Security Best Practices](https://developers.cloudflare.com/pages/platform/security/)
- [Node.js Security Best Practices](https://nodejs.org/en/docs/guides/security/)

---

**Last Updated:** 2025-10-05
