# Ad Campaigns & Automated Nurturing Setup Guide

## Overview

The Group Info Panel now includes a comprehensive campaign integration system that automatically syncs leads from your ad campaigns (Meta, Google Ads, LinkedIn) into WhatsApp groups for automated nurturing.

## Features

### 1. **Multi-Platform Ad Integration**
- **Meta/Facebook Ads** - Connect to Meta Business Account webhooks
- **Google Ads** - Integrate Google Ads lead capture
- **LinkedIn Ads** - LinkedIn Sponsored Content lead generation

### 2. **Automatic Lead Syncing**
- Leads who click on ads are automatically added to the group
- No manual CSV imports or contacts copy-paste needed
- Real-time synchronization with lead capture

### 3. **Configurable Followup Frequency**
Choose how often Mr LAD nurtures leads:
- **Daily** - Send daily followup messages
- **Every 3 Days** - Spaced out touchpoints
- **Weekly** - Less frequent but consistent
- **Bi-weekly** - Light touch campaigns

### 4. **Campaign Management**
- Enable/disable campaigns without disconnecting
- Multiple campaigns per group (e.g., different products)
- Campaign status monitoring
- Edit campaigns anytime

## Setting Up a Campaign

### Step 1: Access Group Info Panel
1. Open a WhatsApp group in the chat interface
2. Click the **Group Info** panel (Users icon in header)
3. Scroll to **"Ad Campaigns & Nurture"** section
4. Click to expand the campaigns panel

### Step 2: Connect Your First Campaign
1. Click **"Connect Your First Ad Campaign"** button
2. Fill in the campaign details:
   - **Campaign Name** (e.g., "Winter Sale 2026", "Product Launch")
   - **Ad Platform** (select Meta, Google, or LinkedIn)
   - **Webhook URL** (provided by the ad platform)
   - **Followup Frequency** (choose your preference)

### Step 3: Configure Ad Platform Webhooks

