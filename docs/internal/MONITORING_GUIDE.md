# Monitoring Guide - Progressive Disclosure System

## Real-Time Monitoring Dashboard

**Purpose**: Track key metrics after deployment  
**Update Frequency**: Real-time  
**Review Schedule**: Daily (Week 1), Weekly (Week 2+)

---

## 1. User Engagement Metrics

### Daily Active Users (DAU)
**What to track**:
- Total DAU
- DAU by tier (NEW/ENGAGED/POWER)
- DAU growth rate

**Targets**:
- Week 1: Baseline
- Week 2: +10% from baseline
- Month 1: +30% from baseline

**Query** (Firebase Analytics):
```javascript
// Get DAU
SELECT COUNT(DISTINCT user_id) as dau
FROM events
WHERE event_name = 'session_start'
AND event_date = CURRENT_DATE()
```

**Alert if**: DAU drops > 20% day-over-day

---

### Session Metrics
**What to track**:
- Average sessions per user
- Average session duration
- Sessions by tier

**Targets**:
- Avg sessions/user: 3-5 per week
- Avg duration: 5-10 minutes
- NEW tier: 1-2 sessions
- ENGAGED tier: 3-5 sessions
- POWER tier: 5+ sessions

**Query**:
```javascript
// Average session duration
SELECT 
  AVG(session_duration_ms) / 60000 as avg_duration_minutes,
  user_tier
FROM events
WHERE event_name = 'session_end'
GROUP BY user_tier
```

**Alert if**: Avg duration < 3 minutes

---

### Tier Distribution
**What to track**:
- % of users in each tier
- Tier progression rate
- Time to tier progression

**Targets**:
- NEW: 40-50%
- ENGAGED: 30-40%
- POWER: 20-30%

**Query**:
```javascript
// Tier distribution
SELECT 
  user_tier,
  COUNT(*) as user_count,
  COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
FROM user_properties
GROUP BY user_tier
```

**Alert if**: POWER tier < 15%

---

## 2. Onboarding Metrics

### Completion Rate
**What to track**:
- Overall completion rate
- Completion by step
- Drop-off points

**Targets**:
- Overall: 80%+
- Step 1: 95%+
- Step 2: 90%+
- Step 3: 85%+

**Query**:
```javascript
// Onboarding funnel
SELECT 
  step,
  COUNT(DISTINCT user_id) as users,
  COUNT(DISTINCT CASE WHEN completed = true THEN user_id END) as completed
FROM onboarding_events
GROUP BY step
ORDER BY step
```

**Alert if**: Completion rate < 70%

---

### Time to Complete
**What to track**:
- Average time to complete onboarding
- Time by step

**Targets**:
- Total: 2-5 minutes
- Step 1: 30-60 seconds
- Step 2: 30-60 seconds
- Step 3: 60-120 seconds

**Query**:
```javascript
// Time to complete
SELECT 
  AVG(TIMESTAMP_DIFF(completed_at, started_at, SECOND)) as avg_seconds
FROM onboarding_sessions
WHERE completed = true
```

**Alert if**: Avg time > 10 minutes (users struggling)

---

## 3. Feature Usage Metrics

### Feature Access by Tier
**What to track**:
- Most accessed features by tier
- Feature discovery rate
- Feature engagement

**Query**:
```javascript
// Top features by tier
SELECT 
  feature_id,
  user_tier,
  COUNT(*) as access_count
FROM feature_usage_events
GROUP BY feature_id, user_tier
ORDER BY access_count DESC
LIMIT 20
```

**Insights**:
- Which features drive engagement?
- Are users discovering features?
- Which features need promotion?

---

### Feature Lock Events
**What to track**:
- Most locked features
- Lock → Subscribe conversion
- Lock → Engage more rate

**Targets**:
- Lock → Subscribe: 5-10%
- Lock → Engage more: 30-40%

**Query**:
```javascript
// Most locked features
SELECT 
  feature_id,
  feature_name,
  COUNT(*) as lock_count,
  COUNT(DISTINCT user_id) as unique_users
FROM feature_locked_events
GROUP BY feature_id, feature_name
ORDER BY lock_count DESC
LIMIT 10
```

**Action**: Protect top 3 most locked features next

---

## 4. Conversion Metrics

### Subscription Conversion
**What to track**:
- Overall conversion rate
- Conversion by source (lock modal, tier card, etc.)
- Time to conversion

**Targets**:
- Overall: 3-5%
- From lock modal: 5-10%
- From tier card: 3-5%

**Query**:
```javascript
// Conversion funnel
SELECT 
  source,
  COUNT(DISTINCT user_id) as viewed,
  COUNT(DISTINCT CASE WHEN subscribed = true THEN user_id END) as converted,
  COUNT(DISTINCT CASE WHEN subscribed = true THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as conversion_rate
FROM subscription_events
GROUP BY source
```

**Alert if**: Conversion rate < 2%

---

### Revenue Metrics
**What to track**:
- Daily revenue
- Revenue by tier
- Average revenue per user (ARPU)
- Lifetime value (LTV)

**Targets**:
- ARPU: $5-10/month
- LTV: $50-100
- Revenue growth: +20% month-over-month

**Query**:
```javascript
// Revenue by tier
SELECT 
  user_tier,
  SUM(amount) as total_revenue,
  COUNT(DISTINCT user_id) as paying_users,
  SUM(amount) / COUNT(DISTINCT user_id) as arpu
FROM subscription_payments
GROUP BY user_tier
```

**Alert if**: Revenue drops > 15% week-over-week

---

## 5. Retention Metrics

### Cohort Retention
**What to track**:
- Day 1, 7, 30 retention
- Retention by tier
- Retention by cohort

**Targets**:
- Day 1: 40%+
- Day 7: 25%+
- Day 30: 15%+

**Query**:
```javascript
// Retention by cohort
SELECT 
  signup_date,
  COUNT(DISTINCT user_id) as cohort_size,
  COUNT(DISTINCT CASE WHEN days_since_signup >= 1 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as day_1_retention,
  COUNT(DISTINCT CASE WHEN days_since_signup >= 7 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as day_7_retention,
  COUNT(DISTINCT CASE WHEN days_since_signup >= 30 THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as day_30_retention
FROM user_cohorts
GROUP BY signup_date
ORDER BY signup_date DESC
```

**Alert if**: Day 1 retention < 30%

---

## 6. Technical Metrics

### Error Rate
**What to track**:
- JavaScript errors
- Native crashes
- API errors
- Analytics errors

**Targets**:
- Error rate: < 2%
- Crash rate: < 0.5%
- API errors: < 1%

**Query**:
```javascript
// Error rate
SELECT 
  error_type,
  COUNT(*) as error_count,
  COUNT(DISTINCT user_id) as affected_users
FROM error_events
WHERE event_date >= CURRENT_DATE() - 7
GROUP BY error_type
ORDER BY error_count DESC
```

**Alert if**: Error rate > 5%

---

### Performance Metrics
**What to track**:
- App launch time
- Screen load time
- API response time
- Memory usage

**Targets**:
- Launch time: < 3 seconds
- Screen load: < 1 second
- API response: < 500ms
- Memory: < 200MB

**Query**:
```javascript
// Performance metrics
SELECT 
  metric_name,
  AVG(value) as avg_value,
  PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY value) as p95_value
FROM performance_events
WHERE event_date >= CURRENT_DATE() - 7
GROUP BY metric_name
```

**Alert if**: P95 launch time > 5 seconds

---

## 7. A/B Testing Metrics

### Experiment Results
**What to track**:
- Variant distribution
- Conversion by variant
- Statistical significance

**For each experiment**:

**Onboarding Flow**:
```javascript
// Experiment results
SELECT 
  variant_id,
  COUNT(DISTINCT user_id) as users,
  COUNT(DISTINCT CASE WHEN completed = true THEN user_id END) as completed,
  COUNT(DISTINCT CASE WHEN completed = true THEN user_id END) * 100.0 / COUNT(DISTINCT user_id) as completion_rate
FROM experiment_assignments
WHERE experiment_id = 'onboarding_flow'
GROUP BY variant_id
```

**Decision criteria**:
- Minimum 1000 users per variant
- Statistical significance > 95%
- Improvement > 5%

---

## 8. Custom Dashboards

### Executive Dashboard (Daily)
**Metrics**:
- DAU / MAU
- Revenue (daily, weekly, monthly)
- Conversion rate
- Retention rate
- Top issues

**Format**: Single-page summary with charts

---

### Product Dashboard (Daily)
**Metrics**:
- Onboarding completion
- Feature usage
- Tier distribution
- Lock events
- User feedback

**Format**: Interactive dashboard with drill-downs

---

### Engineering Dashboard (Real-time)
**Metrics**:
- Error rate
- Crash rate
- API performance
- App performance
- System health

**Format**: Real-time monitoring with alerts

---

## 9. Alert Configuration

### Critical Alerts (Immediate)
- Crash rate > 1%
- Error rate > 5%
- API downtime
- Revenue drop > 30%

**Action**: Page on-call engineer

---

### Warning Alerts (1 hour)
- Onboarding completion < 70%
- Day 1 retention < 30%
- Conversion rate < 2%
- Error rate > 2%

**Action**: Notify team lead

---

### Info Alerts (Daily digest)
- New tier progressions
- Feature unlock events
- A/B test milestones
- User feedback

**Action**: Daily email summary

---

## 10. Weekly Review Template

### Week of: [Date]

#### Key Metrics
- DAU: _____ (±___% vs last week)
- MAU: _____ (±___% vs last week)
- Revenue: $_____ (±___% vs last week)
- Conversion: ___% (±___% vs last week)

#### Onboarding
- Completion rate: ___% (target: 80%)
- Drop-off point: Step ___
- Action items: _____

#### Feature Usage
- Top 5 features: _____
- Most locked features: _____
- Action items: _____

#### Retention
- Day 1: ___% (target: 40%)
- Day 7: ___% (target: 25%)
- Day 30: ___% (target: 15%)
- Action items: _____

#### Technical Health
- Error rate: ___% (target: <2%)
- Crash rate: ___% (target: <0.5%)
- Performance: ___s (target: <3s)
- Action items: _____

#### A/B Tests
- Active experiments: _____
- Results: _____
- Decisions: _____

#### Action Items
1. _____
2. _____
3. _____

#### Next Week Focus
- _____
- _____
- _____

---

## 11. Tools & Integrations

### Analytics Platforms
- **Firebase Analytics**: User behavior, events
- **Mixpanel**: Funnels, cohorts, retention
- **Amplitude**: Product analytics, user journeys

### Error Monitoring
- **Sentry**: JavaScript errors, stack traces
- **Crashlytics**: Native crashes
- **LogRocket**: Session replay

### Performance Monitoring
- **Firebase Performance**: App performance
- **New Relic**: API performance
- **DataDog**: Infrastructure monitoring

### Business Intelligence
- **Looker**: Custom dashboards
- **Tableau**: Data visualization
- **Google Data Studio**: Free dashboards

---

## 12. Data Export & Backup

### Daily Exports
```bash
# Export analytics data
firebase analytics:export --date=YYYY-MM-DD

# Export user data
firebase firestore:export gs://backup-bucket/YYYY-MM-DD

# Export to BigQuery (automatic)
# Configure in Firebase Console
```

### Weekly Reports
- Generate PDF reports
- Email to stakeholders
- Archive in Google Drive

---

## 13. Privacy & Compliance

### Data Collection
- [ ] User consent obtained
- [ ] Privacy policy updated
- [ ] GDPR compliant
- [ ] CCPA compliant

### Data Retention
- Analytics: 14 months
- User data: Until account deletion
- Backups: 90 days

### Data Access
- Development team: Full access
- Product team: Aggregated data only
- External: No access

---

## Quick Start Monitoring

### Day 1: Setup
1. Configure analytics platform
2. Set up error monitoring
3. Create basic dashboards
4. Configure alerts

### Week 1: Baseline
1. Collect baseline metrics
2. Identify patterns
3. Set realistic targets
4. Adjust alerts

### Week 2+: Optimize
1. Review metrics daily
2. Identify issues
3. Make data-driven decisions
4. Iterate and improve

---

## Monitoring Checklist

### Daily (5 min)
- [ ] Check DAU
- [ ] Check error rate
- [ ] Check conversion rate
- [ ] Review critical alerts

### Weekly (30 min)
- [ ] Review all metrics
- [ ] Analyze trends
- [ ] Identify issues
- [ ] Plan actions

### Monthly (2 hours)
- [ ] Deep dive analysis
- [ ] Cohort analysis
- [ ] A/B test results
- [ ] Strategic planning

---

**Status**: Ready to Monitor 📊  
**Next**: Deploy to staging and start collecting data!

