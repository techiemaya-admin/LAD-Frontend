# Old Apollo Services - ARCHIVED

**Date Archived:** December 18, 2025  
**Reason:** Migrated to feature-based TypeScript structure

## What Was Moved

These files have been replaced by the new production-grade structure in `/frontend/features/apollo-leads/`:

### Archived Files:

1. **apolloLeadsService.js** (JavaScript)
   - Old service for Apollo.io API integration
   - Replaced by: `/frontend/features/apollo-leads/services/apolloLeadsService.ts`
   - Improvements: Full TypeScript support, better error handling, type safety

2. **apolloPhoneService.js** (JavaScript)
   - Old service for phone number reveal
   - Replaced by: `/frontend/features/apollo-leads/services/apolloPhoneService.ts`
   - Improvements: TypeScript, better types, consistent API

3. **apolloPhoneConfig.js** (JavaScript)
   - Configuration file for phone service
   - Replaced by: Environment variables in TypeScript service
   - Improvements: Configuration moved to service, no separate config file needed

## Migration Completed

✅ **tsconfig.json** - Added path alias `@/features/*` pointing to `../frontend/features/*`
✅ **page.jsx** - Updated import from `@/services/apolloLeadsService` to `@/features/apollo-leads`
✅ **All imports** - Verified no remaining references to old services

## New Usage

### Old Way (JavaScript):
```javascript
import { apolloLeadsService } from '@/services/apolloLeadsService';
```

### New Way (TypeScript):
```typescript
import { apolloLeadsService } from '@/features/apollo-leads';
```

## Benefits of New Structure

1. **Full TypeScript Support**
   - Type-safe API calls
   - IntelliSense autocomplete
   - Compile-time error checking

2. **Better Organization**
   - Feature-based structure
   - Clear separation of concerns
   - Easier to maintain and scale

3. **Enhanced Error Handling**
   - Proper error types
   - Better error messages
   - Credit insufficiency handling

4. **Production-Ready**
   - SSR-safe (no window/localStorage issues)
   - Proper authentication flow
   - Credit tracking built-in

## Do Not Use These Files

These files are kept for reference only. All new development should use the TypeScript services in `/frontend/features/apollo-leads/`.

## Related Documentation

- [Frontend Apollo Feature](/frontend/features/apollo-leads/README.md)
- [Backend Apollo Feature](/backend/features/apollo-leads/)
- [Migration Guide](/MIGRATION_GUIDE.md)

---

**Archive Note:** These files are no longer actively maintained. Use the new feature-based structure.