#### Meta/Facebook Ads Setup
1. Go to [Meta Business Suite](https://business.facebook.com)
2. Navigate to **Leads** → **Webhooks**
3. Configure webhook URL field with:
   ```
   https://your-domain.com/webhook/meta-leads
   ```
4. Copy this webhook URL into the campaign form
5. Select **Campaign Active** to enable
6. Toggle **Auto-add Leads to Group** to sync new leads

#### Google Ads Setup
1. Go to [Google Ads Editor](https://ads.google.com)
2. Navigate to **Tools** → **Conversions** → **Setup Leads**
3. Create a conversion action with webhook:
   ```
   https://your-domain.com/webhook/google-leads
   ```
4. Copy webhook URL to campaign form
5. Enable campaign activation

#### LinkedIn Ads Setup
1. Go to [LinkedIn Campaign Manager](https://business.linkedin.com)
2. Navigate to **Account Assets** → **Sponsored Content**
3. Add webhook to Lead Gen Form:
   ```
   https://your-domain.com/webhook/linkedin-leads
   ```
4. Configure in campaign form

### Step 4: Verify Configuration
Once created, you'll see:
- ✓ **Green checkmark** = Campaign is active and syncing
- ⚠️ **Alert icon** = Campaign inactive (manually paused)
- **Status badge** = Shows number of active campaigns
- **Auto-add indicator** = "✓ Auto-adding leads to this group"

## How It Works

### Automated Lead Flow
```
Ad Platform → Webhook → Group → Mr LAD Agent
                ↓
        Lead capture from ad
                ↓
        Sent to configured webhook URL
                ↓
        Lead automatically added to WhatsApp group
                ↓
        Mr LAD begins automated nurturing (based on frequency)
```

### Followup Process
1. **Initial Message** - Welcome message when added to group
2. **Scheduled Followups** - Based on frequency setting
3. **Nurturing Sequences** - PersonalizedMessages using lead data
4. **Conversion Tracking** - Monitor lead engagement

## Campaign Options Explained

### Enable/Disable Toggle
- **On** → Campaign is actively syncing and nurturing leads
- **Off** → Webhook won't accept new leads, existing leads still in group

### Auto-add Leads Setting
- **Enabled** → New lead clickers automatically join this specific group
- **Disabled** → Leads synced but not automatically added (manual review)

### Webhook URL
- Generated unique endpoint per campaign
- Must be HTTPS (SSL/TLS encrypted)
- Receives POST requests with lead data
- Each platform sends different lead data structure

## Examples

### Example 1: E-commerce Product Launch
```
Campaign Name: Summer Collection 2026
Platform: Meta Ads
Frequency: Daily
Auto-add: Yes
```
→ Every lead from your Instagram ads joins the group and receives daily updates

### Example 2: B2B Service Multi-touch
```
Campaign Name: Enterprise Software Demo
Platform: Google Ads
Frequency: Weekly
Auto-add: Yes
```
→ High-value leads get weekly check-ins over WhatsApp

### Example 3: LinkedIn Professional Services
```
Campaign Name: Consulting Services
Platform: LinkedIn Ads
Frequency: Bi-weekly
Auto-add: Yes
```
→ Professional leads get spaced-out nurturing for consultative selling

## Best Practices

### 1. **Campaign Naming**
Use clear, specific names:
- ✅ "Black Friday Sale - Nov 2026"
- ✅ "Free Trial Signup Campaign"
- ❌ "Campaign 1" or "Meta Ads"

### 2. **Frequency Selection**
- Daily → High-energy products, flash sales
- Every 3 Days → Regular products, moderate urgency
- Weekly → Professional services, consultative sells
- Bi-weekly → Long sales cycles, low-frequency touch

### 3. **Multiple Campaigns**
Create separate groups/campaigns for:
- Different products/services
- Different audience segments
- Different geographic regions
- Different marketing stages (awareness vs. conversion)

### 4. **Lead Quality**
- Ensure ad platform filters out invalid leads
- Test webhook with sample leads first
- Monitor lead engagement in group

### 5. **Message Personalization**
Mr LAD uses lead data from the ad platform to personalize:
- Lead name
- Company (if B2B)
- Product interest
- Lead score

## Troubleshooting

### Campaign Not Syncing Leads?
1. Verify webhook URL is correct and HTTPS
2. Check that "Campaign Active" toggle is ON
3. Check that "Auto-add Leads" toggle is ON
4. Verify ad platform webhook is configured correctly
5. Test webhook with sample lead payload

### Leads Not Getting Messages?
1. Verify Mr LAD is admin of the group
2. Check followup frequency setting
3. Verify nurture template is configured
4. Check for message delivery errors in logs

### Webhook Errors?
- Ensure URL is publicly accessible
- Verify SSL certificate is valid
- Check firewall allows POST requests to webhook
- Review ad platform webhook logs for errors

## API Integration

### Webhook Payload Format

#### Meta/Facebook
```json
{
  "entry": [{
    "changes": [{
      "value": {
        "leads": [{
          "id": "lead_123",
          "created_time": "2026-03-11T10:00:00Z",
          "field_data": [
            {"name": "first_name", "values": ["John"]},
            {"name": "last_name", "values": ["Doe"]},
            {"name": "phone_number", "values": ["+1234567890"]},
            {"name": "email", "values": ["john@example.com"]}
          ]
        }]
      }
    }]
  }]
}
```

#### Google Ads
```json
{
  "conversion_id": "conversion_123",
  "gclid": "CjwKCAiA4JifBhAXEiwA2pg9d...",
  "phone": "+1234567890",
  "email": "john@example.com",
  "first_name": "John",
  "last_name": "Doe",
  "timestamp": "2026-03-11T10:00:00Z"
}
```

#### LinkedIn
```json
{
  "elementId": "form_123",
  "timestamp": 1679050800000,
  "profileFormData": [
    {"name": "firstName", "value": "John"},
    {"name": "lastName", "value": "Doe"},
    {"name": "email", "value": "john@example.com"},
    {"name": "phone", "value": "+1234567890"}
  ]
}
```

## Monitoring Campaigns

Monitor campaign performance:
- Lead count per campaign
- Message delivery rates
- Conversion tracking
- Engagement metrics
- Response rates

See: [Campaign Analytics Dashboard](./CAMPAIGN_ANALYTICS.md) (coming soon)

## Support

For issues or questions:
1. Check troubleshooting section above
2. Review webhook logs in your ad platform
3. Verify group member count increases with leads
4. Contact support with campaign ID and webhook URL

---

**Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Production Ready
