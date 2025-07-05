# Farcaster MiniApp Integration

This branch contains a specialized version of the Waku-Codex React template designed to work as a Farcaster miniapp.

## Features

- **Farcaster SDK Integration**: Properly loads and initializes within Farcaster's iframe context
- **User Context**: Displays the connected Farcaster user's information
- **Development Mode**: Works both inside and outside of Farcaster for easy development
- **All Template Features**: Includes Waku P2P messaging and Codex file storage

## Getting Started

### Development

Run the miniapp version locally:

```bash
npm run dev:miniapp
```

This will start the development server. You can:
- Access it directly at http://localhost:5173 (shows warning that it's not in Farcaster context)
- Test it in Farcaster by pointing to your local development URL

### Production Build

Build the miniapp for deployment:

```bash
npm run build:miniapp
```

The build output will be in the `dist` directory.

## Deployment

For the miniapp to work on Farcaster (rhetoric.space), you need to:

1. Deploy the built files to your hosting service
2. Ensure the app is served over HTTPS
3. Configure your domain to allow iframe embedding

### Required Headers

Make sure your server sends appropriate headers to allow iframe embedding:

```
X-Frame-Options: ALLOW-FROM https://farcaster.xyz
Content-Security-Policy: frame-ancestors https://farcaster.xyz https://*.farcaster.xyz
```

## How It Works

1. **Loading**: The `FarcasterMiniapp` component checks if the app is running inside Farcaster
2. **Authentication**: Automatically gets the user context from Farcaster
3. **Ready Signal**: Signals to Farcaster that the app is ready
4. **Graceful Degradation**: Shows a warning when not in Farcaster context but still works

## Components

### FarcasterMiniapp

Wrapper component that handles:
- SDK initialization
- Loading states
- Error handling
- Development mode detection

### MiniApp

Main application component that:
- Uses the Farcaster context
- Provides all Waku-Codex functionality
- Shows user information when in Farcaster

## Testing in Farcaster

1. Start the development server: `npm run dev:miniapp`
2. Use a tunneling service like ngrok to expose your local server
3. Add your miniapp URL to Farcaster for testing

## API Usage

### Check if in MiniApp

```typescript
const { isInMiniApp } = useFarcasterContext();
```

### Get User Info

```typescript
const { context } = useFarcasterContext();
if (context) {
  console.log(context.user.username);
  console.log(context.user.fid);
}
```

## Differences from Main Template

- Added Farcaster SDK dependency
- Created `FarcasterMiniapp` wrapper component
- Added `MiniApp.tsx` as the main entry point
- Separate build configuration for miniapp
- Shows Farcaster user information when available