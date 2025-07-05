# Farcaster AI Agents & LLMs Checklist

## Overview
This document contains critical guidelines for AI agents (like Claude) working with Farcaster Mini Apps. Following these guidelines ensures correct implementation and avoids common pitfalls.

## Communication Best Practices

### When Uncertain:
1. **Ask clarifying questions** - Don't assume, always verify
2. **Be specific** - Point out exactly what's unclear
3. **Verify assumptions** - Confirm understanding before implementing
4. **Seek help** - Contact Farcaster team when stuck:
   - @pirosb3
   - @linda
   - @deodad

## Critical Implementation Rules

### ✅ DO:
- **Use official SDK**: Always use `@farcaster/miniapp-sdk`
- **Reference current docs**: miniapps.farcaster.xyz
- **Use version 1**: All examples should have `"version": "1"`
- **Follow SDK patterns**: Use `sdk.actions.ready()` for initialization
- **Test thoroughly**: Use preview tools and check console

### ❌ DON'T:
- **No Frames v1 syntax**: Don't reference outdated Frames documentation
- **No invented fields**: Don't create non-official manifest fields
- **No terminology mixing**: Keep Frame and Mini App terms separate
- **No old examples**: Avoid examples from before 2024
- **No assumptions**: Don't guess at API behavior

## Technical Implementation Checklist

### 1. SDK Initialization
```javascript
import sdk from '@farcaster/miniapp-sdk'

// ALWAYS call this when app is ready
await sdk.actions.ready()
```

### 2. Manifest Requirements
- Must be accessible at correct URL
- Must validate against official schema
- Must include proper domain signature
- Version must be "1"

### 3. Meta Tags
```html
<!-- Required meta tags -->
<meta property="fc:frame" content="vNext">
<meta property="fc:frame:image" content="https://...">
<meta property="fc:frame:button:1" content="Launch">
<meta property="fc:frame:button:1:action" content="launch_frame">
<meta property="fc:frame:button:1:target" content="https://...">
```

### 4. Image Requirements
- **Aspect ratio**: 3:2
- **Format**: PNG, JPG, GIF
- **Size**: Optimize for performance

### 5. Button Constraints
- **Title limit**: 32 characters maximum
- **Action types**: Must use valid action types

### 6. CORS Configuration
- Enable CORS for Farcaster domains
- Allow iframe embedding
- Set appropriate headers

## Troubleshooting Guide

### Common Issues:
1. **App not loading**: Check `sdk.actions.ready()` call
2. **Manifest errors**: Validate schema and version
3. **Preview issues**: Check meta tags and image URLs
4. **SDK not found**: Verify import statements
5. **Context missing**: Ensure proper initialization

### Debug Steps:
1. Open browser console
2. Check for initialization errors
3. Verify asset loading
4. Test with preview tool
5. Monitor network requests

## Testing Requirements

### Before Deployment:
1. **Preview test**: Use Farcaster preview tool
2. **Link sharing**: Test shareable links work
3. **Console check**: No errors in browser console
4. **Asset verification**: All images/resources load
5. **Mobile test**: Check safe area insets

### Runtime Checks:
1. Context loads properly
2. Primary button works
3. Navigation functions
4. Error states handled
5. Performance acceptable

## Key Differences from Frames

### Mini Apps ARE NOT Frames:
- Different initialization (`sdk.actions.ready()` vs frame response)
- Different context (full app vs single interaction)
- Different capabilities (persistent state, complex UI)
- Different manifest structure

### Migration Notes:
- Don't use Frame v1 patterns
- Update all meta tags to vNext format
- Use Mini App SDK, not Frame SDK
- Follow current documentation only

## Quick Reference

### Essential Imports:
```javascript
import sdk from '@farcaster/miniapp-sdk'
import type { Context } from '@farcaster/miniapp-sdk'
```

### Initialization Pattern:
```javascript
// Check if in miniapp
const isInMiniApp = await sdk.isInMiniApp()

// Get context
const context = await sdk.context

// Signal ready
await sdk.actions.ready()
```

### Common Actions:
```javascript
// Set primary button
sdk.actions.setPrimaryButton({ text: 'Share' })

// Compose cast
sdk.actions.composeCast({ text: 'Hello Farcaster!' })

// Open URL
sdk.actions.openUrl({ url: 'https://...' })
```

## Remember:
1. Always use current documentation
2. Never mix Frame and Mini App concepts
3. Test in actual Farcaster environment
4. Ask for help when uncertain
5. Validate everything before deployment