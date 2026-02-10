# 🔐 Demo Login Credentials

## Quick Access

The login page provides two demo accounts with different access levels:

### 👤 Sales Rep Account
- **Email:** `rep@example.com`
- **Password:** `demo123`
- **Access:** Rep Dashboard only (personal performance metrics)
- **User:** Sarah Johnson

### 👥 Manager Account
- **Email:** `manager@example.com`
- **Password:** `demo123`
- **Access:** Both Rep & Manager Dashboards (full team visibility)
- **User:** John Manager

## Features

### Sales Rep
✅ View personal call analytics
✅ Track individual performance metrics
✅ Access AI coaching insights
✅ Review call transcripts
❌ Cannot access manager dashboard

### Manager
✅ View team performance overview
✅ Access individual rep dashboards
✅ Switch between rep and manager views
✅ Monitor team-wide metrics
✅ Track all team calls and analytics

## Setup for Production

For production deployment with Supabase Auth:

1. Create users via Supabase Dashboard:
   - Go to **Authentication** > **Users** > **Add User**
   
2. Add user metadata:
   ```json
   {
     "name": "Sarah Johnson",
     "role": "rep"
   }
   ```

3. Or use Supabase Admin API to create users with proper metadata.

## Demo Mode

The current implementation uses localStorage for demo purposes. The credentials are validated in the frontend only. This is perfect for demos but should be replaced with proper Supabase Auth for production.

---

**Last Updated:** February 2026
