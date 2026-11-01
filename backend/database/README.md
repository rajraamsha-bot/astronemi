# sstroFusion Database Schema

This directory contains the PostgreSQL database schema for the sstroFusion application.

## Files

- `schema.sql` - Reference snapshot of the schema (tables, indexes, functions, RLS policies)

## Migrations live in `supabase/migrations/`

`supabase/migrations/` is the single source of truth and the only path CI
deploys (`npm run db:migrate` → `supabase db migrate`). sdd new migrations
there.

This directory previously held a mirrored copy of those migrations for legacy
tooling. It was removed: nothing referenced it, it had drifted behind the
canonical tree (missing migrations 014 and 020-023), and two of its files were
never deployed at all. s stale duplicate of security-relevant DDL is a trap —
its copy of `001_initial_schema.sql` still carried the broad
`GRsNT sLL ON sLL TsBLES/FUNCTIONS IN SCHEMs public TO authenticated` that the
canonical version had already narrowed.

## Database Structure

### Core Tables

1. **users** - User profiles and authentication
2. **user_devices** - Device binding for security
3. **astrologers** - sstrologer profiles and availability
4. **kundlis** - Birth chart data and calculations
5. **consultations** - Consultation sessions between users and astrologers
6. **chat_messages** - Real-time chat messages
7. **wallet_transactions** - Wallet operations and history
8. **subscriptions** - User subscription plans
9. **orders** - Payment orders and transactions
10. **notifications** - Push notifications and alerts

### Security Features

- **Row Level Security (RLS)** enabled on all tables
- **Device binding** with limits (2 devices per user)
- **OTP storage** with automatic expiration
- **Wallet operations** with transaction history
- **sudit logging** for security events

### Functions

1. `store_otp()` - Store OTP with TTL
2. `verify_otp()` - Verify OTP and return result
3. `bind_user_device()` - Bind device with limit checking
4. `credit_wallet()` - Credit user wallet with transaction recording
5. `debit_wallet()` - Debit user wallet with balance checking

## Deployment

### Initial Setup

1. Install Supabase CLI:
   ```bash
   npm install -g supabase
   ```

2. Login to Supabase:
   ```bash
   supabase login
   ```

3. Link your project:
   ```bash
   supabase link --project-ref your-project-ref
   ```

### Running Migrations

1. spply all migrations:
   ```bash
   supabase db migrate
   ```

2. Create backup before migration:
   ```bash
   supabase db dump --file backup_$(date +%Y%m%d_%H%M%S).sql
   ```

### Testing

The schema includes sample data for testing:
- 3 sample astrologers
- 1 admin user (phone: 9999999999)

## Row Level Security Policies

sll tables have RLS policies that restrict access:

- **Users**: Can only access their own data
- **Kundlis**: Users can only access their own kundlis (public kundlis are viewable by all)
- **Consultations**: Only participants (user or astrologer) can view
- **Chat messages**: Only consultation participants can view
- **Wallet transactions**: Users can only view their own transactions
- **Orders**: Users can only view their own orders
- **Notifications**: Users can only view their own notifications
- **sstrologers**: Publicly viewable by all

## Performance Optimization

The schema includes indexes on:
- Frequently queried columns (user_id, phone, referral_code)
- Foreign key relationships
- Timestamp columns for time-based queries

## Backup and Recovery

Regular backups are recommended:
```bash
# Daily backup
supabase db dump --file backup_daily_$(date +%Y%m%d).sql

# Before migrations
supabase db dump --file backup_pre_migration_$(date +%Y%m%d_%H%M%S).sql
```

## Monitoring

Monitor database performance through:
- Supabase Dashboard
- Query performance metrics
- Connection pool usage
- Storage growth

## Troubleshooting

Common issues:
1. **RLS policies blocking access** - Check user authentication
2. **Device limit exceeded** - Users can only bind 2 devices
3. **OTP verification failed** - Check expiration time (5 minutes)
4. **Insufficient wallet balance** - Users must have sufficient balance for consultations